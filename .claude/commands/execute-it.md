# Execute Implementation Brief

Execute the verified brief step by step. Follow it to the letter.

## Workflow

1. **Follow steps in order** — no additions, no skipped steps
2. **Read before editing** — always read a file immediately before modifying it
3. **One logical unit per commit** — conventional commits (feat/fix/refactor)
4. **Stop on surprises** — if code differs from the brief, STOP and report
5. **Mark progress** — confirm each step completion

## Rules

- **Brief is law** — do not add features, refactor beyond scope, or "improve" things not in the brief
- **Verify after changes** — run `ng build` or relevant checks when applicable
- **Stop on conflict** — do not improvise. User will re-plan externally.

## Output

### Complete:
```
✓ Execution complete
- Tasks: [N/N completed]
- Files modified: [list]
- How to verify: [where in the app + what to check]
```

### Stopped:
```
✗ Stopped at step [N]
- Expected: [what the brief said]
- Found: [what the code shows]
- Completed so far: [list]

→ Take this back to the planning session for re-plan.
```