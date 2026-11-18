# Plan 639 — Private mode only stops learning; erasing what was learned is a separate, explicit action

Status: draft
Depends-on: 627, 638
Snapshot: dede1a11

## Problem Statement
The map's C-LEARN (`docs/modules/modules-map.md`, 2026-11-17) says that turning private mode on erases what the platform
already learned from a business, and that deleting a private business leaves nothing. Plans 618, 619 and 627 built it.
On 2026-11-18 Dandan changed the rule: data already collected is kept and used. Private mode only stops learning from
that moment on. Old learned data is erased only when the business explicitly asks for it: the platform admin erases
it from the business dialog with a reason, or answers "erase it too" to a question the delete of a business now asks.

Verified on `origin/orch/mod-invoices-srv` (run `mod-invoices-srv`, PR #605, holds 625–627; this plan runs after it is
merged):
- `server/services/business.js` `setAiPrivate(id, value)` (around line 87): when `value` is true it deletes the
  business's promoted `GEMINI_SHOTS` copies (`businessId: '__master__'`, `promotedFrom.businessId`), and calls
  `require('./invoice-memory').forgetBusiness(db, id)` (added by 627). It returns `{ matchedCount, aiPrivate, removed }`.
- Same file, `deleteBusinessServerData(db, business, log)` (around line 108): when `mayLearnFrom(business)` is false
  (private) it deletes the promoted copies and every `aiDrafts` row of the business and calls `forgetBusiness`;
  otherwise it strips the drafts to numbers. Both cases always delete `storedFiles`, `priceHistory`, the business's own
  `invoiceAliases` and `businessAccess`.
- `server/services/invoice-memory.js` `forgetBusiness(db, businessId)` (line 131) pulls the business from the
  `contributors` of the shared aliases and supplier profiles and deletes the ones left with no contributor.
- `server/routes/admin.js` `PUT /businesses/:id/platform` (around line 281) calls `setAiPrivate` and logs `removed`.
- Tests that check the old rule: `server/test/admin-platform.test.js` ("aiPrivate true … removes the promoted copy",
  around line 66), `server/test/admin-business-delete.test.js` ("deleting the owner of a private business … leaves
  nothing", line 80), `server/test/invoice-memory.test.js` (`setAiPrivate('bA', true)`, line 153).
- The dialog text `platform_ai_private_hint` (`public/assets/data/dictionary.json:2371`) says: "הפעלה מוחקת את מה שכבר
  שותף ממנו".
- A whole business is deleted from `src/app/pages/metadata-manager/components/user-management/`
  (`onDeleteUser`, around line 58): deleting an owner asks `ConfirmModalService.open` twice (the second with the
  business name typed), then calls `UserAdminService.deleteUser(userId)` → `DELETE /api/v1/admin/users/:userId`
  (`server/routes/admin.js` around line 56), which calls `deleteBusinessServerData`. `ConfirmModalService.openTernary`
  answers `'cancel' | 'confirm' | 'save'` with a second action button (`saveButtonLabel`).
- `mayLearnFrom(business)` (`server/utils/ai-learning.js`) is the only test any code uses before it learns; it stays as
  it is, so a private business still adds nothing new to the shared pools.
- Plan 638 adds `changes: [{ field, from, to }]` to `platformHistoryRowSchema` and the history panel in
  `platform-business-dialog`; this plan writes one more kind of history row and adds one button to the same dialog.

## Goals & Success Criteria
**Primary:** turning private mode on keeps everything already learned; deleting a business asks whether to erase what
was learned from it too (keeping it is the default answer); and the platform admin can erase what was learned from one
business, with a required reason, from the business dialog.

- [auto] `pnpm run test:server` passes, including `server/test/admin-platform.test.js`: a save with `aiPrivate: true`
  stores the flag and keeps the promoted copy and the shared alias contributions of the business; `aiPrivate: false`
  restores nothing and removes nothing.
- [auto] The same command, `server/test/admin-business-delete.test.js`: deleting the owner of a private business keeps
  its promoted copies and its shared contributions and strips its drafts to numbers, exactly as for a business that is
  not private; `storedFiles`, `priceHistory`, own `invoiceAliases` and `businessAccess` are still deleted.
  `DELETE /api/v1/admin/users/:ownerId?eraseLearned=true` also removes the promoted copies, the shared contributions
  and every draft of that business (another business untouched); without the parameter, or with any other value,
  they are kept; the log line `admin.users_delete` carries `eraseLearned: true|false` and counts only.
- [auto] The same command, `server/test/admin-erase-learned.test.js` (new): `POST /api/v1/admin/businesses/:id/erase-learned`
  with `{ reason }` for the platform admin answers 200 `{ ok: true, counts }` and removes the promoted copies, the
  business from every shared `contributors` list (shared rows left with none are deleted), and every `aiDrafts` row of
  the business; another business's rows are untouched; one history row `{ changed: ['learnedData'], changes:
  [{ field: 'learnedData', from: '', to: 'erased' }], reason }` is stored; an empty or missing reason answers 400; an
  owner gets 403; no token 401; an unknown id 404; the log line holds the business id and the counts only.
- [auto] The same command, `server/test/invoice-memory.test.js`: `setAiPrivate('bA', true)` no longer forgets; a new
  case calls `forgetBusiness` directly and keeps today's expectations.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts`:
  the erase button opens the confirm popup; cancel sends nothing; confirm with an empty reason keeps the confirm
  button disabled; confirm with a reason calls the service once and shows the counts text; a failed call shows the
  error text and the dialog stays usable; when the history panel is open it is requested again after a successful erase.
