# FoodVibe — Agent Workflow Map

> Purpose: precise, hand-off-ready inventory of every workflow, command, skill, hook,
> script, rule source, and state store in this project, plus how they connect.
> Written for a visualization agent — every node is a real file path; every edge is
> labeled `invokes`, `loads`, `reads`, `writes`, `gates`, or `triggers`.
> Snapshot date: 2026-07-20.

---

## 1. Roles (three-agent workflow)

| Role | Who | Responsibility |
| --- | --- | --- |
| Human Director | The user | Approves plans, validates jobs (`done` / ship `Y`), answers gates |
| Architect | Claude.ai (default; Claude Code/Cursor on explicit override) | Produces Plan Contracts via `/plan`-style scoping. Read-only against the app |
| Contractor | Cursor (or Claude Code) | Executes **one milestone at a time** from the saved plan, writes `sessions/[date].md`, stops |
| Reviewer | Claude Code via `/review-it` | Checks milestone vs Plan Contract. Report-only, never fixes, never commits |
| Shipping agent | Whichever agent runs `/ship` | Build gate → review → commit approval → merge gate → brain capture |

Rule: **a job is never done until the Human validates it** (`docs/agent/job-validation.md`).

---

## 2. Rule sources (precedence roots)

| File | Scope | Notes |
| --- | --- | --- |
| `AGENTS.md` | Both agents | Single source of truth: hard rules, skill triggers, standards index, job validation, Plan Contracts |
| `CLAUDE.md` | Claude Code only | Imports `AGENTS.md` + addendum: branch guard, session hooks, "Yes chef!" gate |
| `.cursor/rules/*.mdc` (11 files) | Cursor only | Mirrors of hard rules; key one: `save-plan-must-use-skill.mdc` (alwaysApply) |
| `docs/agent/` (9 files) | Both, load-on-demand | conventions, standards-angular/-security/-domain/-backend/-git, brain-capture, job-validation, pr-check-fix-loop |
| `_shared/tech-stack.md` | Both | Stack detail |
| `docs/brain/` | Both | Second brain: `index.md`, `gotchas.md`, `patterns/`, `decisions/` (ADRs), `glossary.md`, `projectbrief.md`, `how-it-works.md` |

Cursor rule files: `add-recipe-must-use-skill`, `angular-component-structure`, `brain-memory-session-start`, `core-angular`, `git-commit-must-use-skill`, `lucide-icons-must-register-in-app-config`, `save-plan-must-use-skill`, `scss-styling-must-use-cssLayer`, `security`, `translation` (`.mdc` each).

---

## 3. Commands — Claude Code (`.claude/commands/`)

### Core plan/execute/ship pipeline

| Command | Invokes / loads | Reads | Writes |
| --- | --- | --- | --- |
| `/plan` | loads `.claude/references/prd-template.md`, `hld-template.md`, `_shared/*`, `docs/agent/*` (path-scoped) | codebase (read-only) | Plan Contract under `plans/` |
| `/feat` | invokes `/plan` then `/review-it`; loads `standards-angular.md`, `standards-domain.md`, `_shared/tech-stack.md` | — | product code (via Contractor milestones) |
| `/fix` | bug-fix path (analog of `/feat` for fixes) | — | product code |
| `/refactor` | refactor path | — | product code |
| `/brief` | see §6 flow F2; syncs parent plan via save-plan Phase 4 | `git diff/log`, `.claude/todo.md` (retroactive mode) | `.claude/sessions/{session-id}/brief.md` |
| `/brief-detect` | forces the brief-detection gate (skill) below threshold | user message | — |
| `/review-it` | Reviewer protocol | newest `sessions/*.md`, parent plan in `plans/`, milestone files | verdict in chat only (never `[x]`, never commits) |
| `/ship` | invokes `/review`; runs `scripts/session-manifest-ship.py` (multi-worktree), `scripts/brain-review-check.mjs --scope=full` (feature-complete path) | `.claude/.session-state-path`, brief Done-when | commit; marks `.claude/todo.md` + plan `[x]`; `docs/brain/**` (auto-writes on `Y`, unless `no brain`); session-state file |
| `/done` | job-validation Path B close-out | `.claude/todo.md`, parent plan | marks `[x]` on Human confirm |
| `/review` | standalone review pass (used by `/ship` Phase 2) | session diff | report only |
| `/end-session` | alias territory of `/ship` ("wrap up") | — | — |

### Support / maintenance commands

