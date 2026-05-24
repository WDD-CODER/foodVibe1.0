---
name: finalize-docs
description: Final documentation pass before shipping — updates README, SETUP-LOG, and any in-repo docs to reflect the current state of the feature or fix just completed.
---

# Skill: finalize-docs

**Trigger:** Invoked as part of the `/ship` pipeline or explicitly before a PR.

## Checks

1. **README** — does it describe the current state? Update if out of date.
2. **SETUP-LOG.md** — if present, ensure any newly filled placeholders are recorded.
3. **In-repo docs** — scan `.claude/` for any plan or brief files that should be archived.
4. **Changelog / release notes** — if project uses one, append the current change summary.

## Output

`"Docs finalized. [N] files updated, [M] archived."`
