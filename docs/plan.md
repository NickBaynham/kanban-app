# High Level Steps for Setup

### Part 1: Plan

- [x] Enrich this document to plan out each of these parts in detail, with sub-steps listed out as a checklist to be checked off by the agent, and with tests and success criteria for each. 
- [x] Create an `.agents/agents.md` file inside the frontend/ directory that describes the existing code there.

### Part 2: Scaffolding

- [x] Set up the make file (`make build`, `make run`, `make test`, `make lint`).
- [x] Set up Docker infrastructure (`docker-compose.yml`, `Dockerfile` for serving NextJS fully static from FastAPI).
- [x] Ensure basic project structure including .gitignore and .env.example with `OPENROUTER_API_KEY` and `PASSWORD`.

### Part 3: Backend

- [x] Set up the FastAPI backend using `pdm`.
- [x] Implement robust database integration (`models.py`, `database.py`) setting up tables for `Board`, `Column`, `Card`. (Switched from SQLite to PostgreSQL — see `docker-compose.yml` and `database.py`.)
- [x] Create CRUD API endpoints for Kanban interactions (`routers/api.py`).
- [x] Serve the static `out/` NextJS build from `/` and wrap API routes under `/api`.

### Part 4: Frontend

- [x] Configure `next.config.ts` to `output: 'export'` for full static generation.
- [x] Replace frontend dummy data with API calls (using native `fetch` or a simple SWR hook).
- [x] Secure the app view with a Login page that validates against `/api/login` and drops a token/cookie.
- [x] Fix hydration issues and test interaction between frontend elements and backend persistence.

### Part 5: Integration

- [x] Implement backend `/api/chat` router.
- [x] Connect the OpenRouter API in the backend using `openai/gpt-4o-mini` capable of calling defined CRUD tools.
- [x] Add the AI Chat interface to the right-hand sidebar of the frontend Kanban board.
- [x] Allow the AI to update the board state and trigger automatic board re-renders for the user.

### Part 6: Testing

- [x] Set up the testing infrastructure: backend unit tests using `pytest`.
- [x] Implement end-to-end (e2e) tests using Playwright validating the drag-and-drop workflow and AI interaction.
- [x] Test the backend APIs and lint code (`ruff` for Python, `eslint` for NextJS).

### Part 7: Deployment

- [x] Complete docker multi-stage build that encapsulates both Next.js build step and Python FastAPI runtime.
- [x] Validate container operates on `docker-compose up`.
- [x] Ensure DB persists in docker volumes so data remains after container restart. (Postgres data persisted in the `kanban_pgdata` volume.)
- [x] Test very thoroughly and fix any issues discovered.

### Part 8: Code Review Follow-ups

Items surfaced by the code review in `docs/review.md`. Ordered so security gaps land first. Severity tags reference the review.

- [ ] **🔴 Authorization on cards & columns** — `routers/api.py` (`update_column`, `update_card`, `delete_card`, `create_card`) and every chat tool in `routers/chat.py` must verify the resource belongs to the current user via the column → board → user chain. Add regression tests confirming a second user cannot mutate user 1's cards/columns. (Review #1, #15)
- [ ] **🔴 Harden `SECRET_KEY`** — fail fast at startup if `SECRET_KEY` is unset; add `SECRET_KEY` to `.env.example`. Also add `DATABASE_URL` and remove the unused `PASSWORD` entry. (Review #2, #17)
- [ ] **🔴 Lock down CORS** — replace `allow_origins=["*"]` + `allow_credentials=True` in `main.py` with the real frontend origin(s), or set `allow_credentials=False` since auth is Bearer-header only. (Review #3)
- [ ] **🟠 Don't expose Postgres on the host** — drop `ports: 5432:5432` from the `db` service in `docker-compose.yml` (or bind to `127.0.0.1` if local tooling truly needs it). (Review #6)
- [ ] **🟠 DB healthcheck + gated app start** — add a `pg_isready` healthcheck on `db` and `depends_on: db: condition: service_healthy` on `app`. (Review #7)
- [ ] **🟠 Normalize card `order` on move/create** — fix `move_card` (chat) and the move path in `routers/api.py` to recompute order; replace the hardcoded `order=999` in chat-created cards with `max(existing) + 1`. (Review #4, #5)
- [ ] **🟡 Frontend optimistic updates** — add `boardId` to the `KanbanBoard` load effect (or key the component on it); roll back local state on backend failure for `EditableProjectTitle.commit`, `onRename`, `onUpdateCard`, `onDeleteCard`. (Review #12, #13)
- [ ] **🟡 Chat endpoint robustness** — loop tool calls until the model emits a non-tool response, send tool results back as `tool` messages, surface failed/no-op tool calls in the response, and log (don't return) raw exception strings. (Review #9, #10, #11)
- [ ] **🟡 Replace deprecated `datetime.utcnow()`** in `auth.py` with `datetime.now(timezone.utc)`. (Review #8)
- [ ] **🟡 Test isolation + chat tests** — make `token`/`board` fixtures function-scoped (or truncate tables per test); add `routers/chat.py` tests covering tool dispatch, board-not-found, unknown IDs, and cross-user authorization. (Review #14, #15)
- [ ] **🟢 Cleanup pass** — drop dead frontend code (`createInitialState`, `addCard` in `lib/boardState.ts`); update `CLAUDE.md` chat-tool list (7 tools, not 2); remove unused deps (`passlib`, `lxml`); remove leftover `mkdir /app/data` in Dockerfile; fix `OAuth2PasswordBearer(tokenUrl=...)` to `/api/login`; fix the `/{full_path}` 404 fallthrough; type the `any`s in `KanbanBoard.tsx`; auto-scroll `SidebarChat`; clean up e2e users in `afterAll`. (Review low/nits, #16, #18)
