# API overview

All routes use the `/api` prefix. JSON bodies are validated with Zod, request sizes are capped, and execution has a separate rate limit.

| Method | Path | Auth | Purpose |
|---|---|---:|---|
| GET | `/health` | No | API, database, and Judge0 status |
| POST | `/auth/register` | No | Create account and set httpOnly session cookie |
| POST | `/auth/login` | No | Sign in |
| POST | `/auth/logout` | No | Clear session |
| GET | `/auth/me` | Yes | Current profile |
| GET | `/problems` | No | Search/filter/paginate starter problems |
| GET | `/problems/:slug` | No | Problem statement |
| GET | `/problems/:slug/solution` | Yes | Reference solution after an accepted submission |
| POST | `/run` | No | Bounded run through the configured Judge0/Piston runner |
| POST | `/problems/:slug/run` | No | Visible sample tests for supported problems |
| POST | `/problems/:slug/submit` | Yes | Hidden tests, persist verdict |
| GET | `/progress` | Yes | Accepted counts and topic summary |
| GET | `/submissions/recent` | Yes | Recent account submissions |
| GET/POST/DELETE | `/bookmarks[/:slug]` | Yes | Account bookmarks |
| GET/PUT | `/notes/:slug` | Yes | Account problem notes |
| GET | `/leaderboard` | No | Accepted distinct problems in the last seven days |
| GET | `/study-plans[/:id]` | No | 30/60 day starter schedules |
| GET | `/study-plans/me` | Yes | Current account's enrolled plan and start date |
| PUT | `/study-plans/me` | Yes | Start or restart a 30/60 day plan |
| POST | `/ai/ask` | Yes | SSE tutor response and source events |

`POST /run` accepts JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, and Kotlin. Non-JavaScript programs receive the submitted stdin and must print their result to stdout. Problem runs/submissions provide each test case as a JSON object on stdin for standalone languages; JavaScript/TypeScript solutions use the problem's named-function contract.

The AI tutor endpoint is intentionally unavailable without a configured database, ingested chunks, and provider settings.
