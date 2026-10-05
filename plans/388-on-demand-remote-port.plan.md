# Plan 388 — On-demand remote port for validation

Status: active
Snapshot: 7d26d85bb441f7d9a0d70cbb3fc0fd661e30a9be

## Problem Statement

Dandan often needs to validate a job (the `[human]` Done-when items) while away from the PC and the home Wi-Fi. Today nothing on a slot is reachable from outside: the dev servers listen on `localhost`, and the frontend environments hard-code the API as `http://localhost:<be>` (`src/environments/environment.local.ts`; `environment.slot.ts` is generated from it by `scripts/take-plan.mjs` `generateEnvironmentSlot()`), so even a tunnel to the frontend port would load a page with no data.

Goal: any session — Planner (main folder, 4200/3000) or Worker (`wt-N`, 4200+N/3000+N) — can, on request, open a temporary, secret-gated public https link to that checkout's running app, and close it again. Not always-on.

## Goals & Success Criteria

- Primary: "open remote" in any checkout prints a working `https://…trycloudflare.com/?k=<secret>` link within ~30 s, without restarting the dev servers.
- Primary: without the secret the link returns 403; after "close remote" (or the TTL, default 3 h) the link is dead and no tunnel/proxy process remains.
- Success: the same app on `localhost` behaves exactly as today (API still `http://localhost:<be>`).

## Execution Mode

- Parallel: yes (touches no app feature code except the two environment files).
- Concurrent plans: none touching `scripts/take-plan.mjs` or `src/environments/**`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/remote-port.mjs
scripts/lib/remote-proxy.mjs
scripts/lib/remote-proxy.test.mjs
scripts/take-plan.mjs
src/environments/environment.local.ts
.claude/commands/remote.md
.claude/commands/commands.md
AGENTS.md
.gitignore
docs/agent/remote-port.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As Dandan, away from home, I ask the session "open remote", get a link on my phone, validate the job over mobile data, and say "close remote".

## Functional Requirements

### Must Have (P0)
- [ ] **Proxy (`scripts/lib/remote-proxy.mjs`, pure Node `http`/`net`, no new deps).** `createRemoteProxy({ fePort, bePort, token, ttlMs })`:
  - `/api/*` → `localhost:<be>`; everything else → `localhost:<fe>`, including WebSocket upgrades (dev-server live reload).
  - Rewrites `Host` to `localhost:<target>` and `Origin`/`Referer` to `http://localhost:<fe>` so Angular's dev-server host check and the backend's `ALLOWED_ORIGIN` CORS check accept the request unchanged.
  - Secret gate: a request with `?k=<token>` gets `Set-Cookie: fv_remote=<token>; HttpOnly; Secure; SameSite=Lax; Path=/` and a 302 to the same URL without `k`; any request without the cookie (or with a wrong one) gets a plain 403. Constant-time compare.
  - Exits itself after `ttlMs`.
- [ ] **CLI (`scripts/remote-port.mjs on|off|status [--hours=N]`).**
  - Ports from `scripts/lib/slot.mjs` `ports()`; outside a slot (Planner) → fe 4200 / be 3000. Proxy port `4290 + N` (main = 4290).
  - Refuses with a clear line if the fe/be ports aren't listening, or if `cloudflared` is missing (prints `winget install --id Cloudflare.cloudflared`).
  - `on`: random 24-byte token; starts the proxy detached, then `cloudflared tunnel --no-autoupdate --url http://localhost:<proxyPort>` detached; parses the `https://*.trycloudflare.com` URL from its output (timeout 45 s); writes `.worktree-remote` (JSON: pids, url, token, expiresAt); prints `REMOTE: on url=<url>/?k=<token> expires=<local time>`. Already on → reprints the existing link.
  - `off`: kills both process trees (`taskkill /T /F /PID` via `spawn` with an args array on Windows — never through Git Bash; `process.kill` elsewhere); deletes `.worktree-remote`; prints `REMOTE: off`.
  - `status`: prints on (url, expiry) / off; cleans a stale state file whose pids are gone.
  - The proxy kills the tunnel and deletes the state file when its TTL fires.
