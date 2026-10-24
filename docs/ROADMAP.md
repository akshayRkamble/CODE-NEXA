# NexaCode completion roadmap

This roadmap tracks the supplied product brief against the repository. A phase is complete only when its user-facing behavior and relevant verification are present.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Scaffold, shared packages, developer tooling | Partial: React/Vite, Express, TypeScript, PostgreSQL, Compose and CI exist; requested monorepo/shared package, lint/format tooling and app separation do not. |
| 2 | Futuristic design system and shell | Partial: responsive dark/light shell exists; requested reusable design system, command palette, motion, focus/reduced-motion audit and full visual direction remain. |
| 3 | Monaco editor workspace | Partial: Monaco, language mode, local draft, persisted font/language/theme settings, and basic shortcuts exist; tabs, file explorer, palette, Vim mode, and split view remain. |
| 4 | Judge0 execution | Mostly present: API forwards bounded runs to Judge0 and maps verdicts; mocked client/timeout tests and full integration verification remain. |
| 5 | Output and terminal experience | Partial: run/output and sample/hidden-test actions exist; stdin UI, resizable panel, clickable diagnostics, copy/clear, complete status details and terminal tabs remain. |
| 6 | SQL workbench | Mostly present: 50 exercises, SQLite worker, datasets, history, results and CSV/JSON export; EXPLAIN and live schema metadata remain. |
| 7 | Database and auth | Partial: PostgreSQL, bcrypt, JWT cookie, email auth, GitHub OAuth, notes, bookmarks and submission persistence exist; refresh flow, profile, migration tooling and comprehensive account sync remain. |
| 8 | 150-problem practice platform | Mostly present: 150 original prompts share the API/browser/MCP catalog; JS/TS use function wrappers and other Judge0 languages can run standalone JSON-stdin/JSON-stdout programs against visible and hidden cases. Tested JavaScript references are revealed after acceptance. Problem-specific wrappers and reference solutions for every language, plus complete result/progress UI, remain. |
| 9 | Progress and study plans | Partial: leaderboard and persisted plan enrollment exist; solved state is still local, and streak, difficulty, acceptance, heatmap, automatic task completion and leaderboard caching remain. |
| 10 | RAG tutor | Partial: ingestion, pgvector retrieval/evaluation, authenticated cited SSE tutor, and persisted learner feedback exist. Hybrid retrieval, richer source links, answer-quality evaluation and operational token controls remain. |
| 11 | MCP server and client | Partial: stdio/HTTP server, tools/resources/prompts and client configuration exist. Tutor-side MCP client/approval UI, remote audit log, rate limits per identity and full tool tests remain. |
| 12 | Polish, security, testing, deployment | Partial: CI, PWA shell, security middleware and deployment docs exist. Browser/API E2E, accessibility/performance targets, coverage and production deployment verification remain. |

## Execution order

1. Build the original problem catalog and reusable problem/test/solution format; migrate the browser and API to consume one catalog.
2. Add safe language execution and grading, then expand problem-specific function wrappers and reference solutions beyond JavaScript/TypeScript.
3. Complete account-backed progress, submissions, study-plan completion and dashboard summaries.
4. Finish the editor and SQL usability gaps, then complete auth/account synchronization.
5. Finish RAG quality controls and tutor feedback; add an MCP client with explicit approval and audit logging.
6. Close with automated API/component/browser coverage, accessibility/security review, and deployment validation.

The problem topic taxonomy follows common interview-preparation coverage such as the public [LeetCode Top Interview 150](https://leetcode.com/studyplan/top-interview-150/) and [NeetCode topic map](https://neetcode.io/). NexaCode problem statements, examples, hints, tests, and solutions must be authored independently; external lists are topic references only.
