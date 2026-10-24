import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './mcp.js';
import { parseTutorMcpToolInput, requireExplicitApproval } from './mcp-client.js';
import { summarizeToolInput } from './mcp-audit.js';

describe('tutor MCP tool validation', () => {
  it('allows only supported tools and validates their arguments', () => {
    expect(parseTutorMcpToolInput('get_problem', { slug: 'pair-sum' })).toEqual({
      toolName: 'get_problem',
      arguments: { slug: 'pair-sum' }
    });
    expect(() => parseTutorMcpToolInput('delete_user', {})).toThrow('not available');
    expect(() => parseTutorMcpToolInput('get_problem', { slug: '../users' })).toThrow();
  });

  it('requires explicit approval only for code execution', () => {
    expect(() => requireExplicitApproval('run_code', false)).toThrow('Approve this code execution');
    expect(() => requireExplicitApproval('run_code', true)).not.toThrow();
    expect(() => requireExplicitApproval('get_problem', true)).toThrow('only valid for the code execution');
    expect(() => requireExplicitApproval('search_knowledge', false)).not.toThrow();
  });
});

describe('remote MCP audit redaction', () => {
  it('stores safe selectors but only lengths for free-form input', () => {
    expect(summarizeToolInput({
      slug: 'pair-sum',
      language: 'javascript',
      code: 'const secret = "private";',
      query: 'SELECT confidential FROM users',
      stdin: 'private input'
    })).toEqual({
      slug: 'pair-sum',
      language: 'javascript',
      code: { type: 'string', length: 25 },
      query: { type: 'string', length: 30 },
      stdin: { type: 'string', length: 13 }
    });
  });

  describe('MCP server client connection', () => {
    it('lets the tutor client call a read-only problem tool', async () => {
      const server = createServer();
      const client = new Client({ name: 'nexacode-test-client', version: '0.1.0' });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      try {
        const result = await client.callTool({ name: 'get_problem', arguments: { slug: 'pair-sum' } });
        expect(result.isError).not.toBe(true);
        expect(result.content).toEqual(expect.arrayContaining([
          expect.objectContaining({ type: 'text', text: expect.stringContaining('Pair Sum') })
        ]));
      } finally {
        await client.close();
        await server.close();
      }
    });
  });
});
