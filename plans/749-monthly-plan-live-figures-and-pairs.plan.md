# Plan 749 — Monthly plan: live figures, forecast/actual chips, a dense page and gross-only staff cost

Status: draft
Depends-on: none
Track: code
Snapshot: 7c135d5b

## Problem Statement
Plans 727–729 were built into the run branch `orch/biz-numbers` (not on `main`). Dandan graded the monthly plan page
(`/monthly-plan`) on 2026-11-26. This plan is his items 7–15 for that page, built on a branch cut from
`origin/orch/biz-numbers`. He asked for no more questions: every choice he did not spell out takes the simplest option
and is logged as a `behaviour:` decision under Technical Considerations.

His words (translated faithfully):
7. «תמונת החודש» does not change whatever is typed. It must recalculate live, as the user types, from the page's
   current unsaved values; saving is only for keeping them. Today a changed actual income still shows «לא הוזן»,
   adding or removing a fixed line changes nothing, and switching to «סכום אחד» still sums the detailed lines.
8. When an actual box is empty and its forecast has a value, the actual box shows the forecast as faded placeholder
   text with a tooltip saying it was filled from the forecast; once he types, it is normal text.
9. Every forecast/actual pair starts closed as two small chips «תחזית» and «בפועל»; a click opens that box; clicking
   the (now very small) control again closes it. Gray when empty, teal-green when filled. Reuse the `.c-chip` family.
10. The boxes are far too wide: amounts need at most 7 digits; short boxes in a dense grid.
11. «עלות צוות»: the typed number is gross pay; employer cost = gross × factor (default 1.25) always shows beside it;
    no employer-total / gross choice any more. Months stored with an employer total are migrated on read.
12. Hovering «חלקי» lists exactly what is missing.
13. The norms («מקובל בישראל» beside each target) become a hover hint on the input, not inline text.
14. Remove/delete uses the app's icons, not the text buttons added on this page.
15. Rename «סכום אחד» → «עלויות משוערות» and «שורות» → «עלויות מפורטות».

**Root cause of item 7 (verified on `origin/orch/biz-numbers` 7c135d5b):** it is a wiring choice, not an engine bug.
- `src/app/pages/monthly-plan/monthly-plan.page.ts:152-156` — `figures_ = computed(() => monthFigures(monthInputOf(this.open_())))`,
  commented "The month's figures from the SAVED month, never from typed-but-unsaved numbers (plan 728)". `open_` is
  set only by `show_()` (`:328-334`) and after a successful `save()` (`:293`). Every box writes `draft_`
  (`setRevenue` `:201`, `setFixed` `:207`, `setLabour` `:212`, `setPurchases` `:217`, `setTarget` `:223`), which the
  figures never read. Plan 728 asked for this on purpose (`plans/728-month-engine-and-missing-list.plan.md:200`,
  `:243`, A6 `:234`) and plan 729 repeated it (P0 "Page wiring": "reads the saved month").
- The same saved-only binding feeds `flags_` (`:158-163`, «הערכה» / fixed «חלקי»), `[targets]="month.targets"` of
  `app-month-figures` (`monthly-plan.page.html:131`) and `[foodTargetPct]="month.targets.foodPct"` of the dish
  calculator (`:150`).
- The spec locks it in: `monthly-plan.page.spec.ts:135-147` ("updates after a save, not while typing") types an actual
  revenue and expects `mf-actual-revenue` to stay `mp_not_entered`.
- The mode mapping itself is right: `fixedInputOf` (`src/app/core/engine/month-plan.ts:58-69`) uses only the rough pair
  in rough mode, and `month-plan.spec.ts:135` ("rough mode uses only the rough total even when lines hold numbers")
  passes. "Still sums the detailed lines" is the saved month (lines mode) being shown, not a mapping bug.
- One trap for the live input: a target box the owner empties is `null` in `draft_().targets` (`setTarget` `:223-230`),
  while `MonthTargets` (`month-plan.ts:9`) is `Record<MonthTargetKey, number>`; the live input must fall back to the
  saved target for an empty box, or `revenue × null` would leak into the engine.

