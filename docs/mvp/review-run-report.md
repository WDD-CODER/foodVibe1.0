> Update 2026-10-22: rerun of 451, 461 — both merged into `mvp-review`; all 31 of their browser cards passed, so no new checks for you.

# MVP review run — final report for Dandan

Written 2026-10-22 from the orchestrator's results, every `docs/mvp/runs/<plan>.md` on `origin/mvp-review` and the merge log of `origin/mvp-review`. Nothing reached `main` or `mvp`, and nothing was written to Atlas.

## 1. Result

- **26 plans merged** into `mvp-review` (451 and 461 merged on the 2026-10-22 rerun), **0 parked**, **0 stopped** by environment trouble. Plans 471 and 473 were parked before the run started, as agreed.
- Browser agents ran 199 validation cards: 185 passed, 2 failed, 12 were unsure. The two failures (457 card 15, 468 card 4) are small look-and-feel defects in merged plans, not broken features.
- **What you must do:** walk the 14 cards in section 5 (about 15 minutes), then do the final-gate steps in section 6 before `mvp-review` goes to `main`.

## 2. Plans

| Plan | Title | Status | Fix rounds | What changed for the chef |
| --- | --- | --- | --- | --- |
| 450 | Reuse layer: component registry and checks | merged | 2 | Nothing on screen. Agents now get a list of shared pieces to reuse instead of copying code. |
| 451 | One shared shell for every popup | merged (rerun) | 3 | Every popup closes with Escape (only the top one when two are open), keeps Tab inside, and ignores Escape while an AI request is sending. The two export windows are unchanged. |
| 452 | One shared search box for seven search dropdowns | merged | 2 | Event type, section, dish, ingredient, preparation and tool searches all behave the same way with keyboard and mouse. |
| 453 | Shared list search, sort and clear | merged | 2 | Lists (suppliers, inventory, recipes, equipment, venues, menus) search the same way and ignore Hebrew spelling variants. Venue cards sit in the shared list frame. |
| 454 | One data-service base | merged | 1 | Nothing visible. Saving, loading and the new-unit window run on one shared path. |
| 455 | One form field and one unsaved-changes check | merged | 1 | Forms look the same; the "leave without saving?" question now appears only when something really changed. |
| 456 | One way to show messages and errors | merged | 1 | Every message comes from the dictionary and every error is logged first. Wording is unchanged. |
| 457 | One chip engine for all chips and pills | merged | 3 | Chips and pills across the app share one style; a few sizes may look slightly different. |
| 458 | Code follows the hard rules again | merged | 2 | Nothing visible. Some leftover English/hard-coded texts now come from the dictionary. |
| 459 | Dropdown lists click reliably and sit on top | merged | 3 | A dropdown list is no longer hidden behind the next panel, a slow click still picks, and Space types in the dish search. |
| 460 | Popovers, number boxes, paste boxes, leave guard | merged | 3 | The «חלקי» popover stays on screen, number boxes select their value on tap, paste boxes grow with the text. |
| 461 | Product form: purchase-unit row and new-unit window | merged (rerun) | 1 | The new purchase-unit row shows only the unit at first, the quantity box is wide enough and lines up on a phone, the new-unit window starts with an empty quantity, and a duplicate product name is refused with a clear message. |
| 462 | One clear status mark on each inventory row | merged | 3 | Each product row shows one mark (red or amber) with one box explaining what is missing. |
| 463 | Link pasted ingredient names to existing products | merged | 1 | Pasted ingredients link to products you already have, with AI help for misspellings. |
| 464 | Fix the product import page | merged | 1 | Import recognises misspelled products, shows the old price, handles messy lists and asks before you leave. |
| 465 | Import products from a photo of a receipt | merged | n/a | New «צלם קבלה» / «העלה תמונה» buttons read a receipt photo into the import table. |
| 466 | Fix unlinked and deleted ingredients from the «חלקי» popover | merged | n/a | You can link or create the missing product right inside the popover, on the recipe or the menu. |
| 467 | New-inquiry form, deposit step, phone stage bar | merged | n/a | The date is typed as day/month/year, moving to «מקדמה שולמה» asks for the deposit, the stage bar scrolls on a phone. |
| 468 | Tidy the metadata manager on phones | merged | 3 | Even margins on a phone, rename has Save/Cancel buttons, the users card keeps its trash icon inside. |
| 469 | Centre settings, banner instead of redirect, setup counter | merged | 3 | Settings are centred; owners see a banner instead of being sent away; the setup card counts priced products up to 5. |
| 470 | Portion numbers, phone dish row, partial tags | merged | 2 | No more 110.00000000000001; the dish row fits a phone; «חלקי» says why. |
| 472 | Business name optional at sign-up | merged | n/a | Sign-up works without a business name; the owner can rename it in Settings. |
| 474 | One way in to add a recipe, with clear tabs | merged | n/a | The add-recipe window has clear tabs: describe, paste, photo, link. |
| 475 | Rename a measurement unit everywhere | merged | n/a | Renaming a unit updates it everywhere with costs unchanged; a name clash gets a clear message. |
| 476 | Staff open others' recipes in Cook View only | merged | n/a | Staff open other people's recipes and dishes read-only in Cook View. |
| 477 | Owner chooses which event stages staff see | merged | n/a | A new owner card picks the stages staff can see; hidden events show "not available". |

