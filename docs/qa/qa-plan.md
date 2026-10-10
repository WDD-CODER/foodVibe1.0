# FoodVibe QA Plan — pages × checks × breakpoints

Derived from the code at origin/main `2f9be7eb` and refreshed against `f739e9a1` (2026-10-10): shared `app-page-header`
on dashboard / menu library / venues / trash / list-shell pages, new admin-only «מודלי AI» card on the metadata tab.
**The plan is a claim about the app:** run order and the
existence pass that verifies these claims before any testing are in `docs/qa/qa-flow.md`. Hebrew labels are quoted verbatim from
`public/assets/data/dictionary.json`; if a label on screen differs from the quote, that is itself a `TEXT` finding
(unless an admin override exists — note it). Procedure, breakpoints and evidence rules: `docs/qa/qa-agent.md`.

Markers: **[auth]** page needs login · **[all-bp]** repeat at T and M · **[M]** phone only · **[T]** tablet only ·
**(create)** creates a `QA-<RUN_ID>-` record · **SKIP:** never do this.

Page order (public first, then auth). IDs are the `PAGE` prefix used in shots and findings.

| # | ID | Route | Title |
|---|---|---|---|
| 0 | SHELL | every page | header / bottom nav / chips / FAB / auth modal |
| 1 | DASH | `/dashboard` | «לוח בקרה» |
| 2 | META | `/dashboard?tab=metadata` | «לוח בקרה» → metadata manager |
| 3 | INV | `/inventory/list` | «רשימת מוצרים» |
| 4 | EQ | `/inventory/equipment` | «ציוד» |
| 5 | RB | `/recipe-book` | «ספר מתכונים» |
| 6 | ML | `/menu-library` | «תפריטי אירוע» |
| 7 | COOK | `/cook`, `/cook/:id` | «מסך בישול» |
| 8 | SUP | `/suppliers/list` | «ספקים» |
| 9 | VEN | `/venues/list` | «מיקומי אירוע» |
| 10 | VEND | `/venues/view/:id` | venue detail |
| 11 | INVF | `/inventory/add`, `/inventory/edit/:id` [auth] | product form |
| 12 | EQF | `/inventory/equipment/add`, `/edit/:id` [auth] | equipment form |
| 13 | SUPF | `/suppliers/add`, `/edit/:id` [auth] | supplier form |
| 14 | VENF | `/venues/add`, `/edit/:id` [auth] | venue form |
| 15 | RBD | `/recipe-builder`, `/recipe-builder/:id` [auth] | recipe builder |
| 16 | MI | `/menu-intelligence`, `/:id` [auth] | menu builder |
| 17 | TRASH | `/trash` [auth], `/dashboard?tab=trash` | «אשפה» |
| 18 | REDIR | redirects | `/`, `/command-center`, `/equipment*` |

Logged-out state is tested inside SHELL and once per list page (the `-LO` checks). Everything else runs logged in.

---

## 0. SHELL — global chrome (run first at D, then [all-bp])

