# Plan 408 — QA harness: dedicated QA slot (4205/3005) + evidence server (4206)

Status: active
Snapshot: 2f9be7eb2522709b969b2f710850d3f4f7521f9f

## Problem Statement
Dandan wants Claude Cowork to act as an autonomous QA agent that uses the app through the browser only and
reports (never fixes) with a screenshot per finding (`docs/qa/qa-agent.md`, `docs/qa/qa-plan.md`). Cowork's
built-in browser runs on the PC but its shell runs in a Linux VM: it cannot start servers, reach the PC's
localhost from the shell, or save browser screenshots to disk. The run must also not collide with the dev
servers on 4200/3000 or the Worker slots 4201–4203/3001–3003. Three small pieces of tooling close those gaps.

## Goals & Success Criteria
- Primary: one PowerShell command brings up an isolated QA frontend (4205), backend (3005) and evidence server (4206); one command tears them down.
- Success: `GET http://localhost:4206/health` → `{"ok":true}`; `/shot` writes a PNG of `/inventory/list` at 375×812 logged in as the QA user; `/save` writes a PNG posted from the page; `qa-down.ps1` leaves no node processes on 4205/3005/4206.

## Execution Mode
- Parallel: yes — touches only new files under `scripts/qa/**` and `docs/qa/**`
- Concurrent plans: any
- Isolated DB: no

## Read-Write Scope

```scope
scripts/qa/**
docs/qa/**
bugs/qa-runs/.gitkeep
# append only: bugs/qa-runs/*/shots/ (commented), .claude/.qa-pids
.gitignore
# append only: "qa:up", "qa:down" scripts + html2canvas devDependency
package.json
package-lock.json
```

## Read Scope
Entire repo. Reuse `scripts/take-plan.mjs` (`generateEnvironmentSlot`, `spawnNpm`) and `scripts/lib/slot-procs.mjs`
(`portState`, `killTree`, `waitForPort`) as reference — do not modify them.

## Escalation Protocol
Standard (per prd-template). If `server/routes/auth.js` needs any change for the evidence server login, STOP — it must not.

## Architecture Impact
- INV-none: preserves — tooling only; no app, schema, server-route or taxonomy code is touched. The evidence server talks to the backend solely through the existing public `POST /api/v1/auth/login`.

## Step 0 — Reality Check
Standard.

## User Stories
- As Dandan, I run `npm run qa:up`, paste the QA kickoff prompt into Cowork, and keep working on 4200 while QA runs on 4205.
- As the QA agent, I save a picture of what I see with one `javascript_tool` call, and a clean viewport render of any URL by opening one link.
- As the fixing Worker, every finding in `bugs/qa-runs/<run>/report.md` has a PNG next to it.

## Functional Requirements

### Must Have (P0)
- [ ] `scripts/qa/qa-up.ps1` (PowerShell, Windows):
  - generates `src/environments/environment.slot.ts` from `environment.local.ts` with the same regex as `generateEnvironmentSlot` in `scripts/take-plan.mjs`, pointing `apiUrl`/`authApiUrl` at `http://localhost:3005`;
  - refuses to start if any of 4205/3005/4206 is held by a non-dev process (mirror `portState` logic; a leftover from a previous `qa-up` is killed);
  - starts backend: `cd server; $env:PORT=3005; $env:NODE_ENV='development'; $env:ALLOWED_ORIGIN='http://localhost:4205,http://localhost:4206'; node index.js` (detached, logs to `.claude/qa-backend.log`); `-Env remote` switches to `NODE_ENV=production` (uses `MONGO_URI`), default is `development` (`MONGO_LOCAL_URI`) — same as `npm run dev:local`;
  - starts frontend: `npx ng serve -c slot --port 4205` (detached, log `.claude/qa-frontend.log`);
  - starts `node scripts/qa/evidence-server.mjs` with env `QA_PORT=4206 QA_APP=http://localhost:4205 QA_API=http://localhost:3005 QA_USER QA_PASS` read from `.env` keys `QA_USER`/`QA_PASS` (never printed);
  - writes PIDs to `.claude/.qa-pids`; waits for all three ports (frontend up to 180 s) and prints one line per service `QA: <name> ok on <port>` or `QA: <name> FAIL — see <log>`; exits non-zero on any FAIL;
  - prints the kickoff reminder: `QA ready → http://localhost:4205 · evidence http://localhost:4206/health`.
