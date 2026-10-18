# learner.io — Product Requirements Document (MVP)

| | |
|---|---|
| **Status** | Draft v1, awaiting approval |
| **Owner** | Aman Thapliyal |
| **Date** | 18 Oct 2026 |
| **MVP deadline** | Tue 20 Oct 2026, EOD |
| **Sources** | [Idea.md](Idea.md), [Flow.md](Flow.md), [AgentRule/](AgentRule/Agents.md) |

---

## 1. Problem

AI is moving fast and creators keep saying "learn this, learn that", sometimes with step-by-step guides. That advice is generic. It doesn't know the viewer's current level, so people who follow it often don't get the result they wanted.

## 2. Product vision

**learner.io** builds a personalized learning plan. The user says what they want to become or learn: a profession, one skill, or a set of skills. The product then measures where they actually are (a self-rating checked by an assessment) and creates a plan that covers only the gap between the two.

**Core differentiator:** the plan is built from *assessed* knowledge, not assumed knowledge.

## 3. Goals and non-goals

### Goals (MVP)
1. A working end-to-end path: landing page, sign-up/login, profile, chat with **Asta**, skill assessment, background plan generation, plan on the dashboard.
2. Asta clarifies vague goals, including suggesting what to learn for career growth based on current market trends.
3. Plans are tailored to the assessed level, available time, and learning preferences.
4. A plan becomes **stale after 30 days** and can be regenerated.
5. A modern UI with smooth transitions (not a basic static UI), reviewed against `/apple-design`.

### Non-goals (MVP)
- Progress tracking and check-ins
- Payments and subscriptions
- A mobile app (the web app is responsive only)
- Languages other than English
- More than one plan per user
- Uploading work samples (for example, a painting) for assessment
- Email verification and password reset emails (stretch goal; see §11)

## 4. Users

| Persona | Example | Need |
|---|---|---|
| **Career grower** | Backend dev, 3 yrs, wants to move into AI engineering | A plan that skips what they already know and covers market-relevant gaps |
| **Career explorer** | Professional who knows they want to grow but not in which direction | Suggestions for what to learn, based on their profile and the market |
| **Hobby learner** | Wants to learn drawing or painting | A structured path matched to their real starting level |

## 5. User flow

```
Landing ─► Sign up / Login (email+password or Google)
        ─► Basic info form (required)
        ─► Detailed profile (optional, skippable, editable later)
        ─► Dashboard (empty state: "Chat with Asta to build your plan")
        ─► Chat with Asta ── goal clear? ──yes──► Confirm goal summary
                               │no
                               ├─ Professional ─► ask for professional summary if missing
                               │                  ─► Asta asks a few questions + web search
                               │                  ─► suggests skills ─► user picks ─► confirm goal
                               └─ Non-professional ─► ask about the field/interest ─► narrow down ─► confirm goal
        ─► Self-rating per skill (1–5)
        ─► Assessment (generated from the self-ratings)
        ─► Plan job queued ─► "Our agent is creating your plan; it'll be ready shortly"
        ─► Plan ready on dashboard
        ─► (after 30 days) "Plan is stale" ─► Regenerate
        ─► (anytime) Change goal ─► back to Asta ─► re-assess ─► new plan replaces old
```

## 6. Functional requirements

### 6.1 Landing page
- FR-1: Hero section explaining the product, a "how it works" section (3–4 steps), and a call to action.
- FR-2: "Get started" (sign up) and "Log in" buttons in the header and hero.
- FR-3: Animated, polished visuals (scroll-reveal, micro-interactions); responsive down to 360px.

### 6.2 Authentication
- FR-4: Sign up and log in with email + password.
- FR-5: Sign in with Google (OAuth 2.0).
- FR-6: Session-based auth with secure HttpOnly cookies; log out.
- FR-7: All access checks are enforced centrally in middleware, not per endpoint (guardrail).

### 6.3 Onboarding
- FR-8: **Basic info (required):** full name, country, age range, current status (student / working / career break / other).
- FR-9: **Detailed profile (optional, skippable):** profession / job title, years of experience, education, certifications, existing skills, hobbies, professional summary. Editable from a profile page at any time.

