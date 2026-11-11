# Plan 579 — Logistics questions: per-event list, hide on one event, one needed toggle and tighter chips

Status: draft
Depends-on: 522, 523, 532, 570
Snapshot: 8d4f043ffd5ded749cf5c78836d241b87ada6f86

## Problem Statement
The Human's feedback on run 522 (2026-11-11, cards V5 and V7; `.claude/todo.md` "Logistics feedback" F2, F5, F6, F7,
F10, plus the data that F1/F3/F4 need). The Metadata Manager card part (F1, F3, F4, F8, F9) is plan 581, which
depends on this one. Verified at 8d4f043f:

- **Old events get new questions (F10).** `EventLogisticsPanelComponent.buildRows`
  (`src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts`) reads the
  live registry (`this.registry.forPhase(phase, env)()`, `this.registry.items_()`), so a question added or promoted to
  shared after an event was created shows on that event, unanswered.
  - Every taxonomy term and every event has a required `createdAt: number` (`baseDocShape`, `shared/schemas/base.schema.ts`).
  - The 45 seeded shared questions were inserted by `ensureDefaultLogisticsItems` (`server/services/seed-master.js`)
    with `createdBy: '__master__'` and `createdAt` = the seed time (plan 520, November 2026) — later than most events.
  - Promote (plan 532) is the admin's `POST /api/v1/data/taxonomyTerms` with `shared: true`: it inserts a new master
    term (`createdAt` = now) and **hard-deletes** every business's own term with the same `kind` + `key`
    (`server/routes/generic.js` ~line 629 `deleteMany`; same fold after a master re-key ~line 802). The business's own
    term — and with it the date its old events first saw the question — is gone.
  - Removing a question today is a DELETE (soft delete → Trash → purged after 30 days); nothing records "removed from
    this date on" while keeping the question for older events.
- **No hide on one event (F2).** The panel has no remove control; an event stores only `siteLogistics.answers`
  (written only by `PUT /api/v1/events/:id/logistics`, `server/routes/events.js:295`).
- **Status and payer (F5, F6).** Four status radios (`statuses`: לא נבדק / נדרש / לא נדרש / הלקוח מספק); with
  "נדרש", three payer radios (`LOGISTICS_PAYERS = ['client', 'quoted', 'chef']`: הלקוח / בהצעה / על חשבוננו), none
  selected by default, plus a "ללקוח" checkbox (`showToClient`) that decides what the client summary copies.
- **Chip size (F7).** `.c-chip--toggle` (`min-block-size: 2rem`, 2.75rem on a phone) inside a `.c-chip-group` that
  `.c-chip-group:has(> .c-chip--toggle)` pads by `1rem` block (`src/styles.scss` ~line 2102).
- **Sections are a fixed enum (F4 data).** `LOGISTICS_SECTIONS` (`shared/schemas/entities/event-logistics.ts:4`) is
  the only allowed `section` on a question (`taxonomy-term.schema.ts:145`) and on an answer (`menu-event.schema.ts:154`).
- **No business-level hide (F1/F2 data).** A business cannot take a shared question off its own default list.

