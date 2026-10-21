# MVP run — final report for Dandan

Written 2026-10-21 from `docs/mvp/mvp-map.md`, `run-mode.md`, `decisions.md`, every `docs/mvp/runs/*.md` and the merge log of `origin/mvp`. Nothing here was run again; every number below comes from those files.

## 1. Result

All 29 plans (420, 421, 423, 424–449) are merged into `mvp`, none parked. Nothing reached `main` and nothing was written to Atlas.
What is left for you: restart local MongoDB, walk the 127 validation cards (section 6), run four Atlas migrations by hand (three of them still open: 0006, 0007, 0008), and only then merge `mvp` into `main`.

## 2. What you must do, in order

### (a) Bring MongoDB back, then run the deferred checks

1. In an administrator PowerShell: `Start-Service MongoDB`
2. Run `node scripts/log-query.mjs --since=plan-start --level=error` per plan, or (my suggestion, not from the run files) one sweep after you finish the cards: `node scripts/log-query.mjs --since=2h --level=error`. Expected: `no entries`.
3. Plans that deferred the log-query because MongoDB was down: 426, 427, 428, 429, 430, 431, 432, 437, 442, 443, 444, 445, 446, 447, 448, 449.
4. Plans whose log-query ran only against a throwaway database or the slot log file, so it proves little: 425 (scratch mongod), 436 (file log only), 440 and 441 (throwaway mongod). Plan 435 saw only 3 entries from another checkout.
5. Other local steps that waited for MongoDB:
   - Plan 447 timing script on a restored Atlas copy (steps in section 2c).
   - Plan 442 rehearsal of migration 0008 on a restored Atlas copy (section 2c, 0008 step 0).
   - Plan 440 and 441 cards that need migration 0007 on a local copy (cards 102 and 103).

### (b) Validation cards

Section 6, 127 cards grouped by page. Start the stack from the merged `mvp` checkout with `node scripts/slot-serve.mjs`. The run files used slot ports 4201, 4202 and 4203; use whatever port the stack answers on. Cards 121 to 123 are outside the app and cards 124 to 127 need the production deploy, so they come last.

### (c) Atlas migrations, in this order

Precondition for every step: confirm the masked Atlas host with `node server/migrations/<file> --target=atlas` (it prints the host to use as `<host>`), take a fresh backup, read the dry run, reply `go <number>` in chat, then write, then verify. Take a new backup before each migration (not one for all four) so a rollback undoes only that step. Every write needs `--backup-dir` pointing at a snapshot under 24 hours old.

Backup command (read-only against Atlas): `node server/scripts/db-backup.js --target=atlas` (prints the snapshot folder to use as `<snapshot>`). Only one old Atlas snapshot exists on disk (`atlas-2026-10-20T15-32-31`). Run 424 calls it v1-shaped (before migration 0001). Run 440 restored it and found it v2-shaped, with the 8 events still in the legacy `MENU_EVENT_LIST` collection. Either way, no rehearsal ran on a full current Atlas copy, so the fresh backup and the dry runs matter.

**0005 — already applied, nothing to write.** This is plan 407's migration (`server/migrations/0005-soft-delete-unify.js`), the only 0005 in the repo. Plan 407's close-out (on `main`, 2026-10-20) records the Atlas write and a clean verify: 4 TRASH_* collections dropped, `[verify] OK`. Plan 424's gate asks you to confirm it before 0006, so run this read-only check once:
`node server/migrations/0005-soft-delete-unify.js --target=atlas --confirm-host=<host> --verify=yes`