### 6.4 Dashboard
- FR-10: Empty state that invites the user to chat with Asta.
- FR-11: Shows exactly one of these states: *no goal* → *goal in progress (chat / rating / assessment)* → *plan generating* → *plan ready* → *plan stale* → *plan failed (retry)*.
- FR-12: "Change goal" is always available. It asks for confirmation, because the current plan will be replaced.

### 6.5 Asta (chat agent)
- FR-13: Live streaming chat. Tone is friendly; answers are short and sharp, never padded.
- FR-14: Asta gathers these **requirements** before finishing:
  1. Goal type: professional or personal/hobby
  2. Target: profession / skill(s) / outcome ("what does success look like?")
  3. Motivation (why now)
  4. Time available per week
  5. Target timeline / deadline (optional)
  6. Learning preferences: video / reading / hands-on / mixed
  7. Budget for resources: free only / paid OK
  8. The list of concrete skills to assess (Asta proposes; the user can edit)
- FR-15: **Unclear professional goal:** if the profile has no professional summary, Asta asks for it (inline in chat). It then asks 2–4 targeted questions and uses **web search** to suggest 3–5 in-demand skills or directions that fit the user's background.
- FR-16: **Unclear personal goal:** Asta asks which area interests them (art, music, fitness, languages…) and narrows it down to concrete skills.
- FR-17: When the requirements are complete, Asta shows a **goal summary card** (via a structured tool call). The user confirms or edits it before moving on.
- FR-18: Chat history is saved per goal, so a page reload resumes the conversation.
- FR-19: Asta refuses off-topic or unsafe requests politely and steers back to learning.

### 6.6 Skill assessment
- FR-20: **Self-rating:** for each skill in the confirmed goal (max **6** skills in the MVP), the user rates themselves 1–5 (Never used → Beginner → Intermediate → Advanced → Expert). A rating of 1 skips the assessment for that skill.
- FR-21: **Generated assessment:** for each rated skill, 4–6 questions pitched at the self-rated level: multiple choice plus 1–2 short-answer or scenario questions. For practical or creative skills (for example, painting), it uses scenario and knowledge questions. *The assessment type may change after the MVP.*
- FR-22: Answer keys never reach the browser. Grading happens on the server: MCQs are checked deterministically and short answers are graded by the LLM with a rubric.
- FR-23: **Result per skill:** assessed level (1–5), strengths, gaps, and a one-line explanation. The user sees this summary before plan generation starts.

### 6.7 Plan generation (background agent)
- FR-24: Confirming the assessment results queues a **plan job** in the database. The UI shows "Our agent is creating your plan; it'll be ready shortly" with an animated state, and checks status every few seconds.
- FR-25: The planner agent receives: profile, goal summary, self-ratings, assessment results (levels, strengths, gaps), time per week, preferences, and budget.
- FR-26: **Plan content:**
  - Overview: goal, starting point, target, total estimated duration
  - Phases (ordered), each with: title, duration (weeks), objectives, topics, practice / mini-project, milestone ("you're done with this phase when…")
  - Suggested resources per phase, matched to preference and budget. Links are included only when they come from web search results, so no links are hallucinated.
  - Skills the user already knows well are explicitly marked "skip / refresh only"
- FR-27: Output is validated against a JSON schema. On invalid output it retries (up to 2 times); after that the job fails and the UI offers "Retry".
- FR-28: Typical generation time is under 90 seconds; the job times out at 5 minutes.

### 6.8 One plan per user, staleness and regeneration
- FR-29: A user has at most **one** active goal and **one** plan. Changing the goal archives the old goal and plan (kept in the DB, not shown) and restarts the flow from Asta.
- FR-30: A plan is **stale** 30 days after generation. The dashboard shows a "stale" badge and a **Regenerate** button.
- FR-31: Regenerate reuses the confirmed goal and the latest assessment. The user can optionally retake the assessment first. Regenerate is only offered when the plan is stale or generation failed.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Secrets only in `.env` / user-secrets (never committed); HttpOnly + Secure + SameSite cookies; CSRF protection; the Python agent service accepts only internal calls with a shared service token; rate limits on chat and auth endpoints |
| Performance | Chat first token < 1.5s (Groq); dashboard loads < 1s locally |
| Reliability | Job queue with retries, timeout, and recovery of stuck jobs (`locked_at` lease) |
| UX | Smooth transitions and animations throughout; eye-friendly palette; light + dark mode; accessible (WCAG AA contrast, keyboard navigation) |
| Code quality | A defined architecture per service (§8.2); reusable components and generic methods; no duplicated logic (guardrails) |
| Observability | Structured logs in all three services; LLM token usage logged per call |

