# Code Review — kanban-app

Scope: backend (`main.py`, `auth.py`, `database.py`, `models.py`, `schemas.py`, `routers/api.py`, `routers/chat.py`, `tests/`), frontend (`components/`, `lib/`, `e2e/`), infra (`Dockerfile`, `docker-compose.yml`, `.env.example`, `Makefile`).

Severity legend: **🔴 Critical** · **🟠 High** · **🟡 Medium** · **🟢 Low / nit**

---

## 🔴 Critical

### 1. Cards & columns can be modified/deleted by any authenticated user
`backend/routers/api.py:62-102` — `update_column`, `update_card`, `delete_card`, and `create_card` accept the resource ID and only check that the caller is logged in. They do **not** verify the resource belongs to one of the user's boards. Any logged-in user can guess IDs and mutate or delete other users' cards/columns.

The board endpoints (`get_board`, `update_board`, `delete_board`) correctly filter by `user_id`; the card/column endpoints need the same check via the column → board → user chain. Example fix for `update_card`:

```python
card = (
    db.query(models.Card)
      .join(models.ColumnModel)
      .join(models.Board)
      .filter(models.Card.id == card_id, models.Board.user_id == current_user.id)
      .first()
)
```

The same gap exists in `routers/chat.py` for every tool that takes a `card_id` or `column_id` (`update_card`, `move_card`, `delete_card`, `rename_lane`, `toggle_lane`, `create_card`). The board is verified, but the tool-call arguments are trusted blindly — the model could be coaxed into sending an ID from a different board/user.

`test_board_isolation_between_users` only covers `GET /boards/{id}`. Add tests that confirm a second user cannot mutate user 1's cards/columns.

### 2. JWT signing secret has an insecure default
`backend/auth.py:12` — `SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-for-kanban")`. If the env var is missing in production, JWTs are signed with a publicly-known string and anyone can forge tokens for any user.

Fix: fail fast at startup if `SECRET_KEY` is unset (or unset *and* not in dev mode). Also add `SECRET_KEY` to `.env.example` so the deployer knows it exists.

### 3. CORS allows any origin with credentials
`backend/main.py:14-20` — `allow_origins=["*"]` together with `allow_credentials=True`. Browsers reject this combination per the CORS spec, but it is also a misconfiguration that signals intent to allow cross-site authenticated requests. Restrict to the actual frontend origin (e.g. `http://localhost:3000` in dev, the production hostname in prod), or set `allow_credentials=False` since auth is via Bearer header anyway, not cookies.

---

## 🟠 High

### 4. `move_card` skips order normalization
`backend/routers/chat.py:190-194` and `routers/api.py:84-93` — moving a card sets `column_id` but never recomputes `order`. The `order` column is left at whatever the source column had, which produces inconsistent ordering across the destination column. Normalize order on move (append to the end, or accept an `order` argument from the caller) and re-pack the source column.

`KanbanBoard.tsx:154-157` does pass an explicit `order` on drag-end, so the frontend path is fine. The chat path and the bulk-rename path are not.

### 5. AI new-card placement uses `order=999`
`backend/routers/chat.py:177` — every card created via chat gets `order=999`. After a few additions the sort key collides for multiple cards in the same column and ordering becomes undefined. Use `max(existing) + 1` (or a normalized integer ladder).

### 6. `db` port exposed on host in `docker-compose.yml`
`docker-compose.yml:21-22` — `ports: - "5432:5432"` on the `db` service publishes Postgres to `0.0.0.0:5432` with the default `kanban/kanban` credentials. Drop the `ports:` block; the `app` container reaches the DB via the internal compose network. Keep the published port only if local DB tooling truly needs it, and bind to `127.0.0.1:5432` if so.

### 7. App may start before Postgres is ready
`docker-compose.yml` — `depends_on: - db` without `condition: service_healthy`. On a cold start the FastAPI container can race the DB and fail `Base.metadata.create_all(...)`. Add a healthcheck on `db` and gate `app` on it:

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U kanban"]
    interval: 5s
    timeout: 3s
    retries: 10
app:
  depends_on:
    db:
      condition: service_healthy
