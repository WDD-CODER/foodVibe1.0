# mvp-qa-fixes — run report (2026-10-24)

> **Update 2026-10-24:** plan 490 was rerun. The checker found one major problem and it was fixed (`e3d6989f`); the second check was clean. 490 is merged (`4cbd65fd`) with **no browser pass**: Dandan runs the UI checks himself from now on. Its cards are in `docs/mvp/runs/490.md` → "## Human checks". Cards 1, 2 and 5 need the AI key, so check them on a deployment that has it. Plan 492 also got a security follow-up (`8a17df64`): a removed cook's wrong passwords now count toward the 5-try lockout, and a locked removed name gets the normal wrong-login answer. Head is now `4cbd65fd`: **14 of 14 plans merged.**

## 1. Result
- **13 plans merged** into `mvp-qa-fixes`, **0 parked or rejected**, **1 stopped by the test environment** (plan 490, AI ingredient paste). Head of the branch: `5e8980bf`.
- Agents replayed 58 of the 62 hand checks in a real browser and all 58 passed. None failed. 4 are marked unsure because a headless browser can't do them: a real finger tap, a script only you may run, and one card whose wording is wrong.
- **What you need to do:** run the 62 checks in section 5 on http://localhost:4201 (wt-1 is serving `mvp-qa-fixes`). Start with the 4 unsure ones: ⑧, ⑳, ⑰ and ㉓. Then reply `done` / `failed: <numbers>`, and tell me whether plan 490 gets another checker pass (section 3). After that, do the Atlas step in section 6.

## 2. What changed, per report item
Counts come from `git log origin/mvp-qa-fixes --merges` (13 lines) and the run data.

| Report item | Plan | Status | Fix rounds | What changed for the chef |
| --- | --- | --- | --- | --- |
| 5 Deleted ingredient row (check 10) | 481 | merged | 2 | The partial-cost window shows a deleted product as a clear row: a red icon, a «נמחק» pill and a note. On a phone the window now ends above the bottom menu, and on desktop «חלקי», the price and the bin no longer overlap. |
| 6 Desktop number boxes + coefficients (11) | 482 | merged | 1 | Number boxes have no up/down arrows, and one click selects the whole value. Coefficients save only when you press «שמור». Leaving with unsaved changes asks first. |
| 7 Calendar button rollback (13) | 483 | merged | 1 | The small calendar button is gone. On a phone, a tap anywhere on the date field opens the date picker. |
| 10 Delete business: type the name (14) | 486 | merged | 1 | The final «הסר» stays locked until the exact business name is typed. |
| 8 Pricing bar (92–95) | 487 | merged | 1 | The target chip now opens and closes the boxes, and turns teal when a target is set. Errors no longer move the boxes. On a phone a coins button opens a pricing sheet. Staff see no prices at all. |
| 9 Event closing dialog (97, 100, 101) | 488 | merged | 2 | The dialog is wider, so «שולם בפועל» fits. Photos are added with a small camera icon. Staff can tick and add photos without seeing any money. On a phone the supplier cards are lighter than the dialog. |
| 11 Import delete row · 12 Import on phones (35, 37) | 489 | merged | 1 | Rows can't be trashed or edited while saving. On a phone each row is a card and the page doesn't scroll sideways. |
| 13 AI ingredient paste (43) | 490 | merged (rerun, no browser pass) | 2 | Pasted lines match existing products first and offer options for unclear names. «לא מוכן» no longer saves a product. |
| 14 Station picker on phones (45) | 491 | merged | 1 | On a phone, «סוג מנה» and «תחנה» each get their own full-width line inside the card. |
| 15 Deleted staff frees the username (50/118) | 492 | merged | 1 | A removed cook's username can be given to a new cook. The removed cook still gets the friendly refusal at login. |
| 17 Close event from the stage bar (60) | 493 | merged | 1 | The owner can click «הסתיים» and confirm in a popup. The dashboard still counts the event once. Staff stay locked. |
| 16 Page background · 18 Notes padding (65) | 494 | merged | 1 | The event screen shows the app's background glow. At 770–1030 px the last note is no longer hidden behind the price bar. |
| 19 Coefficient back to default (66) | 495 | merged | 1 | Typing the default coefficient back removes «שונה ידנית», and the dish follows the event type again. |
| 20 One empty dish row per category | 496 | merged | 1 | «הוסף מנה» never opens a second empty search row. Empty rows are not printed. |

## 3. Stopped plan
**Plan 490 — pasted ingredient lines match existing products first; «לא מוכן» never saves** (branch `feat/490-pasted-ingredient-lines-match-existing-products`, `eaee1d3d`).
- **Why it stopped:** the checker's full server test run had 12 failures, all in `auth-business.test.js` and all `MongoNetworkError: read ECONNRESET`. That is the in-memory test database dropping connections under load. When the affected files were run on their own, 33 of 33 tests passed. The builder's own runs were green: 753 of 753 server tests and 89 of 89 client specs. Nothing points at the code, but the run never re-checked it, never browser-checked it and never merged it.
- **Also open:** cards 1, 2 and 5 need a working Gemini step. Locally the AI match returns 502 because there is no key, so those cards can only come out "unsure" on this PC.
- **Recommended next step:** re-run the checker for plan 490 alone, with the server tests run one file at a time. Then do a browser pass of cards 3 and 4 (no AI needed) and merge into `mvp-qa-fixes`. Cards 1, 2 and 5 should be checked against a deployment that has the AI key.
- **Other option:** leave 490 out of this release and ship the 13 merged plans first.

