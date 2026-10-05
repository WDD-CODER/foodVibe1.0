# Plan 384 — Logs in the AI workflow: query script, slot log retention, command wiring

Status: draft
Snapshot: 05132814b7a74187683bb45d5ef48339ae5fb5a0

Logging series: A = 382 (client ingest + Mongo sink), B = 383 (pino + request ids),
**C = 384 (this plan)**. Depends on 382 merged. May run in parallel with 383.

Shared decisions (apply to 382/383/384):
- One durable sink: MongoDB collection `app_logs` in the existing DB (local / Atlas), TTL 90 days.
  Sentry-style external tracker is deferred until there are real clients.
- Event naming everywhere (client and server): `domain.action.result`, lowercase, dots.
- `warn` + `error` are persisted; `info` only to stdout (and to Mongo when `LOG_PERSIST_INFO=1`).
- No PII in any log line (`auth-and-logging` skill rules): only `userId` (= `user._id`), never
  email/name/IP.
- The hand-started `scripts/log-server.js` on port 9765 is removed, not revived.

## Problem Statement
Even with a durable sink, no command or skill tells an agent to look at logs. Slot dev-server
output goes to `.claude/be.log` / `.claude/fe.log`, which `scripts/take-plan.mjs:355-376`
truncates on every start (`openSync(logPath, 'w')`) and which die with the session. `/fix` →
`investigate` checks "recent changes, failure history, source" but never runs a log query;
`/auto-solve` and `/review-it` have no "zero new errors" check; `preflight` doesn't verify the
log route. The Hebrew-notes batch flow ("X didn't work") starts from code reading instead of
from the recorded failure. Result: Dandan re-describes bugs the system already captured.

## Goals & Success Criteria
- Primary: one token-lean script answers "what went wrong, when, for whom" against Mongo
  (local or Atlas) and against slot log files, and the three bug-facing commands call it first.
- Success:
  - [auto] `node scripts/log-query.mjs --since=24h --level=warn --summary` → table with columns `event | count | last | sample` (or `no entries`), exit 0
  - [auto] `node scripts/log-query.mjs --since=1h --event=http.error --limit=5` → ≤ 5 lines, each `<time> <level> <source> <event> <userId|-> <requestId|-> <message> <context≤300ch>`
  - [auto] `node scripts/log-query.mjs --requestId=<id-from-a-real-entry>` → both the client and the server entries for that id (after Plan 383)
  - [auto] `node scripts/log-query.mjs --file --since=30m --level=warn` → parses `.claude/be.log` JSON lines and prints the same shape
  - [auto] after two consecutive `take-plan` runs in a slot: `Get-ChildItem .claude\logs` → previous run's `be-<ts>.log`/`fe-<ts>.log` present, `.claude/be.log` is the current run
  - [auto] `rg -n "log-query" .claude/commands/fix.md .claude/commands/auto-solve.md .claude/commands/review-it.md .claude/skills/preflight/SKILL.md .claude/references/prd-template.md AGENTS.md` → ≥ 1 match in each file
  - [human] Open a fresh slot session, say `/fix data` with a vague symptom; the agent's first
    tool call is `log-query --summary`, not a file read.

## Execution Mode
- Parallel: yes (with Plan 383 after Plan 382 merged)
- Concurrent plans: Plan 383 — scopes don't overlap; run `scope-check.mjs --overlap`
- Isolated DB: no (read-only against `app_logs`)

## Read-Write Scope

```scope
scripts/log-query.mjs
scripts/lib/log-format.mjs
scripts/take-plan.mjs
scripts/slot-stop.mjs
scripts/prune-old-sessions.sh
.claude/commands/fix.md
.claude/commands/auto-solve.md
.claude/commands/review-it.md
.claude/skills/preflight/SKILL.md
.claude/references/prd-template.md
AGENTS.md
.gitignore
package.json
docs/brain/patterns/log-query-usage.md
docs/brain/index.md
docs/workflow-kit/manifest.md
CHANGELOG.md
```