"n/a": the fix-round count for this plan was cut off in the data given to this report; the round history is in its run file.

## 3. Parked plans

None left. Both plans parked in the first pass merged on the 2026-10-22 rerun:

**451 — one shared popup shell (merged, 3 fix rounds).** The two export windows (menu export sheet and recipe export preview) stay as they were; the Planner moved them to parked plan 471. The first browser round found that Escape closed both popups when two were open; the fix was re-run in the browser and all 23 cards passed. Escape on a popup with typed, unsaved text closes it without asking. The full test run has 9 failures, all already on `mvp-review` or passing when run alone.
- **Next step:** nothing for this plan. Decide later whether to un-park 471 for the two export windows.

**461 — product form purchase-unit row and new-unit window (merged, 1 fix round).** The 2 extra lines in the growth-frozen file were removed (net change 0). In the new-unit window the quantity starts empty only when opened from the product form; elsewhere it still starts at 1. The server still accepts duplicate product names that arrive by other paths (left for a later plan). All 8 browser cards passed.
- **Next step:** nothing for this plan.

## 4. Decisions the agents took on their own

Only those that change what a chef sees or what you must decide:

- **Still open for you (458):** 58 stylesheets were left outside CSS layers because moving them could change the look. Decide later whether to do them.
- **Still open for you (452):** the product form's chip picker was marked "old, do not copy" instead of being replaced (the plan's Critical Question 1).
- **452:** in every search list, Tab now closes the list, the "add" row is the same colour everywhere, and the recipe-book ingredient list opens right under its search box.
- **453:** list searches now ignore Hebrew spelling variants. The menu library, trash and metadata manager were not moved into the shared list frame, because that would change their look.
- **455:** a "name already exists" error and a "required" error now show one at a time in the same place.
- **457:** chip sizes and corners were taken from the most common existing values, so a few chips look slightly different. Some special chips (coloured labels, removable chips) were left as they were.
- **462:** an inventory row shows red when the name or unit is missing and amber otherwise; the low-stock badge stays separate.
- **463:** when the AI finds no product for a name, no message shows; a warning shows only when the AI call itself fails.
- **465:** a receipt line without a readable number gets no price and is flagged for you to fill in. The photo is never stored.
- **466:** a deleted ingredient is only explained, with no fix button. Linking a name fixes it in every recipe that uses that name.
- **467:** the deposit amount must be above 0. If saving the deposit fails, the event still moves to the new stage and you can type the amount in «פרטי לקוח».
- **469:** the setup card's goal is now 5 priced products (it was 10). «דלג» on the banner keeps you on the dashboard.
- **476:** when staff tap the builder chip on someone else's recipe, they get a new empty recipe.
- **477:** if the owner unticks every stage, staff see only events they created themselves.

