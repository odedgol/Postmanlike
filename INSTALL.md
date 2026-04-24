# Postmanlike — Installation Guide

A step-by-step guide for a brand-new user to get Postmanlike running on their machine.

---

## 1. Prerequisites

You need these installed **before** you clone the repo:

| Tool | Minimum | How to get it |
|------|---------|---------------|
| **Node.js** | 20.x or newer (22.x recommended) | https://nodejs.org/ or via `nvm install 22` |
| **pnpm** | 10.x | `npm install -g pnpm` |
| **git** | any recent version | https://git-scm.com |
| A modern browser | latest Chrome / Firefox / Edge | Safari works too |

Verify each is on your `PATH`:

```bash
node --version    # v20.x or higher
pnpm --version    # 10.x or higher
git --version
```

If `pnpm --version` fails, close and reopen your terminal after installing it.

---

## 2. Clone and install

```bash
git clone https://github.com/odedgol/Postmanlike.git
cd Postmanlike
pnpm install
```

The install step downloads all workspace dependencies once. It takes roughly 30–90 seconds on a fresh machine. You'll see a note about "ignored build scripts: esbuild" — that's expected and harmless.

---

## 3. Start the app (dev mode)

```bash
pnpm dev
```

This runs **two processes in parallel**:

| Process | URL | What it does |
|---|---|---|
| Web UI (Vite) | http://localhost:5173 | The Postman-like interface |
| Proxy (Express) | http://localhost:4000 | CORS bypass, mocks, monitors, cookies, auth |

Open **http://localhost:5173** in your browser and you should see the three-pane IDE shell.

To stop everything, press `Ctrl+C` in the terminal running `pnpm dev`.

---

## 4. First request — 30-second smoke test

1. In the URL bar, paste: `http://localhost:4000/__echo?hello=world`
2. Click **Send**.
3. You should see a `200 OK` response with a JSON body that echoes your request back. If you see this, the web app and the proxy are both healthy.

If you want to try a real API, use `https://httpbin.org/get` instead.

---

## 5. Run the test suites (optional but recommended)

All tests live inside the repo and require no extra configuration.

### Unit tests (Vitest) — ~2 seconds
```bash
pnpm test
```
Expected: 150 tests pass across `shared`, `runtime`, `codegen`, `proxy`, `web`.

### End-to-end tests (Playwright) — ~30 seconds
First run only, install the browser binaries:

```bash
pnpm --filter @postmanlike/web exec playwright install chromium
```

Then:

```bash
pnpm --filter @postmanlike/web test:e2e
```

Playwright automatically boots the web + proxy dev servers, runs 45 tests against a real Chromium, then shuts them down.

### Type checking
```bash
pnpm -r typecheck
```

---

## 6. Production build (optional)

```bash
pnpm build
```

Then serve the static build + proxy:

```bash
# Terminal 1 — compiled proxy
pnpm --filter @postmanlike/proxy start

# Terminal 2 — preview the built web app on :4173
pnpm --filter @postmanlike/web preview
```

---

## 7. Configuration

Environment variables you may want to set:

| Variable | Used by | Default | Purpose |
|---|---|---|---|
| `VITE_PROXY_URL` | web | `http://localhost:4000` | Point the UI at a different proxy |
| `PORT` | proxy | `4000` | Proxy listen port |
| `POSTMANLIKE_AUTH_SECRET` | proxy | random per restart | Stable HMAC secret for session tokens. **Set this in any deployment.** |

Example:

```bash
POSTMANLIKE_AUTH_SECRET="$(openssl rand -hex 32)" PORT=4100 pnpm dev
```

---

## 8. Repository layout

```
apps/
  web/         React + Vite + Tailwind UI
  proxy/       Express server — /proxy, /mocks, /monitors, /cookies, /auth
packages/
  shared/      Types, variable resolver, cURL + Postman import/export, auth shapes
  runtime/     pm.* API, script runner, collection runner, flow engine
  codegen/     cURL, fetch, axios, Node fetch, Python requests generators
FEATURES.md    Feature catalog with per-feature status
INSTALL.md     This file
README.md      Short project overview
```

---

## 9. Troubleshooting

**`pnpm: command not found`**
Install pnpm: `npm install -g pnpm`, then reopen the terminal.

**Port 4000 or 5173 already in use**
Set `PORT=4100` for the proxy, or change the web port in `apps/web/vite.config.ts`. Both processes honour `strictPort: false` so Vite will pick the next free port automatically.

**Playwright complains the browser is missing**
Run `pnpm --filter @postmanlike/web exec playwright install chromium` once per machine.

**`esbuild: command not found` after install**
Run `pnpm approve-builds esbuild` once to allow esbuild's post-install script, then `pnpm install` again.

**IndexedDB looks stuck / old data**
Open your browser devtools → Application → Storage → clear site data for `localhost:5173`. The app rehydrates into a fresh state on reload.

**A request to `localhost` from another tool fails**
Postmanlike's UI never issues cross-origin requests directly — it routes through the Node proxy on `:4000`. Make sure that process is running (`pnpm dev` or `pnpm --filter @postmanlike/proxy dev`).

---

## 10. Where to go next

- [FEATURES.md](./FEATURES.md) — what's shipped vs. what's still pending per phase.
- [README.md](./README.md) — project overview and stack summary.
- Open the **Runner** from the top bar, **Cookies / Mocks / Monitors / Flows** in the sidebar, and the **Sign in** button to explore the advanced features.

Happy API-poking.
