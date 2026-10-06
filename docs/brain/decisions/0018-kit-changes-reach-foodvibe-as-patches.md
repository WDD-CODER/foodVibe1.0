---
status: accepted
date: 2026-10-06
review-by: when FoodVibe gets a `.kit/install.json` (kit-install run on FoodVibe)
# supersedes: none. Refines 0015's "change it in the kit, then kit-sync" for FoodVibe only.
---

# 0018. Kit changes reach FoodVibe as a hand-applied patch until FoodVibe is kit-installed

## Context

ADR 0015 made `../ai-workflow-kit` the source of truth for kit-owned files (`docs/workflow-kit/kit-owned.json`)
and said to change them in the kit, then run `kit-sync`. But `kit-sync` (`tools/sync.mjs`) needs
`.kit/install.json` in the target, and FoodVibe was never kit-installed: it is the project the kit was
extracted from. `kit-sync.ps1 -Target ..\foodVibe1.0` fails with `KIT_SYNC: FAIL — .kit/install.json not found`.
The kit copies are also templated (`{{git.mainBranch}}`, `{{slots.nameFormat}}`, …), so a plain file copy
would break FoodVibe.

## Decision

Until kit-install is run on FoodVibe, every kit change reaches FoodVibe the same way:

1. **Change it in the kit first.** Make the change in `../ai-workflow-kit` on a branch, then commit it there.
2. **Turn the kit diff into a FoodVibe patch.** Map the paths: `core/<p>` → `<p>`,
   `packs/<pack>/<p>` → `<p>`, `templates/<p>` → `<p>` (templates only when FoodVibe's seeded copy
   should change too).
   ```bash
   git -C ../ai-workflow-kit diff main <kit-branch> \
     | sed -e 's#\([ab]\)/core/#\1/#g' -e 's#\([ab]\)/packs/[^/]*/#\1/#g' -e 's#\([ab]\)/templates/#\1/#g' \
     > <scratch>/kit.patch
   ```
3. **Apply it on a FoodVibe `chore/` branch** with `git apply -C1 --ignore-whitespace <scratch>/kit.patch`.
   A hunk whose context holds a `{{…}}` placeholder will not apply: exclude that file
   (`--exclude=<path>`) and make the same edit by hand with FoodVibe's real values. Then check that no
   `{{` reached FoodVibe: `git grep -n "{{" -- $(git diff --name-only)`.
4. **Gate:** `ng build`, `node scripts/kit-owned.mjs --check`, normal `/ship`. Name the kit commit in the
   FoodVibe commit message ("Mirrors ai-workflow-kit <sha>").
5. **Fixes made in FoodVibe go back the same way.** A kit-owned file a plan's scope allowed in a slot is
   back-ported to the kit, so the two copies don't drift.

Rejected: running kit-install on FoodVibe now (the cutover isn't finished, and it would overwrite
FoodVibe-specific wiring), and editing kit-owned files only in FoodVibe (the kit falls behind and the
next real sync conflicts on every file).

## Consequences

- Kit and FoodVibe stay in step, one patch at a time. Each kit fix costs one extra apply step.
- Templated hunks need a hand edit. Expect it in `take-plan.mjs`, `scope-check.mjs` and `ship-prep.mjs`.
- `kit-owned.mjs`'s block message points here instead of `kit-sync`.

## Review

Supersede this ADR when kit-install runs on FoodVibe and `kit-sync.ps1 -Target ..\foodVibe1.0` works.
From then on, kit changes go through `kit-sync` only.
