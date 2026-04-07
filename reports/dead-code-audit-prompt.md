# Dead Code Audit — Agent Prompt

Copy everything below this line and run it as your agent prompt.

---

## YOUR MISSION

You are performing a full dead code audit of the **foodVibe 1.0** Angular project.

Your job is to find everything in this codebase that exists but is no longer used — application code, shared components, AI workflow skills and agents, scripts, styles, and assets.

You are a **read-only investigator**. You will scan files, cross-reference them, and produce a single report. You will **not change, delete, or fix anything**. The report is the only output.

---

## PROJECT ENTRY POINTS

Start your dependency walk from these two files. Everything that is alive must trace back to one of them:

- `src/app/app.routes.ts` — all lazy-loaded routes, guards, and resolvers
- `src/app/app.config.ts` — all providers, interceptors, and global services

---

## WHAT TO IGNORE

- Any file ending in `.spec.ts` — skip entirely, do not mention in the report
- Any file named `breadcrumbs.md` — skip entirely
- Angular CLI internal wiring (polyfills, `main.ts`, `index.html`) — these are always alive

---

## AUDIT LAYERS

Work through each layer in order. For each item you find, assign a confidence tier (defined below).

---

### LAYER 1 — Angular Application Code (`src/app/`)

Scan every `.ts` and `.html` file under `src/app/`. For each category, apply the rule:

**Components**
- A component is dead if: its selector never appears in any `.html` template, AND it is not referenced in any `loadComponent()` call in `app.routes.ts`, AND it is not listed in any `imports: []` array in any other component or module.
- Exception: components that are the direct target of a lazy route are alive even if their selector is unused.

**Services**
- A service is dead if: its class name never appears in an `inject()` call, a constructor parameter type annotation, or a `providers: []` array anywhere in the codebase.

**Directives**
- A directive is dead if: its selector string never appears inside any `.html` file.

**Pipes**
- A pipe is dead if: its pipe name (the string in `@Pipe({ name: '...' })`) never appears after a `|` character in any `.html` file.

**Models, Interfaces, and Types** (`src/app/core/models/`)
- A model file is dead if: none of its exported names are imported in any `.ts` file.
- Check each export individually — a file may have one live type and two dead ones.

**Resolvers** (`src/app/core/resolvers/`)
- A resolver is dead if: its function/class name never appears in a `resolve:` block in `app.routes.ts`.

**Guards** (`src/app/core/guards/`)
- A guard is dead if: its function/class name never appears in a `canActivate`, `canDeactivate`, or `canMatch` entry in `app.routes.ts`.

**Interceptors** (`src/app/core/interceptors/`)
- An interceptor is dead if: its name never appears in `app.config.ts` (inside `withInterceptors()` or `HTTP_INTERCEPTORS` provider).

**Exported utility functions**
- A utility function is dead if: it is exported from its file but that export is never imported anywhere else in `src/app/`.

---

### LAYER 2 — Shared Components (`src/app/shared/`)

These deserve extra attention. Each folder under `src/app/shared/` contains a component (and sometimes a service) that was built to be reused.

For each shared component:
1. Search all `.html` files for its selector
2. Search all `.ts` files for its class name (imports, inject calls, ViewChild references)
3. Check `app.routes.ts` for any route that loads it directly

If a shared component has zero hits across all three checks — it is dead.

Also check the service files inside shared folders (e.g., `label-creation-modal.service.ts`) — apply the same service rule from Layer 1.

---

### LAYER 3 — Skills and Commands (`.claude/skills/`, `.claude/commands/`)

For each skill folder under `.claude/skills/` and each file under `.claude/commands/`, perform three checks:

**Check A — Is it invoked at all?**
Search these files for the skill/command name:
- `CLAUDE.md`
- `.claude/copilot-instructions.md`
- `agent.md`
- Every other skill's `SKILL.md` or main file
- Every file in `.claude/commands/`
- Any `notes/` or `plans/` directory entries

If the skill name (or its slash-command trigger) appears in none of these → **not invoked**.

**Check B — Is the invocation still valid?**
If the skill IS referenced somewhere, check whether the reference matches what the skill actually does today:
- Does the trigger keyword in the caller match the current skill name or alias?
- Does the description of the skill in `copilot-instructions.md` match what the skill's own `SKILL.md` says it does?
- If the skill was renamed or restructured, the old caller is a broken reference.

**Check C — How often is it referenced?**
Count total references. Report: zero / once / multiple times.

---

### LAYER 4 — Agents (`.claude/agents/`)

For each `.md` file in `.claude/agents/`:

**Check A — Is it in the agent roster?**
Look in `.claude/copilot-instructions.md` for the agent roster section (§0.3). Is this agent listed there? If not — it may be a ghost.

**Check B — Is it invoked anywhere?**
Search `CLAUDE.md`, `copilot-instructions.md`, `agent.md`, and all skills for the agent's name or its invocation pattern. If zero hits → not invoked.

