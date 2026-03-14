---
name: Tech debt analysis execution
overview: Plan for running the full technical debt analysis defined in .assistant/skills/techdebt/SKILL.md — scope selection, all seven phases, report output, and optional copilot-instructions updates.
---

# Tech Debt Analysis — Execution Plan

Execute the workflow in [.assistant/skills/techdebt/SKILL.md](.assistant/skills/techdebt/SKILL.md) and produce a dated report. Existing report format precedent: [tech-debt-report-2026-03-12.md](tech-debt-report-2026-03-12.md).

## Scope

- **Full project (default):** Use when running at end of session, before PR, or weekly. Analyze all of `src/app/` for Phases 1–6; for Phase 7 use working tree (e.g. `git status`, `git diff --name-only`) to find new/changed components and services that need spec coverage.
- **Working tree only:** Use when invoked from commit-to-github (Phase 0). Get file list via `git status` and `git diff --name-only` (modified, deleted, untracked to be committed). Run every phase only for those files. Phase 7: among those files, list components/services that need new or updated `.spec.ts`.

Decide scope at start; all phases then apply to that scope.

## Phase-by-phase execution

### Phase 1 — Duplicate code

- **Full:** Search `src/app/` for similar export signatures (function/const/class names), similar component selectors, repeated signal patterns. Use explore agent or grep for copy-pasted blocks (5+ lines) and consolidatable utilities; report file:line or file ranges.
- **Working tree:** Same checks only within or between the scoped files; report file:line.

### Phase 2 — Dead code

- **Full:** List exported symbols from `src/app/**/*.ts` (excluding `.spec.ts`); cross-check with imports across the repo. Flag components not in `app.routes` or not used by any template.
- **Working tree:** List exports only from scoped files; cross-check if they are imported elsewhere; for scoped components, verify they are routed or used.

### Phase 3 — TODO / FIXME / HACK audit

- **Full:** Grep `src/` for `TODO`, `FIXME`, `HACK`, `XXX` in `.ts`, `.html`, `.css`/`.scss`; count and list with file:line. Optionally spot-check age via `git blame`.
- **Working tree:** Same, restricted to scoped files.

### Phase 4 — File size

- **Full:** List every `.ts`, `.scss`, `.html` under `src/app/` with line count; report those over 300 lines (project standard).
- **Working tree:** Report only scoped files over 300 lines.

### Phase 5 — Style violations

- **Full:** Search `src/app/` for: `@Input()`, `@Output()` (prefer `input()`/`output()`); `BehaviorSubject` (prefer `signal()`); `style=` in HTML; `: any` or `any` types; semicolons in TS if project style is no-semicolon.
- **Working tree:** Same patterns, scoped to the file list.

### Phase 6 — Translation

- **Full:** Search for Hebrew codepoints (e.g. Unicode range for Hebrew) in HTML under `src/`. List files; note where `translatePipe` or dictionary keys should be used.
- **Working tree:** Same search only in scoped files; verify dictionary keys for any `translatePipe` usage there.

### Phase 7 — Spec coverage

- Use working tree (e.g. `git status`, `git diff --name-only`) to get files to be committed. Among them, find `.component.ts` and `.service.ts` in `src/app/` that are new or materially changed. For each, check for co-located `.spec.ts` and whether it's adequate (not just a stub when behavior is non-trivial). List paths that **need** a new or updated spec.
- **Output:** "Spec coverage" section with file paths only; report-only (commit-to-github flow will act on it).

## Report output

- **Path:** Create/overwrite `tech-debt-report-YYYY-MM-DD.md` at repo root (match existing convention).
- **Structure:** Use the skill's report format:
  - Title: `# Tech Debt Report — foodVibe — [Date]`
  - **Critical (Fix Now)** — file:line, description, impact, fix.
  - **High / Medium / Low Priority** — file:line and short description.
  - **Spec coverage (add/update .spec.ts)** — list of paths.
  - **Metrics:** Total TODOs, duplicate blocks, files >300 lines, prohibited patterns, hardcoded Hebrew, specs to add/update.
- Add a one-line note: "Generated per [.assistant/skills/techdebt/SKILL.md](.assistant/skills/techdebt/SKILL.md)."

## After the report

- If new recurring patterns are found, suggest a short addition to [.assistant/copilot-instructions.md](.assistant/copilot-instructions.md).
- If this run was **full project** and the user will later run commit-to-github in the same session, that flow can reuse this report (no second techdebt run); Phase 0 of commit-to-github will still run tests and handle Spec coverage from the report.

## Execution order

1. Choose scope (full vs working tree); if working tree, run `git status` and `git diff --name-only` and store the file list.
2. Run Phases 1–6 over the chosen scope.
3. Run Phase 7 using working tree to get new/changed components and services.
4. Compile report with Critical/High-Medium-Low, Spec coverage, and Metrics.
5. Write `tech-debt-report-YYYY-MM-DD.md`.
6. Optionally suggest copilot-instructions updates.

No code or test changes in this plan; the only artifact is the report file and any suggested doc edits.
