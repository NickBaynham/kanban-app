# Kanban

Single-board Kanban MVP (Next.js). See [docs/user.md](docs/user.md) for how to use the app and [docs/developer.md](docs/developer.md) for contributors.

## Getting started

Requires Node.js 20+ and npm. Optional: GNU Make.

```bash
make install
```

Or without Make:

```bash
cd frontend && npm install && npx playwright install --with-deps chromium
```

Run the dev server:

```bash
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Make targets

| Target   | Description                                      |
|----------|--------------------------------------------------|
| `make install` | Install dependencies and Playwright Chromium |
| `make lint`    | ESLint                                       |
| `make build`   | Production build                             |
| `make test`    | Unit tests and headless Playwright E2E       |
