# AGENTS.md — FoodVibe 1.0 (tool-agnostic)

Single source of truth for hard rules and skill triggers. Both agents defer here.

## Hard rules

- Never write on `main` — except the Planner committing `plans/*.plan.md` + `.claude/todo.md`. All code goes through a `feature/`/`fix/`/`chore/` branch (Worker slots use `feat/NNN-<slug>`).
- `ng build` must pass before any commit.
- Signals only: `signal()`, `computed()`, trailing underscore for private state. No `BehaviorSubject`.
- `inject()` for DI — never constructor injection.
- `input()` / `output()` / `model()` — never `@Input` / `@Output`.
- `.c-*` engine classes live in `src/styles.scss` only.
- Logical CSS properties only.
- No `any`. Single quotes and no semicolons in `.ts`. Double quotes in `.html`.
- Gemini calls proxied through `server/routes/ai.js` only — never a client-side key.
- Secrets live in `.env` only. Never read, print, hardcode, or commit them.
- Hebrew UI strings always through `translatePipe` + `dictionary.json`.
- Browser work goes through gstack `/browse`, never raw Playwright MCP. Default: hand the Human a numbered click/check list for multi-step UI checks; do single-step cheap checks yourself (DB query, log read, one screenshot).
- Compaction: on a context-full warning, state open signals/todos in chat, then prefer `/compact focus on <current job + open signals>`; between unrelated tasks prefer `/clear` + session-state reload.
- **Job validation (all agents):** A job is not done until every Done-when item is validated — `[auto]` by agent evidence (exact output/exit code/build pass; only the plan author tags `[auto]`), `[human]`/untagged by the Human; never self-mark `[human]` items or skip marking with "Contractor does not mark." Counts as validation: `/ship` **Y**/`--yes`, `done`/`verified`/`approved`, `/done` — not `thanks`/`ok`/silence/CI green alone. Full procedure: `docs/agent/job-validation.md`.
- **Plan Contracts (all agents):** A pasted/approved big plan must be persisted under `plans/` via `.claude/skills/save-plan/SKILL.md` before milestone execution. Mid-brief new tasks append to that plan's Atomic Sub-tasks (and `.claude/todo.md` — Planner only).
- **Planner-Worker workflow:** Planner (main, on `main`) writes/pushes `plans/*.plan.md` + `.claude/todo.md` directly; Workers use slots `wt-1`=4201/3001, `wt-2`=4202/3002, `wt-3`=4203/3003 (`main`=4200/3000), writing only inside their plan's `## Read-Write Scope`. Hotspots (`styles.scss`, `dictionary.json`, `app.routes.ts`) are append-only; Workers never write `.claude/todo.md`; `--no-verify` push to `main` is human-only. Rest: `docs/brain/decisions/0009-planner-worker-worktrees.md`.
- **Worker blocked outside scope (including an unmet plan Prerequisite):** offer `approved: <path>` first — per the plan's Escalation Protocol — never conclude unprompted that "this needs its own plan." That costs a full Planner round trip; a one-line `approved:` reply does not.
- **Kit-owned files** (`docs/workflow-kit/kit-owned.json`): change them in `../ai-workflow-kit` first, then bring the kit diff into FoodVibe as a hand-applied patch on a `chore/` branch. `kit-sync` doesn't work on FoodVibe until it's kit-installed. Steps: `docs/brain/decisions/0018-kit-changes-reach-foodvibe-as-patches.md`.

## Compact instructions

Preserve across `/compact`: current plan number + branch, open todos, and any failing checks.

## Skill triggers

| Trigger | File |
| --- | --- |
| Before an Angular Pipe or Directive | `.claude/skills/angular-pipe-logic/SKILL.md` |
| Before any Angular component class | `.claude/skills/angularComponentStructure/SKILL.md` |
| Auth guards, interceptors, user services, HTTP CRUD | `.claude/skills/auth-and-logging/SKILL.md` |
| Hashing/tokens in `auth-crypto.ts` | `.claude/skills/auth-crypto/SKILL.md` |
| New `pages/<x>/` or top-level subtree; after `update-docs` | `.claude/skills/breadcrumb-navigator/SKILL.md` |
| Before any `.scss` / `.css` edit in `src/` | `.claude/skills/cssLayer/SKILL.md` |
| After a hacky fix, or duplicate/special-case logic appears | `.claude/skills/elegant-fix/SKILL.md` |
| Session start or after time away (once/day) | `.claude/skills/github-sync/SKILL.md` |
| Before dev server / browser / database workflows | `.claude/skills/preflight/SKILL.md` |
| "save the plan" or pastes a Plan Contract to execute | `.claude/skills/save-plan/SKILL.md` (+ `scripts/plan-name-similarity.mjs`) |
| Brief adds a new stage / review fallout task | Append `[ ]` to parent plan's Atomic Sub-tasks + `.claude/todo.md` first |
| Before PR, or "audit tech debt" | `.claude/skills/techdebt/SKILL.md` |
| Before a PR | `.claude/skills/update-docs/SKILL.md` |
| "execute plan NNN" inside a `wt-N` slot | `.claude/commands/take-plan.md` |
| "setup worktree" (one-time slot init, not per-plan) | `.claude/skills/worktree-setup/SKILL.md` |
| Human wants to validate away from the PC ("open remote" / "close remote") | `.claude/commands/remote.md` (`scripts/remote-port.mjs`) |
| List skills / commands | `.claude/commands/skills.md` / `commands.md` |
| Finishing a feature | `/ship` — auto-classifies lane, commits/pushes, PRs only when feature-complete. Mandatory Post-push Merge Gate + brain capture: `docs/agent/standards-git.md`. |
| Job validation — finishing a job, marking todos `[x]`, or done/verified/approved | `docs/agent/job-validation.md` + `/done` |
| PR checks failing | `docs/agent/pr-check-fix-loop.md` (via `/fix-pr-checks`), 2 rounds max |
| Session start on unfamiliar work | `docs/brain/index.md`, then the relevant sub-file |
| Architectural choice | `docs/brain/decisions/` first; supersede, never edit in place |
| Surprising behavior / a trap cost time | `docs/brain/gotchas.md` first |

## Standards index

| File | Load when |
| --- | --- |
| `docs/agent/conventions.md` | Editing components, templates, SCSS/CSS, or translation keys |
| `docs/agent/standards-angular.md` | Components, pipes, directives, SCSS, folder structure |
| `docs/agent/standards-security.md` | Auth, guards, interceptors, storage, crypto, security reviews |
| `docs/agent/standards-domain.md` | Translation keys, Hebrew values, Lucide icons, ingredient ledger |
| `docs/agent/standards-backend.md` | New entity types, persisted fields, CRUD, backend API contract |
| `docs/agent/standards-git.md` | Any git write; mandatory Post-push Merge Gate + brain capture |
| `docs/agent/brain-capture.md` | Writing a `docs/brain/` entry — shapes, usefulness gate |
| `docs/agent/job-validation.md` | When a job is done; marking todos `[x]` |

Stack: `/_shared/tech-stack.md`.
