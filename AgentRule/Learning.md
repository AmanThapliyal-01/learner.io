# Learnings

## 2026-10-18 — PRD session
- Aman wants the request restated (goal + assumptions) and confirmed before any work starts.
- Push back with sources when the stack choice is off. This session: "LINQ as ORM" became EF Core + LINQ, and Auth.js became ASP.NET Core Identity (Auth.js is JS-only).
- Secrets live in `confidentials.md` (git-ignored). Never echo key values; move them into git-ignored `.env` files when building.
- Agent rules reference `Sprout\AgentRule\...`; in this repo that path is `AgentRule/`.
- Check what the Groq key can actually call (`models.list()`) before designing around a model. Llama models are Enterprise-only on this key.
- gpt-oss models use output tokens for reasoning. A small `max_tokens` returns empty content.
- Port 5432 is already in use on this machine, so the dev Postgres runs on 5433.
- `AddIdentityCore` + `AddDefaultTokenProviders` needs `AddDataProtection()`. EF design-time startup validation catches it.