| Command | Purpose |
| --- | --- |
| `/security` | security review path |
| `/fix-pr-checks` | runs `docs/agent/pr-check-fix-loop.md` (bounded: 2 rounds; security findings always surfaced) |
| `/cleanup` | session & worktree pruning (`scripts/prune-merged-worktrees.sh`, `scripts/prune-old-sessions.sh`) |
| `/sweep-stale-todos` | prune stale `.claude/todo.md` entries |
| `/docs-refresh` | on-demand documentation refresh |
| `/evaluate-me` | session retrospective (reads brief as contract) |
| `/auto-solve` | autonomous solve loop (browse-based verification) |
| `/mobile-flow-audit`, `/render-flow-audit` | UI audit paths |
| `/adversarial-template`, `/test-template` | fix-template stress-testing / scoring |
| `/test-pr-review-merge` | PR review-merge pipeline test |
| `/validate-agent-refs` | validates agent file cross-references |
| `/skills`, `/commands`, `/_index` | listings |

### Commands — Cursor (`.cursor/commands/`)

| Command | Purpose |
| --- | --- |
| `add-recipe` | wraps `.claude/skills/add-recipe/SKILL.md` |
| `commit-github`, `git` | git flows (rules force skill usage via `git-commit-must-use-skill.mdc`) |
| `deploy-github-pages` | wraps deploy skill |
| `fix-pr-checks` | same loop as Claude Code version |
| `done` | job-validation close-out (Cursor side) |
| `quick-chat` | lightweight Q&A mode |

---

## 4. Skills (`.claude/skills/*/SKILL.md`) — shared by both agents

| Skill | Trigger | Key connections |
| --- | --- | --- |
| `save-plan` | Plan Contract pasted / "save the plan" / plan not yet under `plans/` | runs `scripts/plan-name-similarity.mjs`; writes `plans/NNN-slug.plan.md` + `.claude/todo.md`; `.claude/.plan-write-ack` handshake with `plan-write-guard.sh`; Phase 4 = mid-flight brief↔plan sync |
| `brief-detection` | 3+ structured H2 markers in first message | gates execution → routes to `/feat` (option b) or discussion |
| `add-recipe` | recipe/dish from image/URL/text | writes RECIPE_LIST / DISH_LIST ledger |
| `angularComponentStructure` | any component class work | class structure + CRDUL ordering |
| `angular-pipe-logic` | pipe/directive work | — |
| `auth-and-logging` | guards, interceptors, HTTP CRUD | pairs with `standards-security.md` |
| `auth-crypto` | `auth-crypto.ts` hashing/tokens | — |
| `breadcrumb-navigator` | new subtree / structural change | maintains `breadcrumbs.md` files |
| `context-management` | `/checkpoint` mid-task | session handoff before context exhaustion |
| `cssLayer` | any `.scss`/`.css` edit | `.c-*` engine placement, token tiers |
| `deploy-github-pages` | explicit deploy request | — |
| `elegant-fix` | after hacky fix / duplicate logic | — |
| `github-sync` | session start, once per day | writes `notes/github-sync/YYYY-MM-DD.md` |
| `preflight` | before dev server / browser / DB workflows | env check |
| `techdebt` | end of session / before PR / audit | — |
| `update-docs` | after significant features / before PR | — |
| `worktree-setup` | "setup worktree" (explicit only) | — |

---

## 5. Automation: hooks + scripts

### Claude Code hooks (`.claude/settings.json`)

| Event | Script | Effect |
| --- | --- | --- |
| PreToolUse (Edit\|Write\|MultiEdit) | `scripts/branch-guard.sh` | **blocks writes on `main`** |
| PreToolUse (Edit\|Write\|MultiEdit) | `scripts/plan-write-guard.sh` | gates **new** `plans/*.plan.md` writes: runs similarity check; denies when similar plans exist unless `.claude/.plan-write-ack` names the target; existing-plan edits always allowed |
| SessionStart (startup) | `scripts/session-startup.sh` | loads previous session-state; sets `.claude/.session-state-path` save target |
| PostToolUse (Edit\|Write) | `scripts/session-manifest-hook.py` | records this-session file touches (multi-worktree staging safety) |
| PreCompact | `scripts/pre-compact-todo-append.sh` + `scripts/pre-compact-reminder.sh` | dumps open signals/todos before compaction |
| Stop | `scripts/handoff-check.sh` | handoff completeness check at turn end |

**Cursor runs none of these hooks.** Its equivalent enforcement is advisory `.mdc` rules + the shared pre-commit hooks.

### Workflow scripts (shared, `scripts/`)