## 5. HOW TO VALIDATE — 14 checks on 9 pages · reply: done | not yet | failed: <numbers>

These are only the cards the browser agents could not settle. Start the app first in PowerShell:

```
cd "C:\coding projects\Cursor\foodVibe1.0-mvp-review"
node scripts/slot-serve.mjs
```

Stop the dev server of the main checkout first if it is running, because it uses the same port 4200. Log in as the local owner from `C:\coding projects\Cursor\mvp-review-evidence\accounts.json`. If a page with an id does not open, open any item of that kind from its list.

```text
HOW TO VALIDATE — 14 checks on 9 pages · reply: done | not yet | failed: <numbers>

▸ Menu builder — http://localhost:4200/menu-intelligence   (check ①)
① The event type list picks with Enter
   WHY     The event type list now uses the shared search box; the agent's script pressed one arrow too many.
   WHERE   The small grey event-type label above the menu title.
   DO      Click the label, type "פר", then press Enter (no arrow key).
   SEE ✓   "פרטי" is highlighted as you type; Enter picks it, the list closes and the label reads "פרטי".
   FAIL ✗  Enter opens the "add new type" window or picks nothing.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\452\r2-1.png

▸ Event screen — http://localhost:4200/menu-intelligence/8199a345-b60d-4285-990f-43eb61fb5a3d   (check ②)
② The stage pills look like pills
   WHY     Plan 467 put the stage bar in a scroll rail; the agent saw the pills drawn as bare text with no highlight.
   WHERE   The row of stages at the top of the event.
   DO      Look at the row of stages.
   SEE ✓   Each stage is a rounded pill, the current stage is highlighted and «לא נסגר» is red.
   FAIL ✗  The stages are plain dark text with no box and no highlight (the agent expects this; reply failed: 2 and it becomes a fix plan).
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\467\r3-5.png

▸ Recipe builder — http://localhost:4200/recipe-builder/2a5e9f04-e996-44da-9e15-638bb3a2f656   (checks ③–④)
③ The recipe export preview shows the date at the top
   WHY     The card expected the export date at the bottom; the recipe sheet shows it at the top, which the agent thinks is correct.
   WHERE   The round flame button at the bottom corner.
   DO      Click the flame button, then «ייצוא», «ייצוא פרטי מתכון», «תצוגה».
   SEE ✓   A «תצוגה מקדימה» panel opens with the recipe name and a line «תאריך <date>» near the top. If that is fine with you, the check passes.
   FAIL ✗  Nothing opens, the panel is empty, or you want the date at the bottom.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\450\r2-2.png
④ The allergen chip in the quick-add product window turns white when picked
   WHY     Plan 457 moved all chips to one style; in this window the picked chip kept grey text.
   WHERE   In «אינדקס מרכיבים», type a name that is not a product, choose the add option; in the window open «פרטים נוספים».
   DO      Click the allergen chip «ביצים».
   SEE ✓   The chip fills teal with white text.
   FAIL ✗  The chip fills teal but its text stays grey (the agent saw this; reply failed: 4 if it bothers you).
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\457\r3-15d.png

▸ New product — http://localhost:4200/inventory/add   (check ⑤)
⑤ A slow click on a supplier still picks it
   WHY     Plan 459 stopped lists from closing before a slow click lands; the agent's browser cannot hold the mouse down.
   WHERE   The «ספק» box.
   DO      Open the box, press and hold the mouse on a supplier for about one second, then let go.
   SEE ✓   The list closes and the box shows the supplier you pressed.
   FAIL ✗  The list just closes and nothing is chosen.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\459\r3-2-held.png

▸ Product import — http://localhost:4200/inventory/import   (check ⑥)
⑥ A test product is linked to your existing tomato — is that what you want?
   WHY     Plan 464 reads messy lists correctly, but the AI then linked «עגבניה ניסיון» to the existing «עגבניה».
   WHERE   The big paste box.
   DO      Paste: עגבניה ניסיון 1 קילו 1 עוהל 50 שח   then press «נתח» and wait a few seconds.
   SEE ✓   One row, price 50, no «עוהל» anywhere, no red error. Whether it shows «חדש» or «קיים – עדכן מחיר» (linked to «עגבניה»), the result is acceptable to you.
   FAIL ✗  «עוהל» shows as a unit or in the name, a red error shows, or you do not want this kind of AI link.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\464\r1-1c.png

▸ Inventory list — http://localhost:4200/inventory/list   (check ⑦)
⑦ The red status box has red chips
   WHY     The agent saw the amber box but could not make a product with a missing name or unit, because the forms refuse it.
   WHERE   A row with a red mark next to its name.
   SETUP   Only if such a row exists; otherwise reply "skip 7".
   DO      Hover or tap the red mark.
   SEE ✓   A box opens with small chips in red text on a pale red background.
   FAIL ✗  No box, or the chips have no colour.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\457\r3-28.png

▸ Metadata manager — http://localhost:4200/dashboard?tab=metadata   (checks ⑧–⑨)
⑧ The section chips glide to the middle
   WHY     Plan 468 makes the tapped chip slide to the middle of the chip bar; the agent saw it jump instead of glide.
   WHERE   The chip bar under the header, with the window narrowed to phone width (about 375 px).
   DO      Swipe the chip bar to the end and tap the last chip.
   SEE ✓   The page scrolls to that card and the chip slides smoothly to the middle.
   FAIL ✗  The chip jumps in one step (the agent expects this; reply failed: 8 if it bothers you).
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\468\r3-4-mid-chip-jump.png
⑨ The AI model on/off chips
   WHY     Plan 457 restyled these chips; only a platform admin sees the «מודלי AI» card.
   WHERE   The «מודלי AI» card.
   SETUP   Sign out and reload the page: the local app signs you in as "Guest Admin".
   DO      Click a model's chip twice, then look at a model marked "removed".
   SEE ✓   The chip turns teal, then pale again; the removed model is faded and does nothing when clicked.
   FAIL ✗  The removed model looks active or changes when clicked.

▸ Menu with a deleted ingredient — http://localhost:4200/menu-intelligence/b348b8eb-cc35-4340-a1c7-f00965d9a1d1   (check ⑩)
⑩ A deleted product is explained on the menu
   WHY     Plan 466 explains deleted ingredients. A recipe can never show one, because deleting a product removes it from recipes, so the agent checked it on the menu.
   WHERE   The «חלקי» chip on a dish row.
   DO      Click the «חלקי» chip.
   SEE ✓   A row with the tag «נמחק» and the text «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.», with no button. Showing this only on the menu is acceptable to you.
   FAIL ✗  No explanation, or you want it on the recipe page too.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\466\r3-3-deleted-row-in-menu.png

▸ Outside the app — your phone, through the remote link (type "open remote" in chat)   (checks ⑪–⑬)
⑪ Number boxes replace their value on a phone
   WHY     Plan 460 selects a number box's value on tap; only a real touch screen proves it.
   WHERE   /dashboard?tab=metadata, the «מקדמים» section (the agent's card said /settings by mistake).
   DO      Tap a coefficient box that shows 1.5 and type 2.
   SEE ✓   The box reads 2.
   FAIL ✗  The box reads 1.52 or 21.5.
⑫ Read a real receipt with the phone camera
   WHY     Plan 465 is new: the agent used a rendered receipt, not a real camera and paper.
   WHERE   /inventory/import.
   SETUP   A paper supplier receipt with at least 5 lines.
   DO      Tap «צלם קבלה» and photograph the receipt.
   SEE ✓   Within about 10 seconds a row per product line appears, a line like "2 x 5.00" shows price 5, and the note «נקרא מתמונה – בדקו כל שורה לפני השמירה» is above the table.
   FAIL ✗  A red error, no rows, or prices equal to the line totals.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\465\r2-1a-phone.png
⑬ The calendar button in the new-inquiry window
   WHY     Plan 467 made the date typeable; the agent's browser cannot draw the phone's calendar.
   WHERE   /menu-library?new=inquiry, the «תאריך» field.
   DO      Tap the small calendar button next to the date and pick a day.
   SEE ✓   A calendar opens, and the field then shows that day as dd/mm/yyyy.
   FAIL ✗  Nothing opens, or the date shows as mm/dd/yyyy.
   SHOT    C:\coding projects\Cursor\mvp-review-evidence\467\r3-2a.png

▸ Outside the app — the file docs/brain/component-families.md on branch mvp-review (GitHub or any editor)   (check ⑭)
⑭ The shared-pieces list names the right piece for each job
   WHY     Agents will now be told "use this piece" from this list; only you know if a family points at the wrong one.
   WHERE   Each "###" block: its "Use:" line.
   DO      Read the 22 families.
   SEE ✓   Every "Use:" line names the piece you would want reused; reply "approved registry".
   FAIL ✗  A family points at the wrong or a dead piece; reply with its name and the right piece.
```

