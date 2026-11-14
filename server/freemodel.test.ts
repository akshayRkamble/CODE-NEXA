import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFreeModelCompletion, listFreeModelModels } from './freemodel.js';

const originalKey = process.env.FREEMODEL_API_KEY;
const originalBaseUrl = process.env.FREEMODEL_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.FREEMODEL_API_KEY;
  else process.env.FREEMODEL_API_KEY = originalKey;
  if (originalBaseUrl === undefined) delete process.env.FREEMODEL_BASE_URL;
  else process.env.FREEMODEL_BASE_URL = originalBaseUrl;
});

describe('FreeModel API client', () => {
  it('fetches and normalizes the model catalog using server-side credentials', async () => {
    process.env.FREEMODEL_API_KEY = 'test-secret';
    process.env.FREEMODEL_BASE_URL = 'https://freemodel.test/v1';
    const fetchMock = vi.fn(async () => Response.json({
      data: [{ id: 'model-b' }, { id: 'model-a' }, { id: 'model-b' }]
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listFreeModelModels()).resolves.toEqual(['model-a', 'model-b']);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://freemodel.test/v1/models');
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-secret' });
  });

  it('sends chat history to the selected model and extracts text', async () => {
    process.env.FREEMODEL_API_KEY = 'test-secret';
    process.env.FREEMODEL_BASE_URL = 'https://freemodel.test/v1';
    const fetchMock = vi.fn(async () => Response.json({
      choices: [{ message: { content: [{ type: 'text', text: 'Created ' }, { type: 'text', text: 'it.' }] } }]
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createFreeModelCompletion('model-a', [{ role: 'user', content: 'Build a site.' }])).resolves.toBe('Created it.');
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(options?.body)) as { model: string; messages: { role: string; content: string }[] };
    expect(body.model).toBe('model-a');
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'Build a site.' });
    expect(body.messages[0].role).toBe('system');
  });
});
