# NexaCode

NexaCode is a browser coding workspace and interview practice platform, built in stages from the supplied product brief. The current repository contains a React/Vite frontend, a TypeScript API, PostgreSQL persistence, an in-browser SQLite workbench, optional Judge0 execution, a cited RAG tutor, and stdio plus Streamable HTTP MCP servers.

## Local setup

Requirements: Node.js 20+, npm, and Docker Desktop with Compose. Run `npm test` for core unit checks and `npm run build` for a production build.

1. Install dependencies: `npm install`
2. Create local config: `Copy-Item .env.example .env`
3. Start the app database: `docker compose up -d postgres`
4. Start both apps: `npm run dev`
5. Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The Express API runs at `http://localhost:4000`; Vite proxies `/api` requests to it.

The development API explicitly runs in development mode, so a `NODE_ENV=production` inherited from the shell or editor does not disable the locally configured Piston runner. Production deployments should continue to start the API with `npm run start:api`.

Postgres starts from `db/init.sql` with the user, problem, submission, notes, bookmark, study-plan, and pgvector knowledge tables. The API seeds its current starter problems when it connects. If you already have a Postgres volume from an earlier schema, apply the SQL additions in `db/init.sql` manually or recreate only your local dev volume.

## Optional services

### Sandboxed multi-language execution

All editor languages run through the API and an isolated runner; user code is never evaluated in Express. For local development, start the included Piston service with `docker compose --profile piston up -d piston`; `.env.example` selects it at `http://localhost:2000`. Piston is restricted to non-production environments. Production always uses Judge0.

The standalone Editor is for small projects and code experiments: add files, choose a language, use the built-in project examples, and run the active file. Its terminal focuses on compiler diagnostics and program output instead of algorithm complexity scores or runtime/memory metrics. Practice problems remain a separate area with sample and hidden-test scoring.

Standalone Editor accepts source files up to 256 KiB and uses a separate sandbox budget (up to 60 seconds to compile, 30 seconds to run, and 512 MiB) without scoring or comparing algorithm complexity. Runs that exceed sandbox safety limits are stopped; these are resource-safety protections, not complexity grading. Practice run and submit limits remain unchanged. The included Piston configuration supports this budget. The example Judge0 configuration sets matching maxima; existing deployments must update their Judge0 limits and restart its services to use the larger editor budget.

To run Judge0 locally or in production:

1. Copy `judge0.conf.example` to `judge0.conf` and replace all placeholder passwords/tokens.
2. Put the same Judge0 authentication token in `.env` as `JUDGE0_AUTH_TOKEN`, and set `JUDGE0_URL=http://localhost:2358`.
3. Set `CODE_RUNNER=judge0`.
4. Start the Judge0 profile: `docker compose --profile execution up -d judge0-db judge0-redis judge0-server judge0-worker`.

Judge0 requires privileged containers for its isolation runtime. Keep its API bound to localhost behind the NexaCode API. The included configuration disables user code network access and compiler/command-line overrides. Judge0's official Compose deployment uses separate server, worker, PostgreSQL, and Redis services; this repository follows that layout ([official Judge0 Compose file](https://github.com/judge0/judge0/blob/master/docker-compose.yml)).

### AI Tutor and knowledge ingestion

The AI tutor requires a configured OpenAI-compatible chat/embedding provider, or local Ollama. Add provider settings to `.env`; `AI_API_KEY` stays on the server. The vector store has 1536 dimensions; smaller local embedding vectors are zero-padded, preserving cosine similarity.

```sh
npm run ingest
```

Ingestion reads Markdown in `data/knowledge`, splits it with overlap, skips files whose content and embedding provider/model are unchanged, and stores embeddings in pgvector. The tutor endpoint is authenticated, rate-limited, streams SSE events, includes source labels, treats retrieved material and code as untrusted, redacts common secret formats, and declines when retrieved context is weak.

### AI chat

