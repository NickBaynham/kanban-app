# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Next.js dev server on port 3000
npm run build        # Static export to frontend/out/
npm run lint         # ESLint
npm run test:unit    # Vitest (unit tests)
npm run test:e2e     # Playwright (requires dev server)
npm run test         # unit + e2e
```

### Backend (`backend/`)
```bash
pdm run uvicorn main:app --reload   # Dev server on port 8000
pdm run ruff check .                # Lint
pdm run pytest                      # Tests
pdm run pytest tests/test_api.py::test_name  # Single test
```

### Docker (root)
```bash
make install         # Install all deps (frontend + backend + Playwright)
make run             # docker compose up (port 8000)
make build           # docker compose build
make test            # Run all tests (both frontend and backend)
make clean           # docker compose down -v
```

### Environment variables
Copy `.env.example` to `.env`. Required: `OPENROUTER_API_KEY`. Also: `SECRET_KEY` (JWT, has insecure default), `DATABASE_URL` (defaults to `postgresql://kanban:kanban@localhost:5432/kanbandb`).

## Architecture

### Deployment model
In production (Docker), Next.js is compiled to a fully static export (`out/`) and copied into FastAPI's `static/` directory. A single container on port 8000 serves both the frontend files and all `/api/*` routes. There is no SSR and no separate frontend server.

In development, run the frontend dev server (port 3000) and the FastAPI dev server (port 8000) separately. The frontend calls `/api/*` which assumes same-origin in the static build, so in local dev you may need to proxy or configure CORS.

### Frontend (`frontend/`)
- **Next.js 16 App Router** with `output: "export"` and `trailingSlash: true` — all routing is client-side only.
- `KanbanBoardLoader` wraps `KanbanBoard` with `next/dynamic({ ssr: false })` to prevent hydration mismatches from `@dnd-kit`'s generated IDs.
- `lib/apiClient.ts` — `fetchWithAuth` helper; JWT stored in `localStorage`, attached as `Authorization: Bearer`. On 401 it clears the token and redirects to `/login`.
- `lib/boardState.ts` — pure functions for local state mutations used for optimistic updates on drag-and-drop, card renames, and deletes. Card additions wait for the backend to get the real ID.
- `lib/boardTypes.ts` — shared TypeScript types (`BoardSnapshot`, `CardData`, `ColumnDef`).
- Design tokens are CSS custom properties in `globals.css` (accent yellow `#ecad0a`, blue `#209dd7`, purple `#753991`, navy `#032147`).

### Backend (`backend/`)
- **FastAPI** with SQLAlchemy 2 ORM. DB schema is auto-created on startup via `Base.metadata.create_all()`.
- `database.py` — engine, session, `get_db` dependency.
- `models.py` — `User → Board → ColumnModel → Card` (all cascade-delete). New boards auto-create 5 default columns.
- `auth.py` — JWT creation/verification with `python-jose`, bcrypt hashing via `passlib`.
- `routers/api.py` — CRUD for boards, columns, and cards; `/register` and `/login`.
- `routers/chat.py` — AI chat endpoint.

### AI chat (`POST /api/chat`)
Receives `{ message, board_id }`. Backend fetches the full board state, injects it into a system prompt, then calls OpenRouter (`https://openrouter.ai/api/v1`, model `openai/gpt-4o-mini`) via the OpenAI SDK with two tools: `add_card` and `delete_card`. If the model calls a tool, the backend executes it directly in the DB and returns `{ board_changed: true }`. The frontend's `SidebarChat` calls `onBoardChange()` (which triggers `loadBoard()`) when it receives `board_changed: true`.

### Data model
`User` → many `Board`s → many `ColumnModel`s (ordered) → many `Card`s (ordered, with `title` + `details`). All relations use cascade delete.

## DETAILED PLAN
@docs/plan.md