## 8. Technical architecture

### 8.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React + TypeScript (Vite)**, React Router, TanStack Query, Tailwind CSS, Framer Motion | Framer Motion handles the smooth transitions |
| Backend API | **C# / ASP.NET Core (.NET 10)** | .NET 10 SDK is installed locally |
| ORM | **Entity Framework Core + Npgsql**; queries written in **LINQ** | See decision D-1 |
| Auth | **ASP.NET Core Identity + Google OAuth** (`Microsoft.AspNetCore.Authentication.Google`) | See decision D-2 |
| Agents | **Python 3.12, FastAPI, LangGraph / LangChain** (`langchain-groq`) | Managed with `uv` |
| LLM | **Groq** (OpenAI-compatible API at `https://api.groq.com/openai/v1`) | See §8.4 |
| Web search | **Groq built-in browser search** (gpt-oss models); fallback: Brave Search API | See decision D-3 |
| Database | **PostgreSQL 16** in Docker | Also hosts the job queue |
| Local dev | `docker compose` for Postgres; each service runs locally | Deployment is out of scope for this deadline unless you request it |

### 8.2 Services and structure

```
learner.io/
├─ web/          React SPA ─────────── feature-based (features/auth, onboarding, chat, assessment, plan, landing)
├─ api/          ASP.NET Core ─────── Modular monolith on Clean Architecture (see §8.2.1)
│   ├─ Learner.Domain          Common/ + one folder per module: Profiles/, Learning/, Plans/
│   ├─ Learner.Application     Common/, Contracts/<Module>/ (public module APIs), Identity/, Profiles/,
│   │                          Learning/, Plans/, Dashboard/ (composes modules via contracts only)
│   ├─ Learner.Infrastructure  EF Core DbContext (one schema per module) + migrations, Identity, agent-service client
│   ├─ Learner.Api             controllers, middleware (auth, CSRF, errors, rate limiting), SSE proxy
│   └─ tests/Learner.ArchitectureTests   NetArchTest rules that fail when a module boundary is crossed
├─ agents/       Python FastAPI ───── feature-based modules
│   ├─ asta/          LangGraph chat graph + tools (web_search, finalize_goal)
│   ├─ assessment/    question generation + grading
│   ├─ planner/       plan generation graph (research → draft → validate)
│   ├─ worker/        DB job-queue poller
│   └─ core/          Groq client factory, config, schemas, auth middleware
└─ docker-compose.yml
```

**Request paths**
- **Browser → API only.** The SPA never calls the Python service directly.
- **Chat:** Browser ⇄ API (SSE) ⇄ Agents `/asta/stream` (SSE). The API stores user and assistant messages.
- **Assessment:** API → Agents `/assessment/generate`, `/assessment/grade` (synchronous). The API stores questions and answer keys server-side.
- **Plan:** API inserts a row into `jobs` → the Python **worker** claims it (`SELECT … FOR UPDATE SKIP LOCKED`) → generates the plan → writes `plans.content` and sets `status = ready` → the SPA polls the API for status.
- **Schema ownership:** EF Core migrations own the whole schema. Python only reads and writes `queue.jobs` and `plans.plans` using plain SQL.

#### 8.2.1 API modules (modular monolith)

The C# API is one deployable split into four strict feature modules. Any module can later become its own service without a rewrite.

| Module | Owns (Postgres schema) | Public contract |
|---|---|---|
| Identity | `identity.*` (users, logins, tokens) | Uses `IIdentityService` internally; consumes `IProfilesModule` |
| Profiles | `profiles.user_profiles` | `IProfilesModule`: create profile, profile summary |
| Learning | `learning.*` (goals, chat, ratings, assessments) | `ILearningModule`: active goal |
| Plans | `plans.plans` (+ enqueues on shared `queue.jobs`) | `IPlansModule`: active plan and its phase |