```

### 8. Auth check uses deprecated `datetime.utcnow()`
`backend/auth.py:28-30` — `datetime.utcnow()` is deprecated in Python 3.12+ and emits warnings. Use `datetime.now(timezone.utc)` and store timezone-aware datetimes.

---

## 🟡 Medium

### 9. Single tool-call round trip in `/api/chat`
`backend/routers/chat.py:131-218` — the endpoint executes the model's first response and returns. There is no follow-up turn after tool execution, so the assistant can't acknowledge results, chain operations that depend on freshly-created IDs, or correct itself. Two improvements:
- Loop until the model emits a non-tool response (or hit a max-turn cap).
- Send the tool results back as `tool` messages so the assistant's reply summarizes what was actually done. The current generic `"I've made the requested changes to your board."` lies if a tool no-ops because the ID didn't exist.

### 10. Chat tool no-ops are silent
`routers/chat.py:182-216` — every branch is `if entity: ...`. If the model passes a wrong ID the change is silently dropped, but the response still claims success and `board_changed: True`. Track which calls succeeded; surface failures in the response text.

### 11. Bare exception in chat endpoint
`routers/chat.py:160-161` — `except Exception as e: return {"response": f"AI Error: {str(e)}", ...}` exposes raw exception text to the client and gives no server-side log. Log it; return a generic message.

### 12. `useEffect` dependency on `boardId` is missing
`frontend/components/KanbanBoard.tsx:83-86` —

```ts
useEffect(() => {
  loadBoard();
}, []);
```

The eslint-disable hides the bug: if `boardId` ever changes (e.g. navigating between boards in the same SPA session), the component won't reload. Either add `boardId` to the deps or assert the prop is a key (`<KanbanBoard key={boardId} ...>`).

### 13. Optimistic title commit ignores backend failures
`frontend/components/EditableProjectTitle.tsx:24-33` — `commit()` updates local title state and exits edit mode before the PUT resolves. If the request fails the UI lies. Either await success before clearing edit state or revert on error (the same pattern applies to `onRename`, `onUpdateCard`, `onDeleteCard` in `KanbanBoard.tsx`).

### 14. Test isolation is module-scoped, no DB reset
`backend/tests/conftest.py` only deletes the SQLite file at session-end. Within a session every test shares the same `testuser` and accumulating boards/cards. Tests pass today but order-dependent failures are easy to introduce. Consider:
- Function-scoped DB (recreate schema per test), or
- Truncate tables in a `autouse=True` fixture, or
- At minimum, make `token` and `board` `function`-scoped.

### 15. No tests for `routers/chat.py`
The chat endpoint has the most security-sensitive logic (executes DB writes from LLM-supplied args). Mock the OpenAI client and add tests for: tool dispatch, board-not-found, unknown card_id (silent no-op behavior — once that's fixed), and authorization on cross-user IDs.

### 16. Dead frontend code
`frontend/lib/boardState.ts:3-54` — `createInitialState()` is unused; the board comes from the backend. `addCard()` (lines 69-83) is also unused — `KanbanBoard.onAddCard` posts to the server and reloads. Remove both, plus the `c0..c4`/`k1..k6` seed data, to avoid confusion about whether the frontend has a default state.

### 17. `.env.example` is stale
`.env.example` lists `PASSWORD="password123"` — there is no `PASSWORD` env var in the code. It also omits `SECRET_KEY` and `DATABASE_URL`, both of which are read by the backend. Replace with the actual variables.

### 18. CLAUDE.md describes the chat tools wrong
`CLAUDE.md` says the chat endpoint exposes "two tools: `add_card` and `delete_card`". Actual code (`routers/chat.py:22-128`) ships seven: `create_card`, `update_card`, `move_card`, `delete_card`, `rename_board`, `rename_lane`, `toggle_lane`. Update the doc.

---

## 🟢 Low / nits

- `backend/main.py:30-34` — the `/{full_path:path}` catch-all returns `None` (HTTP 200 with `null` body) for unmatched `/api/...`. Unreachable in practice because real API routes match first, but if hit it should be a 404. Either filter at the route level or return a real 404 response.
- `backend/auth.py:25-30` — `create_access_token` defaults to a 15-minute expiry when no `expires_delta` is passed. The only caller passes one explicitly, so the default is dead. Either delete it or document it.
- `backend/auth.py:16` — `OAuth2PasswordBearer(tokenUrl="login")` is relative; with the `/api` prefix the Swagger "Authorize" button posts to the wrong URL. Use `tokenUrl="/api/login"` (or rely on Bearer tokens via a custom dependency, since the JWT login flow doesn't really fit the OAuth2 password form).
- `backend/routers/api.py:14` — `from typing import List` is placed mid-file (after the router is created). Move to the top with the other imports.
- `backend/routers/api.py:102-103` — missing blank line before the next route decorator.
- `backend/pyproject.toml:18,20` — `passlib` and `lxml` are listed but never imported. Drop them.
- `backend/Dockerfile:38` — `RUN mkdir -p /app/data` is a leftover from the SQLite era. Postgres no longer needs it.
- `frontend/components/KanbanBoard.tsx:29-58` — five `// eslint-disable-next-line @typescript-eslint/no-explicit-any`. Define a `BackendBoard` type matching `schemas.BoardOutput` once and import it; drop the disables.
- `frontend/components/SidebarChat.tsx` — chat panel never auto-scrolls to the latest message; long histories require manual scrolling. Add a ref + `scrollIntoView` on `messages` change.
- `frontend/e2e/board.spec.ts:24` — `test.describe.configure({ mode: "serial" })` paired with module-level `TEST_USER = e2e_${Date.now()}` is fine, but the registered user is never deleted at the end. Over time the dev DB collects orphan e2e users. Add cleanup, or use the API to delete the user in `afterAll`.
- `Makefile` — `lint` runs frontend + backend lint, but `make test` runs `test-frontend` + `test-backend`, and `test-frontend` runs `npm run test` which itself runs unit + e2e (per `frontend/package.json`). The e2e portion needs a running server; `make test` will hang/fail without one. Document the prerequisite or split into `test-unit` / `test-e2e`.

---

## Suggested order to address

1. Authorization checks on cards/columns (#1) — security hole, with regression tests (#15).
2. `SECRET_KEY` hardening + `.env.example` updates (#2, #17).
3. CORS lock-down (#3).
4. DB port exposure + healthcheck (#6, #7).
5. Order/normalization in chat & API moves (#4, #5).
6. Frontend: `boardId` dependency + optimistic-update rollback (#12, #13).
7. Cleanup pass: dead code, stale docs, lint nits (#16, #18, low items).
