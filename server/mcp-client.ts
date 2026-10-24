import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';

const toolSchemas = {
  search_problems: z.object({
    query: z.string().max(200).optional(),
    topic: z.string().max(80).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional()
  }),
  get_problem: z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/) }),
  search_knowledge: z.object({ query: z.string().trim().min(1).max(1000), topic: z.string().max(100).optional() }),
  run_sql: z.object({ dataset: z.enum(['Employees', 'Orders', 'Library']), query: z.string().trim().min(1).max(10000) }),
  run_code: z.object({
    language: z.enum(['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'kotlin']),
    code: z.string().min(1).max(64000),
    stdin: z.string().max(10000).optional()
  })
} as const;

export type TutorMcpTool = keyof typeof toolSchemas;

export function parseTutorMcpToolInput(toolName: string, input: unknown): { toolName: TutorMcpTool; arguments: Record<string, unknown> } {
  if (!(toolName in toolSchemas)) throw Object.assign(new Error('This MCP tool is not available in the tutor.'), { status: 400 });
  const name = toolName as TutorMcpTool;
  const parsed = toolSchemas[name].parse(input);
  return { toolName: name, arguments: parsed };
}

export function requireExplicitApproval(toolName: TutorMcpTool, approved: boolean): void {
  if (toolName === 'run_code' && !approved) {
    throw Object.assign(new Error('Approve this code execution in the tutor before running it.'), { status: 403 });
  }
  if (toolName !== 'run_code' && approved) {
    throw Object.assign(new Error('Approval is only valid for the code execution tool.'), { status: 400 });
  }
}

export async function callTutorMcpTool(
  toolName: TutorMcpTool,
  args: Record<string, unknown>,
  actorId: string
): Promise<unknown> {
  const endpoint = process.env.MCP_CLIENT_URL || 'http://127.0.0.1:4001/mcp';
  const token = process.env.MCP_AUTH_TOKEN;
  const proxyToken = process.env.MCP_PROXY_TOKEN;
  if (process.env.NODE_ENV === 'production' && !token) {
    throw Object.assign(new Error('MCP_AUTH_TOKEN must be configured before tutor MCP calls are enabled.'), { status: 503 });
  }
  const headers: Record<string, string> = { 'X-NexaCode-Actor': actorId };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (proxyToken) headers['X-NexaCode-Proxy-Token'] = proxyToken;

  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers }
  });
  const client = new Client({ name: 'nexacode-tutor', version: '0.1.0' });
  try {
    await client.connect(transport);
    return await client.callTool({ name: toolName, arguments: args });
  } finally {
    await client.close();
  }
}