**Rules (enforced by `Learner.ArchitectureTests`):**
- A module may use another module only through `Learner.Application.Contracts.<Module>`, never its services, entities or data.
- Each module reaches the database only through its own interface (`IProfilesDb`, `ILearningDb`, `IPlansDb`).
- There are no foreign keys across module schemas; modules refer to each other by id only.
- Contracts expose no module internals (no domain entities or enums).
- Cross-module read models, such as the Dashboard, compose contracts only.

### 8.3 Data model (initial)

| Table | Key fields |
|---|---|
| `identity.users` (+ Identity tables) | Identity defaults |
| `profiles.user_profiles` | user_id, full_name, country, age_range, current_status, profession, years_experience, education, certifications[], skills[], hobbies[], professional_summary, onboarding_completed |
| `learning.goals` | id, user_id, type (professional/personal), title, summary (jsonb), time_per_week, timeline, preferences (jsonb), status (chatting/rating/assessing/confirmed/archived), created_at |
| `learning.chat_messages` | id, goal_id, role, content, tool_payload (jsonb), created_at |
| `learning.skill_ratings` | goal_id, skill, self_rating |
| `learning.assessments` | id, goal_id, status, results (jsonb), completed_at |
| `learning.assessment_questions` | id, assessment_id, skill, kind (mcq/short), prompt, options (jsonb), answer_key (server-only), user_answer, score, feedback |
| `plans.plans` | id, user_id (unique where active), goal_id, status (queued/generating/ready/failed/archived), content (jsonb), generated_at, error |
| `queue.jobs` | id, type, payload (jsonb), status, attempts, locked_at, last_error, created_at |

### 8.4 LLM models and rate-limit fallback (Groq)

