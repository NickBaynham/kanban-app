# Developer guide

## Layout

- `frontend/` — Next.js (App Router) application, client-rendered board UI.
- `docs/` — This file and end-user documentation (`user.md`).
- Root `Makefile` — Preferred entry points for install, lint, build, and test.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4 (theme tokens in `frontend/app/globals.css`)
- `@dnd-kit` for drag and drop
- Vitest and Testing Library for unit tests (files matching `frontend/**/*.test.{ts,tsx}` only; `e2e/` is excluded so Playwright specs are not picked up by Vitest)
- Playwright for E2E tests (`frontend/e2e/`)

## Prerequisites

Node.js 20 or newer and npm. For E2E, Playwright downloads Chromium during `make install` (or `npx playwright install --with-deps chromium` in `frontend/`).

## Make targets

Run from the repository root:

| Target | Command run (conceptually) |
|--------|----------------------------|
| `make install` | `npm install` in `frontend/`, then Playwright Chromium install |
| `make lint` | ESLint via `frontend` npm script |
| `make build` | `next build` in `frontend/` |
| `make test` | Unit tests (`vitest run`) then headless Playwright |

Implementation uses `npm --prefix frontend` so you do not need to `cd` for automation.

## Local development

After `make install`:

```bash
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Next.js is configured to allow this dev origin for tooling (`allowedDevOrigins` in `frontend/next.config.ts`).

## Tests

- **Unit**: `npm run test:unit` in `frontend/`. Pure board state logic lives in `frontend/lib/boardState.ts` and is covered in `boardState.test.ts`; column UI behavior is covered in `KanbanColumn.test.tsx`.
- **E2E**: `npm run test:e2e` in `frontend/`. Playwright starts the dev server via `playwright.config.ts` (`webServer`). Runs **headless** by default (`use.headless: true`).

To debug E2E with a visible browser:

```bash
cd frontend && npx playwright test --headed
```

## UI conventions

Palette variables are defined in `frontend/app/globals.css` (accent, primary, secondary, navy, gray) per product requirements. Stable hooks for tests use `data-testid` values such as `column-{id}` and `card-{id}`.
