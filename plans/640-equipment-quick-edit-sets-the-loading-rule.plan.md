# Plan 640 — The equipment quick-edit popup sets the loading rule (per guests, minimum, maximum)

Status: draft
Depends-on: 624
Snapshot: 43365ce0

## Problem Statement
Plan 624 put the loading rule ("one item per N guests, between a minimum and a maximum") on the full equipment form
(`inventory/equipment/add` and `inventory/equipment/edit/:id`). Dandan checked card ① on 2026-11-18 and could not find
it: an existing item is edited from the equipment list, in its quick-edit popup ("עריכה: <name>"), which shows name,
category, owned quantity, consumable and notes only. The list has no link to the full edit page (it navigates only to
`/inventory/equipment/add`), so an existing item cannot get a rule at all.

Verified on `origin/chore/modules-staging` (43365ce0, holds 624):
- `src/app/pages/equipment/components/equipment-form/equipment-form.component.ts`: controls `scalingEnabled`,
  `perGuests`, `minQuantity`, `maxQuantity` (lines 125–129); hydrate from `scalingRule` (lines 140–145);
  `scalingRuleFor_(v, hadRule)` (line 153; off on an item that had a rule stores `{ perGuests: 0, minQuantity: 0 }`);
  the rule checks with the keys `scaling_per_guests_required`, `scaling_min_required`, `scaling_max_below_min`
  (around line 169). Template: the `scaling-block` (`.html` lines 39–60).
- `src/app/pages/equipment/components/equipment-list/equipment-list.component.ts`: `editForm_` built at line 258
  without the rule; `hydrateEditForm` line 267; `saveCurrentInlineEdit` builds the saved item (around line 415) with
  `{ ...equipment, … }`, so a stored rule survives but cannot be changed. Template: the inline popup
  (`equipment-list.component.html` around lines 200–255). The list already shows the rule in its `col-scaling` column
  (`scalingSummary`).
- Dictionary keys exist: `scaling_rule`, `scaling_enabled`, `per_guests`, `min_quantity`, `max_quantity`,
  `scaling_rule_hint` and the three error keys.

## Goals & Success Criteria
**Primary:** in the equipment list's quick-edit popup, the owner turns the loading rule on, fills per guests, minimum
and optional maximum, saves, and the list's rule column and the event's loading list use it.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts` with these new cases: the popup
  of an item with a stored rule opens with the switch on and the three numbers filled; turning the switch on shows the
  three inputs; saving per guests 10, minimum 2, no maximum stores `scalingRule: { perGuests: 10, minQuantity: 2 }`
  and the rule column then reads it; turning it off on an item that had a rule stores `{ perGuests: 0, minQuantity: 0 }`;
  a maximum below the minimum shows `scaling_max_below_min` and does not save; an item that never had a rule and stays
  off is saved without `scalingRule`.
- [auto] The same command: `src/app/core/utils/scaling-rule.util.spec.ts` (new) covers `scalingRuleFrom` and
  `scalingRuleErrors` with the cases above, and
  `src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts` passes unchanged (the form now
  calls the util).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/equipment`, opening an item's quick edit shows the switch "הפעל סקלה"; turning it on shows
  "לכל אורחים", "כמות מינימלית" and "כמות מקסימלית" (`e2e/ui/640-1.spec.ts`).
- [human] Dandan opens "ארון חימום" from the list, sets one per 20 guests, minimum 1, maximum 3, saves, and sees the
  rule in the list's rule column; on a 40-guest event's loading list the item shows 2.

## Execution Mode
- Parallel: yes — it touches only the equipment pages and one new util; no plan of the runs `mod-invoices-ui`,
  `mod-access-ui` or `mod-history` lists these files; no dictionary, `app.config.ts` or style hotspot change.
- Concurrent plans: 628, 629, 630 (run `mod-invoices-ui`)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/scaling-rule.util.ts
src/app/core/utils/scaling-rule.util.spec.ts
src/app/pages/equipment/components/equipment-list/equipment-list.component.ts
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.scss
src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts
e2e/ui/640-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — `scalingRule` keeps its one shape from `shared/schemas`; the util only builds and checks it.

## Reuse Check

- `scalingRuleFrom(values, hadRule)` in `src/app/core/utils/scaling-rule.util.ts` — family: helpers — rung: 3 — why: with
  `scalingRuleErrors(values)` beside it, the rule logic moves out of `equipment-form` so the form and the list popup share
  one copy instead of two.
- the rule inputs in the list popup — family: form-field — rung: 1 — why: the same `appNumberBox` number inputs and
  `c-chip--toggle` switch the form and the popup already use.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to set how many of an item an event needs from the place where I edit the item, so that the
  loading list is right without hunting for another screen.

## Functional Requirements

### Must Have (P0)
- [ ] New `src/app/core/utils/scaling-rule.util.ts`: `scalingRuleFrom(values, hadRule): ScalingRule | undefined` and
  `scalingRuleErrors(values): Record<string, string>` — the exact rules of `equipment-form` today (moved, not changed).
  `equipment-form` calls them; its behaviour and spec stay the same.
- [ ] `equipment-list`: `editForm_` gains `scalingEnabled`, `perGuests`, `minQuantity`, `maxQuantity` (same defaults
  as the form); `hydrateEditForm` fills them from `scalingRule`; `saveCurrentInlineEdit` refuses to save while
  `scalingRuleErrors` returns anything (errors shown under the fields) and writes `scalingRule` from
  `scalingRuleFrom(values, hadRule)`, leaving it out when it returns `undefined`.
- [ ] Popup template: below the consumable switch, the `scaling_enabled` switch; when on, the three number inputs with
  their labels and `scaling_rule_hint`, in the popup's grid; logical CSS only.
- [ ] `docs/brain/component-families.md` (+ regenerated `docs/brain/inventory.md`): the util under `helpers`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. The popup grows by one switch; the three inputs show only when it is on, so items without a rule look as
  today. Existing keys only; no new key, no new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the loading-rule logic into one shared helper the form and the popup both use — scalingRuleFrom, scalingRuleErrors, the form calls them, the util spec — src/app/core/utils/scaling-rule.util.ts, src/app/core/utils/scaling-rule.util.spec.ts, src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
- [ ] A2: Let the owner set the rule in the list's quick-edit popup — the four controls, hydrate, save with the checks, the template block, the six spec cases — src/app/pages/equipment/components/equipment-list/equipment-list.component.ts, .html, .scss, .spec.ts
- [ ] A3: Record the helper and prove it in the running app — the registry row, the inventory, the screen check, then the Done-when commands in order — docs/brain/component-families.md, docs/brain/inventory.md, e2e/ui/640-1.spec.ts

## Technical Considerations
- Dependencies: 624 (the rule, the form, the rule column, the loading list).
- New files: the util and its spec, `e2e/ui/640-1.spec.ts`.
- Model changes, backend, auth, data: none.
- Project checks: the `[auto] log-query` item; no new dictionary key or icon; Reuse Check filled.

## Out of Scope
- A link from the list to the full edit page.
- Any change to how the loading list computes quantities.

## Critical Questions
- none

## Execution Notes
- decided: the rule goes into the popup, not a link to the full page — why: the popup is where items are edited, and a
  link would still hide the rule one screen away.
- decided: built on `chore/modules-staging` (run seeded from it), beside `mod-invoices-ui` — why: no shared file.
