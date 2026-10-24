# Deployment guide

## Frontend

Run `npm run build`; publish the generated `dist/` folder on a static host such as Vercel. Configure the static host to rewrite `/api/*` to the API service and serve `index.html` for navigation paths. The service worker caches the app shell after the first visit; API-backed features remain online-only.

## API and PostgreSQL

Deploy `dist-server/` with Node.js 20+ and `npm run build:api` in CI. Set `DATABASE_URL`, a high-entropy `JWT_SECRET`, `WEB_ORIGIN`, and `NODE_ENV=production`. Set `PORT` to the host-provided port. Apply `db/init.sql` to a fresh pgvector-enabled PostgreSQL database before starting the API. Use TLS for all public connections, backups, and a least-privilege database user.

Use a separate managed or Docker-based host for PostgreSQL and Judge0. The included Compose setup is intended for local development. Do not expose Judge0 directly to the public internet; allow access only from the API network, keep its authentication token private, disable sandbox networking, and apply host-level resource limits.

## Judge0

Configure `JUDGE0_URL` and `JUDGE0_AUTH_TOKEN` on the API. Review `judge0.conf.example`, change every placeholder, and keep the execution endpoint private. The frontend never receives the Judge0 token. Verify your deployment's CPU, memory, process, network, and queue limits before accepting untrusted code.

## AI provider

Set `AI_BASE_URL`, `AI_MODEL`, `EMBEDDING_MODEL`, `RAG_PROVIDER`, and server-only `AI_API_KEY` (or configure Ollama on a private network). Install the database vector extension and run `npm run ingest`. Set provider spend limits and review the provider's data-retention terms before enabling the tutor for users. Code and questions are sent to that provider when the tutor is used.

## MCP remote transport

Keep stdio for local clients where possible. If enabling Streamable HTTP, set `MCP_AUTH_TOKEN`, restrict `MCP_ALLOWED_ORIGINS`, terminate HTTPS at a trusted proxy, rate-limit the route, and audit calls. The current implementation binds to loopback by default. Do not bind it publicly without those controls.

## CI status

`.github/workflows/ci.yml` runs dependency installation, TypeScript typechecking, and production builds. Automated unit, integration, retrieval-evaluation, and browser E2E suites still need to be added before production release.