- [ ] **Same-origin API when opened remotely (`environment.local.ts`).** When the page's hostname isn't `localhost`/`127.0.0.1`, `apiUrl`/`authApiUrl` are `''` (relative — already supported for Render, see `auth.interceptor.ts` same-origin note). On localhost: unchanged.
- [ ] **`take-plan.mjs` `generateEnvironmentSlot()`** keeps working with the new environment shape: it rewrites the localhost port, and `environment.slot.ts` keeps the same remote → `''` behaviour. Verify by generating and reading the file.
- [ ] `.gitignore`: `.worktree-remote`.
- [ ] **Agent entry point:** `.claude/commands/remote.md` (`/remote on|off|status`), a row in `AGENTS.md` Skill triggers ("Human asks to validate remotely / open or close remote" → `/remote`), a line in `.claude/commands/commands.md`, and a short `docs/agent/remote-port.md` (how it works, security model, one-time `cloudflared` install).
- [ ] Tests (`node --test scripts/lib/remote-proxy.test.mjs`): with two throwaway local HTTP servers as fe/be — no cookie → 403; `?k=` → 302 + cookie; with cookie `/api/x` hits be and `/x` hits fe; Origin rewritten; wrong token → 403.

### Should Have (P1)
- [ ] The command file tells the agent to also send the link with a push notification when that tool is available, and to remind "close remote" when the job is validated.

### Nice to Have (P2)
- Tailscale as a second provider (private tailnet) behind `--provider`. Not now.

## Security Notes

- Anyone holding URL + secret gets the app with guest auto-login on the shared DB; the secret gate is the real protection, the random tunnel hostname is not. New secret every `on`; TTL default 3 h; never always-on.
- The secret appears only in the chat reply and in the gitignored `.worktree-remote`; never logged by the proxy, never committed.
- `cloudflared` quick tunnels need no account and expose only the proxy port.

## UI/UX Notes

- No app UI change. No dictionary change.

## Atomic Sub-tasks

- [ ] A1: Proxy module + `node --test` suite (`scripts/lib/remote-proxy.mjs`, `scripts/lib/remote-proxy.test.mjs`).
- [ ] A2: CLI on/off/status + state file + TTL cleanup; `.gitignore` (`scripts/remote-port.mjs`, `.gitignore`).
- [ ] A3: Remote-aware `environment.local.ts`; `generateEnvironmentSlot()` regex; regenerate and check `environment.slot.ts` (`src/environments/environment.local.ts`, `scripts/take-plan.mjs`).
- [ ] A4: `/remote` command, `AGENTS.md` row, `commands.md` line, `docs/agent/remote-port.md`.
- [ ] A5: Build + tests; live check from this slot; update session-state.

## Technical Considerations

- No new npm dependencies (Node `http`, `net`, `crypto`, `child_process`).
- Windows-first: detached `spawn` with `windowsHide`, `taskkill` via args array (Git Bash rewrites `/PID`).
- Angular 19 dev server (`@angular-devkit/build-angular:dev-server`) — the Host rewrite avoids its host check; no `angular.json` change.
- `logServerUrl` stays `localhost:9765`; from a phone the log transport just fails silently (acceptable).

## Out of Scope

- Always-on hosting, custom domains, Cloudflare accounts, Tailscale.
- Remote access for production/Render.

## Success Criteria

- [auto] `node --test scripts/lib/remote-proxy.test.mjs` → all pass.
- [auto] `npm run build` → exit 0.
- [auto] `node scripts/remote-port.mjs status` with no tunnel → `REMOTE: off`.
- [auto] With the tunnel on: `curl -s -o /dev/null -w "%{http_code}" <url>/` → `403`; `curl -s -o /dev/null -w "%{http_code}" "<url>/?k=<token>"` → `302`.
- [auto] After `off`: `node scripts/remote-port.mjs status` → `REMOTE: off`, and `.worktree-remote` is gone.
- [human] On the phone over mobile data (Wi-Fi off): open the link → the app loads with data, sign-in/guest works, an edit saves.
- [human] The same app on `http://localhost:<fe>` on the PC still works as before.