- [auto] The same command, including
  `src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts`: deleting an owner asks
  the learned-data question after the first confirm; "keep" → the final confirm, then `deleteUser(id, false)`;
  "erase too" → the final confirm says the learned data is erased too, then `deleteUser(id, true)`; cancel at the
  question or at the final confirm deletes nothing; deleting a staff user asks no learned-data question.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0;
  `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/platform`, the business dialog shows the button "מחיקת מה שנלמד מהעסק"; pressing it opens a confirm popup
  that names the business; cancel closes it (`e2e/ui/639-1.spec.ts`, the erase route answered from a fixture).
- [ui] Deleting an owner from the users list shows, after the first confirm, the question "למחוק גם את מה שהמערכת למדה
  מהעסק?" with the two answers; cancel closes it and nothing is deleted (`e2e/ui/639-2.spec.ts`, the delete route
  answered from a fixture).
- [human] Dandan opens the dialog of a test business, reads the new private-mode hint, turns private on with a reason
  and sees in the history that nothing was erased; then presses the erase button, types a reason, confirms, and reads
  the counts and the new history row in clear Hebrew. Then deletes a second test business, answers "erase it too",
  and sees the business gone.

## Execution Mode
- Parallel: no — it edits `platform-business-dialog` (also 638, 630, 632), `public/assets/data/dictionary.json` and
  `src/app/app.config.ts` (every screen plan), `server/routes/admin.js` (638) and `docs/brain/component-families.md`.
  Runs after 638 in the same run (`/orchestrate 638,639 mod-history`) or after 638 is merged.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/business.js
server/services/invoice-memory.js
server/routes/admin.js
server/test/admin-platform.test.js
server/test/admin-business-delete.test.js
server/test/admin-erase-learned.test.js
server/test/invoice-memory.test.js
shared/schemas/modules.ts
src/app/core/services/platform-admin.service.ts
src/app/core/services/platform-admin.service.spec.ts
src/app/core/services/user-admin.service.ts
src/app/core/services/user-admin.service.spec.ts
src/app/pages/metadata-manager/components/user-management/user-management.component.ts
src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts
src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts
src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.html
src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts
src/app/pages/platform-dashboard/platform-dashboard.page.scss
public/assets/data/dictionary.json
src/app/app.config.ts
e2e/ui/639-1.spec.ts
e2e/ui/639-2.spec.ts
docs/modules/modules-map.md
docs/frontdesk/pilot-terms-draft.md
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

- INV-1: preserves — the new route sits in `server/routes/admin.js` behind `verifyToken, requirePlatformAdmin`; the
  erase acts on one business id from the path; no member of a business can call it.
