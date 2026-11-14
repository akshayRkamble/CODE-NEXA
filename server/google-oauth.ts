import type { Express } from 'express';
import type { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

type GoogleOAuthOptions = {
  db: () => Pool;
  ensureSchema: () => Promise<void>;
  origin: string;
  secret: string;
};

export function registerGoogleOAuthRoutes(app: Express, { db, ensureSchema, origin, secret }: GoogleOAuthOptions) {
  app.get('/api/auth/google/status', (_req, res) => {
    res.json({
      configured: Boolean(
        process.env.GOOGLE_OAUTH_CLIENT_ID
        && process.env.GOOGLE_OAUTH_CLIENT_SECRET
        && process.env.GOOGLE_OAUTH_CALLBACK_URL
      )
    });
  });

  app.get('/api/auth/google', (_req, res) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const callback = process.env.GOOGLE_OAUTH_CALLBACK_URL;
    if (!clientId || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !callback) {
      res.status(503).json({
        error: 'Google sign-in is not configured. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_CALLBACK_URL to .env, then restart the API.'
      });
      return;
    }

    const state = randomBytes(24).toString('hex');
    res.cookie('nexa_google_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth/google/callback',
      maxAge: 10 * 60 * 1000
    });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account'
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get('/api/auth/google/callback', async (req, res, next) => {
    try {
      const received = String(req.query.state || '');
      const cookie = decodeURIComponent(req.headers.cookie?.split(';')
        .map(value => value.trim())
        .find(value => value.startsWith('nexa_google_oauth_state='))
        ?.slice('nexa_google_oauth_state='.length) || '');
      res.clearCookie('nexa_google_oauth_state', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth/google/callback'
      });

      if (!received || !cookie || received.length !== cookie.length
        || !timingSafeEqual(Buffer.from(received), Buffer.from(cookie))) {
        throw Object.assign(new Error('Google OAuth state validation failed.'), { status: 400 });
      }
      if (req.query.error) throw Object.assign(new Error('Google sign-in was cancelled or denied.'), { status: 400 });

      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const callback = process.env.GOOGLE_OAUTH_CALLBACK_URL;
      if (!clientId || !clientSecret || !callback) {
        throw Object.assign(new Error('Google sign-in is not configured.'), { status: 503 });
      }

      const code = z.string().min(1).parse(req.query.code);
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callback,
          grant_type: 'authorization_code'
        }),
        signal: AbortSignal.timeout(10_000)
      });
      const tokenData = await tokenResponse.json() as { access_token?: string };
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Google did not authorize the sign-in.');

      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000)
      });
      if (!profileResponse.ok) throw new Error('Could not read the Google account profile.');

      const parsedProfile = z.object({
        sub: z.string().min(1),
        email: z.string().email(),
        email_verified: z.boolean(),
        name: z.string().optional()
      }).safeParse(await profileResponse.json());
      if (!parsedProfile.success) throw new Error('Google returned an invalid account profile.');
      const profile = parsedProfile.data;
      if (!profile.email_verified) throw new Error('Your Google account must have a verified email address.');

      await ensureSchema();
      const database = db();
      const existing = await database.query('SELECT id FROM users WHERE google_id=$1', [profile.sub]);
      let user: { id: string; email: string; display_name: string };
      if (existing.rowCount) {
        const conflict = await database.query(
          'SELECT id FROM users WHERE email=$1 AND id<>$2',
          [profile.email.toLowerCase(), existing.rows[0].id]
        );
        if (conflict.rowCount) {
          throw Object.assign(new Error('This Google email is already used by another account. Sign in with that account instead; accounts are not automatically linked.'), { status: 409 });
        }
        const updated = await database.query(
          'UPDATE users SET email=$1,display_name=$2 WHERE id=$3 RETURNING id,email,display_name',
          [profile.email.toLowerCase(), profile.name || profile.email.split('@')[0], existing.rows[0].id]
        );
        user = updated.rows[0];
      } else {
        const emailOwner = await database.query('SELECT id FROM users WHERE email=$1', [profile.email.toLowerCase()]);
        if (emailOwner.rowCount) {
          throw Object.assign(new Error('An account already uses this email. Sign in with that account; Google sign-in will not automatically link accounts.'), { status: 409 });
        }
        const created = await database.query(
          'INSERT INTO users(email,password_hash,google_id,display_name) VALUES($1,NULL,$2,$3) RETURNING id,email,display_name',
          [profile.email.toLowerCase(), profile.sub, profile.name || profile.email.split('@')[0]]
        );
        user = created.rows[0];
      }

      res.cookie('nexa_session', jwt.sign({ id: user.id }, secret, { expiresIn: '7d' }), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      res.redirect(`${origin}/?login=google`);
    } catch (error) {
      next(error);
    }
  });
}