**0006 — business tenant (plans 424, 425). Not applied.** Must come after 0005 and before the `mvp` deploy.
1. Write down the four production dashboard numbers.
2. Dry run: `node server/migrations/0006-business-tenant.js --target=atlas --confirm-host=<host>`. It lists each user as "העסק של <name>", docs per collection and `ORPHAN` lines. Reply `go 0006` if every real user is listed once and orphans are only leftover test users.
3. Write: `node server/migrations/0006-business-tenant.js --target=atlas --confirm-host=<host> --write=yes --backup-dir=<snapshot>`
4. Verify: `node server/migrations/0006-business-tenant.js --target=atlas --confirm-host=<host> --verify=yes` (exit 0, only `ok` lines).
5. Re-run steps 2 to 4 right before you deploy `mvp` (plan 425's gate, reply `go 0006 rerun`). It catches signups and writes made in between; the dry run must show only those, and a second write prints `0 businesses created, 0 docs stamped`. Without this re-run, items written in the gap would disappear from their owner's lists once the business filters go live.
6. Check the production dashboard shows the same four numbers, signing in on phone and desktop (cards 124 and 125 repeat this after deploy).
Rollback: restore the step snapshot (`docs/agent/standards-backend.md` section 7); leaving the new fields is harmless.

**0007 — coefficients (plan 440). Not applied.** Do not write before you have seen the dry run and replied `go 0007`.
1. Dry run: `node server/migrations/0007-coefficients.js --target=atlas --confirm-host=<host>`. Expect about 6 master terms inserted, 3 existing serving terms getting a coefficient, about 51 dish-type colors removed, 0 folds, event snapshots only for events already in `menuEvents`. Also read the "portions change" list (on local data it listed 35 items in 7 copies of the sample event).
2. Write: `node server/migrations/0007-coefficients.js --target=atlas --confirm-host=<host> --write=yes --backup-dir="<snapshot>"`
3. Second dry run must print `0` for every step (same command as step 1).
4. Verify: `node server/migrations/0007-coefficients.js --target=atlas --confirm-host=<host> --verify=yes` (exit 0).
Rollback: restore `taxonomyTerms` and `menuEvents` from the snapshot into a scratch database and copy the two collections back; older code ignores the new fields.

**0008 — event stages (plan 442). Not applied.** Must come after 0007 (both reshape `menuEvents`). Do not write before `go 0008`.
0. Rehearse first (needs MongoDB): restore the latest Atlas snapshot with `node server/scripts/db-restore.js` into `foodvibe_scratch_0008`, then run `node server/migrations/0008-event-stages.js --target=local --db=foodvibe_scratch_0008` (dry run), the same with `--write=yes`, again without flags (must print `events to give a stage: 0`), and with `--verify=yes` (exit 0). A scratch copy needs no `--backup-dir`.
1. Dry run: `node server/migrations/0008-event-stages.js --target=atlas --confirm-host=<host>`. Read how many events become `finished` or `quote_sent`, per business.
2. Write: `node server/migrations/0008-event-stages.js --target=atlas --confirm-host=<host> --write=yes --backup-dir="<snapshot>"`
3. Second dry run must print `events to give a stage: 0`.
4. Verify: `node server/migrations/0008-event-stages.js --target=atlas --confirm-host=<host> --verify=yes` (exit 0).
5. `node scripts/log-query.mjs --since=plan-start --level=error` shows no entries.
Rollback: `db.menuEvents.updateMany({ legacy: true, stageHistory: { $size: 0 } }, { $unset: { stage: '', legacy: '', stageHistory: '', notes: '' } })` for events nobody moved yet; otherwise restore `menuEvents` from the snapshot.

Timing of 0007 and 0008 against the deploy is not stated in the run files; their rollback notes say older code ignores the new fields, so running them before the deploy, after 0006, is the safe reading.

**Leftover to know about (cleanup-dish-types).** `server/scripts/cleanup-dish-types.js` (plan 376, line 135) still writes a neutral color (`#78716C`) on every dish-type (course) term. Migration 0007 removes those colors, so running the cleanup script after 0007 puts colors back and 0007's `--verify=yes` would fail. It is a one-off from plan 376 that already ran; do not run it again, or run it only before 0007.

**Other read-only or after-deploy Atlas items**
- Before you merge: `node server/scripts/check-unit-weights.js --target=atlas` (plan 423). A non-zero `uom differs` line means those products' costs change after the merge (they were costed wrong before). Locally it showed `uom differs: 9`, `copied from shared: 3`. You decide before merging.
- Plan 447 timing check: `node server/scripts/db-backup.js --target=atlas`, then `node server/scripts/db-restore.js --target=local --dir="<snapshot folder>" --db=foodvibe_scratch_447`, then `node server/scripts/time-business-stats.js --target=local --db=foodvibe_scratch_447` (exit 0, every run under 500 ms, an index plan shown for every business).
- Nothing to run by hand for 430 (the `usageDays` index is created on first boot) or 436 (the five master stations are seeded on first boot); cards 126 and 124 to 125 check the result after the deploy.
- Plan 431: every existing business has no opening baseline, so each owner sees the first-visit «פרטי פתיחה» screen once after deploy. Expected.

### (d) Merge `mvp` into `main`

Only after (a), (b) and (c). Merge order for the record is in section 3. After the Render deploy finishes, do cards 124 to 127.

## 3. Plans merged

"Rounds" is the highest checker round the run file records. A dash means the run file shows none (the checker may have passed clean, or its notes were not written down).

| Plan | Title | Rounds | Note |
|---|---|---|---|
| 420 | Stop unknown links showing a blank page; keep the recipe warning on product delete | — | Client only. Glob form of the test include fails on Windows, explicit spec path used. |
| 421 | Stop a refused menu-type rename from moving menus to another type | 2 | Rename methods now return true/false so the page skips the reload when refused. |
| 423 | Give each product its own weight for its purchase units | — | New read-only Atlas report `check-unit-weights.js`; product costs may change for products whose purchase unit differs from their base unit. |
| 424 | Give every item and user a business; move existing data into one business per user | 2 | Migration 0006 rehearsed on a scratch copy of local data only; Atlas run is yours. Round 2 fixed `createdBy`. |
| 425 | Keep each business's data inside that business on every server read and write | — | 41 cross-business tests. Needs the 0006 re-run before deploy. Rehearsed on a throwaway mongod. |
| 426 | Show each user their business; ask the business name at signup; platform screens for platform admin only | 2 | Signup now requires a business name; a browser with the old bundle shows a server error until reload. |
| 427 | One server permission checker so staff change only what they created and never prices | — | Server only. Raised security findings #1 and #2 (closed by 449). |
| 428 | Let the owner add and remove staff, and lock what staff may not change | 4 | New `/settings` page with Team tab. Biggest review fallout (11, 9, 8, 9 findings). |
| 429 | Let the owner set profit target, safety margin and overrun threshold | 3 | Defaults 25 / 10 / 10. Round 3 was a merge conflict fix. |
| 430 | Record each user's active days on the server | 2 | New `usageDays` collection, created on first boot. |
| 431 | Capture the opening baseline and guide a new business through setup | 3 | Also renames the installed app to FoodVibe and removes the dead demo-file read. |
| 432 | Import products from a pasted supplier price list | — | Real Gemini answer never exercised; one real import needed before release. Resume round was a merge only. |
| 433 | One quantity and cost engine for every event list, with fixture tests | — | Pure code, no screen. |
| 434 | Make every menu list, preview, Excel and the menu footer read the one engine | — | Deleted the three shopping-list copies. |
| 435 | Supplier orders per menu, copied or sent to WhatsApp | 5 | Rounds 3 and 4 failed in the merge step (dirty mvp worktree, `git reset --hard` denied), not in the branch. |
| 436 | Kitchen stations as a managed list, picked in the recipe header | — | Five shared stations seeded on first boot after deploy. |
| 437 | Printed prep sheets per station, category or dish, one page per group | 2 | Print layout checked only on a headless-Chrome replica; Android card needs a real phone. |
| 438 | Save a product with just a name and a unit; drop dish-type colors | — | Schema only got looser; stored colors go away with migration 0007. |
| 439 | Paste a recipe or a list of ingredients, with red "not ready" rows | 2 | Retried after the disk-full episode; a merge round followed. |
| 440 | Store event and serving coefficients; compute portions in one place | 2 | Migration 0007 rehearsed on two scratch databases; Atlas run is yours. Round 2 was a merge-step failure, no code change. |
| 441 | Set coefficients per event type and per dish; drop take rate | 3 | Removes "take rate" and "pieces per person" from screens and Excel. |
| 442 | Give every event a stage, a stage history and a notes log on the server | 2 | Migration 0008 rehearsed on a throwaway database only; the Atlas-copy rehearsal is still open. |
| 443 | Log new inquiries and move each event through its stages | 2 | 10 cards. Merge round wired the supplier-orders offer after 435 landed. |
| 444 | Mark unpriced products; show which prices make a total partial | — | Adds the amber «לא סגור סופית» label and the «חלקי» price popover. |
| 445 | Show live profit against the target while the chef builds a menu | — | Replaces the old 33% footer with the pricing meter. |
| 446 | Freeze the event plan and close each event with what was really paid | — | Closing dialog with photo of the delivery note. Existing events past «הזמנות» have no snapshot until the owner presses «רענן תכנון». |
| 447 | Show the business its inquiries, closings, revenue and pricing accuracy | — | New "ביצועים" dashboard area; fake sparklines removed. |
| 448 | Give the platform admin a table of every business | — | Built without the drill-down because 447 was not merged yet (see section 5). |
| 449 | Close three staff permission holes | — | Closed security findings #1 to #3. |

Merge order into `mvp`: 424, 420, 423, 421, 433, 438, 434, 440, 425, 436, 441, 426, 427, 442, 428, 430, 429, 431, 439, 435, 432, 449, 443, 448, 437, 444, 445, 446, 447.

## 4. Decisions taken without asking

Run-level (from `decisions.md`):
- Merges go to `mvp`, not `main`, with one human gate at the end. Reason: production stays untouched until you validate.
- A plan that failed 3 checker rounds is parked and the lanes continue. This was your choice; no plan was parked in the end.
- 423 runs first in lane 2 (before engine 433 and lean form 438): the engine builds on its unit conversion and it avoids a product-form collision.
- 420 and 421 run at the head of lane 3: small QA fixes on files that lane touches.
- 427, 428, 429 keep your lane order 5, 6, 4; 428 creates `/settings`.
- Old map item 11 dropped: plan 407 merged without user prefs, so its business scoping folds into 425.
- Old map item 27 (plan 321 header) fixed by the Planner directly, a plan-file-only edit.
- 424: migration 0006 rehearsed only on a scratch copy; Atlas order at the final gate is 0005, 0006, 0007, 0008. No production writes without you.
- The big reuse refactor (plans 450–458) waits until after the MVP; MVP plans follow a "reuse first" rule and the checker enforces it. Reason: no delay and no collision with every MVP file, while stopping new drift.
- Builders and the merge step on Sonnet (merge at low effort), checker on Opus at high effort, 3 lanes kept. You asked for cost cuts; fewer lanes would cost the same, only slower.

Plan-level (the ones that change what you see or do; each run file lists many more small ones):
- 423: weight pre-filled only for kg, gram, liter, ml, tablespoon, teaspoon, cup (other units are 1 g, meaningless as a weight). The new-unit window starts with amount 0 and save disabled, so it cannot read as "1 jar = 1 kg".
- 424: login for a user with no business gets a token without a business and is blocked later by 425/426. The guest dev user is a platform admin. Migration verify counts per `userId`, so it stays valid once staff share a business.
- 425: `requireAdmin` alias deleted; only `isPlatformAdmin === true` counts as platform admin. Deleting a staff user never removes the business. The refresh sync gate reads the business, and cloned items are stamped with the business owner.
- 426: the guest dev user still stores `role: 'admin'` in the database (only the token and user objects dropped it). The delete button for a business is disabled only for your own business.
- 427: staff cannot link a supplier to a product (a supplier link carries a price, which is owner-only); the owner does it. Event actions and trash actions are deny-by-default.
- 428: team code lives in a lazy `TeamService`, and the header settings link reuses an already registered icon, both to stay under the 560 kB bundle budget. A removed staff member keeps what he wrote. Inventory list hides delete for staff on products they did not create.
- 429: any member may read the business settings (defaults filled in); only the write is owner-only.
- 430: only writes to business data count as "active" (logging, AI, admin and version-history calls do not); days are Israel dates.
- 431: the install-name icon and setup card reuse an existing icon to stay in budget; the hidden-card flag is stored per business in `localStorage`.
- 432: import limit is 10 per 15 minutes per user; no prices or names in logs; unknown units and bad names are skipped per row, not rejected as a whole.
- 433: unit conversion never guesses between weight and volume; a menu item whose recipe was deleted is reported as deleted with cost 0 and marks the total partial.
- 434: shopping-list groups ordered normal categories (Hebrew sort), then "unlinked", then "deleted"; the unit-price column was dropped from the Excel.
- 435: WhatsApp phone choice is the first valid mobile of `phone` / `phone2`; a missing supplier goes to the "ללא ספק" card.
- 436: renaming a station re-keys the owner's recipes and dishes; deleting a used station is refused and names the recipes.
- 437: unknown stations sort after listed ones and before "כללי"; supplier pages are view only (no Excel).
- 438: "category" in the lean form defaults to «כללי» on display.
- 439: unknown unit words stay in the ingredient name and the row is red; pasted recipes do not create an undo snapshot.
- 440: a prep whose recipe is missing counts as a portion unit rounded up (the safe side for food amounts); Atlas rehearsal used a snapshot, not a fresh read.
- 441: a typed coefficient equal to the default still counts as a manual override; menu-library AI import now freezes coefficient snapshots.
- 442: the generic menu-event POST always starts an event in «פנייה»; stage writes are conditional (409 `STAGE_CHANGED` if it moved in the meantime); one shared write limiter for the data and events routes.
- 443: «הסתיים» cannot be picked by hand (only through the close action); stage filter defaults to active events; the inquiry form opens from `?new=inquiry`.
- 444: staff see "ממתין לתמחור של הבעלים" instead of a price box; a blank recipe row never makes a cost partial.
- 445: staff see locked money fields (disabled, still shown); a stored per-event target is never hidden.
- 446: planned amounts freeze when the event enters «ביצוע»; closing writes are accepted from any stage except «הסתיים»; finish, reopen and refresh need the owner.
- 447: lost («לא נסגר») events are left out of "upcoming"; staff get funnel and upcoming only, with no money in the response at all.
- 448: closing rate is a 0 to 1 fraction in the API and shown as a percent; the business name stays plain text (no drill-down).
- 449: kept the existing "kind cannot change" 400 for finding #1 (plan said 403, outcome is the same); replace-all uses the owner-only `editSettings` action; money values are compared by row key, order ignored.

## 5. Open follow-ups

From builders and checkers, with the plan that recorded each:
- 448: the business drill-down (P6, P7) was skipped because plan 447 was not merged when 448 was built. 447 is merged now, so the drill-down can be added.
- 449: a staff version-history trim now gets 403 (only `VERSION_HISTORY` is replaceable today). Whether the client copes with the failed trim is not verified; the builder flagged it for the checker, and no checker round is recorded.
- 428: the leave-guard save and approve-stamp save are not gated in the UI for staff on another member's recipe; the server refuses with the no-permission toast. Follow-up for recipe-builder (a growth-frozen file).
- 428 and 444: 428 said the price lock in the quick-edit panel/modal "stays with plan 444"; run 444 does not mention it. Unverified.
- 426: the agent could not create `nobiz-test` itself (local MongoDB down), so card 20 setup is manual. The guest document still stores `role: 'admin'`; `isAdmin_` remains as a deprecated alias.
- 427: staff cannot link a supplier to a product (product decision, may need revisiting).
- 441: `predictedTakeRate` is still in the AI prompt in `server/routes/ai.js` and in the `MatchedDish` mapping of `ai-menu-modal.component.ts` (nothing reads it). The `.card-title` / `.icon-primary` block is still copied in four components until the reuse refactor.
- 436: the plan's log-query ran only on the file log, not the database (Mongo-backed query to redo).
- 442: the generic menu-event POST resets any re-posted event (restore from trash, append-existing with its own id) to «פנייה». Plan 443 did not address it; whether the client re-posts events that way was not checked.
- 446: staff can still send `planSnapshot` through the generic PUT of an event they created (it is not a money field). Making it owner-only needs `shared/schemas/money-fields.ts`, outside that plan's scope. Existing events past «הזמנות» have no snapshot; the owner presses «רענן תכנון».
- 437: dead code to remove later: `styleExcelBlockBorder`, `styleExcelBlankRow` in `excel-workbook.util.ts`, and the dictionary key `toolbar_checklist`.
- 423: review the `check-unit-weights.js --target=atlas` output before merging (products with a differing unit change cost).
- 425: the comment above `push-to-master` in `generic.js` is stale ("open to any signed-in user"); old `userId` indexes are kept next to the new `businessId` ones.
- 431: duplication left for the reuse refactor (toast mapping in `BaselineTabComponent.send()` and field layout scss repeat `business-settings-tab`); the `clipboard-list` icon could become `list-checks` if the bundle budget allows.
- 432: the real Gemini answer has not been exercised; do one real import before release. The lazy route made the bundle 70 bytes over budget.
- Bundle budget: the initial bundle is over the 560 kB warning on `mvp` (562.36 kB at plan 444, 562.55 kB at 447; 560.79 kB on clean `origin/mvp` at plan 437). Warning only (hard limit 1 MB), but a later plan should win bytes back.
- Test suite: `v2 inferred types upgradeV1toV2 output parses into the inferred Recipe type` (`src/app/core/models/v2/v2-types.spec.ts:26`) fails on clean `origin/mvp` too (seen in 436, 437, 441, 444, 445, 446). Plan 440 also saw `RowActionsMenuComponent ... row-tall` failing (plan 362 code), and plan 445 saw two `ProductFormComponent` specs time out only in the full run (they pass alone).
- Not measured in a real browser (MongoDB down, empty app), covered only by cards: 444 popover inside the recipe-builder cost box and menu footer; 445 fixed bar and phone sheet; 446 phone full-height sheet and camera flow; 447 phone layout and colors; 437 print layout (replica only).
- 447 and 442: `breadcrumbs.md` entries for `business-stats.model.ts` and the new service are missing (left for `/docs-refresh`).
- 434: preview title suffix and Excel sheet name stay in English ("Shopping list"), unchanged from before; each menu's stored `foodCostPct` refreshes on its next save.
- Run files for 425, 444, 445, 446, 447 record no checker round at all, and 420, 423, 427, 433, 434, 436, 438, 448 only "none yet". I could not confirm a checker pass for these from the files.
- Card 55 (plan 442, "existing menus look the same") says no stage appears anywhere; plan 443 now shows a stage chip. I adjusted that card's wording below (the chip is expected, numbers must not change).
- Card 11 (plan 421) names the page `/metadata-manager`; the map says the metadata manager is only reachable at `/dashboard?tab=metadata`. Cards below use the dashboard address. Card 50 (plan 449) names `/products`; the inventory page is `/inventory`.

## 6. Validation cards, grouped by page

127 checks. Format per card: title, WHERE (with SETUP in front when needed), DO, SEE ✓, FAIL ✗ (the WHY is folded into the title; with more than 60 cards each card is kept to five short lines). The source plan is in brackets. Cards refer to earlier cards by name, not by number. Reply `done`, `not yet` or `failed: <numbers>`.

▸ Sign-in window — /dashboard   (card 1)
1. Sign-up asks for the business name [426]
   WHERE  top right «התחברות» then tab «הרשמה». Setup: signed out.
   DO     fill username `kitchen-test`, an email, a password and the confirmation; leave «שם העסק» empty, press «הרשמה»; then type «מטבח בדיקה» in «שם העסק» and press «הרשמה» again. Repeat at phone width.
   SEE ✓  first press shows «נא להזין את שם העסק» and signs nobody in; second signs you in and the header chip shows «מטבח בדיקה» in small grey text under `kitchen-test`
   FAIL ✗ no «שם העסק» field, no message when empty, «שגיאת שרת», or no business name on the chip

▸ Inventory — /inventory, /inventory/add   (cards 2–10)
2. Two kitchens never see each other's products [425]
   WHERE  Inventory in two windows (normal and private). Setup: sign up two new accounts, kitchenA and kitchenB.
   DO     in kitchenA add product «בדיקה עסק א»; in kitchenB look at the Inventory list, type «בדיקה» in the ingredient search of a new recipe, and open Trash. Repeat at desktop and phone width.
   SEE ✓  kitchenB sees «בדיקה עסק א» nowhere (list, ingredient search, Trash); kitchenA still sees it
   FAIL ✗ it shows up for kitchenB anywhere, or kitchenA loses it
3. A product with only a name and unit saves [438]
   WHERE  /inventory/add
   DO     type name «בצל ירוק», choose base unit «ק"ג», leave the rest empty, press «שמור»
   SEE ✓  you land on the inventory list and the new row shows category «כללי»
   FAIL ✗ a red "required" message under price or category, or nothing saves
4. Same on a phone [438]
   WHERE  /inventory/add at phone width
   DO     repeat the previous check
   SEE ✓  it saves; no red "required" message under price or category
   FAIL ✗ a red message appears or it does not save
5. Name and unit are still required [438]
   WHERE  /inventory/add
   DO     press «שמור» with an empty name; then type a name, leave the unit empty, press «שמור»
   SEE ✓  first the red "name required" message and nothing saves; then the red "unit required" message
   FAIL ✗ the product saves, or no message shows
6. Each product keeps its own jar weight [423]
   WHERE  /inventory, edit «בצל צהוב», then «חמוצים». Setup: those two products exist.
   DO     onion: «הוסף יחידת רכש» → «הוסף יחידה חדשה», name «צנצנת», amount 500, unit גרם, save. Pickles: «הוסף יחידת רכש» → choose «צנצנת» → type 350 → save.
   SEE ✓  pickles shows the amount field empty right after choosing «צנצנת»; reopening both: onion 500, pickles 350
   FAIL ✗ pickles opens pre-filled with 500, or onion changed to 350
7. Adding a unit asks the weight of this product [423]
   WHERE  /inventory, edit a third product, «הוסף יחידת רכש» → «הוסף יחידה חדשה»
   DO     open the window and read its title and amount label
   SEE ✓  title «יחידה חדשה עבור <product name>», label «כמה שוקלת ... אחת של <product name>?», unit select preset to the product's base unit
   FAIL ✗ the old title «הגדרת יחידת המרה חדשה», or the amount already says 1
8. Cancel in the unit window keeps the previous unit [423]
   WHERE  /inventory/add, the base unit select
   DO     with base unit "kg": «הוסף יחידה חדשה» → «ביטול». Then again → add unit "crate" → approve. Fill a name and a category, save.
   SEE ✓  after cancel the base unit still shows kg; after adding, "crate" is selected; the product saves
   FAIL ✗ blank base unit, a number like 24, or a save error
9. A product without a price is marked [444]
   WHERE  product list, «מוצר חדש»
   DO     create «שמן בדיקה» with only a name and a unit (no price, supplier or category), save
   SEE ✓  its row shows an amber label «לא סגור סופית» next to the name
   FAIL ✗ no such label, or only the old amber triangle for missing details
10. Filter «לא סגור סופית» [444]
   WHERE  filter panel, chips row (next to «פרטים חסרים»). Setup: a product with a price but no category (edit «עגבנייה» and clear its category).
   DO     tick «לא סגור סופית»
   SEE ✓  «שמן בדיקה» stays; the priced product without a category disappears
   FAIL ✗ the priced product without a category is still listed

▸ Metadata manager — /dashboard?tab=metadata   (cards 11–19)
11. A refused menu-type rename leaves the menu alone [421]
   WHERE  menu types section. Setup: a saved menu using menu type A, and a second existing menu type B.
   DO     rename A to B
   SEE ✓  message «סוג תפריט "B" כבר קיים»; opening that menu in /menu-intelligence still shows serving style A
   FAIL ✗ no message, or the menu now shows serving style B
12. A rename to a new name still reaches the menu [421]
   WHERE  menu types section. Setup: a saved menu using menu type A.
   DO     rename A to a name that does not exist yet, C
   SEE ✓  after reopening the menu in /menu-intelligence its serving style shows C
   FAIL ✗ the menu still shows A, or shows nothing
13. Platform screens are for the platform admin only [426]
   WHERE  this page; on a phone the row of section tabs. Setup: signed in as `kitchen-test`.
   DO     scroll the whole page (swipe the tab row to its end); then sign out, use the dev guest button «Guest (Dev)» and open the page again. Repeat at phone width.
   SEE ✓  as `kitchen-test`: no «ניהול משתמשים», no AI models section, no crown on the avatar, no tab for either; as the guest: both sections, both tabs and the crown are there
   FAIL ✗ an owner sees either section or a tab for it, or the guest is missing one
14. The admin deletes a business (two questions) [426]
   WHERE  section «ניהול משתמשים» as the dev guest. Setup: `kitchen-test` exists.
   DO     find the `kitchen-test` row, press the trash icon, yes to the first question, yes to the second. Desktop only.
   SEE ✓  row shows «מטבח בדיקה» and chip «בעלים»; first question starts «מחיקת בעל העסק מוחקת את כל העסק – כל הנתונים וכל המשתמשים שלו. העסק: "מטבח בדיקה"»; second says «המחיקה סופית ואי אפשר לשחזר אותה. למחוק את העסק?»; then toast «העסק נמחק» and the row is gone; the guest's own row has a disabled trash icon
   FAIL ✗ only one question, delete after one yes, the guest's own row deletable, or the row stays
15. Default stations are there [436]
   WHERE  section «תחנות עבודה» (phone: its tab in the top strip)
   DO     open the section and tap one of the default chips
   SEE ✓  חם, קר, מאפה, קינוחים, הגשה are listed; tapping one says only an admin can change it
   FAIL ✗ section missing, a default missing, or a default editable by a normal user
16. Add, rename and remove your own station [436]
   WHERE  same section. Setup: signed in as a normal (non-admin) user.
   DO     type «גריל» → הוסף; tap it, rename to «גריל פחמים» and confirm; then remove it and confirm
   SEE ✓  each step shows a success message; removing a station a recipe uses is refused with a message naming that recipe
   FAIL ✗ a step fails silently, the old name stays after rename, or a used station is deleted
17. Dish types have no color [438]
   WHERE  card «סוגי מנה»
   DO     add «בראנץ'» (desktop and phone)
   SEE ✓  it is added; no color dot or color picker anywhere in the card
   FAIL ✗ a color dot or picker shows, or the add fails
18. Coefficients card lists event and serving types [441]
   WHERE  card «מקדמים» (desktop)
   DO     look at the two lists
   SEE ✓  event types: עסקי 1.1, פרטי 1.15, חתונה 1.2, מסיבה 1.1, כנסים 0.9; serving types 1, 1.1, 2, 3 (shared ones greyed with a lock unless you are platform admin)
   FAIL ✗ a type or number missing or different, or the card is not there
19. Add an event type [441]
   WHERE  same card, «סוגי אירוע», the add row
   DO     type `בר מצווה` and `1.25`, press «הוסף»
   SEE ✓  «בר מצווה» appears with 1.25 and a «עודכן בהצלחה» message
   FAIL ✗ nothing appears, an error shows, or the number is not 1.25

▸ Sign-in window, again — /dashboard   (card 20)
20. An account with no business gets a clear message [426]
   WHERE  «התחברות» → tab «כניסה». Setup: sign up `nobiz-test` through the app (business name «בדיקה»), sign out, then in the Claude Code prompt run: `! node -e "const {MongoClient}=require('./server/node_modules/mongodb');require('./server/node_modules/dotenv').config({path:'server/.env'});(async()=>{const c=await MongoClient.connect(process.env.MONGO_LOCAL_URI);const r=await c.db('foodvibe_wt1').collection('users').updateOne({name:'nobiz-test'},{\$unset:{businessId:1}});console.log(r.matchedCount,r.modifiedCount);await c.close()})()"` (must print `1 1`; it targets the slot database `foodvibe_wt1`, never Atlas; use the database name your stack actually uses)
   DO     sign in as `nobiz-test` (desktop and phone)
   SEE ✓  the window stays open and shows «החשבון לא משויך לעסק – פנה לתמיכה»
   FAIL ✗ «שגיאת שרת», «משתמש לא נמצא», or you get signed in

▸ Settings, Team tab — /settings?tab=team   (cards 21–24)
21. Owner adds a cook [428]
   WHERE  desktop, signed in as the owner (or dev guest), menu «הגדרות», tab «צוות»
   DO     press «הוסף חבר צוות»; username `cook1`, password `cook12345`; press «הוסף»
   SEE ✓  green «חבר הצוות נוסף»; `cook1` in the list with chip «צוות» and last-login «—»; the owner row has no trash button
   FAIL ✗ an error, `cook1` missing, or a trash button on the owner row
22. The Team list shows when each person last used the app [430]
   WHERE  window A owner, window B (private) as `cook1`. Setup: `cook1` logs in and opens any page in window B.
   DO     in window A open any recipe and save it, then open «הגדרות» → «צוות» and reload
   SEE ✓  both rows show today's date and time under «כניסה אחרונה», not «—»
   FAIL ✗ a row still shows «—», or the date is not today
23. The Team list reads well on a phone [430]
   WHERE  same tab at 620 px or less
   DO     scroll the team list from top to bottom
   SEE ✓  the last-login line sits under each name, readable, no sideways scrolling
   FAIL ✗ text cut off or the page scrolls sideways
24. Team tab on a phone [428]
   WHERE  owner, phone width; bottom bar «פרופיל» → «הגדרות». Setup: `cook1` still in the team.
   DO     press «הוסף חבר צוות» to open the form, close it; scroll the list
   SEE ✓  the Team tab opens; form and list fit with no sideways scroll; the trash button on `cook1` is reachable
   FAIL ✗ «הגדרות» missing for the owner, content wider than the screen, or the trash button hidden

▸ Settings, Business tab — /settings?tab=business   (cards 25–27)
25. Owner sees the defaults and saves a new target [429]
   WHERE  desktop, owner, menu «הגדרות», tab «הגדרות עסק»
   DO     change «יעד רווח נקי» to 30, press «שמור», reload
   SEE ✓  before: יעד רווח 25%, מרווח ביטחון 10%, סף חריגה מספק 10%; after saving toast «ההגדרות נשמרו»; after reload the target shows 30
   FAIL ✗ other starting numbers, no toast, or 25 again after reload
26. Owner types an impossible target [429]
   WHERE  same tab
   DO     type 100 in «יעד רווח נקי»
   SEE ✓  red text «חייב להיות בין 0 ל-99.9» under the field and «שמור» greyed out
   FAIL ✗ no message, or «שמור» stays clickable
27. Business tab on a phone [429]
   WHERE  owner, window under 620 px (or a phone), tab «הגדרות עסק»
   DO     look at the three fields and tap one
   SEE ✓  fields sit one under the other, the % sign is on the inline-end side of each, numeric keyboard opens, no sideways scroll
   FAIL ✗ fields side by side, % in the wrong place, letters keyboard, or sideways scroll

▸ Dashboard to Settings (opening details) — /dashboard   (cards 28–31)
28. A new owner lands on the opening details once and can save them [431]
   WHERE  sign up a brand-new business, then click «לוח בקרה» in the top menu
   DO     on «פרטי פתיחה» type 4 in «אירועים שנסגרו בחודש» and 12000 in «הכנסה ממוצעת לאירוע (₪)», press «שמור»
   SEE ✓  the app first switches to Settings on «פרטי פתיחה»; after saving «פרטי הפתיחה נשמרו» and you are back on the dashboard; «הגדרות» → «פרטי פתיחה» shows 4, 12000 and «עודכן ב-» with today's date (dd/MM/yyyy)
   FAIL ✗ no switch to Settings, no message, numbers gone, or date missing
29. Skipping the opening details is remembered [431]
   WHERE  sign up a second brand-new business, then click «לוח בקרה»
   DO     on «פרטי פתיחה» press «דלג», reload
   SEE ✓  you land on the dashboard and it does not jump to Settings again; «פרטי פתיחה» still exists, four boxes empty, text «עדיין לא מולא»
   FAIL ✗ the screen opens again after reload, or the tab is missing
30. The setup card ticks itself from the business's own data [431]
   WHERE  dashboard, owner whose opening details are saved or skipped (the first one above)
   DO     look at the card «הקמת העסק»; open «מתכון חדש», save any recipe, return to «לוח בקרה»; press «הסתר» and reload
   SEE ✓  card shows 5 steps, none ticked, «0 מתוך 4»; after the recipe «מתכון ראשון» is ticked and «1 מתוך 4» without reloading; after «הסתר» the card is gone and stays gone after reload
   FAIL ✗ sample items tick a step, the recipe step stays unticked, or the card returns after reload
31. A staff member sees neither the opening details nor the card [431]
   WHERE  dashboard and Settings. Setup: owner adds a staff user in «הגדרות» → «צוות»; log in with that user in a private window.
   DO     click «לוח בקרה», then open «הגדרות»
   SEE ✓  no «הקמת העסק» card, no jump to Settings, and no «פרטי פתיחה» tab
   FAIL ✗ the card or the tab shows for staff

▸ Inventory list and import — /inventory/list, /inventory/import   (cards 32–37)
Setup for the group: owner whose business has a supplier «ירקן» (create it in «ספקים» first). Each «נתח» uses one AI request.
32. Only the owner has «ייבוא מוצרים» in the «+» menu [432]
   WHERE  /inventory/list, the round «+» button
   DO     open the «+» menu as the owner; then as a staff member (private window)
   SEE ✓  owner: three entries, the last is «ייבוא מוצרים»; staff: only «הוספת מוצר» and the AI create entry
   FAIL ✗ the staff menu shows «ייבוא מוצרים», or the owner's does not
33. Pasting a price list gives a preview of new products [432]
   WHERE  /inventory/import via «ייבוא מוצרים»
   DO     paste three lines: `עגבנייה 5.9 לק"ג` / `מלפפון 4.5 לק"ג` / `שמנת 32% 1 ליטר 12`; pick supplier «ירקן»; press «נתח»; then «שמור הכל»
   SEE ✓  three rows «עגבנייה · ק"ג · 5.9», «מלפפון · ק"ג · 4.5», «שמנת 32% · ליטר · 12», each marked «חדש»; message «3 נוצרו, 0 עודכנו, 0 דולגו»; the three products are in the list with the price under ירקן
   FAIL ✗ a wrong name, unit or price (for example 32 read as a price), a row not marked «חדש», a different summary, or a missing product
34. A second list updates the price of an existing product [432]
   WHERE  same import page, after the previous card
   DO     paste `עגבנייה 6.2 לק"ג`, keep supplier «ירקן», press «נתח», then «שמור הכל»
   SEE ✓  one row «עגבנייה» marked «קיים – עדכן מחיר» (name and unit not editable); «0 נוצרו, 1 עודכנו, 0 דולגו»; the list shows 6.2 and still only one עגבנייה
   FAIL ✗ a second «עגבנייה», a different summary, or the price stays 5.9
35. Deleting a row and changing a unit before saving [432]
   WHERE  same import page
   DO     paste `גזר 3 לק"ג` and `פטרוזיליה 2 ליחידה`, press «נתח»; trash the «גזר» row; change «פטרוזיליה» unit to «גרם»; press «שמור הכל»
   SEE ✓  «1 נוצרו, 0 עודכנו, 1 דולגו»; «פטרוזיליה» exists with unit גרם; «גזר» does not exist
   FAIL ✗ «גזר» was saved, skipped count is 0, or the unit is not the one chosen
36. Staff cannot open the import page by hand [432]
   WHERE  import page as the staff member
   DO     type /inventory/import in the address bar
   SEE ✓  «אין לך הרשאה לפעולה הזו» and no paste box
   FAIL ✗ the paste box appears
37. The import page works on a phone [432]
   WHERE  import page at 620 px or less, as the owner
   DO     paste `עגבנייה 5.9 לק"ג` and `שמנת 32% 1 ליטר 12`, press «נתח»; scroll the preview sideways; tap a price box and a unit
   SEE ✓  paste box, supplier picker and preview fit; only the preview table scrolls sideways inside its own box; the name column stays at the edge; number keyboard opens for the price
   FAIL ✗ the whole page scrolls sideways, the table is cut off, or a price/unit cannot be edited

▸ Recipe book — /recipe-book   (cards 38–40)
38. Paste a full recipe [439]
   WHERE  the floating round button. Setup: signed in; text ready: a name, 4 ingredient lines (e.g. «2 ק"ג עגבניות»), 3 steps.
   DO     press the button, choose «הדבק מתכון», paste, press «זהה מתכון». Repeat at phone width.
   SEE ✓  an editable draft shows the name, the 4 ingredients and the 3 steps (fits the phone, no sideways scroll)
   FAIL ✗ an error line, an empty draft, or no «הדבק מתכון» option
39. Edit the draft and save [439]
   WHERE  the draft window from the previous card
   DO     change one amount, press «פתח בבונה המתכון», then «שמור»
   SEE ✓  the builder opens with your changed amount; after saving the recipe is in the recipe book
   FAIL ✗ the amount is back to the old value, the builder is empty, or the recipe does not save
40. Text that is not a recipe [439]
   WHERE  floating button
   DO     choose «הדבק מתכון», paste «שלום מה נשמע», press «זהה מתכון»
   SEE ✓  message «לא זוהה מתכון בטקסט» and no draft opens
   FAIL ✗ a draft opens, or no message shows

▸ Recipe builder — /recipe-builder   (cards 41–47)
41. Recipe weight and cost use each product's own jar [423]
   WHERE  a recipe with two ingredient lines. Setup: the onion and pickles jars from the jar-weight check.
   DO     add 1 צנצנת of yellow onion and 1 צנצנת of pickles
   SEE ✓  recipe weight shows 850 g and each line's cost matches its own product
   FAIL ✗ weight is 1000 g or 700 g
42. Adding a unit from a recipe line asks the weight [423]
   WHERE  a line of a third product, its unit list → «הוסף יחידה חדשה»
   DO     pick «צנצנת», type an amount, save
   SEE ✓  the window asked «כמה שוקלת צנצנת אחת של <product>?» before saving; the line uses the typed amount; the product's purchase units show it
   FAIL ✗ the unit was added without asking
43. Paste ingredient lines [439]
   WHERE  open a saved recipe; button «הדבק מצרכים» under the rows. Setup: products «עגבניות» and «מלח» exist.
   DO     press it, paste `2 ק"ג עגבניות`, `200 גרם מלח`, `קצת פטרוזיליה`, press «הוסף». Repeat at phone width.
   SEE ✓  three new rows; tomato and salt show the product names; the third row is red, reads «קצת פטרוזיליה» and shows «לא מוכן»; at phone width everything fits
   FAIL ✗ fewer than three rows, a line missing, the third row not red, or sideways scroll
44. Not-ready row stays and the recipe saves [439]
   WHERE  the red row from the previous card
   DO     click «לא מוכן» (create-product window opens with that name; close without saving to keep it red), press «שמור» and confirm «save anyway», reopen the recipe
   SEE ✓  it saves; after reopening the red row «קצת פטרוזיליה» is still there
   FAIL ✗ the save is refused, or the row is gone
45. Pick a station in a recipe [436]
   WHERE  header field «תחנה», next to the dish type. Setup: open a dish.
   DO     open the list, choose «קר», save, reload; then at phone width (about 390 px) open the list. Also give a second dish station «חם» (needed by the print and station cards later).
   SEE ✓  after reload the field shows «קר»; on the phone the list opens (first entry «כללי», last «הוסף תחנה חדשה»)
   FAIL ✗ field empty after reload, cut off on the phone, or the list does not open
46. The recipe cost says «חלקי» [444]
   WHERE  new recipe; the cost box in the header. Setup: add 1 ק"ג עגבנייה (5 ₪/ק"ג) and 100 גרם «שמן בדיקה» (no price).
   DO     look at the cost, tap the amber «חלקי» label
   SEE ✓  «חלקי» next to the cost; popover «חסרים מחירים» lists «שמן בדיקה» with «בשימוש ב:» and the recipe name
   FAIL ✗ no label, or the popover does not open
47. Price the oil from the popover [444]
   WHERE  the same popover
   DO     type 20 in «מחיר לק"ג», press «שמור»
   SEE ✓  «המחיר נשמר»; the «חלקי» label disappears and the cost rises by 2 ₪; you stay on the page
   FAIL ✗ the page navigates away, the label stays, or the cost does not change

▸ Inventory, as the cook — /inventory/list   (cards 48–50)
Setup for the group: second (private) window at the same address, logged in as `cook1` / `cook12345`; at least one product the owner created.
48. A cook sees locked prices and no delete on the owner's products [428]
   WHERE  «מלאי», click a product the owner created
   DO     look at the price fields and the list row buttons
   SEE ✓  price fields greyed with «המחירים נעולים – רק בעל העסק יכול לשנות אותם»; whole form read-only with «נוצר על ידי חבר צוות אחר – צפייה בלבד»; no trash button on that product's row
   FAIL ✗ a price field can be typed in, no note, or a trash button on the owner's product
49. The cook keeps editing his own product [428]
   WHERE  as `cook1`, inventory list, then the new product's edit page
   DO     add `מוצר בדיקה`, one purchase unit (a box with a conversion rate) and a supplier, save, reload, open it, rename to `מוצר בדיקה 2`, save again
   SEE ✓  second save works, no «אין לך הרשאה לפעולה הזו»; only price fields locked; no «נוצר על ידי חבר צוות אחר» note; the trash button shows on his own product
   FAIL ✗ «אין לך הרשאה לפעולה הזו» on the second save, whole form locked with that note, or trash button missing
50. Staff cannot change a supplier price [449]
   WHERE  inventory (the run file names it the Products page), a product created by staff, supplier prices section. Setup: as staff create a product with two suppliers; the owner is logged in in another window.
   DO     as staff try to change a supplier's price and save
   SEE ✓  price fields locked (or the save refused with the no-permission message); the owner can still change the price
   FAIL ✗ the staff user changes or moves a price and it saves

▸ Recipe book, as the cook — /recipe-book   (cards 51–52)
51. An owner's recipe is view-only for the cook [428]
   WHERE  as `cook1`, «ספר מתכונים», click a recipe the owner created
   DO     look at the list row buttons, then open the recipe
   SEE ✓  no trash button on the owner's row; inside no «שמור מתכון» button and the note «נוצר על ידי חבר צוות אחר – צפייה בלבד»
   FAIL ✗ a trash button on the owner's recipe, or a «שמור מתכון» button for `cook1`
52. The cook works on his own recipe [428]
   WHERE  as `cook1`, «ספר מתכונים» → new recipe
   DO     create `מתכון בדיקה`, save; reopen, edit, save again; press its trash button and confirm. Then create one more recipe and leave it (the owner-removes-cook check needs it).
   SEE ✓  create, edit and delete all work with no error message
   FAIL ✗ any «אין לך הרשאה לפעולה הזו» message on his own recipe

▸ Settings, as the cook — /settings   (cards 53–54)
53. The cook has no settings [428]
   WHERE  as `cook1`: top menu, then the address /settings
   DO     look for the «הגדרות» link; then open /settings
   SEE ✓  no «הגדרות» link; the page shows «ההגדרות זמינות לבעל העסק בלבד» and no tabs
   FAIL ✗ the link is visible for `cook1`, or the page shows tabs
54. Staff cannot see or open the business numbers [429]
   WHERE  as the cook, address /settings?tab=business
   DO     open it
   SEE ✓  no «הגדרות» link in the menu; the page shows «ההגדרות זמינות לבעל העסק בלבד» and no numbers
   FAIL ✗ any tab, field or percentage is visible

▸ Menu library — /menu-library   (cards 55–57)
55. Existing menus open and look the same [442]
   WHERE  menu library list on desktop, then phone width
   DO     open the list, open two existing menus
   SEE ✓  list and both menus show the same numbers as before; no error toast. (Adjusted: a stage chip such as «פנייה» may now show; it comes from plan 443 and is expected.)
   FAIL ✗ a menu does not open, an error toast shows, or a number changed
56. Log a new inquiry on desktop [443]
   WHERE  desktop, the menu library list
   DO     click «פנייה חדשה», name "בדיקה 443", a date next month, 80 guests, first note "התקשרה בבוקר", press «שמור»
   SEE ✓  the form closes, toast "הפנייה נשמרה", a card "בדיקה 443" with chip "פנייה" appears, the stage filter reads "פעילים"
   FAIL ✗ save fails, the card has no chip, or the filter is not on "פעילים"
57. The same form on a phone [443]
   WHERE  phone width, the library list
   DO     open the round add button, choose «פנייה חדשה», save with name "בדיקה 443 נייד"
   SEE ✓  the same form opens, fits the screen, no sideways scrolling, saving works
   FAIL ✗ form cut off, needs side scrolling, or missing from the add button

▸ Menu editor — /menu-intelligence/<id of the event; open it from the library>   (cards 58–103)
Setup for the group: an event "בדיקה 443" from the library check (events 443-ב and 443-ללא-תאריך are created in the stage cards), one menu with dishes whose products have suppliers and prices, and a menu with a dish that contains a prep. Use the Setup lines of each card.
58. Edit and save one menu [442]
   WHERE  menu editor opened from the library
   DO     change the menu name by one letter, press save
   SEE ✓  the save succeeds and the library shows the new name
   FAIL ✗ an error message or the old name still shown
59. Stage bar shows the current stage and keeps a history [443]
   WHERE  top of the event screen, above the paper, event "בדיקה 443"
   DO     check «פנייה» is filled; click «הצעת מחיר נשלחה», then «מקדמה שולמה»; open «פרטי לקוח», type 2000 in «סכום מקדמה»; click «היסטוריית שלבים»
   SEE ✓  «פנייה» filled at first; after the clicks the history shows two moves, each with stage name, date, time and your name
   FAIL ✗ a click does nothing, an error shows, or a history line has no name or time
60. «הסתיים» cannot be picked [443]
   WHERE  the stage bar
   DO     click «הסתיים»
   SEE ✓  nothing moves; message `"הסתיים" נקבע רק דרך "סיים אירוע"`
   FAIL ✗ the event moves to «הסתיים»
61. Mark an inquiry as not closed [443]
   WHERE  stage bar. Setup: a second event still in «פנייה» (log it as before, name it "בדיקה 443 ב").
   DO     click «לא נסגר»; look at «שמור»; pick «מחיר»; press «שמור»
   SEE ✓  «שמור» greyed until you pick «מחיר»; afterwards the bar shows «לא נסגר» filled with reason «מחיר»
   FAIL ✗ «שמור» works with no reason, or the stage does not change
62. A move to «מקדמה שולמה» needs a date [443]
   WHERE  stage bar. Setup: an event with no date in «פנייה» (name it "בדיקה 443 ללא תאריך").
   DO     click «מקדמה שולמה»
   SEE ✓  the event does not move; message `יש להזין תאריך אירוע לפני מעבר ל"מקדמה שולמה"`
   FAIL ✗ the event moves, or no message
63. The stage bar on a phone [443]
   WHERE  phone width, the event screen
   DO     scroll the stage bar sideways with a finger, then scroll the page down
   SEE ✓  only the stage bar scrolls sideways; the page does not; the notes box sits below the paper
   FAIL ✗ the whole page scrolls sideways, or the notes box is beside the paper
64. The «הזמנות» offer [443]
   WHERE  stage bar. Setup: an event in the stage «מקדמה שולמה» that has an event date.
   DO     click the stage «הזמנות»
   SEE ✓  a confirm asks: האירוע עבר ל"הזמנות". לפתוח את "הזמנות לספקים"? and «כן» opens «הזמנות לספקים»
   FAIL ✗ no prompt, or «כן» does nothing
65. Notes log [443]
   WHERE  the notes box beside the paper (desktop), event "בדיקה 443"
   DO     type "ראשונה", press «הוסף הערה»; add "שנייה" and "שלישית"; then sign in as another user of the same business and open the event
   SEE ✓  newest note on top, each with author and date; the other user sees all notes but no pencil or trash buttons on yours
   FAIL ✗ oldest first, a name or date missing, or the other user sees edit/delete on your notes
66. Default coefficient and portions of a dish [441]
   WHERE  /menu-intelligence (new menu), desktop. Setup: event type «פרטי», serving type «בופה», 100 guests, one dish (1 portion per diner).
   DO     click the small info icon next to the dish name
   SEE ✓  «מקדם המנה» shows 1.27 and «מנות לאירוע: 127»
   FAIL ✗ another number, or the fields missing
67. Change one dish by hand and go back [441]
   WHERE  same menu and dish details
   DO     type `1.1` in «מקדם המנה»; add a second dish; change the event type to «חתונה»; press «חזור לברירת מחדל» on the first dish
   SEE ✓  after typing: 110 portions and tag «שונה ידנית»; second dish after «חתונה»: 1.32 and 132 while the first stays 110; after reset the first shows 1.32 and 132 and the tag is gone
   FAIL ✗ any number differs, the tag stays after reset, or the first dish moves when the event type changes
68. Your own event type is used [441]
   WHERE  same menu
   DO     set the event type to «בר מצווה» (from the add-event-type check)
   SEE ✓  dishes without a manual coefficient show 1.25 × the serving coefficient (for «בופה» 1.1: 1.38 and 138 at 100 guests)
   FAIL ✗ the dishes keep the old numbers
69. Zero guests [441]
   WHERE  same menu, guests counter under the title
   DO     set guests to 0
   SEE ✓  every dish shows 0 portions and the red hint «הזן מספר אורחים» appears under the guests line
   FAIL ✗ a dish still shows portions, or no hint
70. Phone width and no take rate anywhere [441]
   WHERE  the menu saved in the default-coefficient check, phone width, then the Excel export from the printer button. Setup: save that menu first and open it by its address.
   DO     open a dish's details; export the menu info to Excel
   SEE ✓  «מקדם המנה», «שונה ידנית» and «חזור לברירת מחדל» fit and can be tapped; the words «שיעור לקיחה» and «פריטים לסועד» appear nowhere on the page or in the Excel
   FAIL ✗ a control cut off or too small, or an old word still shows
71. Prep ingredients reach the shopping list [434]
   WHERE  FAB «צ׳קליסט והדפסות» → רשימת קניות → תצוגה, a menu with a dish that contains a prep. Setup (if none): prep «רוטב» (yield 1 ק"ג: 800 גרם שמן זית, 0.2 ק"ג לימון), dish «סלט» (10 מנות: 500 גרם עגבנייה, 200 גרם רוטב), menu with סלט for 100 guests × 1 portion (tomato waste factor 0.8).
   DO     open the preview
   SEE ✓  rows for שמן זית (1.6 ק"ג), לימון (0.4 ק"ג) and עגבנייה (6.25 ק"ג to buy); no row named «רוטב»
   FAIL ✗ a row named «רוטב», or the oil and lemon missing
72. One line per product [434]
   WHERE  same preview. Setup: a second dish in the menu that also uses עגבנייה.
   DO     look at the עגבנייה rows
   SEE ✓  exactly one עגבנייה row with the summed amount
   FAIL ✗ two עגבנייה rows
73. Same total everywhere [434]
   WHERE  footer «עלות כוללת»; last preview row «סה״כ»; the ייצוא button
   DO     note the footer total, read the last preview row, export, open the Excel
   SEE ✓  the three numbers are equal (₪, 2 decimals); the last row may show «חלקי» when a product has no price
   FAIL ✗ any two numbers differ
74. Shopping list at phone width [434]
   WHERE  same menu, window about 390 px
   DO     repeat the preview and the total checks
   SEE ✓  same rows and total, nothing cut off
   FAIL ✗ cut-off columns or a different total
75. Open the orders screen on the PC [435]
   WHERE  pill «הזמנות לספקים» next to save; then the round bottom button → «הזמנות לספקים». Setup: a menu whose products have suppliers, one with no supplier, one supplier with a mobile phone (e.g. 052-7654321), one supplier with no phone.
   DO     click the pill; close it; open it again from the round button
   SEE ✓  one card per supplier with name, phone, lines "product qty unit" and «סה״כ משוער: ₪...»; a «ללא ספק» card with no WhatsApp button; both ways open the same screen
   FAIL ✗ a supplier card missing, quantities differ from the shopping list, or the screen does not open
76. Send on Android [435]
   WHERE  same menu on an Android phone, round button → «הזמנות לספקים». Setup: supplier with a mobile phone; add a product with an English name (e.g. Mozzarella).
   DO     tap «שלח ב-WhatsApp» on that supplier
   SEE ✓  WhatsApp opens on that supplier's chat with the message typed in; lines right-aligned, quantity and unit after the name; the English line does not flip
   FAIL ✗ wrong chat, text missing, or a line flipped / left-aligned
77. Send on iPhone [435]
   WHERE  same as the Android card, on an iPhone
   DO     repeat the Android card
   SEE ✓  same as the Android card
   FAIL ✗ same as the Android card
78. Send on the PC [435]
   WHERE  same menu on the PC
   DO     click «שלח ב-WhatsApp» on the supplier with a phone
   SEE ✓  WhatsApp Web / Desktop opens with the message ready
   FAIL ✗ a blank page, or an empty message
79. Copy one order [435]
   WHERE  a supplier card
   DO     click «העתק», paste into a WhatsApp chat
   SEE ✓  toast «הועתק – הדבק ב-WhatsApp»; pasted text is one product per line, no prices
   FAIL ✗ no toast, prices in the text, or products on one line
80. Copy all [435]
   WHERE  top of the screen, «העתק הכל»
   DO     click it, paste into WhatsApp
   SEE ✓  every supplier appears, each starting with its name, separated by an empty line, «ללא ספק» last; quantities equal the menu shopping list
   FAIL ✗ a supplier missing, or a quantity differs from the shopping list
81. Grouped by station [436]
   WHERE  FAB «צ׳קליסט והדפסות» → צ׳קליסט → «לפי תחנה» → תצוגה. Setup: a menu with the dish whose station is «קר» and one dish whose station is «כללי».
   DO     open the preview
   SEE ✓  the first dish's preps are under «קר»; the other dish's preps under «כללי»; no group without a name
   FAIL ✗ a group with an empty name, or the first dish under «כללי»
82. One page per station (desktop) [437]
   WHERE  round button → «דפי הכנה» → row «לפי תחנה» → «צפייה». Setup: a menu with one dish at station «חם» and one at «קר», each using a prep.
   DO     open the sheet and scroll through the pages
   SEE ✓  at least two pages, each starting with the station name in large bold text, then event name, date, guests and serving type
   FAIL ✗ one long list, no station names, or the header lines missing
83. Print only one station [437]
   WHERE  same screen, the group checkboxes at the top
   DO     uncheck every group but «קר», click «הדפס»
   SEE ✓  Chrome print preview shows only the «קר» page(s); A4 portrait; no app menu, buttons or footer bar; each row starts with an empty box
   FAIL ✗ other stations print, the app menu appears, or rows have no box
84. Page footer and long rows [437]
   WHERE  the same print preview, bottom of each page. Setup: a prep with a very long name; a station with enough rows for two pages.
   DO     scroll the preview
   SEE ✓  «עמוד X מתוך Y · קר» at the bottom; the long name wraps; no row split between pages; the table header repeats on the second page
   FAIL ✗ no footer, a cut name, a split row, or no repeated header
85. Android print [437]
   WHERE  same menu on an Android phone, Chrome → share/print → save as PDF
   DO     repeat the one-page-per-station and print-one-station checks
   SEE ✓  the same layout as on the computer
   FAIL ✗ different layout, app chrome in the PDF, or the wrong pages
86. Same rows in Excel [437]
   WHERE  same sheet, tab «לפי תחנה», button «ייצוא»
   DO     click it, open the downloaded file
   SEE ✓  one sheet per station with the same rows and quantities as on the screen
   FAIL ✗ one merged sheet, missing stations, or different quantities
87. Supplier pages [437]
   WHERE  same sheet, tab «לפי ספק»
   DO     click «הדפס»
   SEE ✓  one page per supplier with product lines and quantities, no prices; no «ייצוא» button on this tab
   FAIL ✗ prices appear, suppliers share a page, or an export button shows
88. Partial shows on every total of the menu [444]
   WHERE  dish row (right of the dish name), bottom bar «עלות כוללת», FAB → רשימת קניות → תצוגה, and «הזמנות לספקים». Setup: a dish using an unpriced product in a menu (if «שמן בדיקה» was already priced, create a second product with name and unit only and use that).
   DO     look at each of the four places and tap the label once; at about 390 px tap the bottom-bar label
   SEE ✓  «חלקי» in all four; the popover opens on tap, fits the screen, closes on an outside tap
   FAIL ✗ any of the four has no label, or the popover is cut off by the screen edge
89. Staff cannot price [444]
   WHERE  as a staff member of the same business, the same menu, tap a «חלקי» label
   DO     look at the unpriced product's row in the popover
   SEE ✓  «ממתין לתמחור של הבעלים» and no price field
   FAIL ✗ a price field is shown to staff
90. The meter answers «does this price meet my target» [445]
   WHERE  the bar fixed to the bottom. Setup: an event with dishes that have food cost, 50 guests.
   DO     look at the bar
   SEE ✓  price per guest, profit per guest, profit %, either green «עומד ביעד» or red «חסר … ₪ לאורח», the minimum price per guest and «מומלץ להוסיף … ₪ מרווח ביטחון»; no red food-cost % at 33 %
   FAIL ✗ the old five-number footer, or no verdict
91. Empty price is computed, a typed price is live [445]
   WHERE  field «מחיר לאורח ללקוח» in the bar. Setup: leave it empty.
   DO     read the price, type 120, then add a dish
   SEE ✓  empty: price with the tag «מחושב»; after typing the numbers change at once; after adding a dish they change again, no save, no refresh
   FAIL ✗ the tag is missing when empty, or a number only changes after saving
92. A target for this event only [445]
   WHERE  chip «יעד לאירוע זה». Setup: a price showing the red verdict (e.g. 120 per guest).
   DO     click it, type 15 in «יעד רווח נקי (%)»
   SEE ✓  the verdict turns green; /settings business tab still says 25
   FAIL ✗ the setting changed, or the verdict stays red
93. Bad values are refused [445]
   WHERE  the bar
   DO     type 100 in the event target; clear it and type -50 in «עלויות נוספות»; press «שמור»
   SEE ✓  «היעד חייב להיות קטן מ-100%»; «עלויות נוספות לא יכולות להיות שליליות»; «שמור» does not save
   FAIL ✗ the event saves with either value
94. Pricing bar on a phone [445]
   WHERE  the same page, window under 768 px
   DO     look at the bar, tap it, tap it again
   SEE ✓  one line: price per guest · profit % · verdict; tapping opens the full meter, tapping again closes it; nothing scrolls sideways
   FAIL ✗ sideways scroll, or the bar fills the screen with no way to close
95. Staff see the money locked [445]
   WHERE  the same event page, signed in as staff
   DO     click «מחיר לאורח ללקוח»
   SEE ✓  fields show a lock icon and cannot be typed in; numbers still show
   FAIL ✗ the staff member can type an amount
96. The plan stops moving once the event is in execution [446]
   WHERE  stage bar; prices in /inventory. Setup: an event with dishes whose products have suppliers and prices, in stage «הצעת מחיר נשלחה» or later, with a date.
   DO     click «הזמנות», then «ביצוע»; in /inventory raise one product's price by 20 %; back on the event click «שמור», then «פוסט-פרודקשן»
   SEE ✓  the dialog «סגירת אירוע» opens by itself and the «מתוכנן» amounts are the ones from before the price change
   FAIL ✗ the dialog does not open, or the planned amounts include the new price
97. An overrun turns red, a saving stays grey [446]
   WHERE  supplier rows in the «סגירת אירוע» dialog (event with at least two suppliers)
   DO     in one row type an amount 15 % above «מתוכנן»; in another a little below; look at the footer
   SEE ✓  the first row turns red with «חריגה של 15% (…)»; the second shows a grey minus percent; the footer shows «רווח מתוכנן», «רווח בפועל» (₪ and %), «הפרש» and the accuracy in points
   FAIL ✗ no red row, a red row below the threshold, or a footer number that does not move when you type
98. A delivery-note photo stays in its row [446]
   WHERE  the «תעודת משלוח» cell of a supplier row, on a phone (or a narrow window)
   DO     tap «צלם / העלה», take a photo, wait for the thumbnail; close the dialog and reopen it from «סגירת אירוע»
   SEE ✓  a small thumbnail in that row, still there after reopening; tapping it opens the full photo in a new tab
   FAIL ✗ no thumbnail, the thumbnail lands in another row, or it is gone after reopening
99. Finishing warns about missing amounts, then locks the event [446]
   WHERE  dialog footer buttons and the stage bar. Setup: leave one supplier's «שולם בפועל» empty, type the others.
   DO     click «סיים אירוע» and confirm; then click «סגירת אירוע», check the fields, click «פתח מחדש»
   SEE ✓  before finishing «חסרים סכומים ל-1 ספקים» with a confirm; after confirming the stage bar shows «הסתיים» and every dialog field is locked («האירוע הסתיים – הנתונים נעולים»); after «פתח מחדש» the stage is back to «פוסט-פרודקשן» and fields are editable
   FAIL ✗ no warning, a field still editable after finishing, or reopen does not unlock
100. Staff can tick and photograph, but not touch money [446]
   WHERE  same dialog, signed in as staff of the same business, open the event, click «סגירת אירוע»
   DO     tick «הגיע» and «יש חשבונית» on a row and add a photo; try to click into «שולם בפועל»
   SEE ✓  ticks and photo stay after closing and reopening; amount fields are locked; no «סיים אירוע» and no «רענן תכנון» button
   FAIL ✗ an amount can be typed, a tick is lost, or a finish button shows
101. Closing dialog on a phone [446]
   WHERE  the dialog on a phone or window under 768 px. Setup: an event with three or more suppliers.
   DO     scroll through the dialog and look at one row
   SEE ✓  the dialog fills the screen; each supplier is a card (name, planned and paid amounts, the two ticks, then photos); the footer with the profit comparison and buttons stays visible; nothing scrolls sideways
   FAIL ✗ sideways scrolling, columns squeezed side by side, or a footer that scrolls away
102. A menu saved before migration 0007 keeps its portions [441]
   WHERE  a menu saved before plan 440, from the local restore, desktop. Setup: on the local copy only (never Atlas) write down the dish portions and footer totals, then run migration 0007 on it (card 103 does the same run).
   DO     open the menu again after the migration
   SEE ✓  dish portions and footer are the same as you wrote down
   FAIL ✗ any number differs
103. Old menus show the same numbers after the migration [440]
   WHERE  /menu-intelligence, open an existing menu (desktop, then phone width). Setup: on a local database copy: note the dish portions and footer totals of one menu, then run `node server/migrations/0007-coefficients.js --target=local --write=yes --backup-dir=<fresh local snapshot>` and start the app.
   DO     reload the page and open the same menu
   SEE ✓  every dish and the footer show exactly the numbers you noted
   FAIL ✗ any dish count or the footer total changed, or the menu does not open

▸ Menu library, again — /menu-library   (cards 104–105)
104. Library hides lost events [443]
   WHERE  the menu library list. Setup: the event marked «לא נסגר» in the not-closed check.
   DO     look at the list, then open the filter «שלב» and choose «לא נסגר»
   SEE ✓  the lost event is not in the default list («פעילים») and shows under «לא נסגר»; the address ends with stage=not_closed
   FAIL ✗ the lost event shows under «פעילים», or is missing under «לא נסגר»
105. The library shows the meter's revenue [445]
   WHERE  the event's card, tag «הכנסה כוללת». Setup: on the menu page type a price per guest (e.g. 200 with 50 guests), press «שמור».
   DO     look at that event's card
   SEE ✓  «הכנסה כוללת» equals the revenue in the meter (₪10,000.00 for the example); an event not saved since this change shows «—»
   FAIL ✗ a different number

▸ Dashboard — /dashboard   (cards 106–112)
106. The new «ביצועים» area is on top [447]
   WHERE  top of the dashboard. Setup: owner; in /settings tab «פרטי פתיחה» fill the four opening numbers.
   DO     open the dashboard
   SEE ✓  «ביצועים» with «30 יום» selected and five cards (פניות, אירועים שנסגרו, הכנסות, דיוק תמחור, ימי שימוש בשבוע) with numbers; cards 1–3 show a green «+X% מול לפני» or red «−X% מול לפני»
   FAIL ✗ the area missing or below the other cards, or a card empty or showing "NaN"
107. The period picker changes the numbers [447]
   WHERE  the three pills at the top of «ביצועים»
   DO     click «90 יום», then «מההתחלה»
   SEE ✓  numbers update after each click (same only if nothing is older than 30 days); the selected pill is highlighted
   FAIL ✗ nothing changes, an error appears, or the page reloads
108. The funnel opens the filtered library [447]
   WHERE  panel «אירועים לפי שלב»
   DO     click the bar «פנייה»
   SEE ✓  /menu-library opens filtered to stage «פנייה»
   FAIL ✗ nothing happens, or the library shows all events
109. The next 14 days [447]
   WHERE  panel «אירועים קרובים». Setup: one event dated within the next 14 days and one further away.
   DO     look at the list; click a row
   SEE ✓  only events of the next 14 days, soonest first, each with date, name, guests and stage; the far one is not listed; a legacy event shows the «ישן» tag; the row opens that event
   FAIL ✗ a far or past event listed, a near one missing, or a lost («לא נסגר») event listed
110. Staff see no money [447]
   WHERE  the same area, signed in as staff of the same business
   DO     sign out, sign in as staff, open the dashboard
   SEE ✓  only «אירועים לפי שלב» and «אירועים קרובים»; no period pills, no cards, no revenue, profit or accuracy
   FAIL ✗ any money card, profit percent or the period pills show
111. A new business starts at zero [447]
   WHERE  the dashboard of a brand-new business (sign up a new owner)
   DO     open the dashboard
   SEE ✓  zeros on the cards, «—» with «יופיע אחרי סגירת אירוע ראשון» on the accuracy card, and a button «צור פנייה ראשונה» that opens the library with the new-inquiry form
   FAIL ✗ errors, "NaN", or the button does nothing
112. The old cards stay, without zig-zags, and the phone fits [447]
   WHERE  below «ביצועים», then a window under 768 px
   DO     look at the four old cards (products, recipes, low stock, unapproved), then narrow the window
   SEE ✓  the four cards show numbers with no zig-zag line; at phone width the five new cards sit two per row, funnel bars and period pills fit, no sideways scroll
   FAIL ✗ a zig-zag line, a card cut off, or sideways scroll

▸ Platform dashboard — /platform (platform admin login)   (cards 113–117)
113. The table lists every business [448]
   WHERE  header link «דאשבורד מערכת», page /platform
   DO     log in as your platform admin account and click it
   SEE ✓  one row per test business; events and last activity match what you know; sorted by «פעילות אחרונה», newest first
   FAIL ✗ link missing, empty table, or clearly wrong numbers
114. Sorting and idle colours [448]
   WHERE  table header on /platform
   DO     click «מספר אירועים», then again
   SEE ✓  sorted, then reversed; a business idle over 7 days is yellow, over 14 days red, each with a small «לא פעיל» text
   FAIL ✗ no sorting, or colours missing
115. Internal business left out of totals [448]
   WHERE  «פנימי» checkbox in your own business row; the totals line under the table
   DO     tick «פנימי» on your own business, reload
   SEE ✓  the totals line drops that business's numbers; after reload the box is still ticked
   FAIL ✗ totals unchanged, or the tick is lost on reload
116. Owner cannot reach the screen [448]
   WHERE  header and URL bar, as a normal business owner
   DO     look at the header, then type /platform in the address bar
   SEE ✓  no «דאשבורד מערכת» link; /platform sends you to the dashboard
   FAIL ✗ link visible or the table opens
117. Table scrolls inside its box on a phone [448]
   WHERE  /platform at 620 px or less
   DO     swipe the table sideways
   SEE ✓  the table scrolls inside its own box, the business-name column stays fixed, the page does not scroll sideways
   FAIL ✗ the whole page scrolls sideways or the name column moves

▸ Settings, Team tab, again — /settings?tab=team   (card 118)
118. Owner removes the cook [428]
   WHERE  as the owner (desktop), the `cook1` row. Setup: the cook's recipe and product from the earlier checks exist.
   DO     press the trash button on `cook1` and confirm; then in the other (private) window log out `cook1` and try to log in again as `cook1` / `cook12345`
   SEE ✓  «חבר הצוות הוסר» and `cook1` gone from the list; the other window's login is refused with «המשתמש הוסר מהעסק – פנה לבעל העסק»; the owner still sees the recipe `cook1` created
   FAIL ✗ `cook1` still listed, `cook1` can log in, or the recipe `cook1` made is gone

▸ Inventory, second visit — /inventory   (card 119)
119. Deleting a used product warns after a reload [420]
   WHERE  the product list. Setup: a product that exactly one recipe uses (note the recipe name).
   DO     press F5 on /inventory, then delete that product
   SEE ✓  the warning says «בשימוש ב-1 מתכונים/מנות»; after confirming, the recipe opens without that ingredient row
   FAIL ✗ the plain «האם אתה בטוח שברצונך למחוק חומר גלם זה?» appears, or the recipe still lists the ingredient

▸ Unknown link — /does-not-exist   (card 120)
120. An unknown link lands on the dashboard [420]
   WHERE  address bar
   DO     open /does-not-exist
   SEE ✓  the dashboard opens and the address bar shows /dashboard
   FAIL ✗ empty page, or the address stays /does-not-exist

▸ Outside the app — a terminal in the repo, and the nightly report   (cards 121–123)
121. Nightly QA report is clean [420]
   WHERE  the next nightly `pre-qa.md` after the merge
   DO     search it for CODE-SWEEP-191 and CODE-SWEEP-192
   SEE ✓  neither line is present
   FAIL ✗  either line is present
122. Review the old data (reads production, so only you) [423]
   WHERE  a terminal in the repo (see section 2c)
   DO     `node server/scripts/check-unit-weights.js --target=atlas`
   SEE ✓  three sections with counts; review each `uom differs` and `copied from shared` line and decide before merge
   FAIL ✗ the script errors (exit 2)
123. Atlas dry run for migration 0006 read and approved [424]
   WHERE  the output of the 0006 dry run (section 2c, no page)
   DO     read the user list (each user → «העסק של <name>»), the docs per collection and the ORPHAN lines; reply `go 0006`
   SEE ✓  every real user listed once, orphans only leftover test users, counts look like your real data
   FAIL ✗ a real user missing, or ORPHAN lines name a user you recognise

▸ Production, after the merge to main and the Render deploy   (cards 124–127)
124. Same numbers and screens after the Atlas apply [424]
   WHERE  https://wdd-coder.github.io/foodVibe1.0/dashboard, then the recipe book, inventory and menu library. Setup: before the apply, write down the four dashboard numbers.
   DO     after the apply, sign out and sign in again on phone and on desktop
   SEE ✓  the same four dashboard numbers; recipe book, inventory and menu library look exactly as before
   FAIL ✗ a number changed, a list is empty, or sign-in fails
125. Same numbers and screens after the deploy [425]
   WHERE  the same dashboard, then Settings tab «metadata» (AI model list and user list). Setup: four numbers written down after the 0006 re-run.
   DO     after the deploy sign in on phone and desktop
   SEE ✓  the same four numbers; the AI model list and user list still open for you
   FAIL ✗ a number changed, a list is empty, sign-in fails, or the metadata tab shows «Admin access required»
126. Default stations on production [436]
   WHERE  the production app, /dashboard?tab=metadata, section «תחנות עבודה»
   DO     open the section after the deploy finished
   SEE ✓  חם, קר, מאפה, קינוחים, הגשה are listed
   FAIL ✗ the section is empty
127. The installed app is called FoodVibe and the new screens fit a phone [431]
   WHERE  Android Chrome or iPhone Safari on the deployed build (not the dev server)
   DO     remove the old icon, add the site to the home screen again, then on a 360 px screen open «הגדרות» → «פרטי פתיחה» and the dashboard card
   SEE ✓  the icon is named «FoodVibe»; the form and the card fit the width with no sideways scroll
   FAIL ✗ the name is still foodVibe1.0, or the page scrolls sideways

Not cards but still yours: plan 440's two Atlas items (review the 0007 dry run and reply `go 0007`; then its verify) and plan 442's two (review the 0008 dry run and reply `go 0008`; then its verify). They are in section 2c.

## 7. Security

- Finding #1 (locked taxonomy kind could be changed through `eventType` / `menuType` / `station` by staff): closed by plan 449. Changing a term's kind is rejected with 400 before any permission check, and `authorizeEdit` also treats a write as `editTaxonomy` when the stored or resulting kind is locked. Plan 442's builder had found the kind-change refusal already in place and added a test.
- Finding #2 (`moneySignature` ignored zero and empty values, so staff could move a price between supplier rows): closed by plan 449. Money values are compared per row key (`sources[].supplierId`, `purchaseOptions[].unitSymbol`, `closing.suppliers[].supplierId`), order ignored, with server tests.
- Finding #3, HIGH (staff could replace or wipe a whole collection through replace-all `PUT /:type`): closed by plan 449. The route is owner-only (`editSettings`), and server-owned event fields are stripped per document.
- All three are closed by 449; re-verification by a fresh security review has not been done.
- Raised and still open or unverified: (1) after 449, a staff version-history trim gets 403, and whether the client tolerates it is not verified; (2) staff can still send `planSnapshot` through the generic PUT of an event they created (446), because it is not listed as a money field; (3) leave-guard and approve-stamp saves on another member's recipe are not blocked in the UI (428), only by the server; (4) staff cannot link suppliers to products (427), which is a restriction, not a hole.
- Raised and fixed along the way: staff zero-price saves compared wrongly (428 round 4); a login for a removed staff member returns `USER_REMOVED` (403 on login, 401 on refresh); the old `requireAdmin` alias and the `role` fallback were removed so only `isPlatformAdmin === true` grants platform rights (425); cross-business access has 41 server tests across all 11 entity types (425); old access tokens without a business get one 401 and refresh silently (425).
- No secrets were read, printed or written for this report; the only credentials in the cards are the throwaway test cook `cook1` / `cook12345` from plan 428's card.

## 8. Environment notes

- The C: disk filled once (0 bytes free). Plans 435 and 439 were parked, then retried and merged. The run files for 435 and 440 also record two merge-step failures that came from a dirty `foodVibe1.0-mvp` worktree (leftover plan 439 changes, `git reset --hard` denied); the branches themselves were fine and no code changed.
- The local MongoDB Windows service stopped (it needs an administrator restart, `Start-Service MongoDB`). Server tests used the in-memory Mongo and passed throughout (`npm --prefix server test`: up to 643 tests in 53 files at the end). Migration rehearsals used throwaway `mongod` instances on ports 27098, 27099, 27903, 27904 and in-memory databases.
- Free space at the time of writing: 21 GB on C:.
- Run-mode rules held: no writes to `main`, no Atlas writes, `[human]` items never self-marked.

## 9. After the MVP

The reuse-refactor plans 450 to 458 are saved on `main`. They run only after `mvp` is merged into `main`. Suggested order: 450; then 451 and 453 in parallel; then 454 and 457 in parallel; then 452; 456; 455; 458 last.
