# Technical Debt Analysis — foodVibe 1.0

Scan for duplicated code, dead code, and tech debt. Run at end of session, before PRs, or after large features.

## When to Run

- End of development session
- Before creating a pull request
- Weekly hygiene
- After large feature implementations

## Analysis Workflow

### Phase 1: Duplicate Code
- Search for similar export signatures (functions, consts, classes) across `src/app/`.
- Look for similar component selectors and signal patterns.
- Use Explore agent for copy-pasted blocks (5+ lines) and consolidatable utilities. Report file:line.

### Phase 2: Dead Code
- List exported symbols (function, const, class, interface, type) in `src/app/`; cross-check imports.
- Check components that may not be routed or used (selectors vs app.routes imports).

### Phase 3: TODO/FIXME/HACK Audit
- Count and list TODO, FIXME, HACK, XXX in `src/` (ts, html, css). Spot-check age via git blame.

### Phase 4: File Size
- List `.ts`, `.scss`, `.html` in `src/app/` over 300 lines (project standard).

### Phase 5: Style Violations
- Search for: `@Input()`/`@Output()` (use input()/output()), BehaviorSubject (use signal()), `style=` in HTML, `any` types, semicolons in TS.

### Phase 6: Translation
- Search for Hebrew codepoints in HTML (should use translatePipe). Manually verify dictionary keys for translatePipe usage.

### Phase 7: Spec coverage
- Using the working tree (e.g. `git status`, `git diff --name-only`), identify components (`.component.ts`) and services (`.service.ts`) in `src/app/` that are **new** or **materially changed**.
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

If new patterns are found, suggest an addition to `.assistant/copilot-instructions.md`. Related: update-docs (after cleanup), elegant-fix (refine solutions), github-sync (recent changes).
