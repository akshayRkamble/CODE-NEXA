import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

type AuditContext = { actorId: string; requestId: string };
const context = new AsyncLocalStorage<AuditContext>();
const safeValues = new Set(['slug', 'topic', 'difficulty', 'dataset', 'language']);

export function runWithMcpActor<T>(actorId: string, action: () => T): T {
  return context.run({ actorId, requestId: randomUUID() }, action);
}

export function summarizeToolInput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).slice(0, 20).map(([key, value]) => {
    if (safeValues.has(key) && typeof value === 'string') return [key, value.slice(0, 120)];
    if (typeof value === 'string') return [key, { type: 'string', length: value.length }];
    if (Array.isArray(value)) return [key, { type: 'array', length: value.length }];
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return [key, { type: typeof value }];
    return [key, { type: typeof value }];
  }));
}

export async function ensureMcpAuditTable(): Promise<void> {
  if (!pool) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required to persist MCP audit records.');
    console.error('MCP audit persistence is disabled because DATABASE_URL is not configured.');
    return;
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS mcp_tool_audit (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL,
    actor_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    input_summary JSONB NOT NULL DEFAULT '{}',
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'error')),
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS mcp_tool_audit_created_idx ON mcp_tool_audit(created_at DESC)');
}

export async function recordMcpToolAudit(
  toolName: string,
  input: unknown,
  outcome: 'success' | 'error',
  durationMs: number
): Promise<void> {
  if (!pool) {
    console.error('MCP audit record unavailable: DATABASE_URL is not configured.');
    return;
  }
  const request = context.getStore();
  await pool.query(
    'INSERT INTO mcp_tool_audit(request_id,actor_id,tool_name,input_summary,outcome,duration_ms) VALUES($1,$2,$3,$4,$5,$6)',
    [request?.requestId || randomUUID(), request?.actorId || 'stdio', toolName, summarizeToolInput(input), outcome, Math.max(0, Math.round(durationMs))]
  );
}