## Read Scope
Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol
Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Also confirm Plan 382 merged
(`app_logs` indexes in `server/db.js`). If Plan 383 has not merged yet, `--file` mode must
tolerate non-JSON lines (morgan format) by passing them through as `raw`.

## User Stories
- As a Worker, I want `log-query --since=<plan start> --level=error` to be a success criterion
  so that "it builds" stops being mistaken for "it works".
- As Dandan pasting Hebrew notes, I want the agent to find the matching recorded failure
  before it guesses from code.

## Functional Requirements

### Must Have (P0)
- [ ] `scripts/log-query.mjs` (ESM, Node built-ins + a Mongo client): reuse whatever
      `audit-labels.mjs` does (`mongoose` from `server/`, or add the `mongodb` driver to root
      devDependencies) and reuse its URI resolution: `--remote` → `MONGO_REMOTE_URI || MONGO_URI`,
      default `MONGO_LOCAL_URI || MONGO_URI`, read from `.env`.
      Flags: `--since=<15m|2h|3d|ISO>` (default `1h`), `--until=<ISO>`, `--level=<info|warn|error>`
      (minimum level), `--event=<exact or prefix with trailing .>`, `--userId=`, `--requestId=`,
      `--source=client|server`, `--limit=<n>` (default 50, hard max 500), `--summary`
      (group by `event`: count, last seen, one sample message), `--json` (raw docs), `--full`
      (don't truncate context), `--file[=path]` (parse local JSON-lines log instead of Mongo;
      default `.claude/be.log`), `--remote` (Atlas; print `REMOTE` banner on the first line).
      Output is designed for an agent's context window: one line per entry, context
      truncated to 300 chars unless `--full`, no colors.
- [ ] `scripts/lib/log-format.mjs`: shared formatter used by `--file` and Mongo modes so both
      print the same shape; Plan 383's pino JSON (`level` numeric 30/40/50, `time`, `msg`,
      `event`, `req.id`) and Plan 382's client-echo JSON are both normalised.
- [ ] Slot log retention in `scripts/take-plan.mjs`: before `openSync(logPath, 'w')`, if the
      file exists and is non-empty, rename it to `.claude/logs/<label>-<YYYYMMDD-HHmmss>.log`
      (`mkdirSync` the folder). `scripts/slot-stop.mjs` leaves files in place. Add
      `.claude/logs/` to `.gitignore` and to the dirty-slot ignore (`.gitignore:86` pattern —
      verify where the check lives and extend it). `scripts/prune-old-sessions.sh` (or a new
      `--prune-logs` in `log-query.mjs`) deletes `.claude/logs/*.log` older than 14 days.
- [ ] Record plan start: `take-plan.mjs` writes `.claude/.slot-plan-start` with the ISO
      timestamp when a plan is taken; `log-query.mjs --since=plan-start` reads it.
