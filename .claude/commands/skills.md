---
description: List all registered skills, triggers, and scope
allowed-tools: Read, Glob, Bash
---

# /skills — List Available Skills

Show all registered skills with trigger patterns and file locations.

## Execution (fast path — default)

1. **Do not** read every `SKILL.md`. **Do not** call MCP / memory tools.
2. Print the **Current registry** table below as-is.
3. Optional freshness (one cheap check only):
   - `Glob` `.claude/skills/*/SKILL.md` under the repo `.claude/skills/` only (ignore `claude-workflow-sdk/` and other trees).
   - Compare the skill-dir name set to the `File` column paths (e.g. `add-recipe` from `.claude/skills/add-recipe/SKILL.md`).
   - **Exclude retired dirs** even if present on disk: `mp-search`, `nightly-audit`, `worktree-session-end`, `execute-debugging`.
   - If active sets match → done (print table; no further reads).
   - If sets differ → run **Refresh path** once, then print the rebuilt table.
4. `/skills --refresh` (or user says "refresh") → skip straight to **Refresh path**.
5. Do **not** invent skills that are not on disk.
6. Do **not** list retired skills in the printed table.

### Refresh path (only on mismatch or `--refresh`)

1. Enumerate `.claude/skills/*/SKILL.md` (repo skills only; skip dirs without `SKILL.md`).
2. Skip retired: `mp-search`, `nightly-audit`, `worktree-session-end`, `execute-debugging`.
3. For each remaining skill, read frontmatter `description` and the first `**Trigger:**` / `## Trigger` / `## When to checkpoint` line.
4. Scope: `[SHARED]` = Cursor + Claude Code; `[CC]` = Claude Code slash/command path only (or historically CC-gated).
5. Rebuild and print the table. Prefer also updating this file's embedded registry in the same change when adding/removing a skill.
6. Optionally append a one-line note if a non-retired skill folder exists without `SKILL.md`.

## Current registry

| Trigger | File | Scope |
| --- | --- | --- |
| User adds a recipe or dish from an image, URL, or raw text | `.claude/skills/add-recipe/SKILL.md` | SHARED |
| Before creating or refactoring an Angular Pipe or Directive | `.claude/skills/angular-pipe-logic/SKILL.md` | SHARED |
| Before creating or refactoring any Angular component class | `.claude/skills/angularComponentStructure/SKILL.md` | SHARED |
| Touching auth guards, interceptors, user services, HTTP CRUD, or protected access | `.claude/skills/auth-and-logging/SKILL.md` | SHARED |
| Implementing or refactoring hashing/encryption/tokens in `auth-crypto.ts` | `.claude/skills/auth-crypto/SKILL.md` | SHARED |
| New `pages/<x>/` or top-level subtree; structural changes; after `update-docs` | `.claude/skills/breadcrumb-navigator/SKILL.md` | SHARED |
| First message has 3+ brief markers (`## Goal`, `## Steps`, `## Done when`, …) | `.claude/skills/brief-detection/SKILL.md` | CC |
| Mid-task checkpoint before context exhaustion (`/checkpoint`) | `.claude/skills/context-management/SKILL.md` | SHARED |
| Before creating or editing any `.scss` / `.css` in `src/` | `.claude/skills/cssLayer/SKILL.md` | SHARED |
| User says deploy / publish app / GitHub Pages (explicit only) | `.claude/skills/deploy-github-pages/SKILL.md` | SHARED |
| After a hacky fix, before a "not ideal" PR, or when duplicate/special-case logic appears | `.claude/skills/elegant-fix/SKILL.md` | SHARED |
| Session start or after time away (once per calendar day) | `.claude/skills/github-sync/SKILL.md` | SHARED |
| Before workflows that touch dev server / browser / database | `.claude/skills/preflight/SKILL.md` | SHARED |
| User says "save the plan" / "save plan" / confirm plan persist, **or** pastes a Plan Contract / big plan | `.claude/skills/save-plan/SKILL.md` (+ `scripts/plan-name-similarity.mjs`) | SHARED |
| End of session, before PR, after large features, or "audit tech debt" | `.claude/skills/techdebt/SKILL.md` | SHARED |
| After significant features/components/services, or before a PR | `.claude/skills/update-docs/SKILL.md` | SHARED |
| User says "setup worktree" / "new worktree" (on-demand only) | `.claude/skills/worktree-setup/SKILL.md` | SHARED |

## Notes

- `copilot-instructions.md` §0 was retired in the three-agent cutover. This command is the discoverability surface.
- Slash commands live in `.claude/commands/` — use `/commands` or see `_index.md`. Skills are separate from commands.
- When adding/removing a skill, update this table in the same change.
- Do not list retired skills (`mp-search`, `nightly-audit`, `worktree-session-end`, `execute-debugging`) even if mentioned in archives.
