# Postmanlike

A desktop-focused web clone of [postman.com](https://postman.com) — an API client with collections, environments, scripting, tests, mock servers, docs, monitors, flows, and (eventually) real-time team sync.

The full feature catalog is in [FEATURES.md](./FEATURES.md). A step-by-step install guide for new users lives in [INSTALL.md](./INSTALL.md). The phased build plan lives in the repo's plan file.

## Stack
- **Web:** React 18 + TypeScript + Vite + Tailwind
- **State:** Zustand + React Query
- **Local storage:** IndexedDB via Dexie
- **Proxy / Mocks / Monitors:** Node.js + Express (TypeScript)
- **Monorepo:** pnpm workspaces

## Getting Started

Requires Node.js >= 20 and pnpm >= 10.

```bash
pnpm install
pnpm dev
```

This starts the Vite dev server (web) on **http://localhost:5173** and the Express proxy on **http://localhost:4000** concurrently.

The web app points at `http://localhost:4000` by default. Override with `VITE_PROXY_URL`.

## Monorepo Layout

```
apps/
  web/          React UI
  proxy/        Express CORS proxy, mock server, monitor scheduler
packages/
  shared/       Shared types and utilities
```

## Roadmap

The project is delivered in phases; each phase is independently runnable. Phase 0 (scaffold) and Phase 1 (request/response MVP with local history) are shipped. See [FEATURES.md](./FEATURES.md) for the full list.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Run web + proxy together |
| `pnpm build` | Build all workspaces |
| `pnpm typecheck` | Typecheck all workspaces |
| `pnpm test` | Run all tests |
