# NexaCode MCP server

The server uses the official TypeScript MCP SDK with stdio and Streamable HTTP transports. Build the API/MCP TypeScript, then configure an MCP client to launch `node dist-server/mcp.js` from the repository root, or start `npm run mcp:http` for local HTTP access.

## Tools

- `search_problems({query?, topic?, difficulty?})`: search the original starter problem set.
- `get_problem({slug})`: read a problem statement, example, topic, and hints.
- `run_code({language, code, stdin?})`: delegates to `POST /api/run`, which forwards only to Judge0. Ask the user before calling this tool.
- `run_sql({dataset, query})`: read-only SELECT/WITH query over a fresh in-memory sample SQLite database. Dataset names: Employees, Orders, Library.
- `get_user_progress({})`: requires `NEXACODE_USER_TOKEN`; the token scopes the returned data to its account.
- `recommend_next_problem({solvedSlugs})`: suggest an unsolved starter problem.
- `search_knowledge({query, topic?})`: semantic search over ingested knowledge chunks. Needs PostgreSQL, embeddings, and `DATABASE_URL`.

Resources include `problem://{slug}`, `dataset-schema://Employees`, and `study-plan://30-day`. Prompts include `review_my_solution`, `explain_error`, and `interview_mock_question`.

## VS Code

`.vscode/mcp.json` launches the local built server. The first start prompts for an API bearer token and a PostgreSQL URL; no credentials are committed. Build first with `npm run build:api`.

For Claude Desktop, use the stdio server entry in its MCP configuration with command `node`, argument `G:/RAG/CODE-EDITOR/dist-server/mcp.js`, and environment values `NEXACODE_API_URL`, `NEXACODE_USER_TOKEN`, and `DATABASE_URL`. Adjust the path and environment to your machine. Do not commit secrets.

Streamable HTTP is available through `npm run mcp:http`; it binds to loopback by default, rate-limits requests, and requires `MCP_AUTH_TOKEN` in production. Set `MCP_CLIENT_URL` to the server's `/mcp` endpoint for the tutor-side MCP client. The authenticated tutor can call `get_problem` and `search_knowledge`; `run_code` is gated by an explicit Allow/Deny confirmation in the UI and still executes only through Judge0.

Remote MCP tool calls are recorded in `mcp_tool_audit` with the tool name, actor, outcome, duration, and a redacted input summary. Source code, SQL text, knowledge queries, and other free-form input values are never stored in the audit record. Remote MCP requires `DATABASE_URL` so audit events can be persisted. Configure a separate `MCP_PROXY_TOKEN` in both the API and MCP service for authenticated user attribution; actor headers without this proxy credential are recorded as `remote`. The HTTP server enforces a per-IP request limit; tutor calls have a separate authenticated per-user limit.