The Chat workspace uses FreeModel's OpenAI-compatible API and lists every model exposed by its `/v1/models` endpoint. Set `FREEMODEL_API_KEY` in the local `.env` file; the key remains on the API server and is never sent to the browser. `FREEMODEL_BASE_URL` defaults to `https://freemodel.in/v1`. Chat conversations are saved in the current browser's local storage and can be reopened from the Chat section. Provider usage and availability follow your FreeModel account limits.

### MCP

`npm run mcp` starts the local stdio server for an MCP client. Build first if using the generated executable: `npm run build:api`. `npm run mcp:http` starts the Streamable HTTP endpoint on localhost port 4001. Set `MCP_AUTH_TOKEN` before binding it to a network interface and restrict `MCP_ALLOWED_ORIGINS`. The VS Code connection example is in `.vscode/mcp.json`; see [docs/MCP.md](docs/MCP.md) for tools and transport setup. MCP clients should request user consent before calling `run_code`.

## Implemented now

- VS Code-inspired Monaco workspace for small local projects, with file creation and switching, JavaScript/Python project examples, language selection for all 12 practice languages, editable stdin, sandboxed Run, and responsive light/dark themes. Practice problems remain available in the separate Practice workspace.
- 150 original practice problems, topic and difficulty search, progressive hints, local notes/bookmarks, and progress view.
- Code execution for all 12 languages goes through the configured isolated code runner; the Express API never evaluates user code itself.
- SQLite WASM in a Web Worker with sample employee/order/library tables, query history, result grid, read-only filtering, and CSV/JSON export.
- Express API with Zod validation, security headers, CORS allowlist, request/rate limits, bcrypt password hashing, httpOnly JWT cookies, email/password and GitHub OAuth sign-in, and persistent notes/bookmarks/submissions/progress endpoints.
- Judge0 adapter with CPU/memory bounds and verdict mapping.
- RAG ingestion/retrieval, streaming tutor route with citations, and tutor panel.
- MCP tools for problem search/details, Judge0 runs, read-only SQL, user progress, recommendations, and knowledge search; problem/schema/study-plan resources and three prompt templates.
- Authenticated tutor-side MCP calls for problem and knowledge lookup, with explicit Allow/Deny confirmation before code execution; remote tool calls are rate-limited and recorded with redacted input summaries.
- CI workflow for typecheck and production builds.

## Not complete yet

This is not yet the entire product scope in the brief. All 150 interview problems have JavaScript/TypeScript function-based visible and hidden tests plus tested JavaScript reference solutions. Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, and Kotlin problem runs/submissions use a standalone-program contract: each test case is provided as one JSON object on stdin, and the program must print its JSON result to stdout. The editor provides language-specific starter scaffolds; reference solutions are currently JavaScript only. GitHub OAuth is implemented by stable GitHub account ID; configure its three `GITHUB_*` values and register the exact callback URL. The SQL workbench includes 50 prompt/reference-query exercises against a small synthetic dataset. The account study-plan schedule, weekly leaderboard, streaming cited tutor, and retrieval hit-rate evaluation are implemented. Tutor MCP tools are currently user-triggered rather than selected autonomously by an LLM agent; broader automated tests and cross-language function wrappers remain. The sample SQL datasets are intentionally small. Local browser storage is retained as a fallback; account sync is not wired into every UI element yet.

No user code is run in the Express process. The in-browser JavaScript Worker is useful for a demo, but production isolation for arbitrary code depends on a correctly secured Judge0 deployment.



### GitHub sign-in

Create a GitHub OAuth App with callback URL `http://localhost:4000/api/auth/github/callback`, then set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and the exact `GITHUB_CALLBACK_URL` in `.env`. Production must use its HTTPS callback URL. GitHub identities are stored by GitHub account ID; an email match alone never links accounts.

### Google sign-in

Create an OAuth 2.0 Client ID of type **Web application** in Google Cloud Console. Add `http://localhost:4000/api/auth/google/callback` as an authorized redirect URI for local development. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_CALLBACK_URL` in `.env`, then restart the API. For production, use the exact HTTPS callback URL registered in Google Cloud. Only verified Google email addresses are accepted, and existing accounts are not automatically linked by email.

#### Execute A Project ######
npm install
docker compose up -d postgres
npm run dev

####
