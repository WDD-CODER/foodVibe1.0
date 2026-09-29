# AGENTS.md — FoodVibe 1.0 (tool-agnostic)

Single source of truth for hard rules, conventions, and skill triggers. Claude Code and Cursor both defer here.

## Hard rules

- Never write on `main` — except the Planner committing `plans/*.plan.md` and `.claude/todo.md`. All code goes through a `feature/`, `fix/`, or `chore/` branch (Worker slots use `feat/NNN-<slug>`).
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
- Browser interaction goes through gstack `/browse` — never raw Playwright MCP directly.
- Compaction: when a context-full warning appears, state open signals/todos in chat first, then prefer `/compact focus on <current job + open signals>`. Between unrelated tasks prefer `/clear` + session-state reload over `/compact`.
- **Job validation (all agents):** A job is not done until every Done-when item is validated. `[auto]` items by agent evidence, `[human]`/untagged by the Human. Never self-mark `[human]` items. Full procedure: `docs/agent/job-validation.md`. Fully-done plan sections leave `.claude/todo.md` via `node scripts/todo-archive.mjs` into `.claude/todo-archive/NNN.md` (max 300 lines); see that doc’s Todo archive volumes section.
- **Browser validation delegation (all agents, default — override only on explicit "validate it yourself"):** When a HOW TO VALIDATE step needs multi-step UI interaction (opening a dropdown, filling a modal, clicking save, checking a toast) hand the Human a short numbered list of exactly what to click/check and what result to expect, and let them report back — don't drive the browser through that flow yourself. Multi-step UI automation (dropdown timing, modal focus, click-then-reopen races) burns a lot of tokens on retries and is exactly the kind of check a human does in one glance. Still do it yourself when the check is single-step and cheap and clearly higher-value done directly — a DB query, a network-log read, a one-shot screenshot, grepping a server log — since those don't have the multi-step-UI failure mode above.
- **Plan Contracts (all agents):** A pasted/approved big plan must be persisted under `plans/` via `.claude/skills/save-plan/SKILL.md` before milestone execution. Run `node scripts/plan-name-similarity.mjs --name="…"` first — ask rewrite/save-as-new/cancel **only** when similar name hits exist. Mid-brief new tasks must be appended to that plan’s Atomic Sub-tasks (and `.claude/todo.md` — Planner only, see Planner-Worker bullet below).
- **Planner-Worker workflow:** The Planner (main folder, on `main`) writes and pushes `plans/*.plan.md` + `.claude/todo.md` directly. A Worker (one of 3 permanent slots — `wt-1`=4201/3001, `wt-2`=4202/3002, `wt-3`=4203/3003, `main`=4200/3000 unchanged) claims a plan via "execute plan NNN" and may modify only that plan's `## Read-Write Scope`; anything else — STOP, tell the Human the file, exact change, and why, wait for `approved: <path>`, then append it to the scope block (enforced by `scripts/scope-guard.sh` + the `/ship` scope gate). Hotspots `src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` are append-only for every plan — add, never rewrite or remove an existing entry, without escalating the same way. Workers never write `.claude/todo.md`. `git push --no-verify` to `main` is human-only. Full detail: `docs/brain/decisions/0009-planner-worker-worktrees.md`.

## Job validation (all agents)

A requested job stays open until every Done-when item is validated. Mid-milestone STOP for review is unchanged.

**Tier 1 — `[auto]`:** exact-output criteria (exit code, exact string, byte-identical diff, `ng build`/tests) are self-verified; the agent prints `VERIFIED BY AGENT` with raw command + output and marks the todo itself (`todo-query mark --auto-verified`). Only the plan author tags `[auto]`.
**Tier 2 — `[human]` / untagged:** hard Human gate, exactly as below. `/ship` Y is commit/push consent in every case.

**Validation (counts):** `/ship` Approve **Y** / `--yes`; chat `done` / `mark done` / `mark it` / `verified` / `approved` / `LGTM for this job`; `/done` then confirm.  
**Does not count:** `thanks` / `ok` / `cool` / silence / CI green alone.

**When you finish a job and are not immediately running `/ship`:** end the turn with HOW TO VALIDATE bullets, then the JOB DONE ask:

```text
HOW TO VALIDATE
- {action} → {expected result}
- …

JOB DONE — awaiting your validation
Matched todos (still [ ]):
  - …
Reply: done  |  not yet  |  verify  |  edit list
```

Never show the JOB DONE ask without HOW TO VALIDATE above it (or a one-line “no user-visible effect” note, or `VERIFIED BY AGENT` for an all-`[auto]` job). Full bullet rules: `docs/agent/job-validation.md`.

**On validation:** MUST mark matching `.claude/todo.md` / plan Atomic Sub-tasks `[x]`.  
**On `/ship` Y:** mark → stage with job → commit → push (one commit; see ship Phase 4). Ship Phase 4 must also show HOW TO VALIDATE before Approve **Y**.  
Never skip with “Contractor does not mark.” Detail: `docs/agent/job-validation.md`.

