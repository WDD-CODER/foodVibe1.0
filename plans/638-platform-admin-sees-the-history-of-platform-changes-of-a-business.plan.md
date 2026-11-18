# Plan 638 — Platform admin sees the history of module and AI changes of a business, with the reasons

Status: draft
Depends-on: 620
Snapshot: 65e510e0e0b530e69e34ba74a905558768f24a89

## Problem Statement
Since plans 616 and 620 the platform admin switches modules, sets the monthly AI cap and turns private mode on or off
for a business, and must type a reason every time. The reason is stored, but nobody can read it: no screen shows it.
Dandan asked on 2026-11-18 where the changes and the reasons are kept, and then asked for a view.

Verified on `origin/main` (65e510e0, 2026-11-18):
- `server/routes/admin.js` `PUT /businesses/:id/platform` (the handler around lines 255–310) appends one row to
  `business.platformHistory` on every save: `{ at, by, byName, reason, changed }`, and keeps the last 50
  (`$push` with `$slice: -50`, line 290). `changed` holds field names only (`modules`, `aiMonthlyTokenCap`,
  `aiPrivate`): the row does not say what the value was or what it became.
- `shared/schemas/modules.ts:11` `platformHistoryRowSchema` is a `z.strictObject` with exactly those five fields;
  `shared/schemas/entities/business.schema.ts:103` holds `platformHistory` as an optional array of at most 50.
- `server/routes/business.js:41` strips `platformHistory` from what a member of the business receives. No route
  returns it to anyone: `GET /api/v1/admin/businesses` rows carry `modules`, `aiPrivate`, `aiMonthlyTokenCap`,
  `aiTokensThisMonth`, not the history.
- The dialog is `src/app/pages/platform-dashboard/components/platform-business-dialog/`
  (`platform-business-dialog.component.ts` 118 lines, `.html` 75 lines, `.spec.ts` 130 lines,
  `platform-business-dialog.service.ts` 32 lines). It is opened from `platform-dashboard.page.ts` `editPlatform(row)`.
- `src/app/core/services/platform-admin.service.ts` (192 lines) holds every admin call
  (`environment.apiUrl` + `API.admin(...)`).
- `server/test/admin-platform.test.js` covers the write (history row, the 50-row limit, 403 for an owner, the log
  line). `e2e/ui/620-3.spec.ts` opens the dialog from the `biz-edit` button.
- The Lucide icon `History` is not registered in `src/app/app.config.ts`. The dictionary has no `platform_history_*`
  key.
- Lesson from run `mod-0` (plans 617–620 each had to ask for it): a plan that adds a named piece needs
  `docs/brain/component-families.md` and the generated `docs/brain/inventory.md` in its scope, or the kit check stops it.

## Goals & Success Criteria
**Primary:** in the platform dialog of a business, the platform admin reads every stored change — when, who, what
changed (with the old and the new value for changes made from now on) and the reason — newest first.

- [auto] `pnpm run test:server` passes, including `server/test/admin-platform.test.js` with these new cases:
  `GET /api/v1/admin/businesses/:id/platform-history` answers 200 `{ rows }` newest first for the platform admin;
  a business with no history answers `{ rows: [] }`; an unknown business answers 404; an owner gets 403; no token 401.
- [auto] The same file: a save that changes modules from the four defaults to `['events', 'ai_create']`, the cap from
  none to `5000` and private from off to on stores one row whose `changes` is exactly
  `[{ field: 'modules', from: 'events,event_logistics,frontdesk,ai_create', to: 'events,ai_create' },
  { field: 'aiMonthlyTokenCap', from: '', to: '5000' }, { field: 'aiPrivate', from: 'false', to: 'true' }]`;
  a save that sends a field with the value it already has stores no entry for that field in `changes` and still
  stores the row with its reason; a row written before this plan (no `changes`) is returned as stored.
