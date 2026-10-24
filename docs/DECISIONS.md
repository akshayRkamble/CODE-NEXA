# Decisions

- **React + Vite + TypeScript:** a fast browser app with a strict type boundary and straightforward static hosting.
- **Monaco:** provides VS Code editing features without rebuilding an editor control.
- **PostgreSQL + pgvector:** account data and retrieval chunks can share one database.
- **Judge0:** API code never executes submitted programs. Judge0 provides the isolated multi-language runtime; keep its endpoint private.
- **sql.js:** SQL exercises work offline in a worker and use an in-memory sample database.
- **Browser storage fallback:** drafts and early progress work without an account; account endpoints persist notes, bookmarks, and accepted submissions when PostgreSQL is configured.
- **Provider-compatible RAG:** API keys remain on the server; retrieved material and submitted code are treated as untrusted, sources are sent as citations, and weak retrieval is declined.
- **MCP stdio first:** local AI clients can launch the tool server without exposing an endpoint. Streamable HTTP is available as an optional authenticated transport.