**Check C — Does the description still match?**
If the agent IS listed in the roster, compare the roster description to what the agent file actually defines. Flag any mismatch — this means the agent was updated but the roster was not (or vice versa).

---

### LAYER 5 — Scripts (`scripts/`)

For each file in `scripts/`:

1. Check `package.json` — is this script called in any npm script?
2. Check any CI/CD config files (`.github/workflows/`, `*.yml`, `*.yaml`) — is this script called?
3. Check if any other script file calls it

If none of the above → dead script.

Also flag any script in `package.json` that calls a file which no longer exists.

---

### LAYER 6 — SCSS and Assets

**SCSS**
For each `.scss` file under `src/`:
- If it is a partial (filename starts with `_`): check if any other `.scss` file `@use`s or `@forward`s it. If none → dead partial.
- If it is a component's own `.scss` (e.g., `header.component.scss`): it is alive if the component is alive. Dead component = dead SCSS — no need to list these separately, just note it in the component's row.

**Assets** (`src/assets/` or equivalent)
- For each image, icon, or font file: search all `.html`, `.scss`, `.ts`, and `angular.json` for its filename. If no reference found → dead asset.

---

## CONFIDENCE TIERS

Tag every finding with exactly one of these:

| Tier | When to use |
|---|---|
| **CONFIRMED DEAD** | Zero references found anywhere in the live codebase |
| **PROBABLE DEAD** | Only referenced by something that is itself dead (orphan chain — the caller is also dead) |
| **INVESTIGATE** | Referenced in a comment or a string literal (not a real import or invocation), OR only referenced in a file that is deprecated/disabled, OR the reference exists but does not match the current definition |

---

## REPORT FORMAT

Write the final report to: `reports/dead-code-audit.md`

Use the structure below. Write in **plain language** — avoid TypeScript jargon in descriptions. Describe what each thing *does*, not what it *is called*. The report is for a mixed team, not just developers.

---

```markdown
# Dead Code Audit Report
**Date:** [today's date]
**Scanned:** [total .ts + .html + .scss files counted]
**Skipped:** spec files, breadcrumbs.md

---

## Overview

[2–4 sentence plain summary: how much of the codebase looks unused,
which layers have the most dead weight, and what the team should
prioritize cleaning up first.]

---

## Layer 1: Application Logic

**Summary:** [1–2 sentences — what was found here overall]

| Item | What it does | Tier | Why it looks dead |
|---|---|---|---|
| path/to/file.ts | [plain description] | CONFIRMED DEAD | [plain reason] |

---

## Layer 2: Shared UI Components

**Summary:** [1–2 sentences]

| Component | What it does | Tier | Why it looks dead |
|---|---|---|---|

---

## Layer 3: Skills & Commands (AI Workflow Tooling)

**Summary:** [1–2 sentences — are these tools being used? any broken wiring?]

| Skill / Command | What it's supposed to do | Invoked? | Invocation valid? | References | Tier |
|---|---|---|---|---|---|
| skill-name | [plain description] | Yes / No | Yes / No / Mismatch | 0 / 1 / many | CONFIRMED DEAD / INVESTIGATE |

---

## Layer 4: Agents

**Summary:** [1–2 sentences]

| Agent | What it's supposed to do | In roster? | Invoked? | Description matches? | Tier |
|---|---|---|---|---|---|

---

## Layer 5: Scripts

**Summary:** [1–2 sentences]

| Script file | What it does | Called from | Tier |
|---|---|---|---|

---

## Layer 6: Styles & Assets

**Summary:** [1–2 sentences]

| File | Type | Tier | Why |
|---|---|---|---|

---

## Team Action Plan

This is your prioritized checklist for the cleanup work ahead.

### Safe to Delete
These are CONFIRMED DEAD with no ambiguity. Delete them and run `ng build` to confirm nothing breaks.

- [ ] item — reason
- [ ] item — reason

### Needs a Second Look
These are PROBABLE DEAD or have a mismatch. A developer should verify before deleting.

- [ ] item — what to verify
- [ ] item — what to verify

### Investigate Before Deciding
These are INVESTIGATE tier — referenced in ways that look real but may not be. Do not delete without understanding the reference.

- [ ] item — what is suspicious about it
- [ ] item — what is suspicious about it

### Do Not Touch
Items that appear unused but should be kept — with a clear explanation of why.

- item — reason to keep
```

---

## EXECUTION NOTES

- Read files; do not edit them.
- If a file is very large and you only need to check for a specific name, use targeted search (grep equivalent) rather than reading the whole file.
- When checking a skill folder, read the skill's main entry file (usually `SKILL.md` or `index.md` or the first `.md` inside the folder).
- Work layer by layer. Complete one layer fully before moving to the next.
- If you find an orphan chain (dead item A is referenced only by dead item B), report both items and note the chain relationship.
- Be conservative on the INVESTIGATE tier — when uncertain, flag it rather than calling it dead. The team will make the final call.
- The report is the deliverable. Make it clear, scannable, and honest.
