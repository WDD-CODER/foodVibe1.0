# AGENTS.md — FoodVibe 1.0 (tool-agnostic)

Single source of truth for hard rules, conventions, and skill triggers. Claude Code and Cursor both defer here.

## Hard rules

- Never write on `main`. Work only on `feature/`, `fix/`, or `chore/` branches.
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
- **Job validation (all agents):** A job is **not done** until the Human validates it. Never self-mark todos. Full procedure: `docs/agent/job-validation.md`.
- **Plan Contracts (all agents):** A pasted/approved big plan must be persisted under `plans/` via `.claude/skills/save-plan/SKILL.md` before milestone execution. Run `node scripts/plan-name-similarity.mjs --name="…"` first — ask rewrite/save-as-new/cancel **only** when similar name hits exist. Mid-brief new tasks must be appended to that plan’s Atomic Sub-tasks and `.claude/todo.md`.

## Job validation (all agents)

A requested job stays open until Human validation. Mid-milestone STOP for review is unchanged.

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

Never show the JOB DONE ask without HOW TO VALIDATE above it (or a one-line “no user-visible effect” note). Full bullet rules: `docs/agent/job-validation.md`.

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
| End of session, before PR, after large features, or "audit tech debt" | `.claude/skills/techdebt/SKILL.md` |
| After significant features/components/services, or before a PR | `.claude/skills/update-docs/SKILL.md` |
| User says "setup worktree" / "new worktree" (on-demand only) | `.claude/skills/worktree-setup/SKILL.md` |
| List available skills | `.claude/commands/skills.md` |
| List available commands | `.claude/commands/commands.md` |
| Finishing a feature | `/ship` (runs review automatically; `--skip-review "reason"` for trivial changes; commits are PR'd only when feature-complete; milestone commits push without a PR). After any successful push off `main`, the Post-push Merge Gate in `docs/agent/standards-git.md` is mandatory — including Brain capture proposal (not `/ship`-only; confirm-to-write). |
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
| `docs/agent/standards-git.md` | Committing, pushing, PRs, branch renames, any git write; includes mandatory Post-push Merge Gate + Brain capture confirm-to-write |
| `docs/agent/brain-capture.md` | Proposing or writing any `docs/brain/` entry — extraction procedure, required shapes, usefulness gate, proposal format |
| `docs/agent/job-validation.md` | When a job is done; Human validation; close-out ask; marking todos `[x]` (ship Y or chat `done`) |

Stack detail: `/_shared/tech-stack.md`.

## Enforcement

Enforcement is automated via pre-commit hooks and CI — agents should run `npx eslint --fix` proactively but the hooks are the source of truth.


