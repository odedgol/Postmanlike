# Postmanlike — Features

This is the living feature catalog. Features are grouped by domain; the ✅ column tracks whether the item is implemented in the current build. Phases are cumulative (each ships on top of the previous one).

Legend: ✅ done · 🟡 partial · ⬜ not started

**Testing contract:** every feature ships with (a) unit tests in Vitest covering its pure logic, and (b) at least one Playwright E2E test that exercises the feature through the real UI against the real proxy. A feature is only marked ✅ when both test layers pass in CI.

---

## 1. Request / Response  — *Phase 1*
| Status | Feature |
|:-:|---|
| ✅ | HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, custom |
| ✅ | URL bar with send / cancel |
| ✅ | Query params table (enable/disable, bulk edit) |
| ✅ | Headers table (enable/disable) |
| ✅ | Body: none, raw (JSON / Text), x-www-form-urlencoded |
| 🟡 | Body: form-data (multipart), binary upload |
| ⬜ | Body: GraphQL query + variables mode |
| ✅ | Response tabs: Pretty (Monaco) / Raw / Headers / Cookies |
| ⬜ | Response: Preview (HTML iframe) / Visualize |
| ✅ | Status code · latency · size display |
| ✅ | Send, Cancel (AbortController) |
| ⬜ | Save-and-send, Send-and-download, Retry |

## 2. Authorization — *Phase 6*
| Status | Feature |
|:-:|---|
| ✅ | No auth |
| ✅ | API Key (header or query) |
| ✅ | Bearer token |
| ✅ | Basic auth |
| ✅ | AWS Signature v4 (signed server-side in the proxy so the secret never rides on the wire from the browser) |
| ⬜ | Digest, OAuth 1.0, OAuth 2.0 (auth code, client creds, PKCE, implicit, password), NTLM, Hawk, Akamai EdgeGrid |
| ⬜ | Per-request inheritance from folder → collection |

## 3. Collections & Folders — *Phase 2*
| Status | Feature |
|:-:|---|
| ✅ | Nested folders (create / rename / delete, cascading delete) |
| ⬜ | Drag-reorder |
| ⬜ | Duplicate |
| ⬜ | Collection-level auth / variables |
| 🟡 | Collection-level description (stored, not yet editable in UI) |
| ⬜ | Pre-request and test scripts at collection level |
| ✅ | Collection Runner (sequential, iterations, delay, per-request pass/fail + summary) |
| ⬜ | Runner iteration data (CSV / JSON) |
| ⬜ | Per-request saved examples (response pairs) |
| ✅ | Save request into collection / folder |
| ✅ | Click saved request to open in a tab |

## 4. Workspaces (Collaboration-lite) — *Phase 2*
| Status | Feature |
|:-:|---|
| ⬜ | Multiple local workspaces, switcher in header |
| ⬜ | Share via `.postman_collection.json` / `.postman_environment.json` |
| ⬜ | Shareable base64 links |

## 5. Environments & Variables — *Phase 3*
| Status | Feature |
|:-:|---|
| ✅ | Environment manager (CRUD env + variables, active selector in top bar) |
| ✅ | Globals (separate pane in env manager) |
| ✅ | Scope precedence: local > data > environment > collection > global |
| ✅ | `{{var}}` resolution on send across url / params / headers / body |
| ✅ | Unresolved-variables badge on the request view |
| 🟡 | Hover preview on a single field (pending; badge covers the use case) |
| ✅ | Dynamic vars (`$guid`, `$randomUUID`, `$timestamp`, `$isoTimestamp`, `$randomInt`) |

## 6. Scripting & Tests — *Phase 4*
| Status | Feature |
|:-:|---|
| 🟡 | Pre-request + post-response JavaScript (Function-based sandbox; QuickJS worker deferred) |
| ✅ | `pm.environment` / `pm.globals` / `pm.variables` (get) |
| ✅ | `pm.request` (read-only view), `pm.response` (status / headers / text / json / timing / size) |
| ✅ | `pm.test(name, fn)` with pass/fail tracking |
| ✅ | `pm.expect` subset: `toBe` / `toEqual` / `toInclude` / `toBeTruthy` / `toBeFalsy` / `toBeGreaterThan` / `toBeLessThan` / `toHaveStatus` / `not` |
| ⬜ | `pm.sendRequest` |
| ✅ | Test result panel (pass/fail + messages, script-level error surfaced) |
| ✅ | Console panel capturing `console.log/info/warn/error` from pre-request + test scripts, with clear |

