import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './mcp.js';
import { ensureMcpAuditTable, recordMcpToolAudit, runWithMcpActor } from './mcp-audit.js';

const app = express();
const port = Number(process.env.MCP_PORT || 4001);
const host = process.env.MCP_HOST || '127.0.0.1';
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createServer> }>();
const allowed = new Set((process.env.MCP_ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(value => value.trim()).filter(Boolean));

app.use(express.json({ limit: '64kb' }));
app.use('/mcp', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && !allowed.has(origin)) {
    res.status(403).json({ error: 'Origin is not allowed.' });
    return;
  }
  const expected = process.env.MCP_AUTH_TOKEN;
  if (process.env.NODE_ENV === 'production' && !expected) {
    res.status(503).json({ error: 'MCP_AUTH_TOKEN must be configured before remote MCP is enabled.' });
    return;
  }
  if (expected && req.get('authorization') !== `Bearer ${expected}`) {
    res.status(401).json({ error: 'MCP authentication required.' });
    return;
  }
  next();
});

function toolCall(body: unknown): { name: string; input: unknown } | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const request = body as { method?: unknown; params?: { name?: unknown; arguments?: unknown } };
  if (request.method !== 'tools/call' || typeof request.params?.name !== 'string') return null;
  return { name: request.params.name, input: request.params.arguments || {} };
}

app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.get('mcp-session-id');
  const session = sessionId ? sessions.get(sessionId) : undefined;
  const call = toolCall(req.body);
  const startedAt = Date.now();
  const proxyToken = process.env.MCP_PROXY_TOKEN;
  const suppliedProxyToken = req.get('x-nexacode-proxy-token') || '';
  const isTrustedProxy = typeof proxyToken === 'string' && proxyToken.length > 0 && suppliedProxyToken.length === proxyToken.length
    && timingSafeEqual(Buffer.from(suppliedProxyToken), Buffer.from(proxyToken));
  const actor = z.string().uuid().safeParse(isTrustedProxy ? req.get('x-nexacode-actor') : undefined);
  const actorId = actor.success ? `user:${actor.data}` : 'remote';

  try {
    if (!session && !sessionId && isInitializeRequest(req.body)) {
      let transport: StreamableHTTPServerTransport;
      const server = createServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: id => {
          sessions.set(id, { transport, server });
        }
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!session) {
      res.status(sessionId ? 404 : 400).json({ error: sessionId ? 'MCP session not found.' : 'Initialize an MCP session first.' });
      return;
    }

    await runWithMcpActor(actorId, async () => {
      await session.transport.handleRequest(req, res, req.body);
      if (call) await recordMcpToolAudit(call.name, call.input, 'success', Date.now() - startedAt);
    });
  } catch (error) {
    if (call) {
      try {
        await runWithMcpActor(actorId, () => recordMcpToolAudit(call.name, call.input, 'error', Date.now() - startedAt));
      } catch (auditError) {
        console.error('Failed to persist MCP audit record:', auditError instanceof Error ? auditError.message : 'unknown error');
      }
    }
    if (!res.headersSent) res.status(500).json({ error: error instanceof Error ? error.message : 'MCP request failed.' });
  }
});

app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.get('mcp-session-id');
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    res.status(404).end();
    return;
  }
  await session.transport.handleRequest(req, res);
});

app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.get('mcp-session-id');
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    res.status(404).end();
    return;
  }
  await session.transport.handleRequest(req, res);
});

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to persist remote MCP audit records.');
}
await ensureMcpAuditTable();
app.listen(port, host, () => console.log(`NexaCode Streamable HTTP MCP listening on ${host}:${port}/mcp`));
