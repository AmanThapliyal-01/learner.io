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

## 2026-10-18 — M4 session (polish)
- On Windows, call local services at 127.0.0.1, not localhost: .NET tries IPv6 ::1 first, and every refused attempt costs about 2s.
- A component's own `inline-flex` beats a `hidden` class passed in; wrap it in an element that carries the responsive visibility.
- In chat UIs, decide "follow the latest message" from scroll position before new content arrives, and jump instantly when history loads. A tall card makes the after-the-fact check fail, and smooth scroll stalls in background tabs.
- Keep internal labels (SKIP/REFRESH/FOCUS) out of prompts' user-facing text, or tell the model explicitly never to write them.
- When a heredoc'd Python script writes code, `\n` inside the replacement becomes a real newline. Prefer the Edit tool for small source edits.

## 2026-10-18 — Brand assets session (illustrations, OG card, promo video)
- OpenArt's Free plan watermarks every output with a large logo, and every video model costs more than the 40 free credits. Check `openart_account_get` first; treat Free-plan images as concept art and don't strip the watermark.
- Flat illustrations are cheaper and better as hand-written SVG: tiny, sharp, and an inner `@media (prefers-color-scheme: dark)` gives a dark palette. An `<img>` SVG can't see the app's `data-theme` override.
- `#svgView(viewBox(...))` on an SVG URL re-crops it without a second file (used for the OG card).
- `hyperframes capture` refuses localhost dev servers (reports an access-protection 403). Use the no-capture path and rebuild UI moments from the app's own components.
- Headless Chrome follows the OS colour scheme (this machine is dark), and Motion's scroll reveals may not have finished in a `--screenshot`. Don't trust it for light-mode marketing shots.
- Chrome `--screenshot` needs absolute paths and a `file:///` URL; a relative HTML path is read as a hostname.
- Inside a HyperFrames frame, a broad selector like `.opt span { position: relative }` beats `.sel { position: absolute }` and silently collapses overlays. Snapshot every frame before rendering.

## 2026-10-19 — Anbu live progress session
- LangGraph `astream(stream_mode="updates")` emits one update per parallel `Send` task as it finishes, so the worker can count finished phases. Keep the final document identical by reading it from the `assemble` update (a test compares it with `ainvoke`).
- Progress written by a background worker must be best-effort: wrap the write in a timeout and only update rows that are still Generating, so a late write never lands on a Ready or Archived plan.
- When the Claude window is hidden, the Browser pane stops `requestAnimationFrame` entirely (0 frames). Motion's route transitions never finish, clicks fail with "has not drawn yet", and a native `<dialog>` close event never fires. Drive the flow with full page loads and DOM checks, and take screenshots with headless Chrome over CDP (a small Node script with the built-in WebSocket; nothing to install).
- Don't rely on the `<dialog>` close event for side effects like pausing a video. Run them in your own close handler (button, backdrop, `onCancel` for Escape).
- Sibling sessions on other localhost ports share the auth cookie (cookies ignore the port), so one session's login or sign-out can log you out. Re-login and carry on, or use a separate headless profile.
- `form_input` doesn't trigger React's onChange for radios or controlled inputs here. Click the inputs, or set the value through the native setter and dispatch an `input` event.

## 2026-10-19 — Interactive landing page session
- Tailwind v4 utilities live in `@layer utilities`, so the unlayered global `:focus-visible` rule in index.css beats `focus-visible:outline-none`. Use the important suffix (`outline-none!`) when a control draws its own focus ring.
- A native range input laid over a bar works as "drag the bar" if the input is one thumb-width wider than the bar (`-mx-2.5 w-[calc(100%+1.25rem)]` for a 20px thumb); then the thumb centre lands exactly at level / max.
- When the desktop app's session window is hidden, the browser pane fires no `requestAnimationFrame`, so Motion animations and `useScroll` never update and screenshots time out or crop. For checking only, a temporary inline script in index.html that maps rAF to `setTimeout(16)` makes them run; remove it before committing. A `matchMedia` override behind a query flag fakes prefers-reduced-motion the same way.
- Looping showcase animations (agent handoff, step previews) need a visible Pause control, not just reduced-motion support: WCAG 2.2.2 covers auto-updating content longer than 5 seconds.
- Test accounts in the shared browser pane can be in use by another session (the Anbu account gained Asta messages mid-test). Sign up a fresh `@example.test` user for flows that need an empty state.
- 2026-10-19 (CI): astral-sh/setup-uv publishes no floating major tags since v8, so `@v10` fails at "Set up job". Pin an exact release by commit SHA. Check `gh api repos/<action>/git/matching-refs/tags/v` before assuming a `@vN` tag exists.
- 2026-10-19 (release check): CI with fake models can't catch prompt bugs. Run the full journey with real models before a release. Asta's goal card never showed because the extractor prompt didn't explain `target_outcome`/`goal_type`, so it left them null on every run. When a structured-output field is required for a code decision, describe it in the prompt with an example, and replay the failing transcript through the real extractor (3 runs) to confirm.
- 2026-10-19: Don't let an LLM-classified flag (`user_asked_question`) block a step the user needs. When everything is known, answer and show the card in the same turn.
- 2026-10-19 (browser pane): when the app window is hidden, the pane stops drawing, so Motion route transitions stall and screenshots time out. A screenshot forces a paint. This isn't an app bug; check `document` state with JS before reporting one.
- 2026-10-19 (dev): the uvicorn `--reload` on Windows can hang for minutes waiting on the old process. `timeout_graceful_shutdown` didn't fix it. Restart the agents server after Python changes, and don't trust that a reload happened until a new process logs "startup complete".
- 2026-10-19 (dev, fixed): the hang wasn't shutdown being slow. On Windows uvicorn's reloader stops the worker with `os.kill(pid, CTRL_C_EVENT)`, which never reaches it under a hidden console (desktop preview, background shell), so `join()` waits forever. `learner-agents` now uses a reloader that terminates the worker (about 3 s per reload). When a Windows child ignores a signal, test whether the console event arrives at all (a two-process spawn script) before tuning timeouts.
- 2026-10-19 (design review): selected states drawn only as a tint plus a border color fail "not by color alone". Use `choiceClass` and `ChoiceCheck` from `shared/ui` for any pick-one option: they add an inset ring and a check mark.
- 2026-10-19: don't trigger focus or other behavior from `requestAnimationFrame`. It never fires in a tab that isn't painting (a background tab or a hidden pane), so focusing a heading silently did nothing. Use timers.
- 2026-10-19: `AnimatePresence mode="wait"` on the route outlet held every navigation for exit plus enter (about 0.4 s). For frequent navigation, fade the new page in and skip exit animations.