- [ ] `scripts/qa/qa-down.ps1`: kills the PID trees from `.claude/.qa-pids`, confirms ports free, deletes the pid file, prints `QA: down`.
- [ ] `scripts/qa/evidence-server.mjs` (Node ≥ 20, ESM, no new runtime deps beyond `@playwright/test` already in devDependencies and `html2canvas` added as a devDependency):
  - `GET /health` → `{"ok":true,"app":"<QA_APP>","loggedIn":true|false}`; CORS `Access-Control-Allow-Origin: http://localhost:4205` on every response + `OPTIONS` preflight;
  - `GET /html2canvas.min.js` → serves `node_modules/html2canvas/dist/html2canvas.min.js`;
  - `POST /save` JSON `{run, name, dataUrl, url?, w?, h?}` (body limit 25 MB): validates `run` and `name` against `^[A-Za-z0-9._-]+$`, decodes the PNG data URL, writes `bugs/qa-runs/<run>/shots/<name>.png` (mkdir -p), appends a line to `bugs/qa-runs/<run>/shots/index.tsv` (`iso-time \t name \t url \t w×h \t source=page`), responds `text/plain` with the repo-relative path; 400 on bad input;
  - `GET /shot?run&name&url&w&h&full=0|1&auth=1|0` → Playwright chromium (`executablePath` default; if `playwright install` was never run on this PC, print the exact command once and exit 503 with it in the body) opens `<QA_APP><url>` with viewport `w×h`, `isMobile: w < 700`, `hasTouch: w < 700`, `locale: 'he-IL'`; when `auth=1` (default) the context has an `addInitScript` that seeds `sessionStorage.fv_token` and `sessionStorage.loggedInUser` from a login done once at startup via `POST <QA_API>/api/v1/auth/login` `{name, password}` (response `{token, user}`), re-login on 401; waits for `networkidle` + the loader text «רגע, מכינים הכל...» to disappear (max 15 s), screenshots (`fullPage` per `full`), writes the same path/index line with `source=playwright`, responds `text/plain` with the path. One browser instance reused; contexts closed per request; 30 s hard timeout → 504.
  - Security: binds `127.0.0.1` only; refuses `url` that is not a path starting with `/`; never logs the password or token.