Groq limits each model separately per organization: requests per minute and per day, and tokens per minute and per day. Developer-tier numbers for gpt-oss and qwen are 30 RPM, 1K RPD, 8K TPM and 200K TPD ([Groq rate limits](https://console.groq.com/docs/rate-limits)). When one model's daily quota runs out, the next model still has its own.

Every LLM call in the agents service goes through **`FallbackChatGroq`** ([agents/src/learner_agents/core/llm/](agents/src/learner_agents/core/llm/fallback.py)). It's a drop-in LangChain chat model, so it works with LangGraph, `bind_tools` and `with_structured_output`.

**Fallback chain (5 slots, in order):**

| # | Model | Built-in web search | Available to the current key |
|---|---|---|---|
| 1 | `openai/gpt-oss-120b` | ✅ | ✅ |
| 2 | `qwen/qwen3.8-27b` | — | ✅ |
| 3 | `openai/gpt-oss-20b` | ✅ | ✅ |
| 4 | `llama-3.3-70b-versatile` | — | ❌ Enterprise tier |
| 5 | `llama-3.1-8b-instant` | — | ❌ Enterprise tier |

**Behaviour:**
- **On HTTP 429**, the model is benched until Groq's reset time, then the call moves to the next model.
  - The bench time comes from the `retry-after` and `x-ratelimit-reset-*` headers. A daily limit benches the model for hours; a per-minute limit benches it for seconds.
  - The bench list is shared across the whole process, so later calls skip that model without wasting a request.
- **On a 5xx or connection error**, the model is benched for 30s.
- **On 413 (request too large) and model-specific 400s**, the call moves to the next model without benching.
- **Auth errors and other request errors** are raised immediately.
- **Streaming** switches models only before the first token. After that, an error is raised, because the user has already seen part of the reply.
- **Built-in tools** like `browser_search` are removed automatically for models that don't support them.
- **Models the API key can't access** are skipped. The model list is checked once per process.
- **When every model is benched**, it raises `AllModelsExhaustedError` with `retry_at`. The UI shows "Asta is taking a short break; back at HH:MM".
- **The order can be changed** with `GROQ_MODEL_CHAIN` (comma-separated) without code changes.

**Known constraints:**
- **Only 3 of the 5 slots work with the current key.** The Llama models are Enterprise-tier on Groq. They join the chain automatically if the key is upgraded.
- **8K tokens per minute per model is tight for plan generation.** The planner will generate phase by phase, in smaller calls, instead of in one large call.
- **gpt-oss models spend output tokens on reasoning.** Don't set small `max_tokens` values; a 40-token cap returned an empty answer in testing.
- **The bench list lives in memory, per process.** The API's agent calls and the worker each learn about a 429 separately; it costs at most one extra failed request per model per process.

## 9. Key decisions and corrections

| # | Decision | Rationale and source |
|---|---|---|
| D-1 | **"LINQ as ORM" → EF Core, queried with LINQ.** | LINQ is C#'s query syntax, not an ORM. EF Core is the ORM, and its queries are written in LINQ. Microsoft: EF Core "can serve as an object-relational mapper (O/RM)" and entities "are retrieved from the database using Language Integrated Query (LINQ)". [EF Core overview](https://learn.microsoft.com/en-us/ef/core/) |
| D-2 | **Auth.js → ASP.NET Core Identity + Google OAuth.** | Auth.js is a JavaScript library with integrations for JS frameworks (Next.js, SvelteKit, Express, Qwik). It doesn't fit a C# backend. ASP.NET Core has built-in Identity and a first-party Google provider (`AddGoogle`). [Auth.js getting started](https://authjs.dev/getting-started), [ASP.NET Core Google login](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/google-logins) |
| D-3 | **Web search: start with Groq's built-in browser search, keep Brave as a fallback.** Firecrawl is not needed for the MVP. | Groq's gpt-oss models support built-in tools, including browser search, so this needs no extra API key or vendor. Brave Search is the fallback if quality or limits become a problem. Firecrawl is a scraper; it only matters if we later want to read full pages. [Groq tool use](https://console.groq.com/docs/tool-use) |
| D-4 | Job queue in Postgres (no Redis or RabbitMQ). | One less moving part for a 2-day build; `SKIP LOCKED` is a proven Postgres queue pattern. |
| D-5 | Session cookie auth (not JWT in localStorage). | Same-origin SPA (Vite dev proxy). HttpOnly cookies avoid exposing tokens to XSS. |
| D-6 | **Modular monolith now, not microservices.** Split later with the strangler pattern if needed. | Fowler: "you shouldn't start a new project with microservices" ([MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)). Microsoft lists complexity, data-integrity and DevOps costs ([Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)). Strict modules keep extraction cheap. |

## 10. Milestones (deadline: Tue 20 Oct 2026 EOD)

| When | Milestone | Done when |
|---|---|---|
| **Sun 18 Oct** | M0: PRD approved; repo scaffolded (web / api / agents); Postgres in Docker; EF schema + migrations | All three services start; DB is migrated |
| **Mon 19 Oct (AM)** | M1: Auth (email + Google), onboarding forms, dashboard shell, landing page | A user can sign up, onboard, and see the empty dashboard |
| **Mon 19 Oct (PM)** | M2: Asta streaming chat with requirement gathering, goal summary card, web search | A goal is confirmed through chat |
| **Tue 20 Oct (AM)** | M3: Self-rating + assessment generation and grading; plan job queue + planner agent | A plan appears on the dashboard after the assessment |
| **Tue 20 Oct (PM)** | M4: Stale/regenerate, change goal, error states, UI polish + `/apple-design` review, end-to-end test | Full flow passes manually and with smoke tests |

**Risk:** this is a tight timeline for three services. If we slip, cut in this order: dark mode → web search (rely on model knowledge) → short-answer questions (MCQ only) → landing page animations.

## 11. Open items / needed from you

1. **Google OAuth client ID and secret.** Create them in Google Cloud Console with redirect URI `https://localhost:<api-port>/signin-google`. I'll give exact steps when we reach M1.
2. Confirm that **local-only** is acceptable for the 20 Oct deadline (no cloud deployment).
3. Stretch: email verification / password reset needs an email provider. Out of scope unless requested.
4. The Groq API key moves from `confidentials.md` into git-ignored `.env` files. *(Done for `agents/.env`.)*
5. **Model chain slots 4–5:** keep them as Enterprise-only placeholders, or fill them from a second provider? A second provider needs another API key; see §8.4.

## 12. Success criteria (MVP)

- A new user can go from landing page to a generated plan in **≤ 15 minutes**, without errors.
- The plan visibly reflects the assessment: known skills are marked skip/refresh, and gaps get the most time.
- Changing the goal and regenerating a stale plan both work end to end.