- [auto] The same file: a business document holding old rows (without `changes`) and new rows still passes
  `businessSchema`.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts`
  with these new cases: the history is requested once when the dialog opens; rows render newest first with date, name,
  reason and one line per change; a row without `changes` shows the field labels only; no rows shows the empty text;
  a failed load shows the error text and the rest of the dialog still works; after a successful save the list is
  requested again.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0;
  `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/platform`, pressing "מודולים ו-AI" on a business row opens the dialog, and it shows the heading
  "היסטוריית שינויים" (`e2e/ui/638-1.spec.ts`, the history route answered from a fixture with one row whose reason is
  "בדיקת היסטוריה"; the spec asserts that reason text is visible).
- [human] Dandan changes a module for a test business with a reason, opens the dialog again, and reads the change with
  its reason at the top of the list, in clear Hebrew.

## Execution Mode
- Parallel: no — it edits `src/app/pages/platform-dashboard/**` (also 630 and 632), `public/assets/data/dictionary.json`
  and `src/app/app.config.ts` (every screen plan of the Modules program) and `docs/brain/component-families.md`
  (623, 631). Never in a live run with those; `server/routes/admin.js` is edited by no open plan.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/modules.ts
server/routes/admin.js
server/test/admin-platform.test.js
src/app/core/services/platform-admin.service.ts
src/app/core/services/platform-admin.service.spec.ts
src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts
src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.html
src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts
src/app/pages/platform-dashboard/platform-dashboard.page.scss
public/assets/data/dictionary.json
src/app/app.config.ts
e2e/ui/638-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
docs/agent/standards-backend.md
server/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new route sits in `server/routes/admin.js` behind `verifyToken, requirePlatformAdmin` like
  every route of that file; a member of the business still never receives `platformHistory`
  (`server/routes/business.js:41` is not touched).
- INV-4: preserves — the history row stays one Zod shape in `shared/schemas/modules.ts`; the new field is optional, so
  stored rows still validate, and the server builds the row itself.

## Reuse Check

- `PlatformAdminService.getPlatformHistory(businessId)` — family: http — rung: 3 — why: one more method on the
  existing admin service, same `environment.apiUrl` + `API.admin(...)` pattern.
- history list inside `platform-business-dialog` — family: modal-shell — rung: 1 — why: a section in the body of the
  existing dialog; no new popup.
- empty text of the list — family: empty-state — rung: 1 — why: `app-empty-state` in its small form, as the platform
  tables use it.
- loading line of the list — family: feedback — rung: 1 — why: `app-loader`, as the platform page uses it.
- `describePlatformChange(change, translate)` in the dialog component — family: helpers — rung: 4 — why: turns one
  stored `{ field, from, to }` into the Hebrew line; nothing else formats these three fields, and it must be testable
  without the template.
- `platformChangesOf(before, after)` in `server/routes/admin.js` — family: none — rung: 4 — why: a server-side pure
  function local to the one route that writes the row; it compares the stored business with the values being saved.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to read what I changed for a business and why, so that a month later I can answer
  the owner who asks why a screen disappeared.
- As the platform admin, I want to see the old and the new value of a change, so that I can put it back exactly.
- As an owner, I want this history to stay with the platform, so that internal notes about my business are not shown
  to my staff.

## Functional Requirements

### Must Have (P0)
- [ ] `shared/schemas/modules.ts`: `platformHistoryRowSchema` gains
  `changes: z.array(z.strictObject({ field: z.string().max(40), from: z.string().max(200), to: z.string().max(200) })).max(10).optional()`.
  Nothing else in the file changes. Export `PlatformHistoryRow` (`z.infer`) if it is not exported yet.
- [ ] `server/routes/admin.js`, in `PUT /businesses/:id/platform`:
  - Read the stored business once at the start of the `try` (`col('businesses').findOne({ _id })`; unknown → 404 as
    today, before any write, including before `setAiPrivate`).
  - `platformChangesOf(before, { modules, aiMonthlyTokenCap, aiPrivate })` returns the entries for the fields that
    were sent **and** differ from the stored value. Values are strings: modules = the resolved list joined with `,`
    in `MODULE_KEYS` order (`modulesOf(before)` for the old value, so a business with no field reads as the four
    defaults); cap = the number as a string, `''` for no cap; private = `'true'` / `'false'`
    (`before.aiPrivate === true`).
  - The row becomes `{ at, by, byName, reason, changed, changes }`. `changed` keeps today's meaning (every field
    sent) so the existing tests stay as they are; `changes` may be an empty array.
  - Everything else of the handler — the `$slice: -50`, the caches, the log line with ids and field names only,
    the answer — stays as it is. The reason and the values never go to the log.
- [ ] `server/routes/admin.js`: new `GET /businesses/:id/platform-history` with `verifyToken, requirePlatformAdmin`
  → `{ rows }`: the business's `platformHistory` reversed (newest first), `[]` when the field is absent; 404
  `{ error: 'Business not found' }` for an unknown id. Projection: only `platformHistory` is read. Log on failure:
  `event: 'admin.platform_history.failed'` with the error and the business id.
- [ ] `src/app/core/services/platform-admin.service.ts`: `getPlatformHistory(businessId): Promise<PlatformHistoryRow[]>`
  (`API.admin(\`businesses/${id}/platform-history\`)`, returns `res.rows`). One spec case in
  `platform-admin.service.spec.ts` (URL and the unwrapped rows); create the spec file with only this case if the
  service has none.
- [ ] `platform-business-dialog.component.ts`:
  - signals `history_ = signal<PlatformHistoryRow[] | null>(null)` (null = loading) and
    `historyFailed_ = signal(false)`; a private `loadHistory_()` that calls the service for the open target, sets
    the rows, and on failure sets `historyFailed_` and logs `platform.history_load_failed` (business id only).
  - `loadHistory_()` runs when the dialog opens for a target (the same place the form is filled from the target) and
    again after a successful save, before the dialog closes — so the next opening is not needed to see the new row
    when the dialog stays open on an error path; a failed history load never blocks saving or closing.
  - `describePlatformChange(change)` → one Hebrew line from dictionary keys (see UI/UX Notes): modules list the
    added and the removed modules by their `module_*` labels; cap shows old → new with `platform_ai_no_cap` for
    empty; private shows `platform_history_private_on` / `_off`. An unknown `field` shows the raw field name.
  - A row without `changes` (written before this plan) shows its `changed` fields through
    `platform_history_field_*` labels, with no values.
- [ ] `platform-business-dialog.component.html`: below the form fields and above the dialog's buttons, a section
  with the heading `platform_history_title`: while `history_()` is null and not failed → `app-loader` (small);
  failed → the text `platform_history_failed`; empty → `app-empty-state` with `platform_history_empty`; else a list
  (`<ul>`, at most 50 rows, own scroll with `max-block-size`) of rows: first line = date and time
  (`DatePipe`, `'dd/MM/yy HH:mm'`) · `byName`; then one line per change; then the reason in quotes. `data-testid`:
  `biz-history`, `biz-history-row`, `biz-history-reason`.
- [ ] Styles: the few list rules go in `platform-dashboard.page.scss` beside the dialog's existing rules if the dialog
  has no stylesheet of its own (check first; if it has one, use it and add that file to the scope through
  `approved:`). Logical properties only; no new `.c-*` class.
- [ ] `src/app/app.config.ts`: register the Lucide icon `History`; the section heading uses
  `<lucide-icon name="history" [size]="14" />`.
- [ ] `docs/brain/component-families.md` (+ regenerated `docs/brain/inventory.md`): `getPlatformHistory` under
  `http`, `describePlatformChange` under `helpers`. `docs/agent/standards-backend.md` §5 and `server/breadcrumbs.md`:
  one row for the new route.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS only. The section is always open: no expand control, no pagination, no filter (at most 50
  rows exist per business).
- States: loading (loader line), failed (one text line, the form above stays usable), empty, list.
- Nothing in the section can be edited or deleted. Cancel, Escape and save behave exactly as today.
- New keys in `public/assets/data/dictionary.json` (append-only; none exists today):
  - `platform_history_title` — "היסטוריית שינויים" (history of changes)
  - `platform_history_empty` — "עוד לא נעשו שינויים לעסק הזה" (no changes were made for this business yet)
  - `platform_history_failed` — "לא הצלחנו לטעון את ההיסטוריה" (the history could not be loaded)
  - `platform_history_field_modules` — "מודולים" (modules)
  - `platform_history_field_aiMonthlyTokenCap` — "תקרת AI חודשית" (monthly AI cap)
  - `platform_history_field_aiPrivate` — "מצב פרטי" (private mode)
  - `platform_history_added` — "נוספו:" (added:)
  - `platform_history_removed` — "הוסרו:" (removed:)
  - `platform_history_cap_change` — "תקרת AI חודשית: {from} ← {to}" (monthly AI cap: from → to)
  - `platform_history_private_on` — "מצב פרטי הופעל" (private mode turned on)
  - `platform_history_private_off` — "מצב פרטי בוטל" (private mode turned off)
  - `platform_history_reason` — "סיבה:" (reason:)
- Existing keys reused: `module_events`, `module_event_logistics`, `module_frontdesk`, `module_ai_create`,
  `module_consultant_diag`, `platform_ai_no_cap`.
- Lucide: `History` (new registration).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let a history row say what the value was and what it became — the optional changes field on the row shape — shared/schemas/modules.ts
- [ ] A2: Store the old and new value with every platform save, only for what really changed — read the business first, platformChangesOf, the row with changes; the three new write cases — server/routes/admin.js, server/test/admin-platform.test.js
- [ ] A3: Give the platform admin a way to read a business's history from the server — the GET route, newest first, with its five access and empty cases — server/routes/admin.js, server/test/admin-platform.test.js
- [ ] A4: Fetch the history in the browser through the admin service — getPlatformHistory and its spec case — src/app/core/services/platform-admin.service.ts, src/app/core/services/platform-admin.service.spec.ts
- [ ] A5: Show the history in the business dialog with its loading, empty and failed states — signals, loadHistory_, describePlatformChange, the section and its styles, the History icon, the twelve dictionary keys, the six spec cases — src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts, .html, .spec.ts, src/app/pages/platform-dashboard/platform-dashboard.page.scss, public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A6: Record the new route and the two new pieces where the next developer looks — the family rows, the regenerated inventory, the backend route row and the server map row — docs/brain/component-families.md, docs/brain/inventory.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A7: Prove it in the running app and run every check — the one screen check with a fixture row, then the Done-when commands in order — e2e/ui/638-1.spec.ts

## Technical Considerations
- Dependencies: `PlatformBusinessDialogComponent`, `PlatformAdminService`, the platform write route of plan 616.
- New files needed: `e2e/ui/638-1.spec.ts`; `src/app/core/services/platform-admin.service.spec.ts` only if it does
  not exist.
- Model changes: `platformHistoryRowSchema` gains optional `changes`; `pnpm run build:schemas` regenerates
  `server/generated/schemas` (never hand-edited).
- Backend / API: new `GET /api/v1/admin/businesses/:id/platform-history`; `PUT …/platform` stores `changes`.
- Auth and validation: platform admin only (`requirePlatformAdmin`); the id is a path parameter used in an exact
  `_id` match; the row is built by the server, never taken from the body.
- Security surface: the history holds internal reasons about a business. It is returned only by the admin route;
  the member route keeps stripping it. Reasons and values are never logged.
- Data / migration: none — old rows stay as they are and show field names only.
- Project checks: the `[auto] log-query` item; dictionary keys named; the Lucide icon named; Reuse Check filled;
  user stories from the platform admin's and the owner's side; the route is a dedicated endpoint because the history
  is a server-owned field of the business document, not an entity of its own.

## Out of Scope
- The front desk status changes of a business (`PUT /admin/businesses/:id/front-desk`) and the "internal" flag: they
  are not part of `platformHistory` and are not shown here.
- Showing the history to the owner or to anyone in the business.
- More than the last 50 rows, search, filters, export.
- Undoing a change from the list.
- Filling old rows with values: a row written before this plan shows which fields changed, not the values.

## Critical Questions
- none

## Execution Notes
- decided: the list sits inside the existing dialog, always open, not on a new page — why: at most 50 short rows, and
  the dialog is where the change is made.
- decided: values are stored as short strings from now on; old rows show field names only — why: the stored rows
  hold no values and nothing can rebuild them.
- decided: a field sent with the value it already has is left out of `changes` but stays in `changed` — why: the
  dialog sends only what changed, but a direct API call may not; the list should show real changes.
