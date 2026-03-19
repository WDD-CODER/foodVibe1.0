# Technical Debt Analysis — foodVibe 1.0

Scan for duplicated code, dead code, and tech debt. Run at end of session, before PRs, or after large features.

## When to Run

- End of development session
- Before creating a pull request
- Weekly hygiene
- After large feature implementations
- **From commit-to-github (Phase 0):** run in **working-tree scope** only (see Scope below).

## Scope

- **Full project:** When run at end of session, before PR, or weekly hygiene — analyze all of `src/app/` (Phases 1–6) and working tree for Spec coverage (Phase 7).
- **Working tree (commit flow):** When **invoked from commit-to-github**, analyze **only the files that are to be committed**. First obtain the file list: run `git status` and `git diff --name-only` (include modified, deleted, and untracked files that will be part of the commit). Then run every phase only for those files. Do not scan the rest of the project. This keeps the commit flow fast and relevant.

## Analysis Workflow

Apply each phase to the **scope** (full project or working-tree file list) determined above.

### Phase 1: Duplicate Code
- **Full project:** Search for similar export signatures (functions, consts, classes) across `src/app/`.
- **Working tree:** Search only within or between the scoped files; report file:line.
- Look for similar component selectors and signal patterns. Use Grep or Glob to find copy-pasted blocks (5+ lines): search for repeated function signatures, similar class structures, or duplicated utility logic. Report `file:line` for each consolidatable pair.

### Phase 2: Dead Code
- **Full project:** List exported symbols in `src/app/`; cross-check imports.
- **Working tree:** List exported symbols only in the scoped files; cross-check whether they are imported elsewhere.
- Check components that may not be routed or used (selectors vs app.routes imports) only for scoped files when in working-tree scope.

### Phase 3: TODO/FIXME/HACK Audit
- **Full project:** Count and list TODO, FIXME, HACK, XXX in `src/` (ts, html, css).
- **Working tree:** Count and list only in the scoped files.
- Spot-check age via git blame when relevant.

### Phase 4: File Size
- **Full project:** List `.ts`, `.scss`, `.html` in `src/app/` over 300 lines (project standard).
- **Working tree:** List only scoped files over 300 lines.

### Phase 5: Style Violations
- **Full project:** Search `src/app/` for: `@Input()`/`@Output()` (use input()/output()), BehaviorSubject (use signal()), `style=` in HTML, `any` types, semicolons in TS.
- **Working tree:** Search only the scoped files for the same patterns.

### Phase 6: Translation
- **Full project:** Search for Hebrew codepoints in HTML in `src/`.
- **Working tree:** Search only the scoped files. Manually verify dictionary keys for translatePipe usage in those files.

### Phase 7: Spec coverage
- Using the working tree (e.g. `git status`, `git diff --name-only`), identify components (`.component.ts`) and services (`.service.ts`) in `src/app/` that are **new** or **materially changed** (always scoped to files to be committed).
- For each, check if a co-located `.spec.ts` exists and is adequate (e.g. not just a stub if the unit has non-trivial behavior). List those that **need** a new or updated spec.
- **Output**: Report as a "Spec coverage" section — list file paths needing `.spec.ts` added or updated. Report-only; the commit-to-github flow acts on it.

## Report Format

```markdown
# Tech Debt Report — foodVibe — [Date]

## Critical (Fix Now)
- [ ] **[file:line]**: Description — Impact — Fix

## High / Medium / Low Priority
- [ ] **[file:line]**: Description

## Spec coverage (add/update .spec.ts)
- [ ] **path/to/component-or-service.ts**: add or update spec

## Metrics
- Total TODOs: X | Duplicate blocks: X | Files >300 lines: X | Prohibited patterns: X | Hardcoded Hebrew: X | Specs to add/update: X
```

## Integration

If new patterns are found, suggest an addition to `.claude/copilot-instructions.md`. Related: update-docs (after cleanup), elegant-fix (refine solutions), github-sync (recent changes).