## 7. History — *Phase 1*
| Status | Feature |
|:-:|---|
| ✅ | Auto-record requests in IndexedDB |
| ✅ | Sidebar history list, click to restore in new tab |
| ⬜ | Promote a history entry into a collection |

## 8. Import / Export — *Phase 5*
| Status | Feature |
|:-:|---|
| ✅ | Import cURL (paste → new request) |
| ✅ | Import Postman v2.1 collection (nested folders + scripts) |
| ⬜ | Import Postman environment |
| ⬜ | Import OpenAPI 3.0/3.1 + Swagger 2.0 |
| ⬜ | Import HAR, Insomnia |
| ✅ | Export Postman v2.1 collection |
| ⬜ | Export Postman environment |

## 9. Code Generation — *Phase 5*
| Status | Feature |
|:-:|---|
| ✅ | cURL |
| ✅ | JS `fetch`, `axios` |
| ✅ | Node.js `fetch` |
| ✅ | Python `requests` |
| ⬜ | HTTPie, Python `httpx`, Go `net/http`, Java OkHttp, C# `HttpClient`, PHP cURL, Ruby, Swift, Kotlin |

## 10. Cookies — *Phase 7*
| Status | Feature |
|:-:|---|
| ✅ | Cookie jar per domain (view + clear all) populated from Set-Cookie |
| ✅ | Proxy attaches jar cookies to matching outgoing requests |
| ⬜ | Per-cookie edit / delete |

## 11. Mock Servers — *Phase 8*
| Status | Feature |
|:-:|---|
| ✅ | Create a mock from the current request's live response |
| ✅ | Deterministic match: method + path |
| ✅ | Response delay (per-route `delayMs`) |
| ⬜ | Query/header-based matching, random variants |
| ✅ | Local mock URL `/mock/:id/*` served by the proxy |
| ✅ | Sidebar Mocks panel (create / open / delete) |

## 12. API Documentation — *Phase 8*
| Status | Feature |
|:-:|---|
| ✅ | Auto-rendered collection docs (nested folders, method/URL, headers, body) |
| 🟡 | Plain-text description render (Markdown formatting pending) |
| ⬜ | Variables reference section |
| 🟡 | Printable via browser Print; dedicated static-HTML export pending |

## 13. Monitors — *Phase 9*
| Status | Feature |
|:-:|---|
| ⬜ | Scheduled collection runs (cron-like) |
| ⬜ | Run history with pass/fail, duration, chart |
| ⬜ | SQLite persistence in proxy, node-cron scheduler |

## 14. Flows (visual API chaining) — *Phase 10*
| Status | Feature |
|:-:|---|
| ⬜ | React Flow canvas with node palette |
| ⬜ | Node types: Request, Evaluate, Condition, Delay, Output |
| ⬜ | Output passing via `$.body.x` selectors |
| ⬜ | End-to-end runner with per-node logs |

## 15. Accounts + Real-time Sync — *Phase 11*
| Status | Feature |
|:-:|---|
| ⬜ | Accounts (email/password + GitHub OAuth), JWT |
| ⬜ | Postgres + Prisma storage |
| ⬜ | Yjs-based live editing over WebSocket |
| ⬜ | Presence cursors, owner/editor/viewer roles |

## 16. Platform UX — *all phases*
| Status | Feature |
|:-:|---|
| ✅ | 3-pane IDE shell (sidebar / tabs / inspector) |
| ✅ | Light / dark theme |
| ✅ | Multi-tab interface with dirty indicator + restore-on-reload |
| ⬜ | Command palette (`⌘K`) |
| ⬜ | Global search across collections / requests / envs |
| ⬜ | Density toggle (compact / cozy) |
| 🟡 | Keyboard shortcuts: send ⌘↵ ✅, save ⌘S ✅, new tab Alt+N ✅, close Alt+W ✅ (⌘T / ⌘W are reserved by browsers) |
| ⬜ | Settings (proxy URL, SSL verify, timeout, history cap, theme) |

---

## Out of Scope
- Native desktop packaging (Electron / Tauri) — web only
- Mobile layouts — desktop viewport only
- gRPC / WebSocket / MQTT / Socket.IO protocol clients
- Enterprise SSO / SCIM / audit logs
- AI assistant (Postbot)
