# Test Quality Log

> Populated by PHASE 6 mutation testing. Read by `/reflect add-tests` before seed proposal.
> Append-only — never edit existing rows.

## Weak Patterns (tests that failed to detect rule deletion)

| Date | Skill | Rule (truncated to 60 chars) | Pattern Type | Notes |
|------|-------|------------------------------|--------------|-------|

## Strong Patterns (tests that consistently detected deletion)

| Date | Skill | TC + Behavior | Pattern Type | Notes |
|------|-------|---------------|--------------|-------|

---

## Pattern Type Definitions

| Type | Meaning |
|------|---------|
| `broad-group-behavior` | Test checked group assignment loosely — didn't name the specific property |
| `missing-dimension` | No TC covered this dimension of the skill at all |
| `keyword-match` | Test passed because of surface wording in the skill, not presence of a specific rule |
| `precise-property+antipattern` | Test named the exact property AND included a wrong-group anti-pattern — tends to be strong |