## 4. Decisions agents took on their own
- **492, removed cook:** the record is kept and only its username is freed. The old name moves to a hidden field and the login name becomes `<name>~removed~<id>`. The report asked for a "DB cleanup", but this gives the same result (the name is reusable) without losing who created what. Admin user lists will show that placeholder name for removed cooks. Cooks removed before this fix stay blocked until the one-off script in section 6 runs.
- **489, import (planner root cause):** the code already left a deleted row out of the save. The planner thinks the reported failure came from test data: «גזר» and «פטרוזיליה» already existed from an earlier check. The one real hole was trashing a row *during* the save, so the fix locks the rows while saving and fixes the phone layout.
- **493, closing from the stage bar:** when an event is closed this way, the server now saves the planned menu. Without that, the dashboard revenue for the event would drop to 0 and the closing would have no supplier rows. The closing dialog doesn't open by itself afterwards.
- **487, staff:** staff now see no meter, no ₪ price box and no food-cost fields. The dish sell price is hidden from staff too. On a phone the bar is gone (it sat behind the bottom menu) and a coins button opens a sheet instead.
- **488, staff on an old copy of the dialog:** the server only *adds* ticks and photos from a staff member's older copy, so the owner's newer amounts and ticks are kept. The trade-off is that a staff member who unticks or removes a photo on an outdated copy is not saved, and the dialog quietly refreshes.
- **482, leave warning:** the same «שמור» flow is used on phones. The warning shows for a click outside the card, a dashboard tab switch, leaving the page, and reload or closing the tab. The "stay" button is the existing «ביטול», not «הישאר».
- **486:** the typed name is compared after trimming spaces, and otherwise must match exactly. The app now decides "owner" the same way the server does.
- **495:** a menu saved *before* this fix, with the default typed in, keeps that number. It shows as manual again after a later event-type change. This was accepted as out of scope.
- **496:** a second «הוסף מנה» click keeps any text already typed in the open empty row.
- **483:** on a phone the real date picker covers the whole field. Clearing the date in the picker now empties the field.

**Problems agents saw but did not fix (outside scope):**
- With a target of 100%, the minimum price shows «₪-∞» on desktop and «₪NaN» in the phone sheet (seen in 487).
- At 770 px the flame button overlaps the left part of the «יעד לאירוע זה» chip, so a normal click on the chip is blocked (seen in 494).
- In the phone pricing sheet the verdict shows twice (seen in 487).

## 5. HOW TO VALIDATE
Accounts are in `C:\coding projects\Cursor\mvp-review-evidence\accounts.json`. The local owner is `qareview-owner6714` and the local staff account is `qareview-cook2367`. Desktop is 1440 px unless a card says otherwise. Ids are real records in the local DB. Agent verdicts come from the per-plan browser rounds, and screenshots are under `C:\coding projects\Cursor\mvp-review-evidence\qa\<plan>\`.

```text
HOW TO VALIDATE — 62 checks on 17 pages · reply: done | not yet | failed: <numbers>

▸ Dashboard, metadata tab (owner) — http://localhost:4201/dashboard?tab=metadata, card «מקדמים»   (checks ①–⑧)
① No arrows, click selects all, typing doesn't save — plan 482 · agent: pass
   WHY     Item 6: coefficients used to save on every keystroke and had arrows.
   WHERE   «סוגי אירוע» list, the box of the own type «בדיקה 482» (has a bin icon).
   DO      Hover the box, click once in the middle, type 1.25.
   SEE ✓   No arrows; the whole number is highlighted and becomes 1.25; «יש שינויים שלא נשמרו», «ביטול» and an active «שמור» show; no «עודכן בהצלחה» toast.
   FAIL ✗  Arrows, a caret instead of a selection, 11.25, a toast, or «שמור» stays grey.
   SHOT    qa\482\r1-1.png
② «שמור» saves once and survives a reload — 482 · agent: pass
   DO      Click «שמור», reload, open «מקדמים» again.
   SEE ✓   Exactly one «עודכן בהצלחה»; the hint and «ביטול» disappear; after reload the box shows 1.25.
   FAIL ✗  No toast or two toasts, or the old value after reload.
   SHOT    qa\482\r1-2.png
③ A wrong value can't be saved — 482 · agent: pass
   DO      Type 0 in the same box, then click «ביטול».
   SEE ✓   Red «מקדם חייב להיות מספר גדול מ-0 עם עד 2 ספרות אחרי הנקודה», «שמור» grey; «ביטול» puts back 1.25.
   FAIL ✗  «שמור» is active for 0, or «ביטול» doesn't restore 1.25.
   SHOT    qa\482\r1-3a.png, r1-3.png