- [ ] Command wiring (append, don't rewrite):
      - `.claude/commands/fix.md` "Typical flow" step 2 → `investigate` begins with
        `node scripts/log-query.mjs --since=2h --level=warn --summary`, then narrows with
        `--event=` / `--requestId=`; only then recent changes and source.
      - `.claude/commands/auto-solve.md`: before touching code for a note, run
        `log-query --since=24h --level=warn --summary` and quote the matching entry (or
        state "no recorded failure") in the first report line; add final gate
        `node scripts/log-query.mjs --since=plan-start --level=error` → must be `no entries`
        or every entry explained.
      - `.claude/commands/review-it.md`: reviewer runs the same `--since=plan-start
        --level=error` check and fails the review on unexplained entries.
      - `.claude/skills/preflight/SKILL.md`: add check 3 — `curl -s -o NUL -w "%{http_code}"
        -X POST http://localhost:<be-port>/api/v1/log -H "Content-Type: application/json"
        -d '{"level":"info","event":"preflight.log.ok","message":"preflight","timestamp":"<now>"}'`
        → `202`. Remove any mention of port 9765 if present.
      - `.claude/references/prd-template.md`: under Goals & Success Criteria add a standing
        template line `- [auto] node scripts/log-query.mjs --since=plan-start --level=error → no entries`.
      - `AGENTS.md` skill-trigger table: new row `bug report / "something broke" / Hebrew
        note about a failure → run scripts/log-query.mjs --summary before reading code`.
- [ ] `package.json` root script `"logs": "node scripts/log-query.mjs"` so Dandan can type
      `npm run logs -- --since=2h --level=error` in PowerShell.
- [ ] `docs/brain/patterns/log-query-usage.md`: 10-line cheat sheet (common invocations, how
      to go from a Hebrew note → `--summary` → `--requestId`); register in `docs/brain/index.md`;
      `docs/workflow-kit/manifest.md`: mark `scripts/log-server.js` removed and `log-query.mjs`
      as `kit` (generic) with `log-format.mjs`.

### Should Have (P1)
- [ ] `--summary` also prints `distinct users` per event (count only, never ids) — useful for
      "is this one user or everyone".
- [ ] `--remote` requires `--yes` or an interactive `y` confirm, matching the "Human host
      confirm" convention for Atlas reads in plan 321.

### Nice to Have (P2)
- [ ] `--watch` tail mode for `--file`.

## UI/UX Notes
- No UI. All output ASCII, PowerShell-safe (no ANSI colors by default).

## Atomic Sub-tasks
- [ ] C1: `scripts/lib/log-format.mjs` normaliser (client-echo JSON, pino JSON, raw passthrough) + unit-ish self-test via `node --test` if cheap.
- [ ] C2: `scripts/log-query.mjs` Mongo mode (URI resolution, filters, `--summary`, `--json`, limits).
- [ ] C3: `--file` mode + `--since=plan-start` (`scripts/log-query.mjs`).
- [ ] C4: `scripts/take-plan.mjs` rotation + `.slot-plan-start`; `.gitignore`; prune (`scripts/prune-old-sessions.sh`).
- [ ] C5: wire `.claude/commands/fix.md`, `auto-solve.md`, `review-it.md`, `.claude/skills/preflight/SKILL.md`, `.claude/references/prd-template.md`, `AGENTS.md`.
- [ ] C6: `package.json` script, `docs/brain/patterns/log-query-usage.md`, `docs/workflow-kit/manifest.md`, CHANGELOG; run all [auto] criteria.

## Technical Considerations
- Dependencies: Plan 382 (`app_logs` shape); Plan 383 improves `--file` output but is not required.
  `scripts/take-plan.mjs` is shared infrastructure — keep the change to the rotation block
  and the start-timestamp write; do not touch slot/port logic.
- Windows: use `fs.renameSync` (no symlinks); timestamps in filenames must avoid `:`.
- Token budget: default `--limit=50`, 300-char context cap, `--summary` first — this is the
  point of the script. Document that agents should never `cat .claude/be.log` directly.
- Hebrew canonical values: n/a.
- Security: `--remote` reads production logs; `userId` only, never emails (guaranteed upstream
  by Plans 382/383 redaction). Reads `.env` URIs — never print them.

## Out of Scope
- Any server or client code.
- Alerting / notifications (future Sentry-style tracker).
- A web UI for logs.

## Critical Questions
- Q1 Slot log retention: **(a) 14 days — default** / (b) 7 days / (c) keep forever, manual prune.
- Q2 Should `/ship` REGULAR lane also run `log-query --since=plan-start --level=error`?
  **(a) no — `/review-it` and `/auto-solve` own it; keep `/ship` lean — default** / (b) yes, as a soft warning.
- Q3 `--remote` confirm gate: **(a) interactive `y` unless `--yes` — default** / (b) no gate.