- INV-2: preserves — the erase touches the `'__master__'` pools only through the platform admin, removes only rows
  whose `promotedFrom.businessId` or `contributors` name the one business, and never touches another business's own
  copy; the existing scoped deletes of `deleteBusinessServerData` stay as they are.
- INV-3: preserves — the erase and the delete run on the server in one request; the browser only passes the
  admin's answer (`eraseLearned`), and the `user-management` change adds a question, no cross-document write.
- INV-4: preserves — the history row stays the one Zod shape in `shared/schemas/modules.ts`; `learnedData` is one more
  value of `changed` / `changes.field`, which are free strings there.

## Reuse Check

- `eraseLearnedData(db, businessId)` in `server/services/business.js` — family: none — rung: 4 — why: the three
  deletions moved out of `setAiPrivate` and `deleteBusinessServerData` into one server function the new route calls;
  nothing else erases learned data.
- `PlatformAdminService.eraseLearnedData(businessId, reason)` — family: http — rung: 3 — why: one more method on the
  existing admin service.
- erase confirm popup — family: modal-controller — rung: 1 — why: `ConfirmModalService`, as
  `PlatformLogisticsItemsComponent` uses it; the reason field goes in the dialog itself, beside the button, so the
  popup only confirms.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want a business that turns private to stop adding to what the platform learns, without
  losing what was already learned, so that the shared memory keeps helping every other business.
- As the platform admin, I want to erase what was learned from one business when it asks for that, with the reason
  kept, so that I can honour a deletion request and show later when and why it was done.
- As an owner who asked for my data to be erased, I want the erase to cover what the platform learned from me, so
  that nothing of mine stays in the shared memory.

## Functional Requirements

### Must Have (P0)
- [ ] `server/services/business.js`:
  - `setAiPrivate(id, value)` only writes `aiPrivate`; it deletes nothing and returns `{ matchedCount, aiPrivate }`.
  - New `eraseLearnedData(db, businessId)` → `{ promoted, drafts, aliasesPulled, aliasesDeleted, profilesPulled,
    profilesDeleted }`: deletes the promoted `GEMINI_SHOTS` copies (`businessId: '__master__'`,
    `promotedFrom.businessId`), deletes every `aiDrafts` row of the business, and calls `forgetBusiness`.
    Exported.
  - `deleteBusinessServerData` drops its private branch: every business is handled as the not-private case is today
    (shared material kept, drafts stripped to numbers). The doc comment says so and names `eraseLearnedData` as the
    way to erase.
- [ ] `server/routes/admin.js`:
  - `PUT /businesses/:id/platform` no longer reads or logs `removed`; its comment names the new rule.
  - New `POST /businesses/:id/erase-learned` with `verifyToken, requirePlatformAdmin`, body `{ reason }` (trimmed,
    1–300 characters, the same rule as the platform write), 404 for an unknown business before any delete, then
    `eraseLearnedData`, then one `platformHistory` row (same `$push` / `$slice: -50` as the platform write) with
    `changed: ['learnedData']` and `changes: [{ field: 'learnedData', from: '', to: 'erased' }]`; answers
    `{ ok: true, counts }`. Log `event: 'admin.learned_data.erased'` with the business id and the counts; never the
    reason. Failure: `admin.learned_data.erase_failed` with the error and the id, 500.
- [ ] `DELETE /users/:userId` in `server/routes/admin.js`: reads the query `eraseLearned`; only the exact string
  `'true'` counts. For a whole-business delete with it, `eraseLearnedData` runs before `deleteBusinessServerData`
  (inside the same `try`, so a failure is logged as today and the delete still goes on); for a staff user the
  parameter is ignored. The success log line gains `eraseLearned` (boolean) and the erase counts.
- [ ] `src/app/core/services/user-admin.service.ts`: `deleteUser(userId, eraseLearned = false)` adds
  `?eraseLearned=true` only when true; one spec case for each value.
- [ ] `user-management.component.ts` `onDeleteUser`, for an owner only, between the first confirm and the typed
  final confirm: `ConfirmModalService.openTernary(delete_business_learned_question, { variant: 'danger',
  saveLabel: 'delete_business_learned_keep', saveButtonLabel: 'delete_business_learned_erase' })` —
  `'confirm'` = keep, `'save'` = erase too, `'cancel'` = stop. When the answer is erase, the final confirm's message
  adds `delete_business_learned_erase_note`. The chosen value is passed to `deleteUser`. Staff deletes are unchanged.
