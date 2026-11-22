# Dish analysis screen — feasibility audit against the current code

Plan 660. Report only: no code, schema or data was changed. Checked on the snapshot commit
`5b82258e85b72c0fdf97a2af8b83c5a59150b88f` (the branch's base). "Left per dish" = sell price before VAT minus the
dish's ingredient cost.

## 1. Summary for Dandan (Hebrew)

מסקנה כללית: האפליקציה היום בנויה סביב אירועים ומתכונים. אין בה שום נתוני מכירות (כמות שנמכרה, החזרות, סיבות).
מה שכן קיים: מחיר עלות למנה (מחושב בדפדפן), מחיר מכירה לפני מע"מ (בכלי האבחון של היועץ), וסיווג מנות לפי קורס.

- מספרים מרכזיים (סה"כ נמכר, נשאר מהמנות, ממוצע): צריך נתונים חדשים קודם. העלות והמחיר קיימים, הכמות לא.
- ארבעת הסוגים (כוכב, סוס עבודה, חידה, נטל): צריך נתונים חדשים קודם. הנוסחה פשוטה ומחושבת בקוד, אבל תלויה בכמות שנמכרה.
- החזרות וסיבות: צריך נתונים חדשים קודם. אין שום מקום לשמור החזרה או סיבה.
- רשימת המנות ופרט מנה: צריך נתונים חדשים קודם. אין תפריט קבוע של מסעדה מחוץ לאירוע, וצריך ליצור אותו.
- מחשבון "מנה חדשה שמושכת קהל": לא ניתן כרגע. הוא תלוי במסך התכנון החודשי (תוכנית 661) ובנתוני מכירות.
- משפטים שהמסך כותב בעצמו: מוכן לבנייה אחרי שיש מספרים. אפשר בכללים פשוטים, בלי בינה מלאכותית.
- העלות לא תמיד שלמה: חומר גלם בלי מחיר גורם לעלות חלקית, והמסך חייב להציג אזהרה ולא מספר.
- מחיר העלות הוא המחיר של היום, לא של יום המכירה. בחודש שחלף ההפרש עלול להטעות, ולכן מומלץ לשמור עלות מוקפאת לכל חודש.
- תפריט קבוע: ההמלצה היא רשומה חדשה לתפריט מסעדה, ולא שימוש באירוע, כי לאירוע יש תאריך, כמות אורחים ושלבים שלא שייכים.
- הכנסת מכירות: להתחיל בהקלדה ידנית לחודש, ורק אחר כך ייבוא קובץ. אין היום קוד שקורא קובץ CSV או Excel.
- הרשאות: הבעלים בלבד, והיועץ כשהוא פועל בעסק. צוות לעולם לא. צריך מודול חדש שמפעיל את המסך.
- מנות בלי מתכון (שתייה, קינוח קנוי): אפשרי בגרסה ראשונה רק עם עלות שמוקלדת ידנית. ההמלצה: להשאיר לגרסה שנייה.
- סדר בנייה מומלץ: מודול ותפריט קבוע, אחר כך הקלדת מכירות, אחר כך חישובים ומסך, ואחרון ייבוא קובץ.
- הדבר שיגרום למספרים להיות שגויים הכי הרבה: שם מנה שהשתנה בקובץ המכירות, שני גדלים של מנה אחת, ומתכון שהשתנה באמצע חודש.

## 2. Constraints from the project's rules

Only the rules that bear on recipes and their cost, per-business data, taxonomy, AI calls, schemas and modules.

- Every item belongs to one business; every write is checked in `server/utils/permissions.js`; the owner does money
  fields, staff never change money fields; a consultant acts with a live grant (INV-1, `docs/brain/invariants.md`).
- The business is the tenant; every scoped query goes through `server/utils/business-scope.js` (INV-2).
- Cascading or multi-document changes run on the server in one request, never a client loop of writes (INV-3).
- Entity shapes are Zod schemas in `shared/schemas`, and the server validates every write (INV-4,
  `docs/agent/standards-backend.md` for a new entity type and its persisted fields).
- Categories come from `taxonomyTerms`; course is its own axis (INV-5, `shared/schemas/entities/taxonomy-term.schema.ts`).
- Any Gemini call goes through `server/routes/ai.js` only (INV-6, `AGENTS.md` hard rules).
- Modules per business are a fixed list in `shared/schemas/modules-pure.ts:4`; a new screen needs a new module key
  and the server gate (`docs/modules/modules-map.md`, plan 616 and 620 rows).
- Stack rules (`_shared/tech-stack.md`): signals only, `inject()`, no `any`, Hebrew only through `translatePipe` and
  `dictionary.json`, logical CSS properties, and the growth-frozen files (`menu-intelligence.page.ts` among them)
  take no new lines — a new screen is a new page.
- A new component or util must first climb the reuse ladder (`docs/agent/standards-reuse.md`,
  `docs/brain/component-families.md`); a new list uses `app-list-container` and has empty, loading and error states.
- Logs carry ids and counts only: never a dish name or a price (comment at `server/routes/diag.js:4`).
- Gotchas on backend and angular (`docs/brain/gotchas/backend.md`, `docs/brain/gotchas/angular.md`) apply to the build, not to this report.

## 3. What exists today

Recipes and cost
- A recipe (a dish or a preparation) has `ingredients`, `steps[].laborTimeMinutes`, `yieldAmount`, `yieldUnit`,
  optional `course` (`shared/schemas/entities/recipe.schema.ts:8-18`, `:42`). It has no sell price and no category
  other than `course`. Dishes live in the `dishes` collection and preparations in `recipes`
  (`server/constants/collections.js:28-29`, `src/app/core/models/recipe.model.ts:46-47`).
- `RecipeCostService.computeRecipeCost` adds each ingredient's cost recursively (`recipe-cost.service.ts:53`);
  `computeRecipeCostStatus` returns `{ cost, partial, missing }`, where missing lists an unpriced product, an unlinked
  free-text row or a deleted reference (`:66-69`, `:75-112`); `getRecipeCostPerUnit` is total cost divided by
  `yieldAmount` (`:139-143`). The price used is the current one (`getEffectivePrice`, `src/app/core/utils/product-source.util.ts:8`).
  An ingredient with no price counts as 0 in the total (`isProductUnpriced`, `src/app/core/utils/product-validation.util.ts:19`).
- The cost code runs in the browser only; no file under `server/` or `shared/` computes a recipe cost
  (search in section 4, D2).

Prices and VAT
- A menu event item carries `sellPrice` and `foodCostOverride`, `recipeId`, `recipeType` and `unlinkedName`
  (`menu-event.schema.ts:73-86`); the event also holds `pricePerGuest`, `extraCosts` and a `pricing` cache
  (`:90-109`). Staff never change these money fields (`server/utils/permissions.js:20`, `:123`).
- A consultant diagnosis holds `menu: [{ name, sellPrice, dishId? }]` (up to 300), `pricesIncludeVat` and `vatPct`
  (default 18), `periodDays` and `invoiceIds` (`diagnosis.schema.ts:9-16`); it is owner-only data and needs the
  home module `consultant_diag` (`server/routes/diag.js:28`, `server/utils/permissions.js:25`).
- `buildMarginReport` is pure and shared: net price = sell price ÷ (1 + VAT), margin % and `underTarget` against the
  business profit target, and rule-based findings (`shared/schemas/diag/margin-report.ts:25-59`). The browser feeds it
  `costByDishId` from complete costs only (`src/app/pages/diagnosis/components/diag-report/diag-report.component.ts:54-66`).
- Business settings hold `profitTargetPct` (25), `safetyMarginPct`, `priceRiseAlertPct`
  (`shared/schemas/entities/business.schema.ts:8`).

Price history, import and stats
- `priceHistory` rows are written by the invoice and price-list apply route only, with `source` `invoice` or `import`
  (`shared/schemas/entities/price-history.schema.ts:3-19`, `server/routes/product-import.js:215-218`); products keep
  only the current price in `sources` (`product.schema.ts:9-14`).
- `server/routes/product-import.js` has `POST /apply` (`:64`), `POST /resolve` (`:328`) and `GET /price-rises` (`:351`);
  its readers take text or photos through the AI route, not a spreadsheet. `excel-workbook.util.ts` only writes
  workbooks (`:7`, `:27`, `exceljs` in `package.json:52`); nothing reads a CSV or Excel upload.
- `invoice-alias.schema.ts:5-16` maps a printed name (`nameKey`) per supplier to a product with `hits`; `POST
  /resolve` answers from that memory before any model call (`:33-37`).
- `server/routes/stats.js:23` and `:52` serve dashboard and report numbers from events (closed events, `pricing`,
  not-closed reasons in `server/services/business-report.js:123-140`); none counts a dish sold.

Screens
- `src/app/pages/menu-library/**` lists and creates menu events (`menu-library.page.ts:23`, items built at `:60-73`);
  it holds no standing menu. `src/app/pages/menu-intelligence/**` is the event editor.
- `src/app/pages/diagnosis/**` is the consultant's workspace (`app.routes.ts:312-322`).

Search for sales or dish performance (the plan's command, noise removed): the hits for `sold|sales|returned|refund|pos|
popularity|contribution` over `shared server src` are Gemini "returned invalid JSON" errors, `Contribution` in
`src/app/core/engine/event-plan.engine.ts:20-246` (a portion contribution, not money) and catalog scripts
(`server/scripts/catalog-enrichment/**`, "sold by weight" product units). None is real sales or dish-performance data.

## 4. Requirements matrix

Searches used for the `missing` rows are in the evidence column. All searches ran on `shared server src` unless named.

| Req | Requirement | Status | Evidence | What a build needs | Risk to the number |
|---|---|---|---|---|---|
| D1 | Standing restaurant menu | missing | Searches: `git grep -n -i -E "standingMenu\|restaurantMenu\|menuItems" -- shared server src` → no hit. Closest: `diagnosis.schema.ts:11` (consultant-only snapshot) and `menu-event.schema.ts:58-88` (an event). | New entity (a business's dish list) with a module gate and owner-only access | A copied event menu drifts from the real menu |
| D2 | Dish linked to a recipe, cost per portion, incomplete flag | partial | `recipe-cost.service.ts:66-69` (status and partial), `:139-143` (per portion), `diag-report.component.ts:54-66` (dish id → cost). Server side: `git grep -n -i -E "computeRecipeCost\|recipe-cost" -- server shared` → no runtime hit (only `server/scripts/lib/demo-data.js` seed maths). | Menu item with `recipeId`; cost frozen per month with its `partial` flag; or the cost logic moved to `shared/` | Current price used, not the price of the sale day; ingredient without price counts 0 |
| D3 | Sell price with VAT and VAT rate | partial | `menu-event.schema.ts:79` (`sellPrice`, no VAT), `diagnosis.schema.ts:11-13` (`sellPrice`, `pricesIncludeVat`, `vatPct`), `margin-report.ts:29` (net price) | `priceWithVat` on the menu item; `vatPct` on the business or the menu | A price changed mid-month changes the margin of every past sale |
| D4 | Units sold per dish per period, by hand then file then integration | missing | Searches: `git grep -n -i -E "unitsSold\|salesRow\|salesImport\|posImport" -- shared server src` → none; `git grep -n -E "csv\|xlsx\|multer" -- package.json server/package.json` → only `exceljs` (`package.json:52`, export only). Alias pattern at `invoice-alias.schema.ts:5-16` could serve the name matching. | Period record with a row per menu item; an entry form; later an upload route (parse, preview, match, apply) | A renamed or unmatched dish on the file silently drops units |
| D5 | Units returned per dish | missing | Searches: `git grep -n -i -E "returned\|refund\|returnReason" -- shared server src` → only Gemini error strings (`server/routes/ai.js:366`). | `returned` on the period row | Return counted in a different month than its sale |
| D6 | Reason per return, counted per dish | missing | Same searches as D5; closest idea: fixed reason list for events `NOT_CLOSED_REASONS` (`menu-event.schema.ts:13`, `:134`) | `returnReasons: [{ reason, count }]` on the row, reasons from a small taxonomy list or free text | Free text splits one reason into many spellings |
| D7 | Category per dish | partial | `recipe.schema.ts:42` (`course`), `taxonomy-term.schema.ts:63`, `:129` (course kind). The diagnosis `menu` row has no category (`diagnosis.schema.ts:11`). | Read `course` through the dish link; a category on the menu item for unlinked items | A dish with no course falls out of the filter |
| D8 | Derived numbers and the four classes | partial | Net price, cost, margin %: `margin-report.ts:28-46`. Searches for the rest: `git grep -n -i -E "popular\|workhorse\|puzzle\|menuEngineering\|returnRate" -- shared server src` → no hit. | A pure shared function (like `buildMarginReport`) for share, totals, return rate, return cost, 0.7 equal-share popularity and weighted-average profit; unit tests | Weighted average and class edges move with one wrong dish row; a dish with partial cost must not be classed |
| D9 | Preparation minutes per dish, batch yield | partial | `recipe.schema.ts:12` (`laborTimeMinutes`), default 0 on save (`recipe-form.service.ts:281`, `cook-view.page.ts:1267`); sum per recipe only in export (`excel-workbook.util.ts:172`); sub-recipe cost per yield unit (`recipe-cost.service.ts:139-143`, `:373`) but no labour roll-up | A labour roll-up through preparations divided by yield | Minutes left at 0 look like "free" labour |
| D10 | New-dish calculator vs room for the team | missing | Searches: `git grep -n -i -E "newDish\|crowd\|roomForTeam\|breakEven" -- shared server src` → none. `profitTargetPct` exists (`business.schema.ts:8`); `extraCosts` is per event (`menu-event.schema.ts:92`), not monthly. | The monthly planning screen's figure (plan 661, sibling) and a pure formula | Expected sales are a guess; the replaced-share assumption is easy to misjudge |
| D11 | Sentences from the numbers | partial | Rule-based findings by key and count: `margin-report.ts:48-57`, `business-report.js:123-140`; AI calls are INV-6 only | Rules in a pure function; keys → Hebrew in `dictionary.json` | A sentence from few data points reads as a fact |
| D12 | Period and source per number; note for no sales or no cost | partial | Cost-incomplete flag exists (`recipe-cost.service.ts:66-69`); `periodDays` exists only for price history (`diagnosis.schema.ts:10`). Searches: `git grep -n -i -E "period\|source" -- shared/schemas/entities` shows only price-history `source` (`price-history.schema.ts:17`). | `period` (`YYYY-MM`) and `source` on the period record; a per-row flag | A mixed month (hand + file) without a source note |
| D13 | Who sees and changes it; module switch | partial | Owner-only types list incl. `diagnoses` (`permissions.js:25`), `editMoney` owner-only (`:20`); modules `modules-pure.ts:4-5`; gate by type `generic.js:58`; consultant via grants (INV-1). | New module key, new type added to `OWNER_ONLY_TYPES`, money fields listed for the new entity | A staff read through the generic API if the type is not listed |
| D14 | What the diagnosis and menu library already hold | partial | Diagnosis: menu with prices and `dishId` (`diagnosis.schema.ts:11`), `PUT /:id/menu` (`diag.js:99`), margin report (`diag-report.component.ts:54-80`). Menu library: events only (`menu-library.page.ts:23`, `:60-73`). | Share `buildMarginReport` and the net-price rule; do not share the diagnosis record (consultant-owned, home-business gate) | Two menus for one business drift apart |
| D15 | Sold items with no recipe | partial | Diagnosis rows may have no `dishId` (`diagnosis.schema.ts:11`, `margin-report.ts:30` → no cost); event items use `unlinkedName` (`menu-event.schema.ts:86`) | Menu item with no `recipeId` and an optional typed cost per portion | Without a cost the class and total left are unknown, not zero |

## 5. Data-quality risks

Ingredient cost per portion (A5)
- Where it is computed: only in the browser from the loaded products and recipes
  (`recipe-cost.service.ts:38-41` injects `KitchenStateService`). The server has no cost function, so a server report
  over many dishes cannot read it today. The generic API returns documents, not costs.
- No price or no unit conversion: an unpriced product is listed in `missing` and the status is `partial`
  (`recipe-cost.service.ts:66-112`); in the total it adds 0 (`computeIngredientCost`, `:351-367`), and a product that
  cannot be found adds 0 as well (`:352`). So a partial cost is always too low; the screen must show it as partial,
  as the margin report already does by dropping it (`diag-report.component.ts:64-65`).
- Current price vs price at sale: cost uses today's price. `priceHistory` could give a past price but only for
  products changed through an invoice or import, and it is a server-only collection
  (`price-history.schema.ts:3`, `server/db.js:168-169`). A month of sales should therefore store the cost it used.
- Labour minutes: step `laborTimeMinutes` is a required number and is written as 0 when the form has none
  (`recipe-form.service.ts:281`), so a 0 cannot tell "no labour" from "not filled".

Sales intake (A6)
- File import reuse: the invoice and price-list flow (`server/routes/product-import.js`) is the closest shape — a
  preview, a match step (`/resolve`), then `/apply` — but it reads through the AI route; a sales file from a
  point-of-sale is a table, so a parse step (CSV; Excel via the already approved `exceljs`) is new. A sales file
  should not call a model: the numbers must come from the file exactly.
- Matching a name to a dish: the alias idea fits (name key per business → menu item, `hits`, last seen); the stored
  shape would be a new own-alias type, not the invoice one (it is keyed by supplier and product).
- Where returns live: a `returned` count and a reason count list on the same period row as the sold count.
- Items without a recipe: a menu item with no `recipeId` and its own typed cost.

The three most likely ways the figures end up wrong, and what the build does
1. A dish renamed on the sales file: the name no longer matches. The build lists every unmatched name in the preview
   and blocks the apply until each is matched, skipped or added; the choice is remembered as an alias.
2. Two sizes of one dish (or a dish sold with a variation): units split or double count. The build matches many
   sales names to one menu item and sums them, and shows the matched names on the dish detail.
3. A recipe changed during the month: the cost no longer fits the earlier sales. The build stores the cost per
   portion and its `partial` flag on the period row when the month is saved, and shows "cost as of <date>".

## 6. Architecture impact of a future build

- INV-1 Ownership: touched. The new entities are the owner's (and an acting consultant's) money data; add them to
  `OWNER_ONLY_TYPES` and the money-field list so staff cannot read or write them; can be preserved.
- INV-2 Tenancy: touched. Every query through `business-scope.js`; the entities are not cloned from `__master__`
  (`cloneable: false` like `diagnoses`, `server/constants/collections.js:63`); can be preserved.
- INV-3 Server owns consistency: touched only if saving a month also writes frozen costs for many rows; one request
  per month record keeps it inside the rule; can be preserved.
- INV-4 One Zod schema package: touched. New schemas in `shared/schemas/entities/` and the server validation; can be
  preserved.
- INV-5 Taxonomy: touched if return reasons or dish categories become taxonomy kinds (a new kind in
  `taxonomy-term.schema.ts`, `TAXONOMY_KINDS`); a fixed list kept as code constants avoids touching it. Can be preserved.
- INV-6 AI calls: not touched if the insights (D11) are plain rules computed from the numbers, as
  `margin-report.ts:48-57` does. Nothing in D1–D15 needs a model; the sales file is parsed by code. Can be preserved.
- Shared with the diagnosis: `buildMarginReport` (net price, margin, cost-missing note), the VAT rule and the
  `costByDishId` idea. Duplicated: the menu rows (diagnosis `menu` is the consultant's own snapshot, gated by the home
  business's module); a conversion from a diagnosis menu into a standing menu could be offered, not a shared record.
- Dependency on the monthly planning screen (D10): the calculator needs its "room for the team" figure; build it
  after plan 661's output exists, or leave the room figure typed by hand.
- No change to an existing invariant is needed; no `Arch-approved:` line would be required.

## 7. Proposed build slices

In dependency order, one Worker session each.

1. Module and registration — a `dish_analysis` module key, the new collections and indexes, owner-only and money
   fields, schemas. Touches `shared/schemas/modules-pure.ts`, `shared/schemas/entities/`, `server/constants/collections.js`,
   `server/utils/permissions.js`, `server/db.js`. Delivers: nothing visible; a gated, validated store.
2. Standing menu — a list page to add dishes, link a recipe, set a price with VAT and a category; cost per portion
   with the incomplete flag shown. Touches a new `src/app/pages/restaurant-menu/**`, the route, a data service,
   dictionary keys. Delivers: the owner's dish list with cost and left per dish.
3. Monthly sales by hand — pick a month, type sold and returned per dish, a reason per return; saves the frozen cost.
   Touches a new server route, the period schema's router, a page section. Delivers: real numbers per month.
4. The analysis function — a pure shared function with the D8 numbers and four classes, with unit tests. Touches
   `shared/schemas/dish-analysis/**` (new). Delivers: tested numbers.
5. The analysis screen — key numbers, class chart, dish list and dish detail from slices 2–4. Touches a new page.
   Delivers: the screen of the mockup with real data.
6. Written insights — plain rules and dictionary keys (D11). Touches the function of slice 4 and the page.
   Delivers: the sentences, each with its evidence count.
7. Sales file import — parse CSV and Excel, preview, name matching with remembered aliases, apply. Touches a new
   server route and a small parser module. Delivers: a month from a file instead of typing.
8. Labour (D9) — roll-up of step minutes through preparations divided by yield, shown as a separate column. Touches
   a shared function and the dish detail. Delivers: a full cost with labour.
9. New-dish calculator (D10) — after plan 661. Touches a new component and the shared formula. Delivers: the
   "is there room" answer.
10. Dishes without a recipe (D15) — typed cost per portion on a menu item (could move up if the Human chooses it for
    version one).

## 8. Decisions for the Human

Each decision lists the options; the recommended one is first.

1. How the standing menu is stored: (a) a new entity, one document per business holding its dishes — recommended:
   no misuse of event fields, clean owner-only gating; (b) a `menuEvent` with a serving type used as the menu — reuses
   the editor and `sellPrice` but drags in `guestCount`, `eventDate`, stage and the `pricing` cache, and shows the
   menu in the events list; (c) the consultant diagnosis `menu` — already has prices and VAT but belongs to the
   consultant module and home business, and has no category or recipe-cost freeze.
2. How sales get in first: (a) typed by hand per month, file import later — recommended: no parser, quick to
   validate with real owners; (b) file import first — more work and name matching is the risky part; (c) a live
   point-of-sale integration — not now, the system is not chosen.
3. Return reasons: (a) a fixed short list the owner can extend, with "other" — recommended: counts per reason
   are comparable; (b) free text — flexible but splits into many spellings.
4. Dishes without a recipe in version one: (a) not in version one — recommended: keeps the cost rule simple; (b) yes,
   with a typed cost per portion; (c) yes, counted in units only with no cost and no class.
5. Which cost a month uses: (a) cost per portion frozen when the month is saved — recommended; (b) always today's
   cost — simpler but old months change by themselves.
6. VAT rate: (a) one rate per business, 18% default like the diagnosis — recommended; (b) a rate per dish.
7. Who switches the screen on: (a) a new module the platform admin sets — recommended, like the other modules; (b) on
   for every business with the events module.
