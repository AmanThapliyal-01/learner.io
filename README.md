# learner.io

Personalized learning plans built from what you actually know. See [PRD.md](PRD.md) for the product and architecture.

| Service | Path | Stack | Local URL |
|---|---|---|---|
| Web | `web/` | React + TypeScript (Vite), Tailwind, TanStack Query, Motion | http://localhost:5173 |
| API | `api/` | ASP.NET Core (.NET 10), EF Core + Npgsql, Identity | http://localhost:5080 |
| Agents | `agents/` | Python 3.12, FastAPI, LangChain/LangGraph, Groq | http://localhost:8001 (internal only) |
| Database | `docker-compose.yml` | PostgreSQL 16 | localhost:5433 |

## First-time setup

1. Start Postgres: `docker compose up -d`
2. Agents secrets: copy `agents/.env.example` to `agents/.env` and fill in `GROQ_API_KEY` and `AGENT_SERVICE_TOKEN`.
3. API secrets (same token as the agents service):
   `dotnet user-secrets set "AgentService:Token" "<token>" --project api/src/Learner.Api`
4. Apply database migrations:
   `cd api && dotnet tool restore && dotnet ef database update -p src/Learner.Infrastructure -s src/Learner.Api`
5. Install web dependencies: `cd web && npm install`

## Run

Run each service in its own terminal:

- API: `dotnet run --project api/src/Learner.Api --launch-profile http`
- Agents: `uv run --directory agents learner-agents`
- Web: `npm run dev --prefix web`

The web dev server proxies `/api` to the API, so the browser only ever talks to http://localhost:5173.

## Tests

- API architecture rules (module boundaries): `dotnet test api/Learner.slnx`
- Agents: `uv run --directory agents pytest`

## Local test accounts

Dev-only accounts in the local Docker database (fake data; never use these values anywhere real):

| Email | Password | State |
|---|---|---|
| `m1test@example.com` | `password123` | Onboarded (basic info only) |
| `m1-ui@example.com` | `password123` | Onboarded with skills |

## Google sign-in (optional locally)

The Google button only appears once the API has credentials:

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorized redirect URI: `http://localhost:5173/signin-google` (the web dev server proxies it to the API).
3. Save the values as API user secrets:
   `dotnet user-secrets set "Authentication:Google:ClientId" "<id>" --project api/src/Learner.Api`
   `dotnet user-secrets set "Authentication:Google:ClientSecret" "<secret>" --project api/src/Learner.Api`
4. Restart the API.