- [ ] `bugs/qa-runs/.gitkeep`; `.gitignore` gets `bugs/qa-runs/*/shots/` **commented out by default** (Dandan decides later whether PNGs are committed — leave the line present but commented, with a one-line note) and `.claude/.qa-pids`.
- [ ] `package.json` scripts: `"qa:up": "powershell -ExecutionPolicy Bypass -File scripts/qa/qa-up.ps1"`, `"qa:down": "powershell -ExecutionPolicy Bypass -File scripts/qa/qa-down.ps1"`.
- [ ] `docs/qa/README.md` (short): prerequisites (`.env` with `QA_USER`/`QA_PASS` of a **non-admin** account created once through the UI; `npx playwright install chromium` once), the two commands, the kickoff prompt to paste into Cowork (copy from this plan's UI/UX Notes), where reports land.

- [ ] **Nightly run support** (Windows; the Cowork scheduled task cannot start Windows processes, so Windows Task Scheduler owns the servers):
  - `scripts/qa/qa-nightly-up.ps1 -Root <path>`: runs in the **dedicated QA checkout** (a separate clone that stays on `main`, never Dandan's working folder). Steps: `git fetch origin main`; `git merge --ff-only origin/main` (if not fast-forwardable: log and continue on the current tree); if `package-lock.json` (root or `server/`) changed since the last run → `npm ci` there; call `qa-up.ps1`; append every step and its exit status to `bugs/qa-runs/.nightly.log`. A failure never throws before logging — the 03:00 Cowork run then hits its own P0 blocker and writes `BLOCKED.md`.
  - `scripts/qa/qa-nightly-down.ps1 -Root <path>`: runs `qa-down.ps1`, logs the result.
  - `scripts/qa/qa-schedule.ps1 -Root <path> [-Up 02:45] [-Down 07:00] [-Unregister]`: registers two Windows scheduled tasks `FoodVibe QA up` / `FoodVibe QA down` with `Register-ScheduledTask` (daily, `-WakeToRun`, `-StartWhenAvailable`, run only when the user is logged on, battery allowed); prints the task names and next run times. `-Unregister` removes both.
  - `qa-up.ps1` is idempotent: if the QA servers are already up it reports `QA: already up` and exits 0.
  - The QA checkout's `bugs/qa-runs/` stays untracked (reports are read from there); `git merge --ff-only` is unaffected by untracked files.

### Should Have (P1)
- [ ] `qa-up.ps1 -Status` prints the three port states and the last 5 log lines each.
- [ ] `/shot` accepts `wait=<ms>` extra settle time and `selector=<css>` to clip to one element.

### Nice to Have (P2)
- [ ] `qa-up.ps1 -Build` runs `ng build -c slot` once first so the first browser load is fast.

## UI/UX Notes
- No UI in the app. The only "UI" is the kickoff prompt Dandan pastes into Cowork (store verbatim in `docs/qa/README.md`):

```
אתה סוכן ה-QA של FoodVibe. התחל מ-docs/qa/qa-flow.md בתיקייה המחוברת (אחריו docs/qa/qa-agent.md ו-docs/qa/qa-plan.md) ופעל לפי ארבעת השלבים עד הסוף — קודם בדיקת קיום מול האפליקציה, ורק אחריה הבדיקות — בלי לשאול שאלות אלא אם יש hard blocker. אם bugs/qa-runs/<RUN_ID>/progress.md כבר קיים, המשך משם.
RUN_ID: <YYYY-MM-DD-a>
QA_USER: <user>   QA_PASS: <pass>
SCOPE: all
REPORT_LANG: en
השרתים כבר רצים: http://localhost:4205 (אפליקציה), http://localhost:4206/health (evidence). אל תנסה להריץ שרתים בעצמך.
```
- Hebrew canonical values: not applicable.

## Atomic Sub-tasks
- [ ] A1: `scripts/qa/evidence-server.mjs` — `/health`, `/html2canvas.min.js`, `/save` (+ `html2canvas` devDependency, `bugs/qa-runs/.gitkeep`, `.gitignore` lines)
- [ ] A2: `/shot` with Playwright + API login + sessionStorage seeding; 503 message when chromium is missing
- [ ] A3: `scripts/qa/qa-up.ps1` (env.slot generation, port checks, 3 detached processes, pid file, waits, summary line) + `scripts/qa/qa-down.ps1`
- [ ] A4: `package.json` scripts `qa:up` / `qa:down`; `docs/qa/README.md` with the kickoff prompt
- [ ] A6: Nightly scripts `qa-nightly-up.ps1`, `qa-nightly-down.ps1`, `qa-schedule.ps1` (+ idempotent `qa-up.ps1`); `docs/qa/README.md` gains the one-time QA-checkout setup (below) and the nightly prompt
- [ ] A5: Manual proof on Windows: `npm run qa:up` → health ok → open `http://localhost:4206/shot?run=smoke&name=inv-m&url=/inventory/list&w=375&h=812&full=1` → PNG exists and shows the logged-in list → `npm run qa:down` → ports free. Paste the three outputs in the PR.

## Success criteria
- [auto] `node scripts/qa/evidence-server.mjs` with `QA_USER`/`QA_PASS` set, then `curl http://127.0.0.1:4206/health` → `{"ok":true,...,"loggedIn":true}`
- [auto] `curl -X POST http://127.0.0.1:4206/save -H "content-type: application/json" -d "{\"run\":\"t\",\"name\":\"x\",\"dataUrl\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==\"}"` → prints `bugs/qa-runs/t/shots/x.png` and the file exists (1×1 PNG)
- [auto] `ng build -c slot` passes (environment.slot.ts generated by qa-up)
- [auto] `powershell -File scripts/qa/qa-schedule.ps1 -Root <qa-checkout>` prints two task names and next-run times; `Get-ScheduledTask -TaskName 'FoodVibe QA*'` lists both with `WakeToRun = True`; `-Unregister` removes them.
- [human] Nightly dry run: `Start-ScheduledTask -TaskName 'FoodVibe QA up'` → `QA: ... ok` lines in `bugs/qa-runs/.nightly.log`, ports 4205/3005/4206 answer; `Start-ScheduledTask -TaskName 'FoodVibe QA down'` → ports free.
- [human] A5 on Dandan's PC: both PNGs open and show the app; `npm run qa:down` frees the ports; nothing on 4200/3000 was disturbed.

## Technical Considerations
- Dependencies: `@playwright/test` (present), `html2canvas` (new devDependency, pinned).
- New files: `scripts/qa/qa-up.ps1`, `scripts/qa/qa-down.ps1`, `scripts/qa/evidence-server.mjs`, `docs/qa/README.md`, `bugs/qa-runs/.gitkeep`. (`docs/qa/qa-agent.md`, `docs/qa/qa-plan.md` and `docs/qa/qa-flow.md` are already on `main` from PR #367.)
- Model changes: none.
- The refresh cookie is per-port in development (`fv_refresh_3005`), so the QA login never overwrites Dandan's 3000 session in the same browser profile.
- `ng serve` on 4205 serves without helmet CSP, so the page can load `html2canvas` from 4206 and POST to it. If a future prod-style serve is used, CSP would block it — documented in README, not solved here.

## Out of Scope
- Any change to app code, routes, dictionary or server routes. Fixing anything the QA finds. A GUI for the report. Committing PNGs (decision deferred). CI integration.

## Nightly mode — one-time setup (goes into `docs/qa/README.md`)

```powershell
# 1. dedicated QA checkout, stays on main (path is yours to choose)
git clone https://github.com/WDD-CODER/foodVibe1.0 C:\dev\foodVibe-qa
cd C:\dev\foodVibe-qa
npm ci ; cd server ; npm ci ; cd ..
# 2. copy .env from your working folder; add QA_USER / QA_PASS (non-admin account, created once through the UI)
# 3. register the two Windows tasks (wake the PC at 02:45, stop the servers at 07:00)
powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Root C:\dev\foodVibe-qa
```
Then in Claude: create the scheduled task (daily 03:00 Asia/Jerusalem, requires this computer, folder = the QA checkout)
with this prompt (no `RUN_ID` — the run is chosen from `bugs/qa-runs/INDEX.md`):

```
אתה סוכן ה-QA הלילי של FoodVibe. התחל מ-docs/qa/qa-flow.md בתיקייה המחוברת (אחריו docs/qa/qa-agent.md ו-docs/qa/qa-plan.md) ופעל לפי ארבעת השלבים. אין RUN_ID: בחר ריצה לפי bugs/qa-runs/INDEX.md (המשך ריצה לא גמורה, אחרת פתח חדשה). אף אחד לא נמצא — לא לשאול שאלות; בעיה חוסמת → BLOCKED.md וסיום.
QA_USER: <user>   QA_PASS: <pass>
STOP_AT: 06:30
SCOPE: all
REPORT_LANG: en
השרתים מורמים על ידי Windows Task Scheduler: http://localhost:4205 (אפליקציה), http://localhost:4206/health (evidence). אל תנסה להריץ שרתים בעצמך.
```
Caveats to state in the README: the PC must be awake and Claude Desktop open at 03:00; approve `localhost:4205`
once in a manual run and set the scheduled task to automatic approval; QA runs write `QA-*` records to the local
Mongo that the dev server also uses (prefixed, removed when a run finishes).

## Critical Questions
1. QA account: (a) create `qa-bot` through the UI once and put credentials in `.env` — **assumed**; (b) seed it by script — not in scope.
2. Mongo for QA runs: (a) local (`dev:local` behaviour) — **assumed default**; (b) remote via `-Env remote`.
3. PNG retention in git: (a) ignored — **assumed**; (b) committed per run.
4. Nightly target: dedicated QA checkout on `main` — **decided by Dandan (2026-10-10)**; PC is awake at 03:00 — **confirmed by Dandan**.
