# QA harness — running the autonomous QA agent

The QA agent (Claude Cowork) uses FoodVibe through the browser only and reports what it finds, with a PNG for each
finding. It never fixes anything. It reads `qa-flow.md` first, then `qa-agent.md` and `qa-plan.md`. This page covers
the servers it needs (plan 408).

| Service | Port | Started by |
| --- | --- | --- |
| QA frontend (`ng serve -c slot`) | 4205 | `npm run qa:up` |
| QA backend (`server/index.js`) | 3005 | `npm run qa:up` |
| Evidence server (`scripts/qa/evidence-server.mjs`) | 4206 | `npm run qa:up` |

These ports are separate from your dev servers on 4200/3000 and from the Worker slots on 4201–4203/3001–3003. The
refresh cookie is per port in development (`fv_refresh_3005`), so the QA login does not sign you out on 4200.

## Before the first run

1. Create a **non-admin** account once through the UI, then add its credentials to `server/.env` (or a root `.env`):
   `QA_USER=<name>` and `QA_PASS=<password>`. The evidence server reads them itself. They are never passed on a
   command line or printed.
2. Install the Playwright browser once: `npx playwright install chromium`. Without it, `/shot` answers 503 with this
   command.
3. Run the QA harness from the main folder or the dedicated QA checkout, **not** from a `wt-N` slot. `qa-up`
   rewrites `src/environments/environment.slot.ts` to point at :3005, and in a slot that file belongs to the
   slot's own servers.
4. Local Mongo must be running (default `-Env local` uses `MONGO_LOCAL_URI`, like `npm run dev:local`).
   `powershell -File scripts/qa/qa-up.ps1 -Env remote` uses `MONGO_URI` instead.

## Commands

```powershell
npm run qa:up      # QA: backend ok on 3005 / frontend ok on 4205 / evidence ok on 4206
npm run qa:down    # QA: down
powershell -ExecutionPolicy Bypass -File scripts/qa/qa-up.ps1 -Status   # port states + last 5 log lines each
powershell -ExecutionPolicy Bypass -File scripts/qa/qa-up.ps1 -Build    # ng build -c slot first
```

- `qa:up` is idempotent: if the stack is already up it prints `QA: already up` and exits 0. It refuses to start when
  a QA port is held by a program that is not a dev server. A leftover dev server on those ports is stopped.
- Logs: `.claude/qa-backend.log`, `.claude/qa-frontend.log`, `.claude/qa-evidence.log`. PIDs: `.claude/.qa-pids`.
- The first frontend build takes about 1–2 minutes.

## Kickoff prompt (paste into Cowork)

```
אתה סוכן ה-QA של FoodVibe. התחל מ-docs/qa/qa-flow.md בתיקייה המחוברת (אחריו docs/qa/qa-agent.md ו-docs/qa/qa-plan.md) ופעל לפי ארבעת השלבים עד הסוף — קודם בדיקת קיום מול האפליקציה, ורק אחריה הבדיקות — בלי לשאול שאלות אלא אם יש hard blocker. אם bugs/qa-runs/<RUN_ID>/progress.md כבר קיים, המשך משם.
RUN_ID: <YYYY-MM-DD-a>
QA_USER: <user>   QA_PASS: <pass>
SCOPE: all
REPORT_LANG: en
השרתים כבר רצים: http://localhost:4205 (אפליקציה), http://localhost:4206/health (evidence). אל תנסה להריץ שרתים בעצמך.
```

## Evidence server

The agent uses it as described in `qa-agent.md` §5:

- `GET /health` returns `{"ok":true,"app":"http://localhost:4205","loggedIn":true}` once the QA login has succeeded.
- `POST /save` takes `{run, name, dataUrl, url?, w?, h?}` (an html2canvas capture made in the page) and writes
  `bugs/qa-runs/<run>/shots/<name>.png`.
- `GET /shot?run&name&url&w&h&full=0|1&auth=1|0&wait=<ms>&selector=<css>` renders the URL with Playwright at that
  viewport, logged in as `QA_USER` unless `auth=0`.
- Every saved PNG also gets a line in `bugs/qa-runs/<run>/shots/index.tsv`. The server binds `127.0.0.1` only.

`ng serve` sends no CSP header, so the page can load html2canvas from 4206 and POST to it. A prod-style serve with
helmet's CSP would block this, and that case is not handled.

## Where reports land

`bugs/qa-runs/<RUN_ID>/`: `report.md`, `progress.md`, and `shots/` (the PNGs and `index.tsv`). PNGs are not committed
(the repo-wide `*.png` ignore rule covers them). Whether QA evidence is committed is still open; see the commented
line in `.gitignore`.

## Nightly mode

Cowork's scheduled task cannot start Windows processes, so Windows Task Scheduler owns the servers.
`qa-nightly-up.ps1` (02:45) fast-forwards the QA checkout to `origin/main`, runs `npm ci` where a lockfile changed,
then runs `qa-up.ps1`. `qa-nightly-down.ps1` (07:00) stops the servers. Every step is appended to
`bugs/qa-runs/.nightly.log`.

### One-time setup

```powershell
# 1. dedicated QA checkout, stays on main (path is yours to choose)
git clone https://github.com/WDD-CODER/foodVibe1.0 C:\dev\foodVibe-qa
cd C:\dev\foodVibe-qa
npm ci ; cd server ; npm ci ; cd ..
npx playwright install chromium
# 2. copy server/.env from your working folder; add QA_USER / QA_PASS (non-admin account, created once through the UI)
# 3. register the two Windows tasks (wake the PC at 02:45, stop the servers at 07:00)
powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Root C:\dev\foodVibe-qa
# optional: -Up 02:30 -Down 07:30 ; remove with -Unregister
```

Dry run: `Start-ScheduledTask -TaskName 'FoodVibe QA up'`, then check `bugs/qa-runs/.nightly.log` for the
`QA: … ok` lines. `Start-ScheduledTask -TaskName 'FoodVibe QA down'` frees the ports.

Then in Claude, create the scheduled task: daily at 03:00 Asia/Jerusalem, requires this computer, folder = the QA
checkout. Use this prompt (no `RUN_ID`: the agent picks the run from `bugs/qa-runs/INDEX.md`):

```
אתה סוכן ה-QA הלילי של FoodVibe. התחל מ-docs/qa/qa-flow.md בתיקייה המחוברת (אחריו docs/qa/qa-agent.md ו-docs/qa/qa-plan.md) ופעל לפי ארבעת השלבים. אין RUN_ID: בחר ריצה לפי bugs/qa-runs/INDEX.md (המשך ריצה לא גמורה, אחרת פתח חדשה). אף אחד לא נמצא — לא לשאול שאלות; בעיה חוסמת → BLOCKED.md וסיום.
QA_USER: <user>   QA_PASS: <pass>
STOP_AT: 06:30
SCOPE: all
REPORT_LANG: en
השרתים מורמים על ידי Windows Task Scheduler: http://localhost:4205 (אפליקציה), http://localhost:4206/health (evidence). אל תנסה להריץ שרתים בעצמך.
```

### Caveats

- The PC must be awake (the up task wakes it) and Claude Desktop must be open at 03:00.
- Do one manual run first and approve `localhost:4205` there. Then set the scheduled task to automatic approval.
- QA runs write `QA-*` records to the same local Mongo the dev server uses. They are prefixed and removed when a run
  finishes.
- The QA checkout's `bugs/qa-runs/` stays untracked. `git merge --ff-only` is not affected by untracked files. If
  the checkout cannot fast-forward, the run continues on the current tree and the log says so.