| Script | Called by |
| --- | --- |
| `plan-name-similarity.mjs` | save-plan Phase 0 (both agents), `plan-write-guard.sh` |
| `session-manifest-ship.py` | `/ship` Phase 3 (worktree count > 1) — or a branch/HEAD-drift check when ≤1 worktree, same phase |
| `brain-review-check.mjs` | `/ship` feature-complete path (advisory) |
| `brain-capture-comment.mjs` | PR sticky brain-capture comment |
| `pre-commit-no-semi.mjs`, `pre-commit-secret-scan.mjs`, `pre-commit-security-grep.mjs` | pre-commit hooks (source of truth for enforcement per `AGENTS.md`) |
| `prune-merged-worktrees.sh`, `prune-old-sessions.sh` | `/cleanup` |

Data-repair scripts (not workflow): `backup-before-repair.mjs`, `diagnose-broken-refs.mjs`, `fix-duplicate-names.mjs`, `link-users-to-master.mjs`, `migrate-to-master.mjs`, `promote-guest-to-master.js`, `push-master-to-atlas.js`, `repair-recipe-references.mjs`, `trim-demo-data.mjs`, `check-lucide-icons.mjs`, `check-no-native-select.mjs`, `remove-trailing-semicolons.mjs`, `log-server.js`.

---

## 6. State stores (the "ledger" layer)

| Store | Written by | Read by |
| --- | --- | --- |
| `plans/NNN-slug.plan.md` (+ `plans/1-100/` archive) | save-plan; mid-flight Phase 4 appends | `/review-it`, `/brief`, `/ship` todo sync, Contractor |
| `.claude/todo.md` | save-plan Phase 1; mid-flight sync; `/ship`/`/done` mark `[x]` | `/brief` retroactive, `/ship`, `/done`, session startup |
| `.claude/todo-archive.md` | `/ship` (archives fully-complete plan sections) | — |
| `.claude/sessions/{session-id}/brief.md` | `/brief` | `/ship` Done-when check, `/evaluate-me` |
| `sessions/YYYY-MM-DD.md` | Contractor after each milestone | `/review-it` step 1 (handoff) |
| `docs/session-state*.md` (target in `.claude/.session-state-path`) | `/ship` Phase 5 | `session-startup.sh` on next session |
| `docs/brain/**` | `/ship` brain capture (auto-write on gate reply, opt out with `no brain`) | session start on unfamiliar work; architectural choices |
| `.claude/.plan-write-ack` | save-plan (save-as-new after Human confirm) | consumed once by `plan-write-guard.sh` |
| `notes/github-sync/YYYY-MM-DD.md` | github-sync skill | — |
| `.qa-reports/` | QA/audit runs | audits |

---

## 7. Flows (edges for the diagram)

### F1 — Plan lifecycle (persist gate)

```
Human describes feature
  → Architect (claude.ai) drafts Plan Contract
  → Human pastes contract into Cursor or Claude Code
  → [gate] save-plan skill (MANDATORY before any milestone work)
      → Phase 0: node scripts/plan-name-similarity.mjs --name="…"
          → no hits  → save as next NNN, no questions
          → hits     → STOP → Human: rewrite existing | save as new | cancel
      → Phase 1: append Atomic Sub-tasks to .claude/todo.md; allocate NNN (collision guard)
      → Phase 3: write plans/NNN-slug.plan.md
          (Claude Code: plan-write-guard.sh hook re-checks; .plan-write-ack unlocks save-as-new)
  → only now: brief/milestone execution may begin
```

### F2 — Milestone / brief execution loop

```
/brief (proactive) → brief.md names Parent plan path
  → Contractor executes ONE milestone → writes sessions/[date].md → STOPS
  → /review-it: reads newest session file → reads parent plan → checks milestone
      → APPROVE | RETURN TO CURSOR | ESCALATE TO ARCHITECT
  → mid-flight scope change (review fallout / Human adds stage):
      [gate] append [ ] to parent plan Atomic Sub-tasks + .claude/todo.md BEFORE doing the work
      (save-plan Phase 4 + job-validation "Plan file sync")
  → Human validation → next milestone or /ship
```

### F3 — Ship pipeline (`/ship`)

```
Phase 1  ng build            — unconditional hard stop on fail
Phase 2  /review             — one fix-and-recheck cycle max (or --skip-review "reason")
Phase 3  manifest check      — >1 worktree: session-manifest-ship.py; ≤1 worktree: branch/HEAD-drift check (baseline captured at ship start)
Phase 4  approval gate       — visual tree; Human Y = job validation
         on Y (hard order): mark todos/plan [x] → write approved brain drafts
                            → git add listed paths → one commit → rename branch → push if asked
         commit-vs-PR judgment: brief Done-when met → PR; else checkpoint (no PR); ad-hoc → ask
Phase 4.5 Merge Gate         — mandatory after any successful push (standards-git.md)
         replies: merge | later | open-pr-only (brain draft auto-writes; add "no brain" to opt out, "brain edit …" to revise)
Phase 5  session-state write — target from .claude/.session-state-path
Phase 6  (todo sync already done in Phase 4)
```

