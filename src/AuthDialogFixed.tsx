import { useState } from 'react';

export type SessionUser = { id: string; email: string; display_name: string };

export default function AuthDialog({ onClose, onUser }: { onClose: () => void; onUser: (user: SessionUser | null) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState<'google' | 'github' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(mode === 'register' ? { name } : {}) })
      });
      const text = await response.text();
      let body: { user?: SessionUser; error?: string };
      try {
        body = text.trim() ? JSON.parse(text) as { user?: SessionUser; error?: string } : {};
      } catch {
        throw new Error(`Sign-in service returned an unreadable response (HTTP ${response.status}). Check that the API is running, then try again.`);
      }
      if (!response.ok) throw new Error(body.error || `Sign-in failed (HTTP ${response.status}). Try again.`);
      if (!body.user) throw new Error('Sign-in service returned no account details. Please try again.');
      onUser(body.user);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the API. Make sure the API is running.');
    } finally {
      setBusy(false);
    }
  }

  async function startProvider(provider: 'google' | 'github') {
    setError('');
    setProviderBusy(provider);
    try {
      const response = await fetch(`/api/auth/${provider}/status`);
      const text = await response.text();
      let status: { configured?: boolean };
      try {
        status = text.trim() ? JSON.parse(text) as { configured?: boolean } : {};
      } catch {
        throw new Error(`Could not read sign-in status (HTTP ${response.status}). Make sure the API is running.`);
      }
      if (!response.ok) throw new Error(`Could not check sign-in status (HTTP ${response.status}).`);
      if (!status.configured) {
        const providerName = provider === 'google' ? 'Google' : 'GitHub';
        const variables = provider === 'google'
          ? 'GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_CALLBACK_URL'
          : 'GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL';
        throw new Error(`${providerName} sign-in is not configured. Add ${variables} to .env, then restart the API.`);
      }
      window.location.assign(`/api/auth/${provider}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not check ${provider} sign-in configuration. Make sure the API is running.`);
      setProviderBusy(null);
    }
  }

  return (
    <div className="auth-backdrop auth-redesign-backdrop" role="presentation" onClick={onClose}>
      <form className="auth-card auth-redesign" onSubmit={submit} onClick={event => event.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close sign-in">×</button>
        <div className="auth-brand-mark" aria-hidden="true">N</div>
        <small className="auth-kicker">NEXACODE ACCOUNT</small>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-intro">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Join NexaCode and keep your learning in sync.'}</p>

        <button type="button" className="auth-provider-button" onClick={() => void startProvider('google')} disabled={providerBusy !== null || busy}>
          <svg className="auth-google-icon" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.1 11.1 0 0 1-4.8 7.27l7.73 6C44.38 38.05 46.98 31.9 46.98 24.55Z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.55 2.56 10.78l7.97-6.19Z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          {providerBusy === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
        </button>
        <button type="button" className="auth-provider-button" onClick={() => void startProvider('github')} disabled={providerBusy !== null || busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 1.7 2.62 1.21 3.26.92.1-.72.39-1.21.71-1.49-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.61 5.25-5.1 5.52.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" /></svg>
          {providerBusy === 'github' ? 'Connecting to GitHub…' : 'Continue with GitHub'}
        </button>

        <div className="auth-divider"><span>or continue with email</span></div>

        {mode === 'register' && (
          <label className="auth-field">Name
            <input autoComplete="name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Your name" />
          </label>
        )}
        <label className="auth-field">Email address
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <label className="auth-field">Password
          <span className="auth-password-wrap">
            <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" />
            <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </span>
        </label>

        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="run auth-submit" disabled={busy || providerBusy !== null}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">→</span></button>
        <p className="auth-mode-switch">
          {mode === 'login' ? 'New to NexaCode?' : 'Already have an account?'}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Create an account' : 'Sign in'}</button>
        </p>
        <p className="auth-privacy">Your account is used to sync your learning progress and saved work.</p>
      </form>
    </div>
  );
}
