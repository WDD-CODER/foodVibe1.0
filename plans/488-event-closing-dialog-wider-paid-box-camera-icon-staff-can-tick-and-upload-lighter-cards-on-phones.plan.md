# Plan 488 — Event closing dialog: wider paid box, camera icon, staff can tick and upload, lighter cards on phones

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
Dandan's QA report of 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`, item 9, checks 97, 100, 101), closing dialog
«סגירת אירוע» on `/menu-intelligence/<id>`:
- **97:** "the «שולם בפועל» (paid) input is too small to read — make it wider. Replace the large photo-upload box with
  a minimal camera icon."
- **100:** "staff must be able to tick 'Arrived'/'Invoice' and upload photos; staff must not edit money fields or
  press 'Finish Event' (hide/lock them)."
- **101:** "mobile only — slightly lighten the supplier cards (`section:nth-child(3)` inside the modal) for contrast
  against the modal background."
Passed checks 96 (planned amounts frozen), 98 (thumbnails saved, open in a new tab) and 99 (finish warnings, lock,
reopen) are frozen behaviour and must keep working.

Verified in code on `mvp-qa-fixes` (`ea6af7b0`). Files: `src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.{html,ts,scss}`
(opened from `event-stage-bar.component.html:71-76`, mounted at `:155-157`), server `server/routes/events.js:186-207`,
rules `server/utils/closing-rules.js`. Last code change: plan 446 (`f5d9e58e`) and 458 (`6a3d9b4d`, renames only).

**Root cause 97 — the card never gets its intended width (the CSS layer trap).**
- `src/styles.scss:658-661` (unlayered) sets `.c-modal-card { width: 90%; max-width: 28rem; padding: 2rem }`.
- The dialog's own `.closing-card { max-inline-size: 60rem }` (`event-closing-dialog.component.scss:15`) sits inside
  `@layer components.event-closing-dialog` (`scss:3`). An unlayered declaration beats every layered one, whatever the
  specificity, and `max-width` / `max-inline-size` are the same box property, so the card is clamped to **28 rem
  (448 px)** on a desktop instead of 60 rem.
- Inside 448 px minus 2 × 32 px padding, the five-column grid `1.4fr 0.8fr 1.2fr 1.2fr 2fr` (`scss:75`) gives the
  «שולם בפועל» column about 55 px (html:52-64) — too small to read — while the photo column gets the largest share
  (2fr) for the dashed `.photo-add` box with camera icon + text «צלם / העלה» (`html:120-133`, `scss:196-214`).

**Root cause 100 — staff sees all the money and can lose a tick.**
- Permissions are already split: client `canMoney_ = can('editMoney')`, `canArrival_ = can('markArrival')` (`ts:92-93`,
  `core/services/permission.service.ts:25,54`); server `PUT /:id/closing` asks `editMoney` for amounts and
  `markArrival` for ticks/photos (`events.js:198-199`, diff in `closing-rules.js:73-93`); finish / reopen /
  refresh-plan are owner-only (`events.js:214, 234, 262`). Server test `server/test/events-closing.test.js:125`.
- But the money is only *locked*, not hidden: a staff member still sees «מתוכנן» per row (`html:47-50`), the disabled
  «שולם בפועל» boxes with the red overrun remark (`html:52-74`, `is-over` tint `html:44`), «עלויות נוספות בפועל» /
  «הכנסה בפועל» (`html:156-185`) and the whole profit footer «רווח מתוכנן» / «רווח בפועל» / «הפרש» / accuracy
  (`html:188-219`). That contradicts the staff rule the rest of the app follows (passed checks 54 and 110: staff see no
  business numbers; report item 8 / check 95: hide pricing from staff completely).
- A staff tick can be lost: the dialog sends the **whole** closing (`ts:269-277` → `event-pipeline.service.ts:46-50`).
  When the staff member's copy is older than the owner's last amount (owner typed «שולם בפועל» after the staff screen
  loaded), the server sees a changed `actualPaid` (`closing-rules.js:85`), answers 403 (`events.js:198`) and the tick
  falls back (`ts:273-274`) — the card's FAIL ✗ "a tick is lost".

**Root cause 101 —** `.closing-row` (`scss:96-105`) has only a border, no background, so on phones the supplier cards
blend into the modal's `--bg-glass-strong`. (`section:nth-child(3)` in the report is the second supplier card:
`.closing-body`'s first child is `.rows-head`, then one `section.closing-row` per supplier, `html:35-44`. The fix
applies to every supplier card, not only that one.)