- [ ] `src/app/core/services/platform-admin.service.ts`: `eraseLearnedData(businessId, reason): Promise<EraseCounts>`
  and one spec case (URL, body, unwrapped counts).
- [ ] `platform-business-dialog`:
  - Below the private switch, a danger-styled text button `platform_erase_learned` (`data-testid="biz-erase-learned"`).
    Pressing it shows a reason field (`platform_erase_reason`, required) and a confirm button; confirm opens
    `ConfirmModalService` with `platform_erase_confirm` (names the business); on yes, calls the service once.
  - Success: one line `platform_erase_done` with the total count; when the 638 history panel is open it is requested
    again. Failure: `platform_erase_failed`; the rest of the dialog keeps working. Saving and closing behave as today.
- [ ] `public/assets/data/dictionary.json`: change the value of `platform_ai_private_hint` to the new rule (an
  existing key's value changes; no key is removed), and add the new keys (see UI/UX Notes).
- [ ] 638's `describePlatformChange` gains the field `learnedData` → `platform_history_learned_erased`.
- [ ] `docs/modules/modules-map.md` C-LEARN: the private and delete rules rewritten as above, with
  "(Dandan, 2026-11-18; supersedes the 2026-11-17 rule)"; the G4 lawyer note says learned data stays after a business
  leaves unless the business asked to erase it. `docs/frontdesk/pilot-terms-draft.md`: the same sentence where the
  terms describe private mode and leaving (only those lines).
- [ ] `docs/brain/component-families.md` (+ regenerated `docs/brain/inventory.md`): `eraseLearnedData` under `http`
  (service method) and the server function under a new `learning` family heading;
  `docs/agent/standards-backend.md` §5 and `server/breadcrumbs.md`: one row for the new route.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS only. The erase button is a quiet danger text button, never a primary button, so that it is
  not pressed by mistake; it acts only after the reason and the confirm popup.
- Changed value: `platform_ai_private_hint` — "במצב פרטי לא לומדים מהעסק מעכשיו. מה שכבר נלמד נשאר, אלא אם מוחקים
  אותו כאן." (in private mode nothing new is learned; what was learned stays unless erased here)
- New keys (append-only):
  - `platform_erase_learned` — "מחיקת מה שנלמד מהעסק" (erase what was learned from the business)
  - `platform_erase_reason` — "סיבת המחיקה (למשל: בקשת העסק)" (reason for erasing, e.g. the business asked)
  - `platform_erase_confirm` — "למחוק את כל מה שנלמד מ-{name}? אי אפשר לבטל את זה." (erase everything learned from
    {name}? this cannot be undone)
  - `platform_erase_done` — "נמחקו {count} רשומות שנלמדו" ({count} learned records were erased)
  - `platform_erase_failed` — "המחיקה לא הצליחה, נסו שוב" (erasing failed, try again)
  - `platform_history_learned_erased` — "נמחק מה שנלמד מהעסק" (what was learned from the business was erased)
  - `delete_business_learned_question` — "למחוק גם את מה שהמערכת למדה מהעסק? (שמות מוצרים בחשבוניות, דוגמאות מתכונים
    ששותפו, נתוני דיוק). אם תשאירו, זה ממשיך לעזור לעסקים אחרים, בלי מחירים ובלי פרטים אישיים." (also erase what the
    system learned from the business? kept, it keeps helping other businesses, with no prices or personal details)
  - `delete_business_learned_keep` — "להשאיר" (keep)
  - `delete_business_learned_erase` — "למחוק גם את זה" (erase it too)
  - `delete_business_learned_erase_note` — "גם מה שנלמד מהעסק יימחק." (what was learned from the business is erased too)
