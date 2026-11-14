import { z } from 'zod';

const defaultBaseUrl = 'https://freemodel.in/v1';
const modelListSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) }))
});
const completionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.unknown() })
  })).min(1)
});

export type FreeModelMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export class FreeModelError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'FreeModelError';
  }
}

function configuration() {
  const apiKey = process.env.FREEMODEL_API_KEY;
  if (!apiKey) {
    throw new FreeModelError('Configure FREEMODEL_API_KEY on the API server to use chat.', 503);
  }

  const baseUrl = process.env.FREEMODEL_BASE_URL || defaultBaseUrl;
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new FreeModelError('FREEMODEL_BASE_URL must be a valid HTTPS URL.', 500);
  }
  if (url.protocol !== 'https:') {
    throw new FreeModelError('FREEMODEL_BASE_URL must use HTTPS.', 500);
  }

  return { apiKey, baseUrl: url.toString().replace(/\/+$/, '') };
}

async function providerError(response: Response): Promise<FreeModelError> {
  if (response.status === 401 || response.status === 403) {
    return new FreeModelError('FreeModel rejected the server API key. Check FREEMODEL_API_KEY.', 502);
  }
  if (response.status === 402) {
    return new FreeModelError('FreeModel account has no remaining usage. Check its plan or balance.', 402);
  }
  if (response.status === 429) {
    return new FreeModelError('FreeModel rate limit reached. Wait briefly, then try again.', 429);
  }

  return new FreeModelError(`FreeModel request failed (HTTP ${response.status}).`, 502);
}

async function request(path: string, body?: unknown): Promise<Response> {
  const { apiKey, baseUrl } = configuration();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(body === undefined ? 15_000 : 180_000),
      redirect: 'error'
    });
    if (!response.ok) throw await providerError(response);
    return response;
  } catch (error) {
    if (error instanceof FreeModelError) throw error;
    throw new FreeModelError('Could not reach FreeModel. Check the API server network and try again.', 502);
  }
}

let cachedModels: { ids: string[]; expiresAt: number } | undefined;

export async function listFreeModelModels(): Promise<string[]> {
  if (cachedModels && cachedModels.expiresAt > Date.now()) return cachedModels.ids;

  const response = await request('/models');
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FreeModelError('FreeModel returned an unreadable model catalog.', 502);
  }

  const parsed = modelListSchema.safeParse(payload);
  if (!parsed.success) {
    throw new FreeModelError('FreeModel returned an unexpected model catalog.', 502);
  }

  const ids = [...new Set(parsed.data.data.map(model => model.id))].sort((a, b) => a.localeCompare(b));
  if (!ids.length) throw new FreeModelError('FreeModel did not return any available models.', 502);
  cachedModels = { ids, expiresAt: Date.now() + 5 * 60_000 };
  return ids;
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .filter((part): part is { type: 'text'; text: string } =>
      typeof part === 'object'
      && part !== null
      && 'type' in part
      && part.type === 'text'
      && 'text' in part
      && typeof part.text === 'string')
    .map(part => part.text)
    .join('');
}

export async function createFreeModelCompletion(model: string, messages: FreeModelMessage[]): Promise<string> {
  const response = await request('/chat/completions', {
    model,
    messages: [
      {
        role: 'system',
        content: 'You are NexaCode, a practical coding and creation assistant. Help the user design and build projects with clear steps and original examples. Never claim to have edited files or run code; provide complete code blocks and filenames when useful.'
      },
      ...messages
    ]
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FreeModelError('FreeModel returned an unreadable chat response.', 502);
  }

  const parsed = completionSchema.safeParse(payload);
  if (!parsed.success) throw new FreeModelError('FreeModel returned an unexpected chat response.', 502);
  const content = extractText(parsed.data.choices[0].message.content);
  if (!content.trim()) throw new FreeModelError('The selected model returned an empty response.', 502);
  return content;
}
