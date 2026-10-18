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

- Agents: `uv run --directory agents pytest`
