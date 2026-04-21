# High Level Steps for Setup

### Part 1: Plan

- [x] Enrich this document to plan out each of these parts in detail, with sub-steps listed out as a checklist to be checked off by the agent, and with tests and success criteria for each. 
- [x] Create an `.agents/agents.md` file inside the frontend/ directory that describes the existing code there.

### Part 2: Scaffolding

- [ ] Set up the make file (`make build`, `make run`, `make test`, `make lint`).
- [ ] Set up Docker infrastructure (`docker-compose.yml`, `Dockerfile` for serving NextJS fully static from FastAPI).
- [ ] Ensure basic project structure including .gitignore and .env.example with `OPENROUTER_API_KEY` and `PASSWORD`.

### Part 3: Backend

- [ ] Set up the FastAPI backend using `pdm`.
- [ ] Implement robust SQLite database integration (`models.py`, `database.py`) setting up tables for `Board`, `Column`, `Card`.
- [ ] Create CRUD API endpoints for Kanban interactions (`routers/api.py`).
- [ ] Serve the static `out/` NextJS build from `/` and wrap API routes under `/api`.

### Part 4: Frontend

- [ ] Configure `next.config.ts` to `output: 'export'` for full static generation.
- [ ] Replace frontend dummy data with API calls (using native `fetch` or a simple SWR hook).
- [ ] Secure the app view with a Login page that validates against `/api/login` and drops a token/cookie.
- [ ] Fix hydration issues and test interaction between frontend elements and backend persistence.

### Part 5: Integration

- [ ] Implement backend `/api/chat` router.
- [ ] Connect the OpenRouter API in the backend using `openai/gpt-4o-mini` capable of calling defined CRUD tools.
- [ ] Add the AI Chat interface to the right-hand sidebar of the frontend Kanban board.
- [ ] Allow the AI to update the board state and trigger automatic board re-renders for the user.

### Part 6: Testing

- [ ] Set up the testing infrastructure: backend unit tests using `pytest`.
- [ ] Implement end-to-end (e2e) tests using Playwright validating the drag-and-drop workflow and AI interaction.
- [ ] Test the backend APIs and lint code (`ruff` for Python, `eslint` for NextJS).

### Part 7: Deployment

- [ ] Complete docker multi-stage build that encapsulates both Next.js build step and Python FastAPI runtime.
- [ ] Validate container operates on `docker-compose up`.
- [ ] Ensure DB persists in docker volumes so data remains after container restart.
- [ ] Test very thoroughly and fix any issues discovered.