### F4 — Job validation without ship (Path B)

```
Agent finishes job → MUST print HOW TO VALIDATE bullets, then "JOB DONE" block
  → Human: done/verified/approved → mark matching todo + plan [x] on disk
  → verify → agent walks checklist, then re-show JOB DONE
  → not yet → keep [ ]   |   edit list → revise, re-show
(thanks/ok/silence/CI-green never count)
```

### F5 — Session lifecycle (Claude Code)

```
SessionStart → session-startup.sh → loads docs/session-state*.md + sets save target
  → github-sync skill (once per calendar day)
  → work … (branch-guard + plan-write-guard on every write; session-manifest on every edit)
  → context full → PreCompact hooks dump todos → /compact focus … (or /clear + state reload)
  → Stop → handoff-check.sh
  → /ship Phase 5 → writes session-state for next session
```

### F6 — PR checks fix loop

```
PR checks fail → /fix-pr-checks → docs/agent/pr-check-fix-loop.md
  → max 2 rounds; security-scan findings ALWAYS surfaced to Human; then stop
```

### F7 — Brain capture (knowledge loop)

```
Durable learning in session (decision/gotcha/pattern)
  → /ship Phase 4/4.5 proposes: path + title + FULL draft body (fenced)
  → usefulness gate; one-liner proposals forbidden
  → auto-writes verbatim to docs/brain/** on the gate reply (Y / merge / later / open-pr-only); "no brain" opts out
  → next sessions: read docs/brain/index.md → relevant sub-file only
```

---

## 8. Connection matrix (quick edge list)

```
/feat        --invokes-->  /plan, /review-it
/ship        --invokes-->  /review; --runs--> session-manifest-ship.py, brain-review-check.mjs
/ship        --writes-->   .claude/todo.md, plans/*.plan.md ([x]), docs/brain/**, session-state
/review-it   --reads-->    sessions/*.md, plans/*
/brief       --writes-->   .claude/sessions/{id}/brief.md; --reads--> plans/* (parent)
save-plan    --runs-->     plan-name-similarity.mjs; --writes--> plans/*, .claude/todo.md, .plan-write-ack
plan-write-guard.sh --gates--> Write/Edit on plans/*.plan.md; --runs--> plan-name-similarity.mjs
branch-guard.sh     --gates--> all Write/Edit (blocks main)
brief-detection     --gates--> structured pasted briefs; --routes--> /feat | discussion
job-validation      --gates--> marking any [x]; --requires--> Human done / ship Y
brain-capture.md    --gates--> any docs/brain write (shown, then auto-writes; "no brain" opts out)
standards-git.md    --gates--> post-push (Merge Gate, mandatory)
pre-commit hooks    --gate--> every commit (no-semi, secret-scan, security-grep) [shared with Cursor]
```

---

## 9. Known inconsistencies (as of 2026-07-20 — flag these in the visual)

1. **Ghost plan 285** — `.claude/todo.md` tracks `plans/285-ai-menu-phase1.plan.md` with ~22 `[x]` items; the file does not exist. Proof the persist gate was bypassed.
2. **Convention fork** — `/plan`, `/feat`, `/review-it` describe a "new convention" `plans/[feature]_v[N].md`; save-plan, `plan-write-guard.sh`, and `plan-name-similarity.mjs` only recognize `NNN-slug.plan.md` (`*.plan.md` suffix). Zero files on disk use the `_v[N]` form — and any that did would bypass both the guard and the similarity check.
3. **Duplicate NNN** — pairs exist for 234, 239, 241, 247, 248, 250, 259, 268 (parallel sessions/worktrees defeat the 60-second collision guard).
4. **Unnumbered strays** — `plans/nightly-audit-implementation.plan.md`, `plans/tofix.md_verification_report_b26bdf9a.plan.md`, `plans/unused-*.plan.md`.
5. **brief-detection vs save-plan race** — a pasted Plan Contract contains the same H2 markers that trigger brief-detection; option `b` routes straight to `/feat` execution without ever mentioning save-plan.
6. **No ledger integrity check** — nothing verifies that plan paths referenced in `.claude/todo.md` / briefs actually exist (would have caught #1 immediately).
7. **Cursor enforcement is advisory** — `plan-write-guard.sh` is a Claude Code hook; Cursor only has the `.mdc` rule text. Shared pre-commit hooks are the only hard gate Cursor passes through.