## Goals & Success Criteria
- Primary: the owner reads and types amounts comfortably in a wide dialog with a small camera icon; a staff member
  ticks «הגיע» / «יש חשבונית» and adds photos without seeing any money, and the server keeps refusing money writes
  from staff while never dropping a staff tick; on phones the supplier cards stand out from the modal.
- User story: As a chef-owner, I want to type what I really paid in a box I can read, so that closing an event is
  quick; as a cook, I want to tick deliveries and photograph the delivery note without seeing the money.
- Success (Done-when):
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/menu-intelligence/components/event-closing-dialog/**/*.spec.ts'`
        passes, with specs that prove: (a) owner: every row has a `.row-planned` and a `.row-paid input`, the totals
        and the `.profit` footer render, «סיים אירוע» shows in «פוסט-פרודקשן»; (b) staff (`editMoney` false,
        `markArrival` true): `.row-planned`, `.row-paid`, `.totals`, `.profit`, `.add-supplier`, «סיים אירוע»,
        «פתח מחדש» and «רענן תכנון» are absent from the DOM, the `is-over` class is never set, the two checkboxes are
        enabled and a tick calls `saveClosing` with `arrived: true`; (c) the photo trigger is a
        `label.photo-add.c-icon-btn` with `aria-label` «T:closing_add_photo» and no visible text node, and a chosen file
        still uploads into that row (existing upload spec kept green).
  - [ ] [auto] `npm --prefix server test -- events-closing` passes, including the existing staff test
        (`events-closing.test.js:125`: arrival-only change → 200, amount-only change → 403 with nothing stored) and a
        new ones: (1) stored closing has owner's `actualPaid: 1150` on row s1 and `actualRevenue: 9000`; staff sends
        an older copy (no `actualPaid`, no `actualRevenue`) with `arrived: true` on s1 → 200, stored row s1 has
        `arrived: true` **and** `actualPaid: 1150`, `actualRevenue` still 9000; (2) the owner has added row s3 since;
        staff sends an older copy without s3 and with `hasInvoice: true` on s2 → 200, s3 is still stored and s2 has
        `hasInvoice: true`; (3) staff copy with an extra row s9 and no tick change → 403, nothing stored; staff copy
        with an extra row s9 plus a tick on s1 → 200, s9 is **not** stored, the tick is. The existing staff
        `POST /finish`, `/reopen`, `/refresh-plan` → 403 tests (`events-closing.test.js:185, 218, 232`) stay green.
  - [ ] [auto] `npm --prefix server test` (full) passes.
  - [ ] [auto] `grep -nE "^\s*\.c-[a-z]" src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.scss`
        → empty, and `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|@media.*[0-9]+px" <same file>` → empty (cssLayer verify).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or deferred with reason in the run file).
  - [ ] [human] ① Owner, desktop 1440 px — wider paid box (replays check 97). Page `/menu-intelligence/<id>` of an
        event in «פוסט-פרודקשן» with at least two suppliers (SETUP: as owner, take an event with dishes whose products
        have suppliers and prices through «הזמנות» → «ביצוע» → «פוסט-פרודקשן»; the dialog opens by itself). DO: in
        the first row's «שולם בפועל» type `12345.67`. SEE ✓: the dialog is about 960 px wide (no longer a narrow
        ~450 px card), the box is at least 128 px wide and the whole `12345.67` is readable; the photo cell shows only
        a small camera icon (no dashed box, no «צלם / העלה» text). FAIL ✗: digits cut off, narrow dialog, or the dashed
        box with text is still there.
  - [ ] [human] ② Owner, desktop 1440 px — overrun and footer still work (check 97 behaviour). Same dialog. DO: in one
        row type an amount 15 % above its «מתוכנן». SEE ✓: that row turns red with «חריגה של 15% (…)» and the footer
        «רווח בפועל» and «הפרש» numbers change. FAIL ✗: no red row or the footer does not move.
  - [ ] [human] ③ Owner, desktop — photo via the camera icon (passed check 98 must keep working). Same dialog. DO:
        click the camera icon in a row and choose an image. SEE ✓: a small thumbnail appears in that row; after
        «סגור» and reopening from «סגירת אירוע» it is still there; clicking it opens the full photo in a new tab.
        FAIL ✗: no thumbnail, thumbnail in another row, or gone after reopening.
  - [ ] [human] ④ Staff, desktop 1440 px — tick and photograph without money (replays check 100). SETUP: in a second
        browser (or a private window) sign in as the staff account of the same business, open the same event and
        click «סגירת אירוע» (if the cook does not see the event, the owner allows «פוסט-פרודקשן» in the staff
        stages list; by default staff see every stage). Leave it open; in the owner's window type a new «שולם בפועל»
        amount in the first row (this is what made the cook's tick fall back before). DO: back in the cook's window,
        without reloading, tick «הגיע» and «יש חשבונית» on the first row, add a photo with the camera icon, then
        «סגור» and reopen the dialog. SEE ✓: both
        ticks and the thumbnail are still there; the dialog shows no amounts at all — no «מתוכנן», no «שולם בפועל», no
        «עלויות נוספות בפועל», no «הכנסה בפועל», no «רווח מתוכנן» / «רווח בפועל» / «הפרש»; no «סיים אירוע», «רענן
        תכנון» or «הוסף ספק» button. FAIL ✗: a tick or photo is gone after reopening, any amount or profit number shows,
        or a finish button shows.
  - [ ] [human] ⑤ Owner, phone 375 px — lighter supplier cards (replays check 101). Same event and dialog on a phone
        width. DO: scroll through the dialog. SEE ✓: each supplier is its own card with a background a little lighter
        than the dialog around it (a red overrun card stays red); the dialog still shows one card per supplier (name,
        planned and paid amounts, the two ticks, then the camera icon) and nothing scrolls sideways. FAIL ✗: cards
        look the same as the dialog background, or sideways scrolling.
  - [ ] [human] ⑥ Owner, desktop — finish and reopen (passed check 99 must keep working). SETUP: leave one supplier's
        «שולם בפועל» empty, type the others. DO: click «סיים אירוע», confirm, reopen the dialog, click «פתח מחדש».
        SEE ✓: before finishing «חסרים סכומים ל-1 ספקים» with a confirm; after confirming the stage bar shows
        «הסתיים» and every field is locked («האירוע הסתיים – הנתונים נעולים»); after «פתח מחדש» the stage is back to
        «פוסט-פרודקשן» and the fields are editable. FAIL ✗: no warning, a field editable after finishing, or reopen
        does not unlock.

## Execution Mode
- Parallel: yes with care — overlaps plan 482 (its broad `src/app/**/*.html|scss` scope adds `appSelectOnFocus` to
  the three number boxes in this dialog and removes local spin-button rules) and plan 493 (item 17, closing from the
  stage bar; may touch `server/routes/events.js` and `event-stage-bar`). Whichever merges second rebases its feature
  branch on `origin/mvp-qa-fixes` (unpushed branch only) or merges `origin/mvp-qa-fixes` into it and resolves by
  keeping both changes.
- Isolated DB: no (local MongoDB of the slot; owner + staff from `C:\coding projects\Cursor\mvp-review-evidence\accounts.json`).

## Execution Notes
- Run mode: `docs/mvp/run-mode-qa-fixes.md` (base `origin/mvp-qa-fixes`, branch `feat/488-event-closing-dialog`,
  slots wt-1 / wt-2 only, evidence in `C:\coding projects\Cursor\mvp-review-evidence\qa\488\`).
- Planner decisions (logged so the builder does not re-ask):
  - "hide/lock" → **hide** for staff: money is removed from the DOM, not only disabled, the same rule as item 8 /
    check 95 and passed checks 54 / 110. The server keeps returning the numbers on read (INV-1: members read all of
    the business's items; passed check 48 shows staff locked prices elsewhere) — only the closing dialog hides them.
  - Layer trap fix, same approach as plan 479: the one declaration that must beat the unlayered `.c-modal-card`
    (`max-inline-size: 60rem`) moves **out of** `@layer components.event-closing-dialog` into a short unlayered block
    in the component file with a comment naming `src/styles.scss:658`. No `src/styles.scss` change, no new engine.
    Phones stay as validated: at ≤ 768 px the unlayered mobile `.c-modal-card` rule (`styles.scss:776-784`) keeps
    applying; a 60 rem cap is wider than any phone. The existing modifiers do not fit: `.c-modal-card--md` caps at
    34 rem (still too narrow) and `.c-modal-card--fluid` (`styles.scss:681`) is 90vw with no cap.
  - Every rule of this component that competes with an unlayered engine declaration must sit in the same unlayered
    block, or it silently loses: `max-inline-size` (vs `.c-modal-card`) and the camera trigger's busy state
    `opacity` / `cursor` (vs `.c-icon-btn`'s unlayered `opacity: 0.7; cursor: pointer`, `styles.scss:904-916`).
    `.row-paid input { min-inline-size: 8rem }` can stay layered: no unlayered rule sets `min-width` on
    `.c-input` / `.c-input-stack input` (`styles.scss:545-565, 712-740`); V1 confirms the computed width.
  - Server: a caller without `editMoney` whose copy carries an arrival change gets an **arrival-only merge** instead
    of a 403: the stored closing is kept whole (amounts, totals, row set, names, planned), and only `arrived` /
    `hasInvoice` / `photos` of rows present in **both** stored and incoming are taken. Rows the owner added since
    the staff copy loaded are kept; rows only in the staff copy are ignored (never stored). That is what "never drop
    a staff tick" needs — an owner adding a supplier while the cook's dialog is open is the same stale-copy case as
    a typed amount — and it never lets staff write money, so a 403 on a row-set difference buys nothing. `can()`
    from `server/utils/permissions.js` decides `editMoney`, then `assertCan(markArrival)` still guards the write
    (INV-1). A staff copy with money differences and **no** arrival change stays 403 as today (existing test
    `events-closing.test.js:135`). Log `events.closing.money_ignored` (warn, context: event id, no amounts) when
    money differed and was ignored.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.html
src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.ts
src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.scss
src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.spec.ts
server/routes/events.js
server/utils/closing-rules.js
server/test/events-closing.test.js
docs/mvp/runs/488.md
```

## Read Scope
Entire repo (notably `src/styles.scss`, `src/app/core/services/permission.service.ts`,
`src/app/core/services/event-pipeline.service.ts`, `server/utils/permissions.js`,
`src/app/pages/menu-intelligence/components/event-stage-bar/**`, `public/assets/data/dictionary.json`).

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/488.md`, add it to
the scope block, continue (run mode: you work alone, never ask). Never touch `src/styles.scss`, `dictionary.json`,
`app.routes.ts`, `server/utils/permissions.js` or `shared/schemas/**` in this plan — if a step seems to need one,
take the in-scope alternative named in Execution Notes and log it.

## Architecture Impact
- INV-1: preserves — staff still never change money: amounts, rows, finish, reopen and refresh-plan stay `editMoney`
  (owner-only) on the server; the new arrival-only merge is decided by `can(req.user, 'editMoney' | 'markArrival', …)`
  from `server/utils/permissions.js` and only ever keeps the stored money. Reads are unchanged (members read their
  business's events); hiding money from staff is UI only.
- INV-2: preserves — no tenancy or scope change; `loadEvent` / `scopeOf` untouched.
- INV-3: preserves — one request per closing save, as today.
- INV-4: preserves — the merged closing is still validated by `validMerged` (`checkStoredDoc`) before the write; no
  schema change.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call.

## Backend Impact
- `PUT /api/v1/events/:id/closing`: same request and response shapes. Behaviour change only for a caller without
  `editMoney` whose copy carries an arrival change plus stale money or a stale row set: was 403 (tick lost), now 200
  with the stored closing kept and only the arrival fields of shared rows applied (rows only in the staff copy are
  dropped, never stored). Money-only staff writes (no arrival change), finish/reopen/refresh by staff: still 403. No new endpoint, no migration, no Atlas step, no new persisted field.
- Security surface: write authorization on one route; covered by server tests (Done-when). No auth/storage change.

## Reuse Check
- Camera-icon photo trigger in each supplier row — family: engine-classes — rung: 1 — why: the existing `.c-icon-btn` engine (`src/styles.scss:904`) is the 2.25 rem / 2.75 rem-on-phone icon button; put the class on the existing `label.photo-add`, keep the hidden file input.
- Staff view without money in the closing dialog — family: edit-gate — rung: 1 — why: `PermissionService.can('editMoney' | 'markArrival')` already drives the dialog (`canMoney_` / `canArrival_`); the template only widens the existing `@if (canMoney_())` gates.
- Arrival-only merge for staff closing writes — family: server-auth — rung: 1 — why: `can()` from `server/utils/permissions.js` decides; the merge is a pure helper next to `diffClosing` in `server/utils/closing-rules.js`, not a new permission path.

## Step 0 — Reality Check
On the fresh feature branch, find and print `ok` / `conflict: <what>` for: `.c-modal-card` `max-width: 28rem` in
`src/styles.scss` (around 658) and the mobile block (around 776); `@layer components.event-closing-dialog` and
`.closing-card` / `.closing-row` / `.photo-add` in the dialog scss; `canMoney_`, `canArrival_`, `commit`, `onFilesChosen`
in the dialog ts; `.c-icon-btn` in `src/styles.scss`; `diffClosing`, `mergeClosing` in `closing-rules.js`; the
`assertCan(... 'editMoney' ...)` / `'markArrival'` lines in `PUT /:id/closing`; `require('../utils/permissions')` in
`events.js`. If plan 482 or 493 already merged into `origin/mvp-qa-fixes`, log what they changed in these files under
`## Decisions` and build on it. Then reproduce on the slot (owner + staff, desktop 1440 px): measure the dialog width
(expect ~448 px) and the paid box width (expect ~55 px), and as staff confirm the money is visible but disabled; log
the numbers in the run file. Also replay the lost tick: cook's dialog open, owner types an amount in another
browser, cook ticks «הגיע» → expect a 403 on `PUT /closing` and the tick falling back; log the result (if it does
not reproduce, log what the cook saw instead and still build B1/B2 — the server tests prove the stale case).

## Atomic Sub-tasks
- [ ] A1: Let the closing dialog take its intended wide size on desktop so amounts are readable — move `max-inline-size: 60rem` of `.closing-card` into an unlayered block (comment: beats unlayered `.c-modal-card`, `src/styles.scss:658`); keep everything else layered — event-closing-dialog.component.scss
- [ ] A2: Give the paid column the room and shrink the photo column now that it is an icon — grid `1.4fr 0.8fr 1.4fr 1.2fr 1.2fr` for owner rows and head; `.row-paid input` `min-inline-size: 8rem` (layered is enough — see Execution Notes; V1 reads the computed width); phone grid stays `1fr` — event-closing-dialog.component.scss
- [ ] A3: Replace the dashed photo box with a small camera icon button that still opens the file chooser — `label.photo-add` gets `c-icon-btn`, keeps `lucide camera` (18) and the hidden `input[type=file]`, drops the visible «צלם / העלה» span, adds `[attr.aria-label]` and `[attr.title]` from `closing_add_photo`; remove the dashed border / padding / gap / font-size / colour rules from `.photo-add`; move `.photo-add.is-busy { opacity: 0.5; cursor: progress }` into the unlayered block (it loses to `.c-icon-btn`'s unlayered `opacity` / `cursor` otherwise); add `.photo-add:focus-within { outline: 2px solid var(--border-focus); outline-offset: 2px }` so a keyboard user sees where the hidden file input is — event-closing-dialog.component.html, event-closing-dialog.component.scss
- [ ] A4: Hide every money figure from staff in the closing dialog — wrap the head «מתוכנן» / «שולם בפועל» spans, `.row-planned`, `.row-paid`, `.totals` and the `.profit` list in `@if (canMoney_())`; `[class.is-over]` only when `canMoney_()`; add a `[class.no-money]="!canMoney_()"` on `.closing-body` with a 3-column grid `1.4fr 1.2fr 1.2fr` (name, checks, photos) for `.rows-head` and `.closing-row` **only inside `@media (min-width: $break-mobile + 1px)`** (the `.no-money .closing-row` selector is more specific than the phone `1fr` rule and would otherwise give phones three columns); footer keeps «סגור» only — event-closing-dialog.component.html, event-closing-dialog.component.scss
- [ ] A5: Lighten the supplier cards on phones so they stand out from the dialog — `.closing-row` gets `background: var(--bg-glass-hover)` inside `@media (max-width: $break-mobile)`, declared before `&.is-over` so a red row stays red — event-closing-dialog.component.scss
- [ ] B1: Never lose a staff tick because the staff copy has older amounts — add pure `arrivalOnly(stored, incoming)` (new; rows matched by `rowKey`; returns stored with, for each stored row that has a matching incoming row, `arrived`, `hasInvoice`, `photos` taken from it; stored rows without a match unchanged; incoming-only rows ignored; every other field — amounts, totals, `finishedAt` / `finishedBy` — from stored) and export it — server/utils/closing-rules.js
- [ ] B2: Use the arrival-only merge for callers who may not change money — in `PUT /:id/closing`: when `diff.money` and `can(req.user,'editMoney',ctx)` is not ok → if `diff.arrival`, `assertCan(markArrival)`, build the closing with `arrivalOnly(base, incoming)` instead of `mergeClosing` and log warn `events.closing.money_ignored`; otherwise `assertCan(editMoney)` (403) as today; owner path unchanged (`mergeClosing`); `validMerged` still runs on the result; import `can` next to `assertCan`; `can()` returns `{ ok: boolean, reason? }` (`permissions.js:32-50`), so test `can(req.user, 'editMoney', { type: TYPE, doc: event }).ok` — server/routes/events.js
- [ ] T1: Prove the owner and staff views and the camera trigger in specs — update the staff spec (no `.row-paid`, no totals, no profit, no finish/reopen/refresh, ticks enabled) and add the owner/camera cases from Done-when — event-closing-dialog.component.spec.ts
- [ ] T2: Prove the server keeps money safe and keeps staff ticks — the three new cases from Done-when (stale amounts, owner-added row, extra staff row with and without a tick); staff finish/reopen/refresh-plan → 403 are already covered (`:185, :218, :232`), keep them green — server/test/events-closing.test.js
- [ ] V1: Build, specs, server tests, browser replay of cards ①–⑥ on the slot (owner + staff, 1440 px and 375 px), write the run file with the human cards and evidence — docs/mvp/runs/488.md

## Out of Scope
- Migrating this dialog onto `app-modal-shell` (registry follow-up for the 7 hand-drawn dialogs).
- Moving the global native-element reset or `.c-modal-card` into a CSS layer (plan 479 audit follow-up).
- Hiding event money from staff on the server read path (would change INV-1's read rule and passed check 48).
- Pricing bar / pricing widgets for staff in the Menu Editor (item 8, plan 487) and closing straight from the stage
  bar (item 17, plan 493).
- Spin buttons and select-all on the dialog's number boxes (plan 482).
- Any change to the planned-amount freeze (check 96), photo storage (check 98) or finish/reopen rules (check 99).

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

Independent review 2026-10-24 (plan reviewer, not the author) — gaps found and fixed in this file:
```
ARCHITECT + PM REVIEW
- A3 kept `.photo-add.is-busy` layered, but `.c-icon-btn` sets `opacity` / `cursor` unlayered → busy state would never show → moved to the unlayered block (Execution Notes + A3); added a focus ring for the hidden file input
- A4 `.no-money` 3-column grid out-specifies the phone `1fr` rule → scoped to `min-width: $break-mobile + 1px`
- B2 kept 403 on any row-set difference → an owner adding a supplier while the cook's dialog is open still dropped the tick (same stale-copy root cause) → arrival-only merge applies whatever the row set; incoming-only rows are never stored; Done-when server cases rewritten
- T2 asked for staff finish/reopen/refresh 403 tests that already exist (:185, :218, :232) → "keep green"
- Card ④ did not replay the stale-copy failure and missed the staff-visible-stages precondition → SETUP now has the owner type an amount while the cook's dialog is open
- A2 hedge ("unlayered if it loses") resolved: no unlayered min-width competes; `can()` return shape named in B2
```
- Architect: Architecture Impact filled for every invariant (INV-1 is the one whose Touches the scope reaches via
  `server/routes/events.js`); every named file and symbol exists at `ea6af7b0` (`arrivalOnly` and the `no-money`
  class are new and marked so); the design follows the existing permission split and the plan-479 layer-trap
  approach, no new pattern; the scope block lists exactly the eight files the steps write.
- Product Manager: problem and success are testable; every Done-when item is tagged; Out of Scope written; backend
  impact, auth (write authorization on one route), security surface and data/migration (none) named; smallest version
  — no shell migration, no global CSS change; every step names its files. Project checks (`docs/agent/plan-checks.md`):
  log-query `[auto]` item present; Reuse Check present (3 rows, rung 1); no hotspot edits; RTL logical properties and
  tokens only (`--bg-glass-hover`); no new translation keys (reuses `closing_add_photo`); `camera` Lucide icon already
  registered (used today at `html:122`); no new persisted data or schema.
