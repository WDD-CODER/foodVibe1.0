# Technical Debt Analysis — foodVibe 1.0

Scan the codebase for duplicated code, dead code, and tech debt patterns. Run at the end of sessions to keep the codebase clean.

## When to Run

- End of every development session
- Before creating a pull request
- Weekly as part of codebase hygiene
- After large feature implementations

## Analysis Workflow

### Phase 1: Duplicate Code Detection

Search for similar code blocks that should be consolidated:

```powershell
# TypeScript: similar function signatures across files
rg "export (function|const|class)" src/app/ --type ts | Sort-Object

# Similar component patterns
rg "selector:" src/app/ --type ts | Sort-Object

# Duplicate signal patterns
rg "signal\(" src/app/ --type ts | Sort-Object
```

Use the Explore agent for deeper analysis:
```
Search for duplicated code patterns in src/app/:
1. Functions with similar names across files
2. Copy-pasted code blocks (5+ lines)
3. Similar utility functions that could be consolidated
Report file paths and line numbers for each duplicate found.
```

### Phase 2: Dead Code Detection

Find unused exports and functions:

```powershell
# Find exported symbols
rg "export (function|const|class|interface|type) " src/app/ --type ts

# Cross-reference: check if each export is imported elsewhere
# (manual verification — check import count for each symbol)
```

Check for unused components:
```powershell
# Components declared but potentially not routed or used
rg "selector: '" src/app/ --type ts
rg "import.*Component" src/app/app.routes.ts
```

### Phase 3: TODO/FIXME/HACK Audit

```powershell
# Count and list all debt markers
rg "TODO|FIXME|HACK|XXX" src/ --type ts --type html --type css -c
rg "TODO|FIXME|HACK|XXX" src/ --type ts -n | Select-Object -First 30

# Age of TODOs via git blame
# (spot check the oldest ones)
```

### Phase 4: File Size Audit

Files over 300 lines violate project standards:

```powershell
# Find files exceeding 300 lines
Get-ChildItem -Recurse -Include "*.ts","*.scss","*.html" src/app/ |
  ForEach-Object { $lines = (Get-Content $_.FullName).Count; if ($lines -gt 300) { "$lines`t$($_.FullName)" } } |
  Sort-Object -Descending
```

### Phase 5: Style Violations

```powershell
# Check for prohibited patterns
rg "@Input\(\)|@Output\(\)" src/app/ --type ts         # Should use input()/output()
rg "BehaviorSubject" src/app/ --type ts                  # Should use signal()
rg "style=" src/app/ --type html                         # Inline styles (should be SCSS)
rg 'any[^a-zA-Z]' src/app/ --type ts | Select-Object -First 20  # any types
rg '";' src/app/ --type ts | Select-Object -First 10    # Semicolons (prohibited)
```

### Phase 6: Translation Audit

```powershell
# Hardcoded Hebrew in templates (should use translatePipe)
rg '[\u0590-\u05FF]' src/app/ --type html | Select-Object -First 20

# translatePipe usage without dictionary key
# (manual check: verify keys exist in dictionary.json)
```

## Report Format

```markdown
# Tech Debt Report — foodVibe — [Date]

## Critical (Fix Now)
- [ ] **[file:line]**: Description — Impact — Fix

## High Priority (Fix This Sprint)
- [ ] **[file:line]**: Description

## Medium Priority (Track)
- [ ] **[file:line]**: Description

## Low Priority (Nice to Have)
- [ ] **[file:line]**: Description

## Metrics
- Total TODOs: X
- Duplicate code blocks: X
- Files over 300 lines: X
- Prohibited patterns found: X (BehaviorSubject, @Input, any, etc.)
- Hardcoded Hebrew strings: X
```

## Integration

If new patterns are discovered, suggest additions to `.assistant/copilot-instructions.md`:
```
New pattern found: [description]
Suggested rule addition: [rule text for copilot-instructions.md]
```

## Related Skills

- `/update-docs` — Update documentation after cleanup
- `/elegant-fix` — Refine solutions found during audit
- `/github-sync` — Review recent changes for debt introduction
