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
   For Code QA's cross-user API checks (`code-qa.md`, plan 414) create a **second** non-admin account the same way and
   add `QA_USER2=<name>` / `QA_PASS2=<password>` next to them. Without it those checks are skipped.
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
השרתים כבר רצים: http://localhost:4205 (אפליקציה), http://localhost:4205/qa-evidence/health (evidence). אל תנסה להריץ שרתים בעצמך.
```

## Evidence server

The agent uses it as described in `qa-agent.md` §5:

- `GET /health` returns `{"ok":true,"app":"http://localhost:4205","loggedIn":true}` once the QA login has succeeded.
- `POST /save` takes `{run, name, dataUrl, url?, w?, h?}` (an html2canvas capture made in the page) and writes
  `bugs/qa-runs/<run>/shots/<name>.png`.
- `GET /shot?run&name&url&w&h&full=0|1&auth=1|0&wait=<ms>&selector=<css>` renders the URL with Playwright at that
  viewport, logged in as `QA_USER` unless `auth=0`.
- Every saved PNG also gets a line in `bugs/qa-runs/<run>/shots/index.tsv`. The server binds `127.0.0.1` only.

The page never calls 3005 or 4206 directly: `qa-up` starts `ng serve` with `.claude/qa-proxy.conf.json`, which
proxies `/api` to 3005 and `/qa-evidence` to 4206 (Cowork's built-in browser blocks cross-port calls with
`ERR_BLOCKED_BY_CLIENT`). The QA build also has no guest auto-login, so a fresh browser is signed out.
`ng serve` sends no CSP header, so the page can load html2canvas from `/qa-evidence` and POST to it. A prod-style serve with
helmet's CSP would block this, and that case is not handled.

## Where reports land

`bugs/qa-runs/<RUN_ID>/`: `report.md`, `progress.md`, and `shots/` (the PNGs and `index.tsv`). PNGs are not committed
(the repo-wide `*.png` ignore rule covers them). Whether QA evidence is committed is still open; see the commented
line in `.gitignore`.

## Nightly mode

Cowork's scheduled task cannot start Windows processes, so Windows Task Scheduler owns the servers.

| Time | Who | What |
| --- | --- | --- |
| 00:00 | Windows "FoodVibe QA up" (`qa-nightly-up.ps1`) | fast-forward to `origin/main`, `npm ci` where a lockfile changed, `qa-up.ps1`, then Code QA (`run.mjs --nightly`: yesterday's code reviews in, gates · static · api · sweep, tonight's review queue out; stops by 02:40) — see `code-qa.md` |
| 01:00 | Cowork "FoodVibe Code QA" agent | reads `bugs/qa-runs/code-qa/<DATE>/queue.md`, reviews page code against `qa-plan.md` until 02:40, one `review-<PAGE>.md` per page (`code-qa-agent.md`) |
| 02:45 | Windows "FoodVibe Code QA merge" (`qa-code-merge.ps1`) | merges tonight's reviews into `ledger.json` and `latest.md` |
| 03:00 | Cowork "FoodVibe UI QA" agent | reads `latest.md` first: skips what Code QA already checked, runs `suspect`/`unknown` checks first, confirms `CODE-AI-*` findings |
| 07:30 | Windows "FoodVibe QA down" (`qa-nightly-down.ps1`) | stops the servers |

Every step is appended to `bugs/qa-runs/.nightly.log`; Code QA adds one `CODE-QA: <layer> <status> <n> findings` line
per layer (its full output is in `.claude/qa-code.log`) and `CODE-QA: ingest …` / `CODE-QA: queue …` lines.

The two Cowork agents share the night's usage. If the UI agent keeps running out, lower the Code QA agent's
`STOP_AT` first: the rotation makes a shorter window safe — it only means more nights per full cycle.

### Set it up (once, about 15 minutes)

**1. Windows tasks** — in PowerShell, in the QA checkout (registers all three; run it again after any change to the times):

```powershell
cd C:\dev\foodVibe-qa
git pull --ff-only
powershell -ExecutionPolicy Bypass -File scripts\qa\qa-schedule.ps1 -Root C:\dev\foodVibe-qa
```

It prints `QA: task 'FoodVibe QA up' next run … 00:00`, `… 'FoodVibe QA down' … 07:30`, `… 'FoodVibe Code QA merge' … 02:45`.
Times: `-Up 23:30 -Merge 02:50 -Down 08:00`; remove all three with `-Unregister`.

**2. Second QA account** (for the API layer's cross-user checks): create another non-admin user through the UI and add
`QA_USER2` / `QA_PASS2` to `C:\dev\foodVibe-qa\server\.env` (see "Before the first run").

**3. Cowork task "FoodVibe Code QA"** — Claude Desktop → Cowork → Scheduled → New task:
- Name: `FoodVibe Code QA` · Schedule: daily, 01:00 (Asia/Jerusalem) · Requires: this computer
- Folder: `C:\dev\foodVibe-qa` · Tools: file read/write in that folder only; no browser needed
- Approvals: automatic for file reads and for writes under `bugs/qa-runs/code-qa/`
- Prompt (paste as is):

```
אתה סוכן ה-Code QA של FoodVibe. קרא את docs/qa/code-qa-agent.md בתיקייה המחוברת ופעל לפיו עד הסוף, בלי לשאול שאלות.
DATE: היום (YYYY-MM-DD)
STOP_AT: 02:40
עבוד לפי bugs/qa-runs/code-qa/<DATE>/queue.md מהדף הראשון, כתוב review-<PAGE>.md לכל דף ועדכן את הכותרת אחרי כל בדיקה. אל תריץ שרתים, אל תפתח דפדפן, אל תשנה קוד.
```

**4. Cowork task "FoodVibe UI QA"** — same place:
- Name: `FoodVibe UI QA` · Schedule: daily, 03:00 (Asia/Jerusalem) · Requires: this computer
- Folder: `C:\dev\foodVibe-qa` · Tools: the built-in browser + files
- Approvals: approve `localhost:4205` once (site scope) in a manual run, then automatic
- Prompt (fill in the QA account; no `RUN_ID`: the agent picks the run from `bugs/qa-runs/INDEX.md`):

```
אתה סוכן ה-QA הלילי של FoodVibe. התחל מ-docs/qa/qa-flow.md בתיקייה המחוברת (אחריו docs/qa/qa-agent.md ו-docs/qa/qa-plan.md) ופעל לפי ארבעת השלבים. אין RUN_ID: בחר ריצה לפי bugs/qa-runs/INDEX.md (המשך ריצה לא גמורה, אחרת פתח חדשה). אף אחד לא נמצא — לא לשאול שאלות; בעיה חוסמת → BLOCKED.md וסיום.
QA_USER: <user>   QA_PASS: <pass>
STOP_AT: 06:30
SCOPE: all
REPORT_LANG: en
השרתים מורמים על ידי Windows Task Scheduler: http://localhost:4205 (אפליקציה), http://localhost:4205/qa-evidence/health (evidence). אל תנסה להריץ שרתים בעצמך.
```

**5. First run by hand** (so every approval is given once while you watch):

1. `Start-ScheduledTask -TaskName 'FoodVibe QA up'` — wait for `CODE-QA: queue …` in `bugs/qa-runs/.nightly.log`
   (Code QA takes 30–50 minutes; `QA: … ok` lines come first).
2. Cowork → "FoodVibe Code QA" → **Run now**. Let it finish one page (or stop it after a few minutes), then check
   `bugs/qa-runs/code-qa/<today>/review-<PAGE>.md` exists.
3. `Start-ScheduledTask -TaskName 'FoodVibe Code QA merge'` — `latest.md` now shows a `Code review:` block for that page.
4. Cowork → "FoodVibe UI QA" → **Run now**, approve `localhost:4205` (site scope), let it reach P1, stop it.
5. `Start-ScheduledTask -TaskName 'FoodVibe QA down'` frees the ports.

### Checkout setup (once, before "Set it up")

```powershell
# dedicated QA checkout, stays on main (path is yours to choose)
git clone https://github.com/WDD-CODER/foodVibe1.0 C:\dev\foodVibe-qa
cd C:\dev\foodVibe-qa
npm ci ; cd server ; npm ci ; cd ..
npx playwright install chromium
# copy server/.env from your working folder; add QA_USER / QA_PASS and QA_USER2 / QA_PASS2 (non-admin accounts)
```

### Caveats

- The PC must be awake (the up task wakes it at 00:00) and Claude Desktop must be open at 03:00.
- Do one manual run first and approve `localhost:4205` there. Then set the scheduled task to automatic approval.
- QA runs write `QA-*` records to the same local Mongo the dev server uses. They are prefixed and removed when a run
  finishes.
- The QA checkout's `bugs/qa-runs/` stays untracked. `git merge --ff-only` is not affected by untracked files. If
  the checkout cannot fast-forward, the run continues on the current tree and the log says so.