④ Leaving the card asks first — 482 · agent: pass
   SETUP   Type 1.4 (don't save).
   DO      Click the title of another card («יחידות והמרות»), then «ביטול» in the popup.
   SEE ✓   One popup «יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?» with «ביטול», «יציאה בלי לשמור», «שמור וצא»; after «ביטול» the box still shows 1.4.
   FAIL ✗  No popup, two popups, or the value changes.
   SHOT    qa\482\r1-4.png, r1-4b.png
⑤ Switching dashboard tab asks first — 482 · agent: pass
   DO      With 1.4 unsaved, click «לוח בקרה» in the top menu, then «ביטול».
   SEE ✓   One popup; you stay on «מקדמים», the URL still ends in ?tab=metadata, the box shows 1.4.
   FAIL ✗  The overview opens without asking.
   SHOT    qa\482\r1-5a.png, r1-5.png
⑥ «יציאה בלי לשמור» drops the change — 482 · agent: pass
   DO      Click «מלאי» in the top menu → «יציאה בלי לשמור»; come back to this card.
   SEE ✓   The inventory page opens; back on the card the box shows 1.25, not 1.4.
   FAIL ✗  No popup, you stay on the dashboard, or the box shows 1.4.
   SHOT    qa\482\r1-6a.png, r1-6.png
⑦ «שמור וצא» saves and leaves — 482 · agent: pass
   DO      Type 1.3, click «מלאי» → «שמור וצא»; come back.
   SEE ✓   «עודכן בהצלחה», the inventory page opens, and the box shows 1.3.
   FAIL ✗  You stay, there's no toast, or the box shows 1.25.
   SHOT    qa\482\r1-7a.png, r1-7.png
⑧ Phone: a tap selects all, saving only on «שמור» — 482 · agent: UNSURE (no real touch in the test browser)
   SETUP   A real phone, or a 375 px window.
   DO      Tap the same box, type 1.35, tap «שמור».
   SEE ✓   The tap highlights the whole number; nothing saves before «שמור»; then one toast and the box shows 1.35.
   FAIL ✗  The tap doesn't select, or a toast shows before «שמור».
   SHOT    qa\482\r1-8a.png, r1-8.png

▸ Product form — http://localhost:4201/inventory/edit/cbe049ef-a8f0-41f5-b8e2-b27debe0152c   (check ⑨)
⑨ Product number boxes: no arrows, click selects all — 482 · agent: pass
   WHY     Item 6 covers every number box on desktop.
   WHERE   The price box and «רמת מלאי מינימלית».
   DO      Hover each, click once in the middle of the number.
   SEE ✓   No arrows; the whole number is highlighted.
   FAIL ✗  Arrows, or only a caret.
   SHOT    qa\482\r1-9a.png, r1-9.png

▸ Recipe «טפנד זיתים» — http://localhost:4201/recipe-builder/39bfeb43-1289-47b1-b43c-7284d16f2de9   (check ⑩)
⑩ Ingredient quantity: no arrows, click selects all — 482 · agent: pass
   DO      Click once in the first ingredient's quantity, type 31; put back 30 and leave without saving.
   SEE ✓   No arrows; the value is replaced (31, not 3031).
   FAIL ✗  Arrows, or the digits are appended.
   SHOT    qa\482\r1-10.png

▸ Recipe header — http://localhost:4201/recipe-builder/e6b6c02a-9f52-4fec-88a9-7a971a2e1116   (checks ⑪–⑬)
⑪ Phone: both pickers fit inside the card — 491 · agent: pass
   WHY     Item 14: the «תחנה» picker stuck out past the card on a phone.
   WHERE   The recipe header card, at 390 px and then 375 px.
   DO      Look at «סוג מנה» and «תחנה»; try to swipe sideways.
   SEE ✓   Each picker on its own full-width line inside the card; no sideways scroll.
   FAIL ✗  «תחנה» sticks out past the card edge.
   SHOT    qa\491\r1-1.png, r1-1-card.png
⑫ Phone: the station list still works — 491 · agent: pass
   DO      At 375 px tap «תחנה», tap a station; don't save.
   SEE ✓   The list fits the screen: «כללי», the stations and «הוסף תחנה חדשה» one per line; the box shows the station you tapped.
   FAIL ✗  The list is cut off, or the add option wraps onto two lines.
   SHOT    qa\491\r1-2-list.png, r1-2.png
⑬ Desktop header unchanged — 491 · agent: pass
   DO      At 1440 px look at the header.
   SEE ✓   The pickers sit under their labels, as before.
   FAIL ✗  A picker moved or changed size.
   SHOT    qa\491\r1-3.png

▸ Product import — http://localhost:4201/inventory/import   (checks ⑭–⑰)
⑭ A trashed row is never saved (replays check 35) — 489 · agent: pass
   WHY     Item 11.
   SETUP   Two made-up names that /inventory/list doesn't find (the matcher is fuzzy, so pick nonsense words), NAME1 and NAME2.
   DO      Paste «NAME1 3 לק"ג» and «NAME2 2 ליחידה», «נתח», bin NAME1 straight away, wait until «בודק מול המלאי…» is gone, change NAME2's unit to «גרם», «שמור הכל».
   SEE ✓   «1 נוצרו, 0 עודכנו, 1 דולגו»; the inventory has NAME2 with unit גרם and no NAME1.
   FAIL ✗  NAME1 exists, or the message differs.
   SHOT    qa\489\r1-A.png
⑮ The bin is locked while saving — 489 · agent: pass
   DO      Paste three new names at «4 לק"ג», «נתח», press «שמור הכל» and right away try a row's bin.
   SEE ✓   The bins and boxes are greyed out during the save; «3 נוצרו, 0 עודכנו, 0 דולגו»; all three exist.
   FAIL ✗  A row vanishes during the save.
   SHOT    qa\489\r1-A2.png, r1-A2-end.png
⑯ The page fits a phone (replays check 37) — 489 · agent: pass
   WHY     Item 12.
   DO      At 375 px paste «עגבנייה 5.9 לק"ג» and «שמנת 32% 1 ליטר 12», «נתח», wait, try to swipe sideways; open the last card's unit list; scroll to the bottom.
   SEE ✓   No sideways scroll; each row is a labelled card; the unit list opens fully; «שמור הכל» is clear of the round «+».
   FAIL ✗  Sideways scroll, something cut off, or the list is clipped.
   SHOT    qa\489\r1-B.png
⑰ Desktop import unchanged (checks 33, 34) — 489 · agent: UNSURE (card wording)
   SETUP   Supplier «ירקן» exists (the agent created it). NAME3 is a new name.
   DO      Paste «NAME3 5.9 לק"ג», pick «ירקן», «נתח», «שמור הכל»; then paste «NAME3 6.2 לק"ג», «נתח», «שמור הכל».
   SEE ✓   First: a table (שם · יחידה · מחיר · יחידת רכש · קטגוריה), row «חדש», «1 נוצרו, 0 עודכנו, 0 דולגו». Second: «קיים – עדכן מחיר», the unit as plain text, «0 נוצרו, 1 עודכנו, 0 דולגו»; «שמור הכל» is clickable.
   FAIL ✗  Cards instead of a table, a different message, or «שמור הכל» opens the «+» menu.
   NOTE    The card also said "name not editable". The name *is* editable, on purpose since plan 464, and 489 didn't change that. Tell me if you want it locked.
   SHOT    qa\489\r1-C-1-table.png, r1-C-2-table.png, r1-C.png

▸ Settings, team tab (owner) — http://localhost:4201/settings?tab=team   (checks ⑱–⑳)
⑱ Remove a cook, add the same name again — 492 · agent: pass
   WHY     Item 15: the name stayed taken after removal.
   SETUP   If reuse492 is listed, remove it first. reuse492 and phone492 are live from the agent run: remove them first, or use new names.
   DO      «הוסף חבר צוות» reuse492 / Chef4920 → «הוסף»; bin icon → confirm; add reuse492 / Chef4921 again.
   SEE ✓   «חבר הצוות נוסף»; reuse492 is listed once, as «צוות».
   FAIL ✗  «שם המשתמש כבר תפוס».
   SHOT    qa\492\r1-1.png
⑲ Phone 375 px, same flow — 492 · agent: pass
   DO      Add phone492 / Chef4923, remove it, add phone492 / Chef4924.
   SEE ✓   «חבר הצוות נוסף», listed once, no sideways scroll.
   FAIL ✗  «שם המשתמש כבר תפוס», or sideways scroll.
   SHOT    qa\492\r1-4.png
⑳ A cook removed before this fix — 492 · agent: UNSURE (human only, not run)
   SETUP   Outside the app, in your validation checkout's terminal (Git Bash in the repo root):
           node server/scripts/release-removed-staff-names.js --target=local
           node server/scripts/release-removed-staff-names.js --target=local --write
   DO      «הוסף חבר צוות» with that old cook's username and a new password.
   SEE ✓   «חבר הצוות נוסף», listed once.
   FAIL ✗  «שם המשתמש כבר תפוס».

▸ Login screen (private window) — http://localhost:4201/   (checks ㉑–㉒)
㉑ The re-added cook logs in — 492 · agent: pass
   DO      Log in as reuse492 / Chef4921.
   SEE ✓   You're in, and the inventory shows the owner's products.
   FAIL ✗  Any login error.
   SHOT    qa\492\r1-2.png
㉒ A removed cook is still refused kindly — 492 · agent: pass
   SETUP   As owner on the team tab, add gone492 / Chef4922, then remove it.
   DO      Log in as gone492 / Chef4922.
   SEE ✓   «המשתמש הוסר מהעסק – פנה לבעל העסק».
   FAIL ✗  You get in, or a generic wrong-password message.
   SHOT    qa\492\r1-3.png

▸ Menu library, new inquiry (owner) — http://localhost:4201/menu-library?new=inquiry   (checks ㉓–㉔)
㉓ Phone: one tap on the date field opens the picker — 483 · agent: UNSURE (no real touch)
   WHY     Item 7: the small calendar button made the phone worse.
   WHERE   «פנייה חדשה» → «תאריך»; also an event's deposit date in the stage bar and the «מקדמה שולמה» window.
   SETUP   A real phone (the test browser can't tap).
   DO      Tap the field on «dd/mm/yyyy», pick a day.
   SEE ✓   The phone's date picker opens at once, no keyboard, no button; the day shows as dd/mm/yyyy. The same in the other two places.
   FAIL ✗  A keyboard, nothing opens, a button, or mm/dd/yyyy.
   SHOT    qa\483\r1-1.png, r1-1b.png, r1-1c.png
㉔ Desktop date field still works — 483 · agent: pass
   DO      Type 25122026 in «תאריך»; then click the field once and start typing at once.
   SEE ✓   25/12/2026, no red text, no button; typing works.
   FAIL ✗  A button, typing blocked, or the wrong format.
   SHOT    qa\483\r1-2.png

▸ Menu editor, new menu (owner) — http://localhost:4201/menu-intelligence   (checks ㉕–㉛)
㉕ Only one empty dish row (bug replay) — 496 · agent: pass
   WHY     Item 20.
   DO      «לחץ לבחור קטגוריה», pick one, click «הוסף מנה» three times.
   SEE ✓   Exactly one «חפש מנה או הכנה...» row, with the cursor in it.
   FAIL ✗  Two or more empty rows.
   SHOT    qa\496\r1-1.png
㉖ Pick, then add — 496 · agent: pass
   DO      Type two letters, pick a dish, click «הוסף מנה».
   SEE ✓   The dish plus ONE empty row, still one after the click.
   FAIL ✗  A second empty row.
   SHOT    qa\496\r1-2.png
㉗ Rename still works — 496 · agent: pass
   DO      Click the dish name, then «הוסף מנה».
   SEE ✓   The dish name comes back; one empty row.
   FAIL ✗  The dish disappears, or two empty rows.
   SHOT    qa\496\r1-3a.png, r1-3.png
㉘ Two courses, phone 375 px — 496 · agent: pass
   DO      «הוסף קורס», pick a second category, its «הוסף מנה».
   SEE ✓   Each course shows one empty row.
   FAIL ✗  The second course has none, or the first one's row moved.
   SHOT    qa\496\r1-4.png
㉙ Empty rows aren't printed or saved — 496 · agent: pass
   SETUP   Name the menu «בדיקה 496»: course 1 has a dish plus its empty row, course 2 has a title.
   DO      «צ׳קליסט והדפסות» → «הדפסה»; close; «שמור תפריט»; open the «בדיקה 496» card.
   SEE ✓   The print preview has no gap and no «חפש מנה או הכנה...»; the reopened menu has only the dish.
   FAIL ✗  A gap or placeholder in print, or an empty row after reopening.
   SHOT    qa\496\r1-5.png, r1-5b.png
㉚ Typing the default back clears «שונה ידנית» — 495 · agent: pass
   WHY     Item 19.
   SETUP   New menu «בדיקה 495», «פרטי», «בופה», 100 guests, two dishes; open the first dish's info icon and note the default «מקדם המנה» (locally 1.15 → 115; the plan's 1.27 depends on your data).
   DO      Type 1.1, click outside; then type the default, click outside.
   SEE ✓   After 1.1: «שונה ידנית», «חזור לברירת מחדל», 110 portions. After the default: neither tag nor button, portions back to the default.
   FAIL ✗  The tag or button stays.
   SHOT    qa\495\r1-1.png
㉛ The dish follows the event type again — 495 · agent: pass
   DO      Change the event type to «חתונה».
   SEE ✓   Both dishes show the same new coefficient and portions; no tag.
   FAIL ✗  The first dish stays on the old number.
   SHOT    qa\495\r1-2.png

▸ Menu editor, saved menu «בדיקה 495» — http://localhost:4201/menu-intelligence/8c7dcde3-fdd0-47f0-8ab9-97d0ece76980   (checks ㉜–㉝)
㉜ Still normal after save and reopen — 495 · agent: pass
   DO      Save ㉛'s menu, reopen it here, open the first dish's info icon.
   SEE ✓   The «חתונה» default, no «שונה ידנית», no reset button.
   FAIL ✗  The tag shows.
   SHOT    qa\495\r1-3.png
㉝ A real change is still manual and reset works (check 67) — 495 · agent: pass
   DO      Set «פרטי», type 1.1 on the first dish, change to «חתונה», press «חזור לברירת מחדל».
   SEE ✓   1.1 stays with the tag after «חתונה» (the second dish moves); after the reset the first dish follows with no tag.
   FAIL ✗  The first dish moves with «חתונה», or the tag stays after the reset.
   SHOT    qa\495\r1-4.png

▸ Event «5/10/2026» — http://localhost:4201/menu-intelligence/345a7ef5-8002-4bdd-aef7-7806c30959e1   (checks ㉞–㉟)
㉞ Deleted product row, desktop — 481 · agent: pass
   WHY     Item 5: a deleted ingredient was unclear and the icon hid behind the price.
   SETUP   «מיקרו כוסברה» and «אצות וואקמה» are in the Trash (already set up).
   DO      Under «מנות פתיחה» click «חלקי» by «מוסלין שרימפס…», scroll to the bottom of the window.
   SEE ✓   A red ⊗ icon, «מיקרו כוסברה», a red «נמחק» pill and «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.», no button; in the dish row «חלקי», «500 ₪» and the bin sit side by side.
   FAIL ✗  The pill is plain text, a button shows, or «חלקי» covers the price.
   SHOT    qa\481\r2-1.png
㉟ The same on a phone — 481 · agent: pass (375 px emulation only)
   DO      On a real phone tap «חלקי» by «מרק מיסו…», scroll to the bottom.
   SEE ✓   «אצות וואקמה» with the red «נמחק» pill and note; the window ends above the bottom menu.
   FAIL ✗  The note is hidden under the bottom menu.
   SHOT    qa\481\r2-2.png

▸ Event «QA 487 build» (owner) — http://localhost:4201/menu-intelligence/7984c59e-b26c-4fdd-8bb5-7450e12d8364   (checks ㊱–㊵)
   Never press «שמור» here; when you leave, choose leave without saving.
㊱ The target chip toggles and shows if it holds data — 487 · agent: pass
   WHY     Check 92.
   DO      Click «יעד לאירוע זה»; type 15 in «יעד רווח נקי (%)»; click the chip twice; clear the 15, click outside.
   SEE ✓   The chip is grey; teal once 15 is in; the 2nd click hides the boxes (chip stays teal, the verdict doesn't change); the 3rd shows 15 again; it turns grey after clearing.
   FAIL ✗  The boxes don't hide, the colour is wrong, or the 15 is lost.
   SHOT    qa\487\r1-1.png, r1-1-teal15.png, r1-1-hidden.png
㊲ Errors don't move anything — 487 · agent: pass
   WHY     Check 93.
   DO      Type 100 in the target box, click outside; type -50 in «עלויות נוספות», click outside.
   SEE ✓   «היעד חייב להיות קטן מ-100%» and «עלויות נוספות לא יכולות להיות שליליות» show under their boxes; no box, label or row moves.
   FAIL ✗  Anything jumps or overlaps.
   SHOT    qa\487\r1-2-before.png, r1-2-after100.png, r1-2.png
㊳ The owner meter still works (checks 88, 90, 91) — 487 · agent: pass
   SETUP   Reload, leave without saving.
   DO      Look at the bar with the price empty; type 120 in «מחיר לאורח ללקוח»; scroll to the bottom.
   SEE ✓   «מחושב» and a verdict when empty; the numbers change at once; «חלקי» on profit fields; «+ הוסף קורס» fully above the bar.
   FAIL ✗  No «מחושב», numbers only after «שמור», or the bar covers «+ הוסף קורס».
   SHOT    qa\487\r1-7-empty.png, r1-7-120.png, r1-7.png
㊴ Phone: a coins button replaces the hidden bar — 487 · agent: pass
   WHY     Check 94.
   DO      At 375 px tap the coins button (bottom corner); type 120; tap X; tap the coins button again.
   SEE ✓   No bar; the button sits above the bottom menu, opposite the flame button; the sheet «תמחור האירוע» shows all fields and the numbers, which update; 120 is kept after reopening; no sideways scroll.
   FAIL ✗  The bar still shows or is hidden, the sheet is cut off, or the value is lost.
   SHOT    qa\487\r1-3.png, r1-3-sheet.png
㊵ The chip and errors inside the sheet — 487 · agent: pass
   DO      In the sheet tap the chip, type 100 in the target, tap outside.
   SEE ✓   The chip is teal; the error shows under the box; nothing jumps.
   FAIL ✗  The error pushes or covers boxes.
   SHOT    qa\487\r1-4.png

▸ Event with 3 notes — http://localhost:4201/menu-library, then http://localhost:4201/menu-intelligence/ad07a244-27b5-4311-8584-7c759b6f301c   (checks ㊶–㊸)
㊶ The event screen shows the app's background glow — 494 · agent: pass
   WHY     Item 16.
   DO      At 1440 px look at the top-left glow on /menu-library, then open the event.
   SEE ✓   The same soft teal glow around the menu paper.
   FAIL ✗  A flat grey-blue colour with no glow.
   SHOT    qa\494\r1-1-library.png, r1-1.png
㊷ The last note clears the price bar at 770–1030 px — 494 · agent: pass
   WHY     Item 18 (check 65).
   DO      At about 960 px (also 770 and 1030) scroll to the bottom; open «יעד לאירוע זה» and scroll again.
   SEE ✓   The last note, its date and «הוסף הערה» are fully above the bar.
   FAIL ✗  Anything is cut off or under the bar.
   NOTE    At 770 px the flame button blocks a click on the left of the chip (a known issue, see section 4).
   SHOT    qa\494\r1-2.png, r1-2-960-closed.png
㊸ No change at 1440 and 375 px — 494 · agent: pass
   DO      Scroll to the bottom at each width.
   SEE ✓   At 1440 the notes sit in the side column, with the usual ~96 px under the content; the phone looks as before.
   FAIL ✗  Extra empty space, or the notes moved.
   SHOT    qa\494\r1-3.png, r1-3-375.png

▸ Event closing dialog — http://localhost:4201/menu-intelligence/<id of an event with ≥2 suppliers>, «סגירת אירוע»   (checks ㊹–㊾)
   SETUP   As owner, move an event with priced, supplied products through «הזמנות» → «ביצוע» → «פוסט-פרודקשן»; the dialog opens. The id is the end of the URL.
㊹ The paid box is wide enough (replays check 97) — 488 · agent: pass
   WHY     Item 9: the paid box was ~55 px wide.
   DO      At 1440 px type 12345.67 in the first «שולם בפועל».
   SEE ✓   The dialog is about 960 px wide; the full number is readable; the photo cell is just a small camera icon.
   FAIL ✗  Digits cut off, a narrow dialog, or the dashed box with text.
   SHOT    qa\488\r2-1.png
㊺ The overrun and footer still work — 488 · agent: pass
   DO      Type an amount 15% above a row's «מתוכנן».
   SEE ✓   The row turns red with «חריגה של 15% (…)»; «רווח בפועל» and «הפרש» change.
   FAIL ✗  No red row, or the footer doesn't move.
   SHOT    qa\488\r2-2.png
㊻ Photo via the camera icon (check 98) — 488 · agent: pass
   DO      Click the camera icon, choose an image; «סגור», reopen, click the thumbnail.
   SEE ✓   The thumbnail is in that row, still there after reopening, and opens in a new tab.
   FAIL ✗  It's missing, in the wrong row, or gone.
   SHOT    qa\488\r2-3.png
㊼ Staff tick and photograph without money (replays check 100) — 488 · agent: pass
   SETUP   A private window as staff on the same event, dialog open. In the owner window type a new «שולם בפועל» in row 1.
   DO      As staff, without reloading: tick «הגיע» and «יש חשבונית» on row 1, add a photo, «סגור», reopen.
   SEE ✓   The ticks and the photo stay; no amounts, profit, «סיים אירוע», «רענן תכנון» or «הוסף ספק» for staff; the owner's amount survives a reload.
   FAIL ✗  A tick or photo is lost, money shows, or the owner's amount is gone.
   SHOT    qa\488\r2-4.png
㊽ Phone: lighter supplier cards (replays check 101) — 488 · agent: pass
   DO      At 375 px scroll the dialog.
   SEE ✓   One card per supplier, a bit lighter than the dialog (an overrun card stays red); no sideways scroll.
   FAIL ✗  The cards blend into the dialog, or sideways scroll.
   SHOT    qa\488\r2-5.png
㊾ Finish and reopen (check 99) — 488 · agent: pass
   SETUP   Leave one «שולם בפועל» empty.
   DO      «סיים אירוע» → confirm; reopen → «פתח מחדש».
   SEE ✓   «חסרים סכומים ל-1 ספקים»; then «הסתיים» and «האירוע הסתיים – הנתונים נעולים»; after reopening, «פוסט-פרודקשן» and the fields are editable.
   FAIL ✗  No warning, editable when finished, or reopen doesn't unlock.
   SHOT    qa\488\r2-6a.png, r2-6b.png, r2-6.png

▸ Stage bar «הסתיים» — new events from http://localhost:4201/menu-library?new=inquiry, opened with their pencil button → /menu-intelligence/<id>   (checks ㊿–(55))
   SETUP   First open http://localhost:4201/dashboard and write down «אירועים שנסגרו». Create «בדיקה 493 א» with next week's date.
㊿ The owner's click opens a popup (replays check 60) — 493 · agent: pass
   WHY     Item 17.
   DO      Click the «הסתיים» pill.
   SEE ✓   «האם אתה בטוח שברצונך לסגור את האירוע ללא פוסט-פרודקשן?» with «סיים אירוע» / «ביטול»; no red toast.
   FAIL ✗  The toast «"הסתיים" נקבע רק דרך "סיים אירוע"», or nothing happens.
   SHOT    qa\493\r1-1.png
(51) Cancel keeps the stage — 493 · agent: pass
   DO      «הסתיים» → «ביטול».
   SEE ✓   «פנייה» is still filled; no new row in «היסטוריית שלבים».
   FAIL ✗  The stage changed.
   SHOT    qa\493\r1-2.png
(52) Confirm finishes — 493 · agent: pass
   DO      «הסתיים» → «סיים אירוע».
   SEE ✓   «השלב עודכן»; «הסתיים» is filled; the history has a «הסתיים» row with your name; «סגירת אירוע» is locked and has «פתח מחדש».
   FAIL ✗  An error, or the stage stays «פנייה».
   SHOT    qa\493\r1-3.png
(53) Reopen (check 99) — 493 · agent: pass
   DO      In «סגירת אירוע» click «פתח מחדש».
   SEE ✓   «פוסט-פרודקשן», and the closing can be edited.
   FAIL ✗  An error, or still locked.
   SHOT    qa\493\r1-4.png
(54) Phone 375 px, from «ביצוע» — 493 · agent: pass
   SETUP   Create «בדיקה 493 ב» with a date and move it to «ביצוע».
   DO      Scroll the stage bar, tap «הסתיים» → «סיים אירוע».
   SEE ✓   The same popup, not cut off; «הסתיים» is filled; the closing dialog doesn't pop up.
   FAIL ✗  The popup is cut off, or the dialog opens.
   SHOT    qa\493\r1-5.png
(55) The dashboard counts each event once — 493 · agent: pass
   DO      Reload http://localhost:4201/dashboard.
   SEE ✓   «אירועים שנסגרו» is exactly 2 higher than the number you wrote down.
   FAIL ✗  An error, or +1 / +3.
   SHOT    qa\493\r1-6.png

▸ Staff account — http://localhost:4201/menu-intelligence/7984c59e-b26c-4fdd-8bb5-7450e12d8364 and a new staff event   (checks (56)–(58))
   SETUP   Sign out, sign in as qareview-cook2367.
(56) Staff see no pricing, desktop (check 95) — 487 · agent: pass
   DO      Look at the bottom and at the dish rows; open a dish's (i).
   SEE ✓   No bar, no ₪ box, no partial-cost warning; the details show «מקדם המנה» and «מנות לאירוע» but no food costs; the stage bar and notes are visible.
   FAIL ✗  Any price, cost or profit shows.
   SHOT    qa\487\r1-5.png
(57) No pricing button for staff on a phone — 487 · agent: pass
   DO      At 375 px look at the bottom.
   SEE ✓   Only the bottom menu and the flame button.
   FAIL ✗  A coins button or any number.
   SHOT    qa\487\r1-6.png
(58) Staff can't close an event — 493 · agent: pass
   SETUP   As staff create «בדיקה 493 ג» (it opens in «פנייה»).
   DO      Hover, then click «הסתיים».
   SEE ✓   The pill looks locked; no popup; red «רק הבעלים יכול לסגור אירוע»; «פנייה» stays.
   FAIL ✗  A popup, or the stage changes.
   SHOT    qa\493\r1-7.png

▸ Users card (Guest (Dev) platform admin) — http://localhost:4201/dashboard?tab=metadata, «ניהול משתמשים»   (checks (59)–(62), last because one deletes a business)
   SETUP   Signed out: «התחברות» → «הרשמה»: del486-owner, del486@test.local, any password, «שם העסק» = מטבח למחיקה 486. Sign out, sign in with «Guest (Dev)». Use the bin ONLY on del486-owner.
(59) A wrong name keeps the final delete locked — 486 · agent: pass
   WHY     Item 10 (check 14).
   DO      Bin on del486-owner → «הסר»; in the second question type «מטבח למחיקה» (without 486), Enter, then «הסר».
   SEE ✓   «המחיקה סופית ואי אפשר לשחזר אותה. למחוק את העסק?», «כדי למחוק, יש להזין את שם העסק:», the name in bold, a text box; «הסר» is faded and does nothing.
   FAIL ✗  No box, or the business is deleted.
   SHOT    qa\486\r1-1.png
(60) Cancel keeps it and the box starts empty — 486 · agent: pass
   DO      «ביטול»; open the second question again.
   SEE ✓   The row is still there; an empty box; a faded «הסר».
   FAIL ✗  The row is gone, or the old text is still there.
   SHOT    qa\486\r1-2.png
(61) Phone 375 px: the second question fits — 486 · agent: pass
   DO      Open the second question at 375 px, type something, «ביטול».
   SEE ✓   Everything is inside the popup; no sideways scroll.
   FAIL ✗  Something sticks out.
   SHOT    qa\486\r1-3.png
(62) The exact name deletes it — 486 · agent: pass
   DO      Type «מטבח למחיקה 486» exactly → «הסר».
   SEE ✓   «הסר» becomes active; the toast «העסק נמחק»; del486-owner is gone and «QA Review Kitchen» is untouched.
   FAIL ✗  Still locked, the row stays, or another business disappears.
   SHOT    qa\486\r1-4.png
```

## 6. Before `mvp-qa-fixes` can go to main
1. **Your checks:** the 62 cards above (the 4 unsure ones first) and a decision on plan 490.
2. **Build budget:** `ng build` passes, but the starting bundle is just over its 560 kB warning level (560.13 to 564.41 kB across plans). It's only a warning, but worth deciding on before release.
3. **Deploy the server** (plans 488, 492 and 493 change server code). Then do the only Atlas step of this run, from plan 492. Run it in Git Bash from the repo root, after the deploy:
   ```
   node server/scripts/db-backup.js --target=atlas
   node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<atlas-host>
   node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<atlas-host> --write
   node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<atlas-host>
   ```
   The second command is a dry run, so note its count. The last command must print `Would release 0 removed staff name(s)`.
4. **No other plan needs Atlas.** 481, 482, 483, 486, 487, 488, 489, 491, 493, 494, 495 and 496 have no schema, migration or data step.
5. **Data left in the local DB:** the agents left test events, menus, cooks and the supplier «ירקן». The «QA Review Kitchen» opening-details banner was also skipped. All of this is local only.

## 7. Evidence
- **Screenshots:** `C:\coding projects\Cursor\mvp-review-evidence\qa\<plan>\` for each plan. A later pass on the merged branch is in `C:\coding projects\Cursor\mvp-review-evidence\qa\final\`.
- **Run notes for each plan** (Decisions, UI validation, Final gate): `docs/mvp/runs/<plan>.md` on `mvp-qa-fixes`. For 490 they are on its own branch.
- **Agent card count:** 62 hand checks; 58 passed, 0 failed, 4 unsure (⑧, ⑰, ⑳, ㉓). There were also 6 extra console and layout checks, all passed.

_Report by claude-opus-5-5 (Opus 5.5)._