Other facts this plan builds on (same snapshot):
- Pair inputs today: revenue (`monthly-plan.page.html:64-81`, plan + actual), purchases (`:86-94`, actual only), fixed
  lines and the rough total (`fixed-costs-card.component.html:27-93`), labour (`labour-card.component.html:27-45`).
  Each is a full-width `.c-input-wrapper` inside `.mp-grid` (`minmax(min(100%, 12rem), 1fr)`, `monthly-plan.page.scss`).
- Labour: `LabourGroup.mode: 'employer' | 'gross'` (`shared/schemas/month/month-rules.ts:64-69`), `defaultLabour()`
  returns `mode: 'employer'` (`:81-83`, used by the server's `POST` in `server/routes/month-plans.js:89`), schema enum in
  `shared/schemas/entities/month-plan.schema.ts:35-40`; `labourInputOf` (`month-plan.ts:71-76`) multiplies only in
  gross mode. Server tests assert the employer default (`server/test/month-plans.test.js:186`,
  `server/test/month-rules.test.js:77-83`).
- Norms: `bandLine` (`src/app/pages/monthly-plan/month-target-fields.ts`) rendered as inline text
  `mp-band-<key>` (`monthly-plan.page.html:114-120`).
- «חלקי»: the figure cells' `mf-partial` chip (`src/app/shared/month-figures/month-figures.component.html:322-326`)
  and the page's `mp-flag-fixed-partial` chip (`monthly-plan.page.html:138-141`); neither says what is missing. The
  engine already returns `missing` per column (`month-plan.ts:42`, `:109-113`).
- Text buttons: the fixed line «הסר» (`fixed-costs-card.component.html:70-77`, `c-btn-ghost--sm`). The app's remove
  icon: `button.c-icon-btn.danger` + `<lucide-icon name="trash-2">` + `aria-label` (e.g.
  `inventory-product-list.component.html:272-281`); `Trash2` is registered in `src/app/app.config.ts:89`.
- Chips: `.c-chip--tap` is the pressable chip (button, `aria-expanded`), `.c-chip.teal` its teal tone
  (`src/styles.scss:1004-1037`, `:2255-2303`; `docs/brain/component-families.md` "chip").
- The shared tooltip box (plan 744) lives on the run branch `orch/house-style-ui`, not on `orch/biz-numbers`; here the
  default `hints-in-tooltips` "how" (native `[attr.title]` + an accessible description) is what exists.

## Goals & Success Criteria
**Primary:** on `/monthly-plan` every number typed changes «תמונת החודש» at once, without saving; each forecast/actual
pair is two small chips that open short boxes in a dense grid; an empty actual shows its forecast faded; staff cost is
gross × factor with the employer cost always beside it; «חלקי» and the target norms explain themselves on hover; the
fixed-line remove is the trash icon; the fixed modes are «עלויות משוערות» / «עלויות מפורטות».

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/pages/monthly-plan/monthly-plan.page.spec.ts` (A3, A8), `src/app/pages/monthly-plan/month-draft.spec.ts` (A1), `src/app/pages/monthly-plan/month-hints.spec.ts` (A6), `src/app/pages/monthly-plan/components/month-pair/month-pair.component.spec.ts` (A2), `src/app/pages/monthly-plan/components/fixed-costs-card/fixed-costs-card.component.spec.ts` (A4), `src/app/pages/monthly-plan/components/labour-card/labour-card.component.spec.ts` (A5) and `src/app/shared/month-figures/month-figures.component.spec.ts` (A6).
- [auto] `pnpm run test:server` exits 0, including `server/test/month-rules.test.js` and `server/test/month-plans.test.js` (A5: a new month's labour is `{ mode: 'gross', factor: 1.25, plan: null, actual: null }`; a stored `employer` month is still accepted).
- [auto] `src/app/pages/monthly-plan/monthly-plan.page.spec.ts` replays each broken case of item 7, with `service.update` never called: (a) typing 0 in the actual revenue turns `mf-actual-revenue` from `mp_not_entered` into `₪0.00`; (b) adding a fixed line and typing 1500 in its actual changes `mf-actual-fixed`, removing it changes it back; (c) with lines holding 12000 and the estimated total 30000, switching to the estimated mode shows `₪30,000.00` and switching back shows `₪12,000.00`; (d) typing 40000 gross staff cost shows `₪50,000.00` in `mf-actual-labour`; (e) emptying the food target box keeps the saved target in the figures (no `NaN`). The old case "updates after a save, not while typing" is replaced.
- [auto] `src/app/pages/monthly-plan/components/month-pair/month-pair.component.spec.ts` covers: both chips closed on start; a click opens the box and focuses it; a click on the small chip closes it and keeps the value; the chip has the teal tone only when filled; an empty actual with forecast 12000 shows placeholder `12,000` and the forecast hint as its title, and emits nothing (item 8: the placeholder is not a value); a closed month's chips do not open.
- [auto] `src/app/pages/monthly-plan/month-draft.spec.ts` covers: a stored `employer` labour `{ factor: 1.25, plan: 50000, actual: 62500 }` reads as gross `{ plan: 40000, actual: 50000 }` (item 11); a `gross` labour is kept as is; the live month uses the draft's revenue, purchases, fixed and labour and the saved target for an empty target box.
- [auto] `src/app/pages/monthly-plan/month-hints.spec.ts` and `src/app/shared/month-figures/month-figures.component.spec.ts` cover: a partial cell's hint lists the missing inputs of its own column (plan or actual labels); fixed lines without an actual are named in the hint (item 12).
- [auto] `src/app/pages/monthly-plan/components/fixed-costs-card/fixed-costs-card.component.spec.ts` covers: the remove control is a `c-icon-btn` with the `trash-2` icon and an `aria-label`, no text (item 14); the mode chips read `mp_fixed_mode_detailed` / `mp_fixed_mode_estimated` (item 15). `src/app/pages/monthly-plan/components/labour-card/labour-card.component.spec.ts` covers: no `lc-mode-*` radios, the factor box always present, the employer cost always beside each side (item 11).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/749-monthly-plan-live-figures-and-pairs.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/749-monthly-plan-live-figures-and-pairs.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Signed in as `demo_host`, on «תכנון חודשי» pick «אוקטובר 2026» (actual staff cost missing). In «עלות צוות» press «בפועל» and type 40000, do not save: «תמונת החודש» shows «עלות צוות» בפועל ‎₪50,000.00 at once, and «רווח» בפועל changes with it.
- [human] Same month: under «הוצאות קבועות» press «עלויות משוערות», press «בפועל» and type 30000: «הוצאות קבועות» בפועל in «תמונת החודש» becomes ‎₪30,000.00 at once; press «עלויות מפורטות»: it goes back to the sum of the lines.
- [human] Same month: in «עלויות מפורטות» press «הוסף שורה», name it «הנהלת חשבונות», press its «בפועל» and type 1500: the fixed figure grows by 1,500 at once; press the trash icon on that line, confirm with «הסר»: it shrinks back.
- [human] Pick «נובמבר 2026» (forecast only): every row shows two gray chips «תחזית» (teal, with its amount) and «בפועל» (gray). Press «בפועל» of «הכנסות»: the box shows the forecast amount in faded text, and hovering it says «מולא אוטומטית מהתחזית. הקלידו כדי לשנות.»; «תמונת החודש» still shows «לא הוזן» for הכנסות בפועל. Type a number: it shows as normal text and the chip turns teal. Press the small «בפועל» chip: the box closes back to the chip.
- [human] On «נובמבר 2026», look at the page on the computer: each amount box is short (about 7 digits wide) and the cards sit side by side in a grid, not one wide box per line.
- [human] On «אוקטובר 2026» hover a «חלקי» tag in «תמונת החודש»: the hint lists what is missing (for example «חסר: עלות צוות בפועל»); hover «הוצאות קבועות: חלקי» under the figures: it names the lines without an actual.
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed — on «תכנון חודשי», «אוקטובר 2026», press the trash icon on «שכירות»: «להסיר את השורה?» asks; «ביטול» leaves the line and the figures unchanged.
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal — on «תכנון חודשי» (a page, not a dialog), hover the «רווח נקי» target box: «מקובל בישראל: 5–10%» shows as a hover hint and no norm text sits beside the box.
- [human] Open «אוגוסט 2026» (full month): its staff cost shows the gross amount and «עלות מעביד (הערכה)» beside it, and the «עלות צוות» figure is the same as before this change (within one agora).

## Execution Mode
- Parallel: yes — with 748 (`src/app/pages/restaurant-menu/**`) and 750 (dashboard sign-out). The only shared paths are
  `public/assets/data/dictionary.json` (append-only) and `src/app/pages/breadcrumbs.md` (each plan edits its own row);
  if the runner refuses that overlap, run 749 after 748.
- Concurrent plans: any but another monthly-plan slice.
- Isolated DB: no — no stored shape changes; an `employer` month is migrated in the browser and stored as `gross` on its
  next save.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/monthly-plan/**
src/app/pages/monthly-plan/monthly-plan.page.spec.ts
src/app/pages/monthly-plan/month-draft.spec.ts
src/app/pages/monthly-plan/month-hints.spec.ts
src/app/pages/monthly-plan/components/month-pair/month-pair.component.spec.ts
src/app/pages/monthly-plan/components/fixed-costs-card/fixed-costs-card.component.spec.ts
src/app/pages/monthly-plan/components/labour-card/labour-card.component.spec.ts
src/app/shared/month-figures/**
src/app/shared/month-figures/month-figures.component.spec.ts
shared/schemas/month/month-rules.ts
server/test/month-rules.test.js
server/test/month-plans.test.js
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
docs/brain/component-families.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-4: preserves — no schema change: `labourGroupSchema` keeps `mode: 'employer' | 'gross'` so stored months stay
  valid; only `defaultLabour()` in `shared/schemas/month/month-rules.ts` now returns `mode: 'gross'`; the server still
  validates every `PUT` with `monthPlanUpdateInputSchema`.
- INV-1: preserves — labour is still one total for the whole team (ADR 0034); no route, permission or scope change.
  Money fields unchanged: `revenue`, `targets`, `fixed`, `labour`, `purchases` stay in `MONEY_FIELDS.monthPlans`, owner
  and consultant only, staff never; the page stays behind `requireModule('monthly_plan')` on the server and the
  `monthly_plan` module gate in the browser.
- INV-6: preserves — no AI call is added or changed (the scope matches `src/app/**/*ai*` only through the
  `month-pair` folder name).
- INV-none: preserves — the live figures are computed in the browser from the same engine
  (`src/app/core/engine/month-plan.ts`, unchanged); nothing new is stored or sent; no AI call; no new collection.

## Reuse Check
- `month-pair` (`src/app/pages/monthly-plan/components/month-pair/`) — family: number-box — rung: 2 — why: one forecast/actual pair as two `.c-chip--tap` chips (`.c-chip.teal` when filled) that each open one short `appNumberBox` box; used by the revenue, purchases, fixed and labour rows of this page only, so page-local, not shared
- `month-draft.ts` (`draftOf` with the labour migration, `liveMonthOf`) — family: helpers — rung: 3 — why: the page's draft-to-month mapping moved out of `monthly-plan.page.ts` so it can be tested; feeds the existing `monthInputOf` / `monthFigures` (family event-plan), no new engine
- `month-hints.ts` (missing-input and unentered-line hint texts) — family: helpers — rung: 3 — why: pure text builders for the «חלקי» hints, shared by the page flag and `app-month-figures`
- card-local classes `.mpp`, `.mpp__chip`, `.mpp__box`, `.mpp__suffix` — family: chip — rung: 2 — why: layout of the chip-and-box pair only; the chip look is `.c-chip.c-chip--tap` (+ `.teal`), no new `.c-*` class

## Defaults

- confirm-destructive-action — applies — how: the trash icon on a fixed line still asks through `ConfirmModalService` («להסיר את השורה?», «הסר» / «ביטול»); cancel keeps the line.
- empty-state-on-list — exception — why: the fixed lines keep their empty text, reworded to the new mode name («אין שורות. הוסיפו שורה או עברו לעלויות משוערות.»).
- loading-and-error-states — exception — why: no new request; the month's load, save and errors stay as in plan 727.
- unsaved-changes-on-leave — applies — how: the live figures never save; typed values still count as unsaved changes and the leave question of plan 727 stays; opening or closing a chip is not a change.
- hints-in-tooltips — applies — how: the target norm, the forecast placeholder and each «חלקי» explanation are `[attr.title]` plus `aria-describedby` on the control, as the default's how line says; the shared tooltip piece (plan 744) is not on this branch.
- leave-and-return — exception — why: the page sends the user nowhere.
- app-list-container — exception — why: the fixed lines are editable rows inside a month card, not a page list.
- one-breakpoint-set — applies — how: no new `@media`; the dense grid uses `auto-fit` / `minmax` columns that fold to one column on a phone.
- unit-dropdown-add — exception — why: no unit dropdown on this page.
- anchored-popup — exception — why: no floating box is built; the hints are native titles.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want the month's profit to move as I type a number, so I can try "what if rent goes up" without saving.
- As an owner filling the actual month, I want to see what I forecast in the empty actual box, so I know what I expected while I type what happened.
- As a busy owner, I want short boxes and closed chips, so the whole month fits on one screen and I see at once what is filled (teal) and what is not (gray).
- As an owner who knows only the gross salaries, I want the employer cost worked out beside them every time, so I never pick the wrong kind of number.
- As an owner, I want «חלקי» to tell me what is missing, so I know which box to fill.

## Functional Requirements

### Must Have (P0)
- [ ] **Live figures (item 7).** `month-draft.ts` exports `liveMonthOf(month: MonthPlan, draft: Draft): MonthPlan` =
  the saved month with `revenue`, `fixed`, `labour`, `purchases: { actual: draft.purchases }` from the draft and
  `targets[k] = draft.targets[k] ?? month.targets[k]`. The page's `figures_`, `flags_`, the `[targets]` of
  `app-month-figures` and the dish calculator's `foodTargetPct` all read `liveMonth_ = computed(() => liveMonthOf(open, draft))`.
  `open_` stays the saved month (for `changes_` and the leave question). Saving is unchanged.
- [ ] **Pair piece (item 9)** `app-month-pair`: inputs `labelKey` (row name for the aria labels), `plan`, `actual`
  (`number | null`), `sides: 'both' | 'actual'` (purchases has no forecast), `disabled`, `idPrefix`; outputs
  `planChange`, `actualChange` (`number | null`) and `boxLeave` (`'plan' | 'actual'`, for the VAT divide on blur).
  - Each side starts closed as a `button.c-chip.c-chip--tap` («תחזית» / «בפועל», `aria-expanded="false"`); filled →
    `.teal` tone and the amount after the label («תחזית · ₪12,000.00», `formatMoney`); empty → the gray default.
  - A click opens that side: the chip stays as a small chip button before the box (`aria-expanded="true"`) and the box
    gets focus; a click on that small chip, or Escape in the box, closes it; the value is kept.
  - A closed month: chips show their values and do not open.
  - The page wires it for revenue (both), purchases (actual), each fixed line and the estimated total (both), labour
    (both). The page keeps one open/closed state per pair inside the piece (not saved).
- [ ] **Forecast placeholder (item 8).** An open, empty actual box whose forecast is not `null` shows the forecast as
  its `placeholder` (digits with thousands separators, no ₪) and the title «מולא אוטומטית מהתחזית. הקלידו כדי
  לשנות.» (plus `aria-describedby`); otherwise the placeholder stays «לא הוזן». The placeholder is never emitted or
  counted: the actual stays `null`, the figures keep «לא הוזן» for it and it stays in the missing list.
- [ ] **Short boxes and dense grid (item 10).** The box of `app-month-pair` and the target boxes are sized for 7 digits
  (`inline-size` about `9ch` on the input, wrapper `inline-size: max-content`); fixed lines become a three-column row
  (name · pair · trash icon); `.mp-page` widens and lays its cards in an `auto-fit` grid (inputs on one side,
  «תמונת החודש» on the other, `position: sticky` at the top while the page scrolls on a wide screen; one column on a
  phone). Logical properties only; no new `@media`.
- [ ] **Gross-only staff cost (item 11).** `labour-card` drops the mode radios: one `app-month-pair` of gross pay, the
  factor box always shown (1–2, step 0.01, default 1.25), and under it «עלות מעביד (הערכה): {{amount}}» for plan and
  for actual (gross × factor, `roundMoney`; «לא הוזן» when the gross is empty). `defaultLabour()` returns
  `{ mode: 'gross', factor: 1.25, plan: null, actual: null }`. Migration on read in `draftOf`: a stored
  `mode: 'employer'` group becomes `{ mode: 'gross', factor, plan: roundMoney(plan / factor), actual: roundMoney(actual / factor) }`
  (null stays null), so its employer cost is unchanged within one agora; it is stored as `gross` on the next save
  (the page counts it as an unsaved change only if the owner changes something — the migration itself sets the
  saved snapshot). The page's «הערכה» flag shows only when a labour amount is entered.
- [ ] **«חלקי» hints (item 12).** `month-hints.ts`: `missingHint(missing: MissingKey[], side: 'plan' | 'actual', translate)`
  → «חסר: הכנסה בפועל, עלות צוות בפועל» (plan side: «הכנסה צפויה», …); `unenteredLinesHint(fixed, translate)` → «לא
  הוזנו בפועל: חשמל, מים» (lines mode; starter lines by dictionary key, own lines by name, an unnamed own line as
  «שורה ללא שם»). `app-month-figures` gets an optional input `fixedHint = input('')` and puts on each `mf-partial`
  chip `[attr.title]` = its column's `missingHint` (plus the fixed hint when not empty), with `aria-describedby`; the
  page's `mp-flag-fixed-partial` chip carries `unenteredLinesHint`.
- [ ] **Target norm as a hover hint (item 13).** The inline `mp-band-<key>` text goes; the target box's wrapper gets
  `[attr.title]="band(key)"` and the input `aria-describedby` to a `.visually-hidden` span with the same text. The amber
  «מחוץ לטווח» tag stays beside the box when out of band.
- [ ] **Icons for remove (item 14).** The fixed line «הסר» text button becomes `button.c-icon-btn.danger` with
  `<lucide-icon name="trash-2" [size]="18">` and `aria-label` «הסר»; same confirm. No other remove/delete text button
  exists on this page (the dish calculator has none).
- [ ] **Mode names (item 15).** The fixed mode chips read «עלויות מפורטות» (lines) and «עלויות משוערות» (rough), and the
  notes that named «סכום אחד» use the new name — through new dictionary keys (append-only hotspot).

### Should Have (P1)
- [ ] The completeness badge «הוזנו 3 מתוך 4» carries the actual column's `missingHint` as its title too.
- [ ] `src/app/pages/breadcrumbs.md` (monthly-plan row: live figures, `app-month-pair`, gross-only labour),
  `src/app/shared/breadcrumbs.md` (month-figures: the hint input) and `docs/brain/component-families.md` (month-figures
  family: live from the page draft; helpers family: `month-draft.ts`, `month-hints.ts`; number-box family user:
  `app-month-pair`).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- Page recipe: recipe-form — `/monthly-plan` (one month is one record: header, titled cards, one save row at the end).
- Behaviour: tooltip — hints are native titles here; the shared tooltip of plan 744 replaces them when
  `orch/house-style-ui` and this branch meet (its lint will list these titles).
- RTL; logical properties only; money with `formatMoney`; no new `.c-*` class; no new `@media`; `Trash2` is already
  registered.
- Dictionary keys (append-only, `general`): `mp_chip_plan` ("תחזית"), `mp_from_forecast_hint`
  ("מולא אוטומטית מהתחזית. הקלידו כדי לשנות."), `mp_fixed_mode_detailed` ("עלויות מפורטות"),
  `mp_fixed_mode_estimated` ("עלויות משוערות"), `mp_fixed_estimated_note`
  ("השורות נשמרות ולא נספרות כשמשתמשים בעלויות משוערות"), `mp_fixed_empty_detailed`
  ("אין שורות. הוסיפו שורה או עברו לעלויות משוערות."), `mp_fixed_unnamed` ("שורה ללא שם"),
  `mp_fixed_missing_lines` ("לא הוזנו בפועל: {{list}}"), `mp_labour_gross` ("שכר ברוטו"),
  `mp_labour_employer_cost` ("עלות מעביד (הערכה): {{amount}}"), `mp_labour_note_gross`
  ("מקלידים שכר ברוטו לכל הצוות; עלות המעביד היא הברוטו כפול המקדם."), `mp_missing_plan_revenue` ("הכנסה צפויה"),
  `mp_missing_plan_food` ("עלות מזון צפויה"), `mp_missing_plan_labour` ("עלות צוות צפויה"),
  `mp_missing_plan_fixed` ("הוצאות קבועות צפויות").
  Reused: `mp_actual` («בפועל»), `mp_missing` («חסר: {{list}}»), `mp_missing_*` (actual labels), `mp_not_entered`,
  `mp_band` / `mp_band_max`, `mp_fixed_remove` («הסר»), `mp_labour_factor`. No longer used by the page (left in the
  dictionary, append-only): `mp_fixed_mode_lines`, `mp_fixed_mode_rough`, `mp_fixed_rough_note`, `mp_fixed_empty`,
  `mp_labour_mode_employer`, `mp_labour_mode_gross`, `mp_labour_estimate`, `mp_labour_note`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the draft mapping out of the page and add the live month and the staff-cost migration — draftOf, liveMonthOf, empty target falls back to saved; spec — src/app/pages/monthly-plan/month-draft.ts, src/app/pages/monthly-plan/month-draft.spec.ts
- [ ] A2: Build the forecast/actual chip pair with the faded forecast in an empty actual — open/close, teal when filled, placeholder not counted; spec — src/app/pages/monthly-plan/components/month-pair/**
- [ ] A3: Feed the month picture from what is typed and put the pair on the revenue and purchases rows — live computed, flags, targets and dish calculator from the live month; page spec cases (a)–(e) replace the saved-only case — src/app/pages/monthly-plan/monthly-plan.page.ts, src/app/pages/monthly-plan/monthly-plan.page.html, src/app/pages/monthly-plan/monthly-plan.page.spec.ts
- [ ] A4: Put the pair, the trash icon and the new mode names on the fixed costs card — three-column rows, renamed modes and notes; spec — src/app/pages/monthly-plan/components/fixed-costs-card/**
- [ ] A5: Make staff cost gross pay times the factor, always shown, and start new months that way — drop the mode radios, employer cost beside each side, default gross; card and server tests — src/app/pages/monthly-plan/components/labour-card/**, shared/schemas/month/month-rules.ts, server/test/month-rules.test.js, server/test/month-plans.test.js
- [ ] A6: Let «חלקי» say what is missing — hint texts, the hint on the figure cells and the fixed flag; specs — src/app/pages/monthly-plan/month-hints.ts, src/app/pages/monthly-plan/month-hints.spec.ts, src/app/shared/month-figures/**
- [ ] A7: Turn the target norms into hover hints and lay the page out as a dense grid — band title on the box, short boxes, two-side grid with the picture beside the inputs — src/app/pages/monthly-plan/monthly-plan.page.html, src/app/pages/monthly-plan/monthly-plan.page.scss
- [ ] A8: Add the Hebrew words and check the page end to end in its spec — the keys of UI/UX Notes; page spec: no inline norm, band title present — public/assets/data/dictionary.json, src/app/pages/monthly-plan/monthly-plan.page.spec.ts
- [ ] A9: Record the changes in the maps and run every automatic check — paste outputs under Execution Notes — src/app/pages/breadcrumbs.md, src/app/shared/breadcrumbs.md, docs/brain/component-families.md

## What happens when
- The owner types in a box with «הסכום כולל מע״מ» ticked: the figures follow the typed (gross) number until he leaves
  the box, then the net number after the divide (plan 727's blur rule stays).
- He empties a target box: the figures keep using the month's saved target; the save still does not send an empty
  target (plan 727).
- He types, then picks another month: the leave question of plan 727 asks; «הישאר» keeps the typed numbers and the live
  figures.
- An actual box shows the faded forecast and he leaves it without typing: nothing is stored; the actual stays
  «לא הוזן» and the chip stays gray.
- A forecast is 0: the empty actual shows «0» faded (0 is a real value, N-M2).
- A month stored with an employer total of 50,000 at factor 1.25: the gross box shows 40,000 and «עלות מעביד (הערכה):
  ₪50,000.00»; nothing is written until he saves the month.
- The owner changes the factor: the employer cost beside both sides and the figures move at once.
- A closed month: the chips show the values, do not open; the figures are those of the stored month (draft = stored).
- On a phone the hover hints do not show (native titles); the screen reader reads them through `aria-describedby`.

## Technical Considerations
- The run branch for this plan is cut from `origin/orch/biz-numbers` (7c135d5b), which already holds plans 723–729;
  hence `Depends-on: none`. No `[auto]` command diffs against `origin/main`.
- Root cause and fix in one line: the figures read `open_` (saved) by plan 728's design; they now read
  `liveMonthOf(open_, draft_)` through the unchanged engine. No engine change is needed: the rough/lines mapping is
  already right (`fixedInputOf`).
- `monthInputOf`'s `employer` branch (`month-plan.ts:73`) stays for stored months; the page never feeds it after the
  migration.
- Collision: plans 748 and 750 run beside this one; see Execution Mode. Plan number note: `plans/748-house-style-ui-feedback-round.plan.md`
  exists untracked in the main folder (another round); the Planner resolves the 748 number before saving.
- **Planner choices for Dandan to grade:**
  - `behaviour:` the faded forecast in an empty actual box is NOT counted: the actual stays «לא הוזן», listed as missing — reverse: count it as the actual with an «מהתחזית» tag.
  - `behaviour:` saving stays a button plus the leave question; nothing saves by itself when leaving — reverse: save on leaving the page or the month without asking.
  - `behaviour:` a filled chip shows its amount after the label («תחזית · ₪12,000.00»), so a closed row still shows the number — reverse: label only.
  - `behaviour:` every pair starts closed each time the month opens; open/closed is not remembered — reverse: remember per pair.
  - `behaviour:` a stored employer total is turned into gross by dividing by the month's factor, so the month's figures stay the same — reverse: read the stored number as gross (figures grow by the factor).
  - `behaviour:` the server still accepts `mode: 'employer'` (old months stay valid); only new months and saves from the page use `gross` — reverse: refuse `employer` on save.
  - `behaviour:` «מחוץ לטווח» stays as a tag beside a target box; only the norm text moves into the hover hint — reverse: move it into the hint too.
  - `behaviour:` «תמונת החודש» sits beside the inputs and stays in view while scrolling on a wide screen — reverse: keep it below the targets.
  - `behaviour:` purchases (no forecast) get only the «בפועל» chip and no faded value — reverse: show revenue × food target as its faded forecast.
  - `behaviour:` box width fits 7 digits; the stored maximum stays 1,000,000,000 — reverse: refuse amounts over 9,999,999.
- Cost: none. Security: nothing new is stored or logged; logs still carry the month id only.

## Out of Scope
- The restaurant menu and dish sales pages (plan 748), the dashboard sign-out (plan 750).
- The shared tooltip box (plan 744, other run branch); per-employee lines (N-M3); month close; carry-forward.

## Critical Questions
- none — Dandan asked for no more questions (grading of 2026-11-26); the unasked choices are logged above as
  `behaviour:` decisions for him to grade.

## Execution Notes
- Planner 2026-11-26: written from Dandan's grading of run biz-numbers