**SHELL-01** Open `/`. Redirects to `/dashboard`. `<html dir="rtl" lang="he">` (check via javascript_tool).
**SHELL-02** Header shows brand `foodCo` + mark, and 4 pills «לוח בקרה» «מלאי» «ספר מתכונים» «תפריטי אירוע». Each navigates to `/dashboard` `/inventory` `/recipe-book` `/menu-library` and gets the `active` style.
**SHELL-03** Logged out: header shows «התחברות». Click → auth modal opens with tabs «התחברות» / «הרשמה», fields «שם משתמש» «סיסמה», eye toggle, buttons «ביטול» + «התחברות». Overlay click closes. **Note the presence of a `Guest (Dev)` ghost button — report as INFO (expected on the slot build), not a bug.**
**SHELL-04** Sign-in validation (no submit of valid data): empty → «נא להזין שם משתמש» / «נא להזין סיסמה»; `ab` → «שם משתמש חייב להכיל לפחות 3 תווים»; `a b` → «שם משתמש יכול להכיל רק אותיות, מספרים, _ ו-»; 21 chars → «שם משתמש עד 20 תווים». Wrong password with QA_USER → «משתמש לא נמצא» (or the server's wording — quote it). Evidence shot of the error state.
**SHELL-05** Sign-up tab validation only (never submit valid): switch tab → all fields reset; fields «שם משתמש» «אימייל» «סיסמה» «אשר סיסמה» «תמונת פרופיל»/«בחר תמונה» (**SKIP** clicking the file button). Errors: bad email «כתובת אימייל לא תקינה»; password `abcdefgh` → «סיסמה חייבת להכיל אות ומספר»; `abc1` → «סיסמה חייבת להכיל לפחות 8 תווים»; mismatch → «הסיסמאות אינן תואמות». Shot.
**SHELL-06** Log in with QA_USER/QA_PASS. Modal closes; header shows avatar/initial + username; no crown badge (non-admin). Enter key submits the form (test once).
**SHELL-07** Hero FAB («פעולות מהירות») present bottom corner; toggle shows at least «בונה מתכונים» on non-builder pages; closes on second click.
**SHELL-08** Sub-nav chips per group (0.3 in inventory): on `/dashboard` → «אתרים» «מטא-דאטה» «ספקים» «אשפה»; on `/venues` the «אתרים» slot becomes «לוח בקרה»; `/inventory` → «מוצרים» «ציוד»; `/recipe-book` → «בונה מתכונים» «מצב בישול»; `/menu-library` → «תפריטי אירוע» «בניית תפריטים». Active chip highlighted. [all-bp]
**SHELL-09 [M]** At 375px: top `nav.header-nav` hidden; bottom tab bar visible with 5 slots («פרופיל»/«התחברות» + 4 links, icon + Hebrew label), fixed to bottom, not overlapping content or the FAB. Tap each; active state follows the route. Profile tap → popover with username + «התנתקות».
**SHELL-10 [T]** At 768px: is any hamburger button («menu») visible? Expected per CSS: **no**. If a hamburger appears, report (TEXT S3 for raw `menu` aria + VISUAL). If none, confirm the 4 pills still fit without wrapping/clipping.
**SHELL-11** Logout from header (aria «התנתקות») → returns to logged-out header; then log back in. [all-bp: logout via bottom bar at M]
**SHELL-12** Global loader «רגע, מכינים הכל...» appears on route change and disappears (no stuck overlay after 10 s on any page → S1 if stuck).
**SHELL-13** Update banner «גרסה חדשה זמינה» must **not** appear during the run (if it does, note it as INFO, click «רענן עכשיו» once, continue).
**SHELL-14** Toast («user-msg») behaviour: click dismisses; stacks do not cover the header. (Observed during later pages — record here.)
**SHELL-15** 404/unknown route `/does-not-exist`: what renders? Blank page or Angular error → S2; redirect to dashboard → pass. Shot.

Responsive pass [T, M]: G1–G8, header pills fit, chips row scrolls horizontally without a page scrollbar, FAB does not cover bottom bar at M.

---

## 1. DASH — `/dashboard` (overview)

**DASH-01** Title «לוח בקרה», subtitle «סקירה כללית של המטבח».
**DASH-02** 4 KPI cards (`data-testid` kpi-total-products / kpi-total-recipes / kpi-low-stock / kpi-unapproved): «סה"כ מוצרים» «סה"כ מתכונים/מנות» «מלאי נמוך» «מתכונים/מנות לא מאושרים». Values are numbers (not blank/NaN/—).
**DASH-03** KPI counts vs lists: «סה"כ מוצרים» equals the «{n} מתוך {m}» total on `/inventory/list`; «סה"כ מתכונים/מנות» equals the total on `/recipe-book`. Mismatch → FUNC S2 with both shots.
**DASH-04** Links: «צפייה במלאי» → `/inventory`; «הוסף מוצר» → `/inventory/add`; «צפייה בספר מתכונים» → `/recipe-book`; low-stock «צפייה במלאי» → `/inventory?lowStock=1` and the list opens with the «מלאי נמוך» filter active; unapproved link → `/recipe-book?filters=Approved:false` with «מאושר: לא» filter active.
**DASH-05** «פעילות אחרונה»: items show entity tag («מוצר»/«מנה»/«הכנה»), name, action («נוצר»/«עודכן»/«נמחק»), relative time. Expandable items (click/Enter) show old→new chips. If empty: «עדיין אין פעילות להצגה». After you create a QA product later, come back once and verify the activity appears (do this at the end of INVF).
**DASH-06-LO** Logged out: «הוסף מוצר» is disabled with title «יש להתחבר כדי להשתמש בפעולה זו»; the rest still renders.
**DASH-07** Tabs by URL: `?tab=venues` embeds the venue list; `?tab=add-venue` embeds the venue form **while logged out** — report whether it renders a usable form (expected finding: embedded tab bypasses authGuard; verify save is refused — try «שמור» with an empty form only). `?tab=trash` logged-out: what renders? Shot each. `?tab=bogus` → overview.

Responsive [T, M]: KPI grid 2 cols at T, 1 col at M; each KPI card at M becomes a 2-col row; header stacks; link buttons 44px tall at M; activity list readable, time does not overlap name; bottom padding leaves last activity item visible above the bottom bar.

---

## 2. META — `/dashboard?tab=metadata` (also `/command-center` redirect)

**META-01** `/command-center` → `/dashboard?tab=metadata`. h1 «לוח בקרה» + chip «מטא-דאטה» active.
**META-02** Cards present with titles: «יחידות והמרות», «קטגוריות מוצרים», «מאגר אלרגנים גלובלי», «תוויות מתכונים», «סוגי מנות», «סוגי תפריט (Menu Types)», «קטגוריות הכנה», «קטגוריות מקטעי תפריט», «ניהול משתמשים», «מודלי AI» (last card, new).
**META-03** «ניהול משתמשים» for non-admin shows «גישה למנהלים בלבד».
**META-03b** «מודלי AI» card for non-admin: title «מודלי AI», description «הסדר קובע איזה מודל עונה ראשון. כשמודל מגיע למכסה היומית החינמית שלו, הבא בתור עונה. השינוי חל על כל המשתמשים.», then lock icon + «גישה למנהלים בלבד». No model list, toggles or reorder controls are shown. **Never** try to reach them (admin-only, changes AI routing for all users).
**META-04 (create)** «קטגוריות מוצרים»: type `QA-<RUN_ID>-קטגוריה` + Enter. Expect either the chip appears, or the translation-key-modal asks for an English key (enter `qa_<run>_cat`). Duplicate add → toast `הערך "…" כבר קיים ברשימה הזו.`. Chip click → popover «עריכה» «מחיקה». Delete it. Shot of the popover.
**META-05** Locked chips: system units show lock + tooltip «ברירת מחדל - לא ניתן להסרה»; shared items for non-admin show «זהו פריט משותף לכל המשתמשים — רק מנהל יכול לשנות או למחוק אותו». **Never** act on them.
**META-06 (create)** «תוויות מתכונים»: add `QA-<RUN_ID>-תווית` → label-creation-modal (colour). Confirm chip has colour dot. Delete.
**META-07 (create)** «סוגי תפריט (Menu Types)»: «הוסף סוג תפריט» → add-item-modal title «הוסף קטגוריה חדשה», label «סגנון הגשה»; add `QA-<RUN_ID>-type`; row shows toggles «מחיר מכירה» «עלות מזון (₪)» «עלות מזון (%)» «כמות מנות» «אחוז מנות»; toggle one on/off (saves immediately, no error toast). Delete the type.
**META-08 (create)** «קטגוריות הכנה» and «קטגוריות מקטעי תפריט»: add `QA-<RUN_ID>-…`, popover edit/delete works, delete.
**META-09** Empty-state texts where a list is empty: «אין <title> רשומים במערכת», «אין סוגי תפריט. לחץ "הוסף סוג תפריט".», «אין קטגוריות הכנה. הוסף קטגוריה.», «אין מקטעי תפריט. הוסף מקטע.» (only if applicable).
**META-10-LO** Logged out: every «הוסף» button disabled.

Responsive [T, M]: jump-nav pill row `.mm-jump-nav-row` visible (≤1023px) — now includes a «מודלי AI» pill — and tapping a pill brings that card to the top; cards single column; chip popovers open inside the viewport (not clipped at screen edge, especially RTL right edge); inputs + «הוסף» fit on one line or wrap cleanly.

---

## 3. INV — `/inventory/list`

**INV-01** list-shell: title «רשימת מוצרים», count «{n} מתוך {m} פריטים», search «חיפוש», filter toggle icon, «הוסף».
**INV-02** Columns at D: «מוצר» «קטגוריה» «אלרגנים» «ספק» «יחידה» «מחיר» «פעולות» + select-all checkbox. Sort by «מוצר», «קטגוריה», «ספק», «מחיר»: order flips, sort indicator visible.
**INV-03** Search: type part of an existing product name → list filters, URL gets `?q=`; Escape clears. No match → «אין מוצרים התואמים את הסינון».
**INV-04** Pagination (only if > 50 products): «הקודם» / «עמוד {n} מתוך {m}» / «הבא»; `?page=` in URL; sticky header stays while body scrolls.
**INV-05** Filter panel: «נקה סינון» appears once a filter is active; quick toggles «מלאי נמוך» «לא תקינים» «חסרי פרטים» «עם ערכים תזונתיים» «חסרי ערכים תזונתיים»; groups «קטגוריה» «אלרגנים» «ספק» with counts; selecting writes `?filters=`; count in title updates.
**INV-06** Row content: name (+ badges «מלאי נמוך», invalid/incomplete icons with tooltip), allergen count button opens pill popover, «אלרגנים» header click expands all, price shows `₪`.
**INV-07** Row actions «עריכה» → `/inventory/edit/:id`; row click (not on buttons) → edit page too. Return with «חזור לרשימה».
**INV-08** Selection mode: right-click / long-press a row → selection bar «{n} פריטים נבחרו» with «נקה» «מחיקה» «שנה ערך». «נקה» exits. (Do not bulk delete non-QA rows.)
**INV-09** Hero FAB lists «הוסף מוצר» and «צור עם AI». «צור עם AI» opens ai-product-modal with tabs «מטקסט» / «מתמונה»; «ביטול». **SKIP** generate.
**INV-10-LO** Logged out: «הוסף», «עריכה», «מחיקה» disabled with title «יש להתחבר כדי להשתמש בפעולה זו»; list still readable; row click → does it navigate to edit and bounce with toast «יש להתחבר כדי להשתמש בפעולה זו» + auth modal? Record behaviour + shot.
**INV-11** Delete of a `QA-` product (after INVF creates one): confirm «האם אתה בטוח שברצונך למחוק חומר גלם זה?» → toast «חומר הגלם נמחק בהצלחה» → appears in TRASH «חומרי גלם». (Run from INVF-10.)

Responsive [T, M]: filter panel opens as overlay (≤1023) and closes with its close control; middle columns collapse into the swipeable column carousel (≤768) — swipe/arrows change the visible column and the header label follows; row actions collapse into a «⋮» menu that opens inside the viewport; table bottom not hidden under bottom bar at M; sticky pagination/header does not cover the first row. Shot of carousel mid-swipe.

---

## 4. EQ — `/inventory/equipment`

**EQ-01** Chip «ציוד» active; list-shell title «ציוד»; search; «הוסף» → `/inventory/equipment/add`.
**EQ-02** Columns «שם» «קטגוריה» «כמות בבעלות» «פריט מתכלה» («כן»/«לא» chip) «פעולות». Sorting on name/category/quantity.
**EQ-03** Filters: «קטגוריה» checkboxes (expect «מקור חום» «כלי» «מיכל» «אריזה» «תשתית» «מתכלה»), «פריט מתכלה» radio «הכל»/«כן»/«לא»; «נקה סינון».
**EQ-04** Inline edit at D (≥1024): click a `QA-` row (create one in EQF first, or do EQ after EQF) → accordion panel under the row «עריכה: <name>» with «שם» «קטגוריה» «כמות בבעלות» «פריט מתכלה» «הערות», «ביטול»/«שמור» («שמור» disabled when name empty). Change quantity, save, row updates.
**EQ-05** Dirty-switch: edit a QA row, click another row → prompt to save first; click outside with changes → discard prompt. Record the exact wording.
**EQ-06** Delete QA row: confirm `האם למחוק את פריט הציוד "…"?` → gone (not in Trash).
**EQ-07** Old URLs `/equipment`, `/equipment/list` redirect to `/inventory/equipment` (see REDIR).
**EQ-08** FAB lists «הוסף ציוד».

Responsive [T, M]: inline edit becomes a **modal** (<1024) — opens, scrolls, saves; column carousel; filter overlay; «⋮» row menu.

---

## 5. RB — `/recipe-book`

**RB-01** Title «ספר מתכונים», count, search, «הוסף» → `/recipe-builder`; pagination if > 50.
**RB-02** Columns «שם» «סוג» «תוויות» «אלרגנים» «דירוג» «עלות» «פעולות» (+ «נוסף בתאריך» hidden by default — report if visible).
**RB-03** Row: unapproved items show a clock badge (title «ממתין לאישור»). Labels count → coloured chips; allergens count → pills; cost «₪x.xx» with tooltip «מחיר עבור: …» on hover.
**RB-04** Rating stars on a QA recipe (after RBD creates one): click a star → saves immediately (no error; reload keeps it).
**RB-05** Row actions: heart («הוסף למועדפים»/«הסר ממועדפים») toggles and the «הצג רק מועדפים» filter then shows it; «בישול» → `/cook/:id`; «מחיקה» on QA recipe → confirm «האם אתה בטוח שברצונך למחוק?» → toast «המתכון נמחק בהצלחה» → TRASH.
**RB-06** Row click logged in → `/recipe-builder/:id`.
**RB-07** Filters: «חיפוש לפי מרכיבים» dropdown (type a product name; «לא נמצאו מוצרים» for nonsense) → chip + «נקה»; «תאריך» («חדשים קודם» «ישנים קודם» «מ» «עד» «לפי עדכון»); «תוויות» «סוג» «אל תכלול אלרגנים» «מאושר» «תחנה» «סוג מנה»; «נקה סינון». `?filters=Approved:false` from the dashboard pre-selects «מאושר: לא».
**RB-08** Sort by «שם» «סוג» «דירוג» «עלות».
**RB-09** FAB: «הוסף מתכון עם AI» opens ai-recipe-modal with tabs «הזן טקסט» «העלה תמונה» «הזן קישור» and «בקשות היום» counter; «ביטול». **SKIP** generate.
**RB-10-LO** Logged out: «הוסף» disabled; row click → `/cook/:id` (not builder); heart disabled; «מחיקה» hidden. Shot.
**RB-11** Empty filtered: «אין מתכונים או מנות התואמים את הסינון».

Responsive [T, M]: carousel for «תוויות/אלרגנים/דירוג/עלות»; stars tappable at M (44px); cost tooltip reachable by tap; «⋮» menu.

---

## 6. ML — `/menu-library`

**ML-01** Title «תפריטי אירוע»; «תפריט חדש» → `/menu-intelligence` (logged in). Filters bar (only when any event exists): «סוג אירוע» «סגנון הגשה» «מתאריך» «מיון» («לפי תאריך» «לפי שם» «עלות מזון» «מספר אורחים») + order toggle.
**ML-02** Cards: name, `eventType · date` or «ללא תאריך», tags «עלות מזון: x%», «הכנסה כוללת: ₪…», «אורחים n». Card click → `/menu-intelligence/:id`.
**ML-03** On a QA menu (after MI): «שכפל כתבנית» → navigates to the clone's editor; clone name visible; later delete the clone. «מחיקה» → confirm «למחוק את התפריט הזה?» → gone (not in Trash).
**ML-04** Sorting and order toggle change card order; «מיון» by «מספר אורחים» is numeric (not lexical).
**ML-05** FAB: «תפריט חדש», «צור עם AI» (modal with «תאר את האירוע…», «ביטול»; **SKIP** generate).
**ML-06-LO** Logged out: card actions «עריכה» «שכפל כתבנית» «מחיקה» disabled; «תפריט חדש» click → authGuard toast «יש להתחבר כדי להשתמש בפעולה זו» + auth modal; cancel → stays on library.
**ML-07** Empty states: «אין תפריטים עדיין – צור את הראשון!» + «תפריט חדש» (if no menus) / «אין תפריטים התואמים את הסינון».

Responsive [T, M]: filters 1 col at ≤768; cards 1 col at M; card tags wrap without overflow; sort button 44px at M.

---

## 7. COOK — `/cook` and `/cook/:id`

Use an existing approved recipe with steps for reading checks, and the QA recipe for edit checks (after RBD).

**COOK-01** `/cook` in this browser: if a last recipe is stored it redirects to `/cook/:lastId` — note which. To see the empty state, run `sessionStorage.clear(); localStorage.clear()` via javascript_tool (you will be logged out — log back in after) and reload `/cook`: «בחר מתכון כדי להתחיל לבשל», button «ספר מתכונים» → `/recipe-book`, «מתכונים אחרונים» chips — do the chips show **names or raw ids**? Raw ids → TEXT S3 with shot.
**COOK-02** `/cook/:id`: local nav «מסך בישול» + theme toggle (default dark, aria «מעבר למצב בהיר»); toggling switches theme for the whole page without unstyled areas. Shot of both themes.
**COOK-03** Hero: image/placeholder, «מאושר» badge when approved, cost ₪, title, stars, «התקדמות הכנה» %.
**COOK-04** Scale bar: chips «½×» 1× 2× 3× 4× change every ingredient amount proportionally; «כמות להכנה» counter + unit select; «×factor» badge when unit differs.
**COOK-05** Ingredient checklist: tap row → done styling, header counter `done/total`, all done → «הכל מוכן ✓». Progress % updates.
**COOK-06** Scale by ingredient (aria «הגדר מתכון לפי פריט זה») → inline amount + «המר» → confirm «להמיר את המתכון לפי הכמות הזו של המרכיב?» → banner «מותאם ל …» + «חזרה למתכון המלא» restores.
**COOK-07** Steps: first card active («פעיל עכשיו»), «סיימתי שלב זה» advances, done card shows «הושלם ✓» + undo ↩; a step with cooking time shows «התחל טיימר» and a countdown appears in the hero («שלב n»). Let a short timer run only if ≤ 1 min; else skip. All done → «הכנה הושלמה! בתאבון 🎉».
**COOK-08** Export bar «ייצוא» expands to «ייצוא פרטי מתכון» «רשימת קניות» «ייצוא צ׳קליסט»/«ייצוא שלבי בישול»; click each **eye/«תצוגה»** → preview opens and closes. **SKIP** download icons and any print.
**COOK-09** Edit mode on the QA recipe: «עריכה» → banner «מצב עריכה»; change one ingredient amount; «בטל שינויים» reverts; change again → «שמור שינויים» → confirm → saved (reload shows the new amount).
**COOK-10** Unsaved changes: in edit mode with a change, click sub-nav chip «בונה מתכונים» → ternary dialog «ביטול» / «יציאה בלי לשמור» / «שמור וצא». Choose «ביטול» (stay). Then «יציאה בלי לשמור».
**COOK-11** Approve stamp (aria `approve_recipe`) on the QA recipe toggles «מאושר» with toast «המתכון סומן כמאושר»/«בוטל אישור המתכון»; with unsaved edits a confirm «יש שינויים שלא נשמרו. לשמור ולעדכן אישור?» appears.
**COOK-12-LO** Logged out: page readable; «עריכה» disabled; stars read-only.

Responsive [T, M]: at ≤768 the panes stack and the swap bar «אינדקס מרכיבים» / «תהליך הכנה» (or «רשימת הכנות (מיזאנפלאס)») reorders them; scale chips fit in one row or scroll; step buttons 44px; timer visible in hero without overlapping the title; dark theme has no white gaps at M.

---

## 8. SUP — `/suppliers/list`

**SUP-01** Title «ספקים»; search; «הוסף» → `/suppliers/add`; columns «שם» «מינימום הזמנה» «איש קשר» «טלפון» «ימי משלוח» «זמן אספקה» «מוצרים מקושרים» «פעולות».
**SUP-02** Row click → `/suppliers/edit/:id`; the sub-page shows the back button «רשימת ספקים» + «הוסף ספק» link.
**SUP-03** Filters: «ימי משלוח» day checkboxes, toggle «מוצרים מקושרים»; «נקה סינון»; empty filtered «לא נמצאו ספקים תואמים».
**SUP-04** Delete QA supplier (after SUPF): confirm `למחוק את הספק "…"?` (or the linked-products warning «הספק מקושר למוצרים. למחוק בכל זאת?» if you linked it in INVF) → gone (not in Trash).
**SUP-05-LO** Logged out: «הוסף» disabled; delete hidden/disabled; row click → auth bounce behaviour recorded.
**SUP-06** FAB «הוסף ספק».

Responsive [T, M]: carousel over the 6 middle columns; phone numbers do not break mid-number; «⋮» menu.

---

## 9. VEN — `/venues/list`

**VEN-01** Title «מיקומי אירוע», count «{n} מתוך {m} פריטים», search, «הוסף» → `/venues/add`; filter bar «בחר הכל», env toggles «מטבח מקצועי» «חוץ / שטח» «בית הלקוח» «מיקום פופאפ», «נקה סינון».
**VEN-02** Cards: photo/map-pin, status pill «פעיל»/«לא פעיל», name, address, hours (first + «+n»), env chip, capacity, infrastructure count; «עריכה» → `/venues/edit/:id`; card click → `/venues/view/:id`.
**VEN-03** Env toggle filters cards; count updates; empty → «אין מיקומים התואמים».
**VEN-04** Delete QA venue (after VENF) → confirm `למחוק את המיקום "…"?` → gone.
**VEN-05-LO** Logged out: «הוסף» «עריכה» «מחיקה» disabled; cards still open the detail view.
**VEN-06** FAB «הוסף מיקום».

Responsive [T, M]: card grid 2 cols T / 1 col M; selection checkbox band hidden on touch; status pill and env chip never overlap the name.

## 10. VEND — `/venues/view/:id`

**VEND-01** Top bar: back «מיקומי אירוע» → list; «עריכה» (disabled logged out) → edit form.
**VEND-02** Hero: photo, name, status, address, stats «פריטי תשתית» «תפוסה» «תפריטים משויכים», env chip.
**VEND-03** Cards «איש קשר» (name, «אחראי אתר», phone) or «—»; «שעות פעילות» or «—»; «תפריטים משויכים» — after MI links the QA menu to the QA venue, the menu appears here with date · «אורחים» n. Are the rows clickable links to `/menu-intelligence/:id`? Record (expected finding: not links). «הערות» when present.
**VEND-04** Bad id `/venues/view/000000000000000000000000` → empty-state «מיקום האירוע לא נמצא» (no blank page / console error).

Responsive [T, M]: hero stats wrap into rows; cards stack; long address wraps.

---

## 11. INVF — product form `/inventory/add`, `/inventory/edit/:id` [auth]

**INVF-01** Guard: logged out, open `/inventory/add` → toast «יש להתחבר כדי להשתמש בפעולה זו» + auth modal; log in from the modal → lands on `/inventory/add` (returnUrl). Shot.
**INVF-02** Add page: title «הוספת מוצר חדש למלאי» + «מלא את הפרטים ושמור למלאי». Mandatory block: «שם הפריט» (placeholder «למשל: עגבניות מגי»), «קטגוריה» (placeholder «בחר קטגוריה»), «מחיר קנייה (₪)», «יחידת בסיס» («בחר יחידה»). Buttons «חזור לרשימה», «שמור פריט».
**INVF-03** Empty submit → toast «יש לתקן את השדות המסומנים» and inline «נא להזין שם» «נא לבחור קטגוריה» «נא להזין מחיר» «נא לבחור יחידה». Shot.
**INVF-04** Duplicate name: type an existing product's exact name → «כבר קיים חומר גלם בשם זה».
**INVF-05** Category chip-search: type → dropdown filters; choose; chip appears; choosing the same again → toast «הקטגוריה כבר בפריט זה». «הוסף קטגוריה חדשה» visible (do not use).
**INVF-06** Unit custom-select: type-to-filter works; «add new unit» opens unit-creator-modal — open and «ביטול».
**INVF-07** Purchase units: «הוסף יחידת רכש» adds a row (unit `=` «כמות נטו» `:` compare unit, «מחיר מיוחד» toggle reveals «מחיר», «הסר»); submit with the row empty → row error «אנא מלא את כל פרטי יחידת הרכש בצורה תקינה»; fill it validly.
**INVF-08** Optional sections expand on header click: «ספק» («בחר ספק», «הוסף ספק» opens quick-add → «ביטול»), «אלרגנים» (add one; same again → «האלרגן כבר בפריט זה»; «כל האלרגנים נבחרו» when exhausted — skip), «לוגיקת פחת וניצולת» («אחוז פחת» 0–99 — enter 150 → rejected/clamped?; «מקדם ניצולת»; computed «עלות נטו מחושבת (לאחר פחת):» appears when price > 0), «רמת מלאי מינימלית», «ימי תוקף ברירת מחדל» (negative rejected).
**INVF-09 (create)** Save `QA-<RUN_ID>-מוצר1` with price 10, a category, base unit, one allergen, «רמת מלאי מינימלית» 5 → toast «חומר גלם נוסף בהצלחה» → `/inventory/list` shows it (search `QA-`). Does it show «מלאי נמוך»? Record.
**INVF-10** Edit: open it → title «עריכת מוצר: QA-…»; change price to 12 → «עדכן מוצר» → toast «המוצר עודכן בהצלחה». Then go to DASH-05 (activity shows «עודכן») and INV-11 (delete → Trash). Keep a second product `QA-<RUN_ID>-מוצר2` alive for RBD.
**INVF-11** Unsaved changes: type a name, click «חזור לרשימה» → ternary dialog «יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?» with «ביטול» «יציאה בלי לשמור» «שמור וצא». Test «ביטול» (stay) then «יציאה בלי לשמור». Also test via header pill «לוח בקרה» once.
**INVF-12** FAB on the form lists «ערוך מוצר עם AI» → modal «תאר את השינוי שברצונך לבצע במוצר...» → «ביטול». **SKIP** apply.
**INVF-13** Bad id `/inventory/edit/000000000000000000000000` → behaviour (redirect/toast/blank) + shot.

Responsive [T, M]: sections 2 col at ≤900 then 1 col at ≤768; purchase-unit row stacks cleanly (no `=`/`:` orphan glyphs); dropdowns open inside the viewport and are scrollable; number inputs show numeric keyboard hint (`inputmode`/`type=number`); save button reachable above the bottom bar.

---

## 12. EQF — equipment form `/inventory/equipment/add`, `/edit/:id` [auth]

**EQF-01** Guard as INVF-01. Title «הוסף ציוד». Fields «שם» «קטגוריה» (default «כלי») «כמות בבעלות» (default 1) «פריט מתכלה» «הערות»; «ביטול» → `/inventory/equipment`; «שמור».
**EQF-02** Empty name → «יש לתקן את השדות המסומנים» + «נא להזין שם». Quantity −1 → rejected.
**EQF-03 (create)** Save `QA-<RUN_ID>-כלי1` → navigates to `/inventory/equipment`; record whether a success toast appears and its wording.
**EQF-04** Duplicate name → error toast (quote it; expected «כלי עם שם זה כבר קיים»).
**EQF-05** Edit page title «עריכה: QA-…»; change quantity; save.
**EQF-06** **Expected gap:** type in «שם», then click «ביטול» or a nav pill — **no** unsaved-changes dialog (no guard). Record as FUNC S3 "no unsaved-changes protection" with shot, so it is tracked.

Responsive [T, M]: single column; toggle and notes usable; save reachable.

---

## 13. SUPF — supplier form `/suppliers/add`, `/edit/:id` [auth]

**SUPF-01** Guard as INVF-01. Title «הוסף ספק». Fields «שם» «איש קשר» «טלפון» «מינימום הזמנה» «זמן אספקה» «ימי משלוח» (7 chips). «ביטול» → `/suppliers/list`.
**SUPF-02** Empty submit → «יש לתקן את השדות המסומנים» + «נא להזין שם» (and required markers on «מינימום הזמנה» «זמן אספקה»). Negative numbers rejected.
**SUPF-03 (create)** Save `QA-<RUN_ID>-ספק1` with 2 delivery days → toast `הספק "QA-…" נוסף בהצלחה` → lands on `/suppliers/list?q=QA-…` with the list pre-filtered to it. Shot.
**SUPF-04** Duplicate name → «ספק עם שם זה כבר קיים».
**SUPF-05** Edit → «עריכה: QA-…» → change phone → save → `/suppliers/list`.
**SUPF-06** Expected gap: no unsaved-changes dialog — record like EQF-06.

Responsive [T, M]: day chips wrap in a clean row; phone input `type=tel`.

---

## 14. VENF — venue form `/venues/add`, `/edit/:id` [auth]

**VENF-01** Guard as INVF-01. Title «הוסף מיקום». «תמונת אתר» upload (**SKIP** file picker), «פעיל» toggle, «שם», «סוג סביבה» (default «חוץ / שטח»), «הערות», «כתובת», «תפוסה», «איש קשר», «טלפון», «שעות פעילות» rows («ימים» «שעות», «הוסף שורה»/«הסר»), «תשתית זמינה במקום» rows («בחר ציוד» + qty).
**VENF-02** Empty submit → «יש לתקן את השדות המסומנים» + «נא להזין שם». Add an hours row and leave it empty → both fields flagged. Add an infrastructure row, pick `QA-<RUN_ID>-כלי1`, qty −1 → rejected.
**VENF-03 (create)** Save `QA-<RUN_ID>-אתר1` (address, capacity 80, one hours row, one infrastructure row) → `/venues/list`; record toast wording (or absence). Card shows «פעיל», capacity, infra count 1.
**VENF-04** Duplicate name → «מיקום עם שם זה כבר קיים».
**VENF-05** Unsaved changes: type a name, click «ביטול» → **binary** dialog «ביטול» / «יציאה בלי לשמור» (no «שמור וצא»). Record.
**VENF-06** Edit: toggle «פעיל» off → save → card pill «לא פעיל».

Responsive [T, M]: 2-col basics at T collapse at M; repeated rows («הוסף שורה») stack with «הסר» reachable; actions stacked at M.

---

## 15. RBD — recipe builder `/recipe-builder`, `/recipe-builder/:id` [auth]

**RBD-01** Guard as INVF-01. New: image square (camera icon — **SKIP** upload), type toggle «הכנה» ↔ «מנה», name placeholder «שם המתכון...» → after toggle «שם המנה...», stars, scaling chip (yield + unit, «+» secondary unit), «תוויות», «סוג מנה», metrics «עלות» ₪ and weight/volume toggle «משקל».
**RBD-02** **Known text gaps to confirm:** toggle the metric to volume — does the label render raw `volume`? Any notice rendering `items_not_convertible` / `not_convertible`? TEXT S3 each with shot.
**RBD-03** Empty save («שמור מתכון») → «יש לתקן את השדות המסומנים» + «נא להזין שם», «נא להזין כמות»/«נא לבחור יחידה»; with name but no ingredient → inline/ toast about ingredients (quote). Shot.
**RBD-04** Duplicate name: type an existing recipe's name → «שם מתכון זה כבר קיים» + link «פתח את הקיים» → navigates to that recipe (then «חזור»/back without saving — use nav chip and «יציאה בלי לשמור»).
**RBD-05** «אינדקס מרכיבים»: «הוסף שורה» → row with ingredient search (type `QA-` → pick `QA-<RUN_ID>-מוצר2`), unit chip, qty −/+ and input (min 0), «אחוז», «עלות» («ממתין...» then a number). Drag handle reorders rows (try once). Delete icon removes a row. Add a second row with a free-text ingredient `QA-unlinked` (unlinked → link icon «רכיב לא מקושר»).
**RBD-06** Quick-edit pencil on the product row → quick-edit panel/modal opens; «ביטול».
**RBD-07** «תהליך הכנה» (preparation type): «הוסף שלב הכנה» → row «#», textarea «תאר את פעולת ההכנה...», Enter adds next step; clock toggle «זמן עבודה» (mm:ss), timer «זמן בישול (דק׳)» (set 00:00:30 so COOK-07 can run); delete step.
**RBD-08** «לוגיסטיקת מנה»: «חפש כלי...» → pick `QA-<RUN_ID>-כלי1`, qty 2, «הוסף» → chip `name ×2`; chip click removes; «הוסף» new tool via add-equipment-modal — open and «ביטול».
**RBD-09** Labels: pick an existing label; «סוג מנה» select. Yield: 4 + unit.
**RBD-10 (create)** Save as preparation `QA-<RUN_ID>-הכנה1` → unlinked confirm «המתכון מכיל רכיבים שלא מקושרים למוצרים. הם יישמרו ללא חישוב עלות. להמשיך?» → «שמור בכל זאת» → toast «המתכון נשמר בהצלחה» → `/recipe-book` lists it.
**RBD-11** Reopen; type toggle to «מנה» → on save a confirm about changing type appears; cancel. Section «רשימת הכנות (מיזאנפלאס)» shows when type is dish (toggle, look, toggle back; «יציאה בלי לשמור» if dirty).
**RBD-12** Approve stamp: click → toast «המתכון סומן כמאושר»; again → «בוטל אישור המתכון». With a dirty form → confirm first.
**RBD-13** Sync badge: change an ingredient amount so total ≠ yield → badge «התפוקה שונה מהסה"כ המחושב. לחץ לסנכרון» → click → yield updates.
**RBD-14** Edit save → «המתכון עודכן בהצלחה». Unsaved-changes ternary via chip «מצב בישול»: «שמור וצא» saves and navigates to `/cook/:id`.
**RBD-15** FAB on builder: «עריכת מתכון עם AI» (modal «מה לשנות? …», «ביטול»; **SKIP** apply), «ייצוא» → toolbar with groups «ייצוא פרטי מתכון» «רשימת קניות» «ייצוא שלבי בישול» «ייצוא הכל ביחד» each «תצוגה»/«ייצוא» + «הדפסת מתכון» — click only «תצוגה» (preview opens/closes). **SKIP** «ייצוא» and «הדפסת מתכון**. On an existing recipe also «מצב בישול». Global «בונה מתכונים» absent here.
**RBD-16** History view: from TRASH «היסטוריה» → «צפה בגרסה» → `/recipe-builder/:id?view=history&…` shows banner «צפייה בגרסה ישנה – לא ניתן לעריכה», form disabled, «חזור לרשימה». Bad params → toast «גרסה לא נמצאה». (Run during TRASH.)
**RBD-17** Collapsible section state persists after reload (localStorage `rb_col_*`): collapse «לוגיסטיקת מנה», reload, still collapsed.

Responsive [T, M]: header regrids at ≤650 (title / image+metrics / rating / scaling / labels) without overlap; name input + type toggle 44px at M; ingredients table — horizontal scroll inside the table only (no page scroll, G1) and the qty −/+ usable; steps: at ≤768 the −/+ counter buttons hide and the value is a tappable field (verify); footer «שמור מתכון» reachable above bottom bar + FAB; dropdowns (ingredient search) open within viewport and keyboard does not hide the input (note only).

---

## 16. MI — menu builder `/menu-intelligence`, `/:id` [auth]

**MI-01** Guard as INVF-01. Pill «שמור תפריט». Paper form: event-type chip «סוג אירוע» (dropdown with «חיפוש» + «הוסף»), serving-type chip «סגנון הגשה» (default «מנות / קורסים»), title «שם האירוע...», guests pill (default 50, −/+ hold-repeat) «אורחים», date chip (default today, «ללא תאריך» when cleared), venue chip «בחר אתר».
**MI-02** Save with event type empty → toast listing missing fields (expect «סוג אירוע» …). Guests 0 → rejected? Record.
**MI-03** Section: «לחץ לבחור קטגוריה» → «חפש קטגוריה...» dropdown → pick one; «+ הוסף מנה» adds a dish row with «חפש מנה או הכנה...»; nonsense search → «אין מתכונים או מנות התואמים את הסינון»; pick `QA-<RUN_ID>-הכנה1`; name button aria «החלף מנה»; info toggle «הצג נתוני מנה» reveals fields per serving type («מחיר מכירה» «עלות מזון (₪)» «עלות מזון (%)» «כמות מנות» «אחוז מנות», read-only «עלות למנה»); sell price 40; remove icon. «+ הוסף קורס» adds a section; section trash icon removes it.
**MI-04** Financial bar: «עלות כוללת» «עלות מזון %» «הכנסה כוללת» «עלות לאורח» «רווח לאורח» update live when price/guests change; «עלות מזון %» turns warning style > 33%; negative «רווח לאורח» styled warning. Shot.
**MI-05 (create)** Title `QA-<RUN_ID>-תפריט1`, venue = `QA-<RUN_ID>-אתר1`, save → «התפריט נשמר בהצלחה» → `/menu-library` card with tags. Then VEND-03.
**MI-06** Reopen `/menu-intelligence/:id`; values persisted; change guests → unsaved ternary dialog via chip «תפריטי אירוע» → «ביטול», then «שמור וצא».
**MI-07** Export sheet via FAB «צ׳קליסט והדפסות» → bottom sheet «צ׳קליסט והדפסות» with «צ׳קליסט» (by dish / category / station), «קניות», «הכל», «הדפסה»; click only «תצוגה» entries; Esc and backdrop close it. **SKIP** «ייצוא» and «הדפסה».
**MI-08** FAB «AI תפריט» → modal («תאר את האירוע…» new / «תאר את השינוי…» edit) → «ביטול». **SKIP** generate.
**MI-09** Keyboard: Tab order moves event-type → serving → title → guests → date → venue → section (record any trap).
**MI-10** Bad id `/menu-intelligence/000000000000000000000000` → behaviour + shot.

Responsive [T, M]: paper padding ≤600; chips 44px at M; dish-row field rail scrolls horizontally inside the row (no G1 violation); financial bar fixed at bottom **above** the bottom tab bar, FAB raised above both (`.above-bar`) — shot at M is mandatory; save pill reachable.

---

## 17. TRASH — `/trash` [auth] and `/dashboard?tab=trash`

**TRASH-01** Guard: logged out `/trash` → bounce + auth modal. Then `/dashboard?tab=trash` logged out → what renders (list? error? empty)? Shot — expected finding (embedded tab has no guard).
**TRASH-02** Logged in: header «אשפה» + «רענן» («ממתין...» while loading). Sections «מנות» «מתכונים» «חומרי גלם»; your QA product (INV-11) under «חומרי גלם», QA recipe under «מתכונים» (after RB-05) with «נמחק: <date>» and buttons «היסטוריה» «שחזר מהאשפה» «מחק לצמיתות»; non-empty sections show «שחזר הכל» «מחק את כל התוכן לצמיתות». Empty: «אין פריטים באשפה».
**TRASH-03** «היסטוריה» on the QA recipe → version-history overlay («היסטוריה», «גרסה מתאריך», «צפה בגרסה», «שחזר גרסה», «סגור»; «אין גרסאות קודמות» if none) → «צפה בגרסה» → RBD-16. «סגור».
**TRASH-04** «שחזר מהאשפה» on the QA recipe → confirm «לשחזר פריט זה?» → back in `/recipe-book`. Delete it again at cleanup.
**TRASH-05** «מחק לצמיתות» on the QA product only → confirm «למחוק לצמיתות? לא ניתן לשחזר.» → toast (quote) → gone. **Never** use «מחק את כל התוכן לצמיתות» or «שחזר הכל».
**TRASH-06** Chip «אשפה» active in the dashboard group; home chip «לוח בקרה» returns.

Responsive [T, M]: item rows wrap with three buttons reachable (44px at M); section headers not overlapped by «רענן».

---

## 18. REDIR — redirects (D only)

**REDIR-01** `/` → `/dashboard`. **REDIR-02** `/command-center` → `/dashboard?tab=metadata`.
**REDIR-03** `/equipment` and `/equipment/list` → `/inventory/equipment`; `/equipment/add` → `/inventory/equipment/add` (guard applies); `/equipment/edit/<QA id>` → `/inventory/equipment/edit/<id>`.
**REDIR-04** `/inventory`, `/suppliers`, `/venues` → their `/list`.

---

## Order of execution (dependencies)

SHELL → DASH → META → INV (read-only parts) → INVF (creates מוצר1, מוצר2) → INV-11 → EQF (כלי1) → EQ → SUPF (ספק1) → SUP →
VENF (אתר1) → VEN → VEND (partial) → RBD (הכנה1 using מוצר2, כלי1) → RB → COOK → MI (תפריט1 using הכנה1, אתר1) → ML →
VEND-03 → TRASH (+RBD-16) → REDIR → logged-out `-LO` sweep (log out once, visit each list page, log back in) → cleanup.

AI quota messages («הגעת למגבלת הבקשות היומית…», «מודל ה-AI הנוכחי הגיע למכסה היומית שלו…», «עבור ל-…») only appear when the daily
AI budget is exhausted and cannot be provoked without generating. If one appears unexpectedly during the run, report it
as INFO with a shot; never try to trigger it.

Estimated: ~230 checks × 3 breakpoints. Write the report after every page.