## Skill triggers

| Trigger | File |
| --- | --- |
| User adds a recipe or dish from an image, URL, or raw text | `.claude/skills/add-recipe/SKILL.md` |
| Before creating or refactoring an Angular Pipe or Directive | `.claude/skills/angular-pipe-logic/SKILL.md` |
| Before creating or refactoring any Angular component class | `.claude/skills/angularComponentStructure/SKILL.md` |
| Touching auth guards, interceptors, user services, HTTP CRUD, or protected access | `.claude/skills/auth-and-logging/SKILL.md` |
| Implementing or refactoring hashing/encryption/tokens in `auth-crypto.ts` | `.claude/skills/auth-crypto/SKILL.md` |
| New `pages/<x>/` or top-level subtree; structural changes; after `update-docs` | `.claude/skills/breadcrumb-navigator/SKILL.md` |
| Mid-task checkpoint before context exhaustion (`/checkpoint`) | `.claude/skills/context-management/SKILL.md` |
| Before creating or editing any `.scss` / `.css` in `src/` | `.claude/skills/cssLayer/SKILL.md` |
| User says deploy / publish app / GitHub Pages (explicit only) | `.claude/skills/deploy-github-pages/SKILL.md` |
| After a hacky fix, before a "not ideal" PR, or when duplicate/special-case logic appears | `.claude/skills/elegant-fix/SKILL.md` |
| Session start or after time away (once per calendar day) | `.claude/skills/github-sync/SKILL.md` |
| Before workflows that touch dev server / browser / database | `.claude/skills/preflight/SKILL.md` |
| User says "save the plan" / "save plan" / confirm plan persist, **or** pastes a Plan Contract / big plan to execute | `.claude/skills/save-plan/SKILL.md` (+ `scripts/plan-name-similarity.mjs`) |
| Brief execution adds a new stage / review fallout task | Append `[ ]` to parent `plans/….plan.md` Atomic Sub-tasks + `.claude/todo.md` before doing the work |
| Before PR, or "audit tech debt" | `.claude/skills/techdebt/SKILL.md` |
| Before a PR | `.claude/skills/update-docs/SKILL.md` |
| User says "execute plan NNN" / "take plan NNN" inside a `wt-N` slot | `.claude/commands/take-plan.md` |
| User says "setup worktree" / "new worktree" (one-time slot init only — not per-plan) | `.claude/skills/worktree-setup/SKILL.md` |
| List available skills | `.claude/commands/skills.md` |
| List available commands | `.claude/commands/commands.md` |
| Finishing a feature | `/ship` (Phase 0 auto-classifies the diff into FAST / ULTRA-TRIVIAL / REGULAR and announces which lane it's running — force with `/ship fast` or `/ship regular`; `--skip-review "reason"` still works standalone; commits are PR'd only when feature-complete; milestone commits push without a PR). After any successful push off `main`, the Post-push Merge Gate in `docs/agent/standards-git.md` is mandatory — including Brain capture proposal (not `/ship`-only; auto-writes on the gate reply, see `docs/brain/decisions/0006-auto-write-brain-capture-by-default.md`). |
| Agent finished a job / user says done, mark done, verified, approved (no ship) | `docs/agent/job-validation.md` + `/done` — close-out ask, then mark todos on Human confirm |
| Job validation / when to mark todos `[x]` | `docs/agent/job-validation.md` |
| PR checks failing | Run `docs/agent/pr-check-fix-loop.md` (via `/fix-pr-checks` in either tool). Bounded: 2 rounds max, security-scan findings always surface to the user. |
| Session start on unfamiliar work | Read `docs/brain/index.md`, then only the relevant sub-file |
| Architectural choice | Check `docs/brain/decisions/` first; supersede, never edit in place |
| Surprising behavior / a trap cost time | `docs/brain/gotchas.md` first |

## Standards index

| File | Load when |
| --- | --- |
| `docs/agent/conventions.md` | Creating/editing Angular components, templates, SCSS/CSS, or translation keys |
| `docs/agent/standards-angular.md` | Creating or refactoring components, pipes, directives, SCSS, folder structure |
| `docs/agent/standards-security.md` | Auth, guards, interceptors, storage, crypto, security reviews, go-live |
| `docs/agent/standards-domain.md` | Translation keys, Hebrew canonical values, Lucide icons, ingredient ledger |
| `docs/agent/standards-backend.md` | New entity types, persisted fields, CRUD/data services, backend API contract |
| `docs/agent/standards-git.md` | Committing, pushing, PRs, branch renames, any git write; includes mandatory Post-push Merge Gate + Brain capture (auto-write on gate reply, opt out with `no brain`) |
| `docs/agent/brain-capture.md` | Proposing or writing any `docs/brain/` entry — extraction procedure, required shapes, usefulness gate, proposal format |
| `docs/agent/job-validation.md` | When a job is done; Human validation; close-out ask; marking todos `[x]` (ship Y or chat `done`) |

Stack detail: `/_shared/tech-stack.md`.