## 6. Before `mvp-review` can go to `main`

1. **No new Atlas migration.** Every one of the 26 merged run files says "no data, schema or migration change" under "Final gate — Atlas".
2. **The open migrations from the first MVP run still apply**, because `mvp-review` contains `mvp`: 0006 (business tenant), 0007 (coefficients) and 0008 (event stages), in that order, each with backup → dry run → your `go <number>` → write → verify. The steps are in `docs/mvp/final-report.md` section 2(c).
3. **Optional read-only check (475):** count purchase units whose unit is not a known unit. The `mongosh` query is in `docs/mvp/runs/475.md` under "Final gate — Atlas". It writes nothing.
4. **Deferred log checks:** plans 451, 461, 462, 464, 466 and 469 could not run their error-log check because local MongoDB was down. After you walk the cards, run `node scripts/log-query.mjs --since=2h --level=error`; expect no new errors from these pages.
5. **Known test failures that were already there before this run:** `code-qa-api.test.mjs` (fixture schema), the `v2-types upgradeV1toV2` spec, and flaky `RowActionsMenu`, `ProductForm` and `HeaderComponent` specs. No plan made them worse.
6. **Small leftovers the agents found (not blocking):** the add-option icon `assets/images/add_ingrediant.png` is missing (404), and the log event `product_name_match.ai_failed` is rejected by the server log (needs a camelCase name, like the 465 fix).
7. Then merge `mvp-review` into `main`. That merge is yours.

