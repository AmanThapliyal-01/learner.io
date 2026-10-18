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

## 2026-10-18 — M1 session
- Aman prefers pushback with sources on architecture asks (microservices → modular monolith, D-6). Present the trade-off and a recommended alternative, then let them decide.
- The C# API is a modular monolith. Module boundaries are enforced by `api/tests/Learner.ArchitectureTests`; run `dotnet test api/Learner.slnx` after any backend change.
- Vite dev gotcha: several quick edits to one file can leave the browser on a cached `?t=` module version. Touch the file and reload before trusting a UI test.
- Browser-pane screenshots can lag behind the DOM. Verify flows with page text and JS; use screenshots only for visuals.
- On this Windows machine Python defaults to cp1252. Always pass encoding='utf-8' when scripting file edits; a failed write truncated README once.
