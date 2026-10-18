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

## 2026-10-18 — M2 session (Asta)
- Don't let a chat LLM decide when structured data is complete. Extract with structured output, then decide in code. Tool-owned "finalize" calls on gpt-oss guessed values, printed JSON, or claimed to summarise without doing it.
- Groq built-in browser_search costs about 6.8K tokens per call (85% of the 8K TPM). Use it sparingly.
- uvicorn --reload can miss newly added modules. Restart the agents server after adding files or routers.
- Measure live LLM behaviour with a scripted multi-turn probe (in the scratchpad) before wiring the UI; it found 4 prompt and flow bugs that unit tests couldn't.

## 2026-10-18 — M3 session (skill check + planner)
- Groq validates tool-call arguments against the JSON schema and returns 400 if any field breaks it. Keep LLM-facing schemas loose (no maxLength or maxItems) and trim in code. This alone fixed most planner failures.
- Spread parallel LLM calls across different models (rotate the fallback chain) to multiply the per-minute token budget. The planner went from 209s to about 10s.
- Background LLM work should wait out short rate limits (`patiently`) instead of failing; user-facing work should fail fast with a retry time.
- TanStack Query: `refetchInterval` as a function only re-arms after a fetch. After `setQueryData`, also invalidate to start polling.
- On Windows, psycopg's async mode can't use the default Proactor event loop. Run sync psycopg in `asyncio.to_thread`.
- Python on Windows writes cp1252 by default. Set PYTHONIOENCODING=utf-8 for scripts that pass model text (which is full of U+2011 hyphens) around.
