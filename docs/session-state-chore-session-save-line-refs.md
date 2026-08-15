# Session State

## Branch
chore/session-save-line-refs

## Date
2026-08-15

## Session Summary
- Produced a **pre-migration design gap analysis** before adopting the new Claude Design visual language. Three artifacts under `_claude-data/design-migration/`: an inventory of the current app read from live Angular source (~100 components), an inventory of the synced design, and a 485-row gap table.
- Gap table verdict: **50 kept / 139 changed / 281 dropped / 15 unclear**, grouped A–M by area. Two whole screens have no counterpart in the new design — the **recipe builder** and the **menu intelligence editor**. The **cook view** is the only screen re-skinned feature-for-feature (and even there the dish/mise-en-place variant never renders — `cookIsDish` is hard-coded `false`).
- **`/design-sync` is not an installed skill in this repo.** The design was pulled by driving the `DesignSync` tool directly (`list_projects` → `list_files` → `get_file`) against the `foodCo Design System` project (58 paths, updated 2026-05-24). Captured as a gotcha.
- The synced project is **three layers that contradict each other** (README/specimen cards vs. `ui_kits/` prototype vs. `designs/` explorations) on typeface (Heebo vs Rubik + Space Grotesk), icons (Lucide vs two hand-rolled SVG sets), emoji policy, and native `<select>`. Recorded as explicit `unclear` rows rather than resolved unilaterally.
- The new design also introduces **data concepts the app does not have**: stock quantity, cost-vs-price, product SKU, recipe difficulty/time/photo/three-state status, step titles, ingredient prep notes, recipe-level nutrition, supplier phone + rating, venue city/address/seats, deleted-by attribution, 30-day trash retention, currency + imperial/metric switching.

## Files Modified
```
 _claude-data/design-migration/gap-analysis.md          | 598 ++++++++++++++
 _claude-data/design-migration/new-design-inventory.md  | 295 +++++++
 _claude-data/design-migration/old-app-inventory.md     | 835 ++++++++++++++++++
 docs/brain/gotchas.md                                  |   2 +-
 docs/brain/gotchas/agent-workflow.md                   |  10 +
 5 files changed, 1739 insertions(+), 1 deletion(-)
```

Also riding this branch from earlier sessions (3 commits, already pushed):
`server/services/sync-master.js` collision-log summarization, perf plan 302/303 line-ref corrections, and a perf session-state refresh.

## Commit
c2753d7

## PR
See "Next Steps" — PR opened at ship time on this branch; merge was gated on checks passing.

## Next Steps
- **Blocking on Human:** the gap table is at **Step 4 of a 5-step brief** — awaiting the annotated table with every row marked **Re-add** (in the new visual style) / **Port as-is** (keep old component, slot into new layout) / **Intentionally cut**. Nothing should be implemented until that comes back.
- On return of the annotated table: use the confirmed feature list as the functional spec and run `/plan-implementation` → `/execute-plan`, respecting FoodVibe conventions (Angular 19 standalone, no `any`, no semicolons + single quotes in `.ts`, double quotes in `.html`, no `.c-*` engine classes in component SCSS).
- **Decide before building anything:** which layer of the synced design wins on typeface, icon system, emoji policy, and native `<select>`. The design system README and the shipped UI kit disagree; §M of the gap table lists these as `unclear`.
- **Deferred housekeeping:** `docs/brain/gotchas/agent-workflow.md` is now at 10 entries / ~164 lines, past the ~150-line / ~10-entry split threshold in `docs/brain/gotchas.md`. A domain split is due at the next brain-capture opportunity.
- **Pre-existing advisory, not introduced here:** `brain-review-check.mjs --scope=full` reports 2 dead refs that are intentional template placeholders (`plans/NNN-slug.plan.md`, `sessions/YYYY-MM-DD.md`).
- Open todos in `.claude/todo.md` are unrelated to this session (Transloco migration, Angular 22 migration, and several "write designated implementation plan" items).