## Goals & Success Criteria
**Primary:** each event shows the questions that existed when it was created (plus the ones it answered), an owner
can hide a question on one event and bring it back, a row is one "נדרש" toggle with "עלינו" / "באחריות הלקוח", the
client summary lists what the customer must bring, and the chips are tight. The data and registry support plan 581's
card (business hide list with dates, removal dates, own sections).

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:no-native-select` exits 0.
- [auto] `pnpm run test:server` exits 0, including `server/test/taxonomy-term-schema.test.js` (A1), `server/test/events-logistics.test.js` and `server/test/business-logistics-hidden.test.js` (A2), `server/test/taxonomy-terms-api.test.js` and `server/test/admin-taxonomy.test.js` (A3).
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/services/business.service.spec.ts` (A4), `src/app/core/services/logistics-item-registry.service.spec.ts` (A5), `src/app/core/utils/logistics-summary.util.spec.ts` (A6) and `src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts` (A9).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/579-logistics-per-event-list-hide-needed-toggle-tight-chips.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/579-logistics-per-event-list-hide-needed-toggle-tight-chips.plan.md` exits 0; `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` line.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] On `/menu-intelligence/<id>` of a QA event, opening the logistics card and tapping "הסר מהאירוע הזה" on "יש מטבח במקום?" removes the row; the footer chip "1 מוסתרות" shows it again with "החזר לאירוע", and tapping that brings the row back (`e2e/ui/579-1.spec.ts`).
- [ui] On `/menu-intelligence/<id>` of a QA event, the row "יש מטבח במקום?" shows no "לא נבדק" chip and no "ללקוח" checkbox; tapping "נדרש" shows exactly "עלינו" and "באחריות הלקוח", with "עלינו" selected (`e2e/ui/579-2.spec.ts`).
- [ui] For a QA event created first, an own question "שאלה חדשה 579" added afterwards through the API is not on `/menu-intelligence/<id>` of that event, and is on a second QA event created after it (`e2e/ui/579-3.spec.ts`).
- [ui] On `/menu-intelligence/<id>` of a QA event, marking "צ'ילרים להבאה" (פגישת ספקים) "נדרש" + "באחריות הלקוח" and tapping "העתק סיכום ללקוח" shows "הועתק", and the clipboard text contains "צ'ילרים להבאה" (`e2e/ui/522-5.spec.ts`, updated).
- [ui] On `/trash`, restoring a deleted client and confirming "לשחזר פריט זה?" removes its row, and the client is live again (`e2e/ui/544-1.spec.ts`, fixed: the spec now confirms the modal).
- [ui] The builder re-runs `e2e/ui/522-1.spec.ts` … `522-6.spec.ts`, `523-1.spec.ts` … `523-3.spec.ts` and `570-1.spec.ts` against the slot app; all pass.
- [human] On a phone-size window and on a laptop, an event's logistics questions take visibly less height than before, and "נדרש", "עלינו" and "באחריות הלקוח" still read clearly and are easy to tap.
- [human] An event created before this plan merged still shows the full shared checklist it showed before (nothing went missing).

## Execution Mode
- Parallel: yes — shares only the append-only hotspots `public/assets/data/dictionary.json` and `src/styles.scss`.
- Concurrent plans: any that do not touch the logistics panel, `server/routes/events.js`, `server/routes/business.js`, `server/routes/generic.js` or `server/routes/admin.js`. Plan 581 runs after this one.
- Isolated DB: no — new optional fields only (`menuEvents.siteLogistics.hiddenKeys`, `businesses.hiddenLogisticsKeys`, `logisticsItem.removedAt` / `foldedAt`, kind `logisticsSection`); no migration.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/event-logistics.ts
shared/schemas/entities/taxonomy-term.schema.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/entities/business.schema.ts
server/routes/events.js
server/routes/business.js
server/routes/generic.js
server/routes/admin.js
server/services/business.js
server/test/taxonomy-term-schema.test.js
server/test/events-logistics.test.js
server/test/business-logistics-hidden.test.js
server/test/taxonomy-terms-api.test.js
server/test/admin-taxonomy.test.js
server/test/helpers/v2-docs.js
src/app/core/models/menu-event.model.ts
src/app/core/services/logistics-item-registry.service.ts
src/app/core/services/logistics-item-registry.service.spec.ts
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/core/services/event-pipeline.service.ts
src/app/core/utils/logistics-summary.util.ts
src/app/core/utils/logistics-summary.util.spec.ts
src/app/pages/menu-intelligence/components/event-logistics-panel/**
src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
src/styles.scss
public/assets/data/dictionary.json
docs/brain/component-families.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
server/breadcrumbs.md
e2e/ui/579-1.spec.ts
e2e/ui/579-2.spec.ts
e2e/ui/579-3.spec.ts
e2e/ui/522-1.spec.ts
e2e/ui/522-2.spec.ts
e2e/ui/522-3.spec.ts
e2e/ui/522-4.spec.ts
e2e/ui/522-5.spec.ts
e2e/ui/544-1.spec.ts
e2e/ui/522-6.spec.ts
e2e/ui/523-1.spec.ts
e2e/ui/523-2.spec.ts
e2e/ui/523-3.spec.ts
e2e/ui/570-1.spec.ts
screens/579-*.png
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `PUT /api/v1/events/:id/logistics` stays behind `assertCan(…, 'editLogistics', …)` (owner) and only gains `hiddenKeys`; the new `PUT /api/v1/business/logistics-hidden` is behind `assertCan(req, res, 'editSettings', { type: 'businesses' })` and writes only `req.user.businessId`; the admin route keeps `requirePlatformAdmin` and only filters folded rows out. Only a platform admin writes master terms (unchanged).
- INV-2: preserves — taxonomy is still read as master ∪ own (`TaxonomyStore`, generic GET, `readScope` unchanged). The business's hidden keys are a business setting that only filters which questions its events list (registry facade); no master term is copied, changed or deleted for one business. The fold of same-key own terms on a shared add stays — for kind `logisticsItem` the folded own term is kept with `foldedAt` instead of deleted, so it no longer appears in any list but still dates when that business first had the question; other kinds fold as today.
- INV-3: preserves — no client loop: a hide is one PUT; renames still re-key answers on the server through `TERM_REFERENCES` (now also `siteLogistics.hiddenKeys[]`) in the same request.
- INV-4: preserves — every new field (`siteLogistics.hiddenKeys`, `businesses.hiddenLogisticsKeys`, `logisticsItem.removedAt` / `foldedAt`, payer `ours`, the section key schema, kind `logisticsSection`) is defined once in `shared/schemas`; the events route validates with `checkStoredDoc` (`validMerged`), the business route with `safeParse`, the generic route with the term schema.
- INV-5: preserves — sections that businesses add are `taxonomyTerms` of the new kind `logisticsSection` (no new collection); questions stay kind `logisticsItem`; the nine built-in sections stay the fixed `LOGISTICS_SECTIONS` with their dictionary labels.

## Reuse Check
- `.c-chip-group--tight` (`src/styles.scss`, append-only) — family: chip — rung: 3 — why: one dense variant of the chip group (no block padding, `--space-1` gap, small chips); no existing modifier removes the toggle group's 1rem block padding. Plan 581 uses it too.
- "נדרש" toggle and provider radios — family: chip — rung: 1 — why: `.c-chip c-chip--toggle` inside `.c-chip-group c-chip-group--tight`.
- Hide / restore buttons — family: engine-classes — rung: 1 — why: `.c-icon-btn` with `eye-off` / `undo-2`.
- Event question list by date, section list, business hide list — family: taxonomy — rung: 3 — why: `LogisticsItemRegistryService` gains `allItems_`, `hiddenAt_`, `defaultItems_`, `sections_`, `sectionLabel()`, `forEvent()`; it stays the one facade over `TaxonomyStore` for logistics.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want an event's checklist to be the one that existed when I booked it so that questions added later don't show up as open on old events.
- As a chef, I want to hide a question on one event without losing what I answered so that the checklist fits that event.
- As a chef, I want one "needed" tap with "on us" already chosen so that a phone intake goes fast.
- As a chef, I want the client summary to list what the client must bring so that I can paste it into the quote.

## Functional Requirements

### Must Have (P0)
- [ ] **Which questions an event shows (F10, date rule).** For an event E of business B (`E.createdAt`; missing → now) and a question key k, let the terms of k be every `logisticsItem` term with that key that B reads (master ∪ own), **including** own terms marked `foldedAt` and terms marked `removedAt`:
  - `since(term)` = 0 when `term.createdBy === '__master__'` (the plan-520 seed, so every existing event keeps the base checklist), else `term.createdAt`.
  - `start(k)` = the smallest `since` over the terms of k (a promoted question keeps the date its own copy had for the promoting business, through the folded own term).
  - `end(k)` = the smallest of: the live term's `removedAt` (when > 0), and B's `hiddenLogisticsKeys` entry `at` for k; no end when neither is set.
  - E shows k when `start(k) <= E.createdAt` and (no end, or `E.createdAt < end(k)`), and the term's phase/environment match (today's filter), **or** when E has an answer for k (answered questions always show, as today's orphan-row path).
  - The row's data (phase, section, type, hint, environments) comes from the live term (not `foldedAt`); when only removed terms remain, from the newest removed one.
  - No field is written on events; nothing is migrated. Old terms all have `createdAt`, so no default is needed except the seed rule above.
- [ ] **Removal dates (data for plan 581).** `logisticsItem` gets `removedAt?: number` (int ≥ 0; absent or 0 = not removed; plan 581 sets it instead of deleting, and sets 0 to bring a question back) and `foldedAt?: number` (server-written only). The registry's `items_` (the live list used by the card and new events) leaves out terms with `removedAt > 0` or `foldedAt`.
- [ ] **Promote keeps the business's history.** In `server/routes/generic.js`, both folds (shared POST, master re-key) do `updateMany({ kind, key, businessId: { $ne: MASTER }, foldedAt: { $exists: false } }, { $set: { foldedAt: now, updatedAt: now } })` when `kind === 'logisticsItem'`, and keep `deleteMany` for every other kind. `GET /api/v1/admin/taxonomy` (plan 532) adds `foldedAt: { $exists: false }` to its filter so promoted rows still leave the admin list. A non-shared POST of a key master already has still answers 409 (unchanged).
- [ ] **Hide on one event (F2).** `siteLogistics.hiddenKeys` (string array, max `LOGISTICS_ANSWERS_MAX`, each ≤ `LOGISTICS_LABEL_MAX`); `PUT /:id/logistics` accepts `hiddenKeys` as a whole-list replace (non-array or a non-string entry → 400 `BAD_LOGISTICS`; duplicates dropped). `TERM_REFERENCES.logisticsItem.menuEvents` gains `'siteLogistics.hiddenKeys[]'`. Each panel row (list or ad-hoc) gets an `eye-off` `.c-icon-btn` "הסר מהאירוע הזה" (`logistics_hide_item`, when `canEdit_()`). A hidden row leaves the list, its answer stays, and it no longer counts as open (tab counts, footer count, phase-done confirm, summary). The footer shows a `.c-chip--tap` "`<n>` מוסתרות" (`logistics_hidden_count`) when n > 0; it toggles `showHidden_`, which lists the hidden rows under their sections, dimmed (`.is-hidden`), each with an `undo-2` button "החזר לאירוע" (`logistics_show_item`) that takes the key out of `hiddenKeys`.
- [ ] **Business hide list (data for plan 581).** `businesses.hiddenLogisticsKeys`: array (max 300) of `{ key, at }` (`key` ≤ `LOGISTICS_LABEL_MAX`, `at` = ms). `PUT /api/v1/business/logistics-hidden` `{ keys: string[] }` (owner, `editSettings`): trimmed and deduped; a key already in the list keeps its `at`, a new key gets `at = Date.now()` (server time), a missing key is dropped. Reply `{ hiddenLogisticsKeys }`. `BusinessService.updateHiddenLogisticsKeys(keys)`.
- [ ] **One "נדרש" toggle (F5).** The four status radios become one `.c-chip--toggle` checkbox "נדרש" (`logistics_status_needed`), off by default, checked when the stored status is `needed` or `client_provides`. On → `{ status: 'needed', payer: <shown provider> }`; off → `{ status: 'not_needed' }`. A row is open ("לא נבדקו") while it has no answer or its status is `unchecked`, as today. The old status values stay in the schema.
- [ ] **Provider (F6).** `LOGISTICS_PAYERS` gains `'ours'` (appended). With "נדרש" on, exactly two radios show: "עלינו" (`ours`, default) and "באחריות הלקוח" (`client`); exactly one is always selected. Reading old answers: payer `chef`, `quoted`, `ours` or none → "עלינו"; payer `client` or old status `client_provides` → "באחריות הלקוח". Any change writes `ours` or `client`. "בהצעה", "הלקוח משלם" and "על חשבוננו" are no longer offered.
- [ ] **Show-to-client checkbox removed (F6).** The "ללקוח" checkbox leaves the template and `setShowToClient` is deleted. Stored `showToClient` values stay in the schema and data and are ignored on read; no migration.
- [ ] **Client summary.** `buildClientSummary(answers, items, sections, t)` lists only answers that are needed (status `needed` or `client_provides`), "באחריות הלקוח" by the read rule above, and not hidden on the event; grouped under the event's section order (`sections: { key: string; label: string }[]`); each line `• <label>` plus ` · <quantity>` and ` · <text>` when set. Nothing to list → today's `logistics_nothing_to_copy` toast.
- [ ] **Sections (F4 data).** `logisticsSectionKeySchema = z.string().min(1).max(LOGISTICS_LABEL_MAX)` replaces `z.enum(LOGISTICS_SECTIONS)` for `logisticsItem.section` and `answers[].section`. New plain kind `logisticsSection` (appended to `TAXONOMY_KINDS` and `plainKinds`; `TERM_REFERENCES.logisticsSection = {}`). The registry's `sections_` = the nine built-ins, then shared `logisticsSection` terms, then own, by `sortOrder`; `sectionLabel(s)` = `logistics_section_<s>` for a built-in, else the key. The panel groups by `sections_()` and appends any other section key found on its rows.
- [ ] **Tight chips (F7).** Append to `src/styles.scss`: `.c-chip-group.c-chip-group--tight { gap: var(--space-1); padding-block: 0 }`; `.c-chip-group--tight > .c-chip { gap: var(--space-1); min-block-size: 1.75rem; padding-inline: var(--space-2); padding-block: 0.125rem; font-size: var(--fs-xs) }`; under `@media (max-width: $break-phone-max)`: `.c-chip-group--tight > .c-chip { min-block-size: 2.25rem }`.
- [ ] Every string through `translatePipe`; icons already registered (`eye-off`, `undo-2`).

### Should Have (P1)
- [ ] `docs/brain/component-families.md`: chip family gets `.c-chip-group--tight` and its 579 user; taxonomy family notes `logisticsSection`, `removedAt` / `foldedAt` and the registry's new members.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; the hide button sits at the inline end of the row head.
- Dictionary keys (`general`, append-only): `logistics_payer_ours` ("עלינו"), `logistics_payer_client_care` ("באחריות הלקוח" — the label for stored `client`), `logistics_hide_item` ("הסר מהאירוע הזה"), `logistics_show_item` ("החזר לאירוע"), `logistics_hidden_count` ("מוסתרות"). Reused: `logistics_status_needed`, `logistics_copy_summary`, `logistics_copied`, `logistics_nothing_to_copy`, `logistics_save_failed`, `logistics_section_*`. Existing entries are not rewritten (`logistics_show_to_client`, `logistics_payer_*` stay unused).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add the schema fields for hide lists, removal dates, own sections and the "ours" provider — `event-logistics.ts`: append `'ours'` to `LOGISTICS_PAYERS`, add `logisticsSectionKeySchema` and `type LogisticsSectionKey = string`; `taxonomy-term.schema.ts`: append `'logisticsSection'` to `TAXONOMY_KINDS` and `plainKinds`, `logisticsItem.section` → `logisticsSectionKeySchema`, `removedAt: z.number().int().min(0).optional()`, `foldedAt: z.number().optional()`, `TERM_REFERENCES.logisticsItem.menuEvents` += `'siteLogistics.hiddenKeys[]'`, `logisticsSection: {}`; `menu-event.schema.ts`: `answers[].section` → `logisticsSectionKeySchema`, `siteLogistics.hiddenKeys` optional; `business.schema.ts`: `hiddenLogisticsKeys` optional + `logisticsHiddenInputSchema = z.strictObject({ keys: z.array(z.string().min(1).max(LOGISTICS_LABEL_MAX)).max(300) })`; tests: a `logisticsSection` term validates; a `logisticsItem` with section "סעיף שלי", `removedAt: 0` and `foldedAt` validates; a 121-char section fails; `TAXONOMY_KINDS` contains `logisticsSection` — shared/schemas/entities/event-logistics.ts, shared/schemas/entities/taxonomy-term.schema.ts, shared/schemas/entities/menu-event.schema.ts, shared/schemas/entities/business.schema.ts, server/test/taxonomy-term-schema.test.js, server/test/helpers/v2-docs.js
- [ ] A2: Store the event's hidden keys and the business's dated hide list — `PUT /:id/logistics` accepts `hiddenKeys` (validate, dedupe, replace); `setHiddenLogisticsKeys(id, keys)` in the business service (keeps existing `at`, stamps new ones, `$set`), `PUT /api/v1/business/logistics-hidden` with `editSettings` + `safeParse`, logs `business.logistics_hidden.saved` / `.failed`; tests: `hiddenKeys` replaces and survives a later answer save; `hiddenKeys: 'x'` → 400 `BAD_LOGISTICS`; staff → 403; owner saves `['a']` then `['a', 'b']` → `a` keeps its first `at`, `b` gets a later one; staff 403; no token 401; 301 keys → 400; another business's doc unchanged — server/routes/events.js, server/test/events-logistics.test.js, server/services/business.js, server/routes/business.js, server/test/business-logistics-hidden.test.js
- [ ] A3: Keep a business's own copy, marked folded, when its question is promoted — both fold spots in `generic.js` mark `foldedAt` for `logisticsItem`, `deleteMany` for other kinds; `admin.js` filter adds `foldedAt: { $exists: false }`; tests: the existing fold test still passes for a non-logistics kind (rows deleted); a shared `logisticsItem` POST leaves the own term with `foldedAt` and its `createdAt`; the admin read no longer lists it (`admin-taxonomy.test.js` fold case) — server/routes/generic.js, server/routes/admin.js, server/test/taxonomy-terms-api.test.js, server/test/admin-taxonomy.test.js
- [ ] A4: Type the new fields on the client — `LogisticsAnswer.section: string`, `payer` union + `'ours'`, `SiteLogistics.hiddenKeys?`; `LogisticsPatch.hiddenKeys?: string[]`; `BusinessService.updateHiddenLogisticsKeys(keys)` via `_put('logistics-hidden', { keys })` (widen the `_put` unions); spec: URL, body, and `business_()` takes the reply — src/app/core/models/menu-event.model.ts, src/app/core/services/event-pipeline.service.ts, src/app/core/services/business.service.ts, src/app/core/services/business.service.spec.ts
- [ ] A5: Decide in the registry which questions an event shows — `allItems_` (every `logisticsItem` term), `items_` (live: no `removedAt > 0`, no `foldedAt`), `hiddenAt_` (Map key → `at` from `BusinessService.business_()?.hiddenLogisticsKeys`), `defaultItems_` (`items_` minus hidden), `sections_`, `sectionLabel()`, `forEvent(createdAt: number | undefined, phase, environment): LogisticsItemTerm[]` (the P0 date rule; one row per key); `forPhase` keeps working on `defaultItems_`; spec: seed term (`createdBy: '__master__'`) shows on an event older than it; an own term created after the event does not; a promoted key (master new + folded own old) shows on the business's old event; removed (`removedAt` T) shows on an event created before T, not after; business-hidden at T likewise; `removedAt: 0` counts as live; section order and labels — src/app/core/services/logistics-item-registry.service.ts, src/app/core/services/logistics-item-registry.service.spec.ts
- [ ] A6: Make the client summary list what the customer brings — new signature and rule of P0; spec: needed + `client` listed; needed + `ours` / `chef` / none not listed; old `client_provides` status listed; `not_needed` not listed; a custom section heading prints its key; quantity and text appended — src/app/core/utils/logistics-summary.util.ts, src/app/core/utils/logistics-summary.util.spec.ts
- [ ] A7: Add the tight chip-group variant — the three rules of P0, appended after the chip block, five-group property order, tokens only — src/styles.scss
- [ ] A8: Make the panel use the date rule, hide/restore and the one toggle — `buildRows` takes items from `registry.forEvent(event.createdAt, phase, env)` and `known` from `registry.allItems_()`; rows carry `hidden` (key in `siteLogistics.hiddenKeys`); counts, `sections_`, `phaseDone` skip hidden rows; `sections_` from `registry.sections_()` + extra keys, labels via `registry.sectionLabel`; `hideRow` / `showRow` → `saveNow({ hiddenKeys })`; `setNeeded(row, on)`, `providerOf(row)` (read rule), `setProvider(row, 'ours' | 'client')`; delete `statuses`, `payers`, `setShowToClient`; `copySummary` passes the sections and leaves out hidden rows — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts
- [ ] A9: Show the toggle, the two providers and the hide controls, and test the panel — template: `eye-off` button `.logistics-hide` in the row head; the status radiogroup → one "נדרש" checkbox; with it on, a radiogroup of "עלינו" / "באחריות הלקוח" in `.c-chip-group c-chip-group--tight`; no "ללקוח" checkbox; hidden rows under `showHidden_` with `.is-hidden` and the `undo-2` button; footer chip `logistics_hidden_count`; scss `.is-hidden` (opacity token), row head flex; spec: an own item created after the event is not a row; hide sends `hiddenKeys` and drops the row and its open count; restore removes the key; "נדרש" on sends `{ status: 'needed', payer: 'ours' }`; payer `chef` shows "עלינו" checked, `client` shows "באחריות הלקוח"; old `client_provides` status shows the toggle on + "באחריות הלקוח"; no showToClient control — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.html, src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.scss, src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
- [ ] A10: Add the Hebrew strings — the keys of UI/UX Notes, appended to `general` — public/assets/data/dictionary.json
- [ ] A11: Write the three screen checks and update 522-5 — 579-1…3 per the `[ui]` lines with `signInQa`, `createQaEvent` / `deleteQaEvent`, API setup, cleanup in `finally` (delete the own term "שאלה חדשה 579" through `DELETE /api/v1/data/taxonomyTerms/:id`, delete both events), screenshots `screens/579-<n>.png`; 579-3 creates event 1, then the term, then event 2; 522-5: click "נדרש", then "באחריות הלקוח" (instead of "ללקוח"), then copy; run each with `pnpm exec playwright test <spec>` with `E2E_APP_URL` / `E2E_API_URL` set to the slot's ports — e2e/ui/579-1.spec.ts, e2e/ui/579-2.spec.ts, e2e/ui/579-3.spec.ts, e2e/ui/522-5.spec.ts
- [ ] A13: Fix the trash-restore screen check so it confirms the restore window — after the row's "שחזר מהאשפה" click, click the confirm button in the "לשחזר פריט זה?" modal before expecting the row to leave (found 2026-11-11: the app restores fine, the spec never confirmed) — e2e/ui/544-1.spec.ts
- [ ] A12: Record the changes in the maps and run every `[auto]` check — paste the outputs under Execution Notes — docs/brain/component-families.md, src/app/core/services/breadcrumbs.md, src/app/pages/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/shared/breadcrumbs.md, server/breadcrumbs.md

## What happens when
- On a hide or restore error: toast `logistics_save_failed` (as today); the row follows the stored event.
- On a toggle or provider change: saved 600 ms after the last change (today's `pending_` flow).
- Read-only viewer (staff): sees the rows by the same date rule; no hide, toggle or provider control works (`canEdit_()`).
- A question deleted the old way (soft delete, before this plan): gone from every event that did not answer it — unchanged behaviour; from now on plan 581 removes with `removedAt`.
- A question renamed in plan 581: answers and `hiddenKeys` re-key on the server (`TERM_REFERENCES`); `createdAt` does not change, so it stays on the same events. A business hide entry keeps the old key (accepted; the question then shows again for that business).
- A business restores a hidden shared question (plan 581): its entry leaves the list, so the question shows again on every event of that business that it existed for, including events created while it was hidden.

## Technical Considerations
- Dependencies: `TaxonomyStore.terms`, `LogisticsItemRegistryService` (521), `BusinessService._put`, `EventPipelineService.saveLogistics`, `getBusiness` / `assertCan` / `checkStoredDoc` on the server; e2e helpers `signInQa`, `createQaEvent`, `deleteQaEvent`.
- New files needed: `server/test/business-logistics-hidden.test.js`, `e2e/ui/579-1.spec.ts` … `579-3.spec.ts`, screenshots.
- Model changes: `LogisticsAnswer.section` widened to `string`, `payer` gains `ours`; `SiteLogistics.hiddenKeys?`; `Business.hiddenLogisticsKeys?`; `logisticsItem.removedAt?` / `foldedAt?`; kind `logisticsSection`.
- Backend / API: `PUT /api/v1/events/:id/logistics` also takes `hiddenKeys`; new `PUT /api/v1/business/logistics-hidden`; the generic shared-term POST and master re-key keep folded `logisticsItem` own terms (`foldedAt`); `GET /api/v1/admin/taxonomy` skips them.
- Auth and validation: owner-only writes (`editLogistics`, `editSettings`); master terms admin-only (unchanged); Zod on every new field.
- Security surface: hidden keys and section names ≤ 120 chars, rendered through interpolation only; the folded own terms are still the business's own docs (read only by that business).
- Data / migration: none. Old answers keep validating; old `showToClient` values are ignored; old payers read as described.
- Project checks: log-query `[auto]` present; Reuse Check present; dictionary keys listed (append-only); icons already registered; logical CSS; hotspots append-only.

## Out of Scope
- The Metadata Manager card: edit, remove, restore, scope radios, environment defaults, adding sections (plan 581).
- Renaming, reordering or removing sections.
- Showing or editing the provider anywhere but the event panel; changing the quote or price from the provider.
- Cleaning stored `showToClient` values or old payer values.

## Critical Questions
- Q1: What does removing a question on one event do? A: (Human, 2026-11-11) hide it on that event and keep its answer; nothing is deleted and it can be shown again.
- Q2: What does the platform admin's "remove for everybody" reach? A: (Human, 2026-11-11) only future events; events that already exist keep it.
- Q3: What replaces the status chips? A: (Human, 2026-11-11) one "needed" toggle, off by default; turning it on opens the provider options.
- Q4: Which provider options, and what does the client summary copy? A: (Human, 2026-11-11) exactly two, "עלינו" (default) and "באחריות הלקוח", one always selected; the show-to-client checkbox goes and the summary lists the needed items that are "באחריות הלקוח".
- Q5: Which questions does an old event show? A: (Human, 2026-11-11) by date: questions that existed when the event was created and were not removed before it; later ones do not show; answered ones always show; per-event hide stays on the event.

## Open questions for the Human
- none

## Execution Notes
- Planner draft 2026-11-11 (feedback F2, F5, F6, F7, F10 and the data for F1/F3/F4; the card is plan 581).
- Date rule needs no migration: every term and event has `createdAt`. Two exceptions are handled in code: the plan-520 seed (`createdBy: '__master__'`) counts as always there, and promote keeps the business's own copy marked `foldedAt` (it used to be deleted) so its first date survives. Own questions added before this plan (e.g. "בדיקת קידום") will no longer show on events created before they were added, unless answered — that is the rule as decided.
