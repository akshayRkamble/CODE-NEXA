import type { Pool } from 'pg';

export type RetrievedChunk = { source: string; title: string; topic: string | null; chunk_text: string; distance: number };

export class TutorServiceError extends Error {
  constructor(message: string, readonly status = 503, readonly retryAfterSeconds?: number) {
    super(message);
    this.name = 'TutorServiceError';
  }
}

type ProviderErrorBody = { error?: { code?: string; type?: string; message?: string; details?: { retryDelay?: string }[] } };

function retryDelaySeconds(response: Response, body?: ProviderErrorBody): number | undefined {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay / 1000);
  }
  const retryDelay = body?.error?.details?.find(detail => detail.retryDelay)?.retryDelay;
  const match = retryDelay?.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Number(match[1]) : undefined;
}

function isQuotaExhausted(body?: ProviderErrorBody): boolean {
  const code = body?.error?.code || body?.error?.type;
  const message = body?.error?.message || '';
  return code === 'credit_balance_exhausted' || code === 'insufficient_quota' ||
    /billing.+(?:disabled|required)|(?:daily|monthly) quota|quota.+exhausted/i.test(message);
}

export async function fetchWithRateLimitRetry(request: () => Promise<Response>, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await request();
    if (response.status !== 429 || attempt >= maxRetries) return response;

    let body: ProviderErrorBody | undefined;
    try {
      body = await response.clone().json() as ProviderErrorBody;
    } catch {
      // Some providers return a non-JSON rate-limit response.
    }
    if (isQuotaExhausted(body)) return response;

    const delaySeconds = retryDelaySeconds(response, body) ?? [0.5, 1][attempt] ?? 1;
    if (delaySeconds > 8) return response;
    await new Promise(resolve => setTimeout(resolve, Math.ceil(delaySeconds * 1000)));
  }
}

function apiRoot() {
  const value = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  return value.replace(/\/+$/, '');
}

function providerError(status: number, code?: string): TutorServiceError {
  if (status === 429 && (code === 'credit_balance_exhausted' || code === 'insufficient_quota')) {
    return new TutorServiceError('The AI provider account has no available credits. Restore its billing or quota, then try again.');
  }
  if (status === 429) return new TutorServiceError('The AI provider is rate-limiting requests. Wait a moment and try again.', 429);
  if (status === 401 || status === 403) return new TutorServiceError('The AI provider rejected its credentials or model permissions. Check the server-side AI configuration.');
  if (status === 404) return new TutorServiceError('The configured AI model or endpoint was not found. Check the server-side AI configuration.');
  if (status >= 500) return new TutorServiceError('The AI provider is temporarily unavailable. Try again later.', 502);
  return new TutorServiceError(`The AI provider rejected the request (HTTP ${status}). Check its model and embedding configuration.`, 502);
}

export async function providerFailure(response: Response): Promise<TutorServiceError> {
  let body: ProviderErrorBody | undefined;
  try {
    body = await response.json() as ProviderErrorBody;
  } catch {
    // Providers may return a non-JSON error body.
  }
  const code = body?.error?.code || body?.error?.type;
  const message = body?.error?.message || '';
  if (response.status === 503 && /high demand|overload|temporarily unavailable/i.test(message)) {
    return new TutorServiceError('Gemini is temporarily at capacity. Wait a little and try the tutor again.', 503);
  }
  if (response.status === 429 && !isQuotaExhausted(body)) {
    const retryAfter = retryDelaySeconds(response, body);
    const wait = retryAfter === undefined ? 'a little' : `${Math.ceil(retryAfter)} seconds`;
    return new TutorServiceError(`The AI provider is still rate-limiting requests after automatic retries. Wait ${wait}, then retry your question.`, 429, retryAfter);
  }
  return providerError(response.status, code);
}

export async function embed(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
  const provider = process.env.RAG_PROVIDER || 'openai';
  const ollama = provider === 'ollama';
  const google = provider === 'google';
  const apiKey = google ? process.env.GOOGLE_AI_API_KEY : process.env.AI_API_KEY;
  if (!ollama && !apiKey) {
    throw new TutorServiceError(google ? 'Set GOOGLE_AI_API_KEY to enable the Gemini tutor.' : 'Set AI_API_KEY to enable the tutor.');
  }

  const model = process.env.EMBEDDING_MODEL || (google ? 'gemini-embedding-001' : ollama ? 'nomic-embed-text' : 'text-embedding-3-small');
  const endpoint = google
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`
    : ollama
      ? `${(process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '')}/api/embed`
      : `${apiRoot()}/embeddings`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (google) headers['x-goog-api-key'] = apiKey!;
  else if (!ollama) headers.Authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetchWithRateLimitRetry(() => fetch(endpoint, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify(google
        ? { content: { parts: [{ text }] }, taskType, outputDimensionality: 1536 }
        : ollama
          ? { model, input: text }
          : { model, input: text })
    }));
  } catch (error) {
    if (error instanceof TutorServiceError) throw error;
    throw new TutorServiceError('Could not reach the embedding provider. Check the server network and AI endpoint.', 502);
  }
  if (!response.ok) throw await providerFailure(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TutorServiceError('The embedding provider returned an invalid response.', 502);
  }

  const data = payload as { data?: { embedding?: unknown }[]; embeddings?: unknown[]; embedding?: unknown; values?: unknown };
  const embedding = data.embedding;
  const googleValues = typeof embedding === 'object' && embedding !== null && 'values' in embedding
    ? (embedding as { values?: unknown }).values
    : undefined;
  const vector = data.data?.[0]?.embedding ?? data.embeddings?.[0] ?? googleValues ?? embedding ?? data.values;
  if (!Array.isArray(vector) || vector.length === 0 || vector.length > 1536 ||
    !vector.every(value => typeof value === 'number' && Number.isFinite(value))) {
    throw new TutorServiceError('The embedding model returned an invalid vector. Configure a model with 1-1536 numeric dimensions.', 502);
  }

  return vector.length === 1536 ? vector : [...vector, ...Array<number>(1536 - vector.length).fill(0)];
}

export async function retrieve(pool: Pool, query: string, topic?: string): Promise<RetrievedChunk[]> {
  const readiness = await pool.query<{ ready: boolean }>('SELECT EXISTS(SELECT 1 FROM knowledge_chunks) AS ready');
  if (!readiness.rows[0]?.ready) {
    throw new TutorServiceError('The tutor knowledge base is empty. Run `npm run ingest` after configuring the embedding provider.');
  }

  const vector = await embed(query, 'RETRIEVAL_QUERY');
  const sql = `SELECT c.source,d.title,d.topic,c.chunk_text,(c.embedding <=> $1::vector)::float AS distance
    FROM knowledge_chunks c JOIN knowledge_documents d USING(source)
    WHERE ($2::text IS NULL OR d.topic=$2)
    ORDER BY c.embedding <=> $1::vector LIMIT 6`;
  const result = await pool.query<RetrievedChunk>(sql, [`[${vector.join(',')}]`, topic || null]);
  return result.rows;
}

export function redactSecrets(text: string) {
  return text
    .replace(/(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]+)/gi, '[REDACTED_SECRET]')
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED_SECRET]');
}
