# Verify Implementation Brief

The detailed plan was built externally (Claude.ai planning session with full project knowledge). Your job is to **spot-check it against live code** — not re-analyze or re-plan.

## Workflow

1. **Read the brief** — understand Goal, Files, Steps, Rules, Done-when
2. **Quick-verify each file reference** — Read every file listed. Confirm:
   - File exists at the stated path
   - Line numbers / selectors / function names match reality
   - No recent changes have invalidated the plan
3. **If mismatches found** — report clearly and STOP. User will re-plan externally.
4. **If everything checks out** — present confirmation, wait for "execute-it"

## Rules

- **Do not re-scan the codebase** — the planning session already did that
- **Do not produce a new plan or add steps** — the plan is already written
- **Do not write any code** — this phase is read-only
- **Do not improvise fixes for mismatches** — report and stop

## Output

### Verified:
```
✓ Brief verified against live code

Checked:
- [file]: [what matched] ✓
- [file]: [what matched] ✓

No mismatches. Say "execute-it" to proceed.
```

### Mismatches:
```
✗ Mismatches found — do NOT execute

- [file:line]: Brief says [X], code shows [Y]
- [file]: [missing / renamed / moved]

→ Take this back to the planning session for re-plan.
```