- Reused: `ConfirmModalService` and its yes / no keys.
- Lucide: none new.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Make private mode stop learning without erasing, and make deleting a business keep what was learned — setAiPrivate writes the flag only, deleteBusinessServerData loses its private branch, the three old tests rewritten — server/services/business.js, server/routes/admin.js, server/test/admin-platform.test.js, server/test/admin-business-delete.test.js, server/test/invoice-memory.test.js
- [ ] A2: Give the platform admin one explicit way to erase what was learned from a business, with a reason in the history — eraseLearnedData, the POST route, its seven cases — server/services/business.js, server/routes/admin.js, server/test/admin-erase-learned.test.js
- [ ] A3: Let the browser call the erase — the service method and its spec case — src/app/core/services/platform-admin.service.ts, src/app/core/services/platform-admin.service.spec.ts
- [ ] A4: Put the erase in the business dialog behind a reason and a confirm, and say the new rule under the private switch — the button, the reason field, the confirm, the done and failed lines, the history label, the dictionary value and six new keys, the spec cases — src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.ts, .html, .spec.ts, src/app/pages/platform-dashboard/platform-dashboard.page.scss, public/assets/data/dictionary.json
- [ ] A4b: Ask, when a business is deleted, whether to erase what was learned from it too — the query parameter on the delete route and its cases, deleteUser's flag, the question between the two confirms, the four keys, the spec cases — server/routes/admin.js, server/test/admin-business-delete.test.js, src/app/core/services/user-admin.service.ts, src/app/core/services/user-admin.service.spec.ts, src/app/pages/metadata-manager/components/user-management/user-management.component.ts, src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts, public/assets/data/dictionary.json
- [ ] A5: Write the new rule where the program and the lawyer read it — C-LEARN and G4 in the map, the private and leaving lines of the pilot terms — docs/modules/modules-map.md, docs/frontdesk/pilot-terms-draft.md
- [ ] A6: Record the new route and pieces where the next developer looks — the family rows, the regenerated inventory, the backend route row and the server map row — docs/brain/component-families.md, docs/brain/inventory.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A7: Prove it in the running app and run every check — the two screen checks with fixtures, then the Done-when commands in order — e2e/ui/639-1.spec.ts

## Technical Considerations
- Dependencies: 627 (`forgetBusiness`), 638 (history panel, `changes`, `describePlatformChange`), 619
  (`deleteBusinessServerData`), 618 (`setAiPrivate`).
- New files: `server/test/admin-erase-learned.test.js`, `e2e/ui/639-1.spec.ts`, `e2e/ui/639-2.spec.ts`.
- Model changes: none (`changed` and `changes.field` are free strings).
- Backend / API: new `POST /api/v1/admin/businesses/:id/erase-learned`; `PUT …/platform` stops erasing;
  `DELETE /api/v1/admin/users/:userId` takes `?eraseLearned=true`.
- Auth and validation: platform admin only; the id is a path parameter in an exact match; the reason is validated and
  stored, never logged.
- Security and privacy: erasing is irreversible and is the answer to a deletion request, so it needs the reason and
  the confirm. A private business still adds nothing new (`mayLearnFrom` unchanged). The business's own records are
  still deleted with it.
- Data / migration: none. Nothing erased by the old rule can come back; no business is private today.
- Project checks: the `[auto] log-query` item; dictionary keys named; Reuse Check filled; user stories from the
  platform admin's and the owner's side.

## Out of Scope
- An owner-side button or request form for erasing (the owner asks FoodVibe; the platform admin erases).
- Erasing a business's own records without deleting the business.
- Undoing an erase.
- Changing what `mayLearnFrom` allows.

## Critical Questions
- none

## Execution Notes
- decided (Dandan, 2026-11-18): private mode stops learning from that moment and erases nothing; learned data is kept
  after a business is deleted; it is erased only on the business's explicit request — why: data already collected is
  useful to every business, and erasing it should be a deliberate act, not a side effect.
- decided (Dandan, 2026-11-18): deleting a business asks whether to erase what was learned too — why: a business that
  leaves may ask for it, and the question makes the choice visible at the moment it matters.
- decided: the question comes between the first confirm and the typed final confirm, and "keep" is the first answer
  — why: keeping is the rule, and the typed confirm stays the last step for both answers.
- decided: the erase is also its own action in the platform dialog — why: a business may ask to erase without leaving.
- decided: PR #605 (run `mod-invoices-srv`) is merged as it is — why: the old rule is already on `main` from 618 and
  619, so one plan changes every place at once; until this plan is merged, no business is turned private.
