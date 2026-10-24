# Architecture

```text
Browser (React + Monaco)
  +- JavaScript demo runner ? short-lived Web Worker
  +- SQL workbench ? sql.js Web Worker + SQLite WASM
  +- /api ? Express + Zod
             +- PostgreSQL / pgvector: users, problems, submissions, notes, bookmarks, knowledge
             +- Judge0: isolated multi-language execution (optional service)
             +- AI provider: embeddings + streamed tutor answer (server-side only)

MCP clients ? stdio or Streamable HTTP MCP server
               +- problem service
               +- /api/run ? same Judge0 path
               +- in-memory sample SQLite
               +- pgvector retrieval
```

The browser JavaScript worker and SQL worker are local demo features. The API does not evaluate untrusted code itself. When Judge0 is unavailable, non-JavaScript runs return a configuration error. The database schema is in `db/init.sql`; frontend routes are Vite client-side view state rather than separate URL routes.
