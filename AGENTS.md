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
| User says "save the plan" / "save plan" / confirm plan persist | `.claude/skills/save-plan/SKILL.md` |
| End of session, before PR, after large features, or "audit tech debt" | `.claude/skills/techdebt/SKILL.md` |
| After significant features/components/services, or before a PR | `.claude/skills/update-docs/SKILL.md` |
| User says "setup worktree" / "new worktree" (on-demand only) | `.claude/skills/worktree-setup/SKILL.md` |
| List available skills | `.claude/commands/skills.md` |
| List available commands | `.claude/commands/commands.md` |
| Finishing a feature | `/ship` (runs review automatically; `--skip-review "reason"` for trivial changes; commits are PR'd only when feature-complete; milestone commits push without a PR) |
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
| `docs/agent/standards-git.md` | Committing, pushing, PRs, branch renames, any git write |

Stack detail: `/_shared/tech-stack.md`.

## Enforcement

Enforcement is automated via pre-commit hooks and CI — agents should run `npx eslint --fix` proactively but the hooks are the source of truth.