## 7. Evidence

- Screenshots for each plan are in `C:\coding projects\Cursor\mvp-review-evidence\<plan>\`, and each run file's "UI validation" section names the file for every card.
- Cards: 199 run by the browser agents; 185 passed, 2 failed (457 card 15, 468 card 4), 12 unsure. The 14 non-passing cards are section 5.
- Final sweep (checked in the run journal on 2026-10-22): 193 cards re-run after all merges; 179 passed, 2 failed (the same two look defects, 457 card 15 and 468 card 4), the rest unsure. No regressions. Screenshots in `C:ding projectsCursormvp-review-evidenceinal`.
- Rerun 2026-10-22: 31 more cards (451: 23, 461: 8), all 31 passed; screenshots in the same `451` and `461` folders.
- Merged list checked with `git log origin/mvp-review --merges`: 26 plan merges (450–470, 472, 474–477).

Model: claude-opus-5-5

## 8. After the run — slow loading and duplicate suppliers (2026-10-22)

- **Cause (local database only):** the local shared supplier list (`__master__`) held each of its 38 suppliers 5 times since 2026-10-01, before this run. Every new business copied all of them. The run also created 9 extra test businesses (about 129,000 records), which made local pages slow.
- **Local cleanup (done):** 9 test businesses, 11 test users and 129,340 records deleted; the shared supplier list cut from 187 to 38, and 3,729 shared products pointed at the kept supplier. The test accounts in `accounts.json` were kept. Guest Admin and QA Review Kitchen still carry their old 5× copies.
- **Atlas (read-only check, nothing written):** 152 suppliers and 5,900 products. The shared list and each of the 3 user accounts have 38 suppliers with 38 different names. Atlas has no duplicate suppliers, so the final Atlas gate needs no supplier cleanup first.
