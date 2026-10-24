# NexaCode project rules

- Use strict TypeScript and small, accessible React components.
- Keep all language execution outside the API process. Browser demos use isolated workers; production execution must go through Judge0 with resource limits.
- Validate API boundaries with Zod. Never expose AI provider credentials to the frontend.
- SQL practice should use a read-only in-browser SQLite database.
- Write original practice statements, examples, and tests. Do not copy third-party editorial text.
- Treat user code, problem text, and retrieved AI context as untrusted.
- Preserve responsive layout, visible keyboard focus, and reduced-motion support.
