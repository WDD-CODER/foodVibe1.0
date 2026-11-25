# Monthly planning screen — feasibility audit against the current code

Plan 661. Report only: no code, schema or data was changed. Checked on commit `695dfda7` (the run branch tip; the plan
snapshot `5b82258e` reports `REALITY: clean`). All money is before VAT unless stated. Evidence is `path:line` on that
commit. "Plan" = what the owner expects for the month; "actual" = what happened.

## 1. Summary for Dandan (Hebrew)

מסקנה כללית: האפליקציה בנויה סביב אירועים, מתכונים וחשבוניות ספק. אין בה שום מושג של "חודש" ואין בה הוצאות קבועות או שכר.

- הכנסות ויעדים: צריך נתונים חדשים קודם. יעד רווח קיים (ברירת מחדל 25%); הכנסה חודשית קיימת רק מאירועים שנסגרו, ואין הכנסה מקופה או מכירות.
- הוצאות קבועות (שכירות, חשמל, ארנונה ועוד): צריך נתונים חדשים קודם. אין שום שדה או אוסף להוצאה כזאת, צריך ליצור אותם.
- צוות ושכר: צריך נתונים חדשים קודם, ובנוסף החלטת פרטיות. אין שום נתון שכר, ושכר הוא נתון רגיש במיוחד.
- צילום מסמך (חשבונית חשמל, תלוש): צריך נתונים חדשים קודם. קריאת חשבונית ספק קיימת, אבל היא בנויה למוצרים בלבד, ולכן תלוש והוצאה קבועה דורשים קריאה חדשה.
- מספרים מחושבים (רווח, חדר לצוות, נקודת איזון, מחיר מנה): מוכן לבנייה כשיש את הקלטים. הנוסחאות פשוטות ונכתבות בקוד חדש אחד; הן תלויות בנתונים שחסרים.
- עלות חומר גלם בפועל: חלקי. אפשר לחשב מחשבוניות שאושרו, אבל רק חשבוניות שהוקלדו דרך ייבוא מוצרים, ורק מה שנקנה ולא מה שנצרך.
- תקופה חודשית עם היסטוריה והעברת שורות קבועות: צריך נתונים חדשים קודם. היום יש רק חלוקת אירועים לפי חודש בדוח.
- נעילת ערך בפועל ושינוי ידני מאושר: לא קיים. נדרש רישום של מי שינה, מתי ומה היה הערך הקודם.
- חוסר נתונים ("חסר ייחשב אפס"): צריך נתונים חדשים קודם. המסך חייב להציג רשימת חסרים ואזהרה, לא מספר נקי.
- הרשאות: הבעלים והיועץ בלבד, צוות לעולם לא. אבל יועץ היום לא יכול לשנות הגדרות עסק, כולל יעד הרווח, ולכן צריך להחליט מי מזין.
- מודול: צריך מפתח מודול חדש, כי מנגנון המודולים הוא רשימה סגורה של חמישה מפתחות.
- פרטיות: כברירת מחדל נתוני העסק משותפים לפלטפורמה; מומלץ להחריג שכר ותלושים לחלוטין.
- הדבר שיגרום למספרים להיות שגויים הכי הרבה: חודש בלי נתונים שנספר כאפס, וקנייה בחודש שנספרת כצריכה בחודש.

## 2. Constraints from the project's rules

Only the rules that bear on money data, per-business data, AI calls, schemas and modules.

- Every item belongs to one business; every write goes through `server/utils/permissions.js`; staff never change money
  fields; a consultant with a live grant may do what the owner may except manage the team and change the business
  settings (INV-1, `docs/brain/invariants.md`, ADR 0032 in `docs/brain/decisions/0032-one-user-more-than-one-business.md`).
- The business is the tenant; every scoped query goes through `server/utils/business-scope.js` (INV-2, ADR 0023).
- Cascading or multi-document changes run on the server in one request, never a client loop of writes (INV-3).
- Entity shapes are Zod schemas in `shared/schemas`; the server validates every write (INV-4,
  `docs/agent/standards-backend.md` for a new entity and its persisted fields; a money field is added to
  `shared/schemas/money-fields.ts`).
- Any Gemini call goes through `server/routes/ai.js` or `server/routes/ai/**` only (INV-6, `AGENTS.md` hard rules).
- A new screen needs a new module key and the server gate (`docs/modules/modules-map.md`, C-MODULES; plan 616 and 620 rows).
- Stack rules (`_shared/tech-stack.md:10-30`): signals only, `inject()`, no `any`, Hebrew only through `translatePipe`
  and `dictionary.json`, logical CSS, growth-frozen files take no new lines — a new screen is a new page.
- The only place profit and profit % are computed is contract C-PRICING (`src/app/core/engine/event-pricing.ts:4`).
- Logs carry ids and counts only, never an amount, a name or a document text (`_shared/tech-stack.md:40-41`;
  `server/routes/diag.js:4`; `server/routes/ai/invoices.js:81`).
- A new component or util climbs the reuse ladder first (`docs/agent/standards-reuse.md`, `docs/brain/component-families.md`).
- Gotchas on backend and angular (`docs/brain/gotchas/backend.md`, `docs/brain/gotchas/angular.md`) apply to the build, not to this report.

## 3. What exists today

Business settings and baseline
- `businessSchema.settings` holds `profitTargetPct` (0 to under 100), `safetyMarginPct`, `overrunThresholdPct`,
  `priceRiseAlertPct` (`shared/schemas/entities/business.schema.ts:10-18`); defaults, `profitTargetPct` 25
  (`:8`). The owner edits them in the settings tab (`src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts:52,75`);
  the route is `PUT /api/v1/business/settings`, guarded by `editSettings` (`server/routes/business.js:50-52`). Both
  `settings` and `baseline` are money fields (`shared/schemas/money-fields.ts:20`).
- `baseline` stores how the business ran before FoodVibe: `avgRevenuePerEvent`, `estProfitPct`, `foodCostPct`, wasted
  and hours estimates, all optional (`business.schema.ts:29-47`); route `PUT /api/v1/business/baseline`
  (`server/routes/business.js:132`). These are monthly averages of the last three months, one set per business, not per month.
- P2 note — existing asks of the same numbers: the baseline tab already asks the owner for `foodCostPct` and `estProfitPct`
  (`src/app/pages/settings/components/baseline-tab/baseline-tab.component.ts:59,75,78`), and the settings tab asks for the profit
  target. The new screen should read those stored values (as the plan's start values) instead of asking twice.

Revenue and food cost from events (not from months)
- An event stores `planSnapshot.plannedRevenue` (`shared/schemas/entities/menu-event.schema.ts:36`) and, when closed,
  `closing.actualRevenue`, `closing.actualExtraCosts`, `closing.suppliers[].actualPaid`, `finishedAt`, `finishedBy`
  (`:47,52,53,55`, `:42-56`).
- The same revenue rule (actual, else planned, else pricing) lives in `server/services/business-stats.js:38-42,160-163` and
  `server/services/business-report.js:17-19`. `GET /api/v1/stats/business` (`server/routes/stats.js:23`) and
  `GET /api/v1/stats/report` (`server/routes/stats.js:52`, owner only) read it.
- The report buckets events by calendar month in Asia/Jerusalem (`server/services/business-report.js:24` `monthKeys`) and measures
  `revenue`, `foodCostPct`, `profitPct` per event, then averages (`:76-78`, metric list `server/constants/report.js:5-16`). The
  event food cost is `pricing.foodCost`, the cost of the recipes at the prices the app holds, not an invoice amount.
- C-PRICING: `computeEventPricing` (`src/app/core/engine/event-pricing.ts:70-106`) computes `profit = revenue - totalCost` (`:84`),
  `profitPct` (`:85`), `minPricePerGuest = totalCost / (1 - target/100) / guests` (`:91`); `partial` is carried (`:104`).
  It knows only food cost and one extra-cost amount: no rent, no salary.

Invoices, prices, stock, files
- An approved invoice is `invoices` (`shared/schemas/entities/invoice.schema.ts:23-36`): header (supplier, `invoiceNumber`,
  `invoiceDate` optional `:29`, `vatIncluded` optional `:30`), `source` photo/pdf/text (`:5,31`), `fileId`, and `lines[]` with
  `quantity`, `unitPrice`, `lineTotal` (all optional, `:11-14`), `price`, `needsReview`, `result` (`:9-21`). There is no invoice
  total field.
- It is written only by `POST /api/v1/product-import/apply` (`server/routes/product-import.js:73-78` parse, `:243-267` build and
  `insertOne`, owner `editMoney`), and only when the owner is importing product prices. No order or delivery note with
  no price import produces one. The write order has no transaction (`product-import.js:18`).
- `invoiceApplyInputSchema` requires at least one line (`invoice.schema.ts:61`). A line's printed `lineTotal` is kept as sent
  (`server/utils/invoice-trail.js:18-20`).
- Price history: one row per created or changed price (`shared/schemas/entities/price-history.schema.ts:6-19`), server-only
  collection (`server/constants/collections.js:66`).
- Stock counts hold `productId`, `quantity`, `baseQuantity` per line, `countedAt`, `status` draft/final
  (`shared/schemas/entities/stock-count.schema.ts:8-23`). `GET /api/v1/stock/on-hand` returns the latest final quantity per product
  and no money (`server/routes/stock.js:195-208`).
- Files: `storedFile.kind` is only `invoice` or `voice` (`shared/schemas/entities/stored-file.schema.ts:4`); allowed mime types
  at `:10-12`; optional `deleteAfter` (`:29`). An invoice file read by AI is stored with `deleteAfterDays: 30`
  (`server/routes/ai/invoices.js:100-102`) and kept for good only when the invoice is saved
  (`server/services/file-store.js:166-170`, `server/routes/product-import.js:274`).

AI invoice read (C-INVREAD)
- `POST /api/v1/ai/invoices/read` (`server/routes/ai/invoices.js:36`) is guarded by `editMoney` on `products` (`:37`), has its own
  limiter (`:29-34`), calls the model in `:54-69` and cleans the answer with `cleanInvoiceHeader` and `cleanPrintedLines`
  (`:86-87`). The prompt asks for supplier header and product lines only and says to skip totals, VAT lines, deposits, delivery
  fees and payment lines (`server/utils/invoice-read.js:37`). The model's answer schema has `supplierName`, `supplierTaxId`,
  `supplierPhone`, `invoiceNumber`, `invoiceDate`, `vatIncluded`, rows of `name/quantity/unitPrice/lineTotal/unit/category`
  (`shared/schemas/ai-invoice-read.schema.ts:18-35`).
- The call saves an AI draft: `feature: 'invoice_read'`, the header, rows and printed lines (`server/routes/ai/invoices.js:103-109`;
  `server/services/ai-drafts.js:51-60`; `aiDrafts` is server-only, `server/constants/collections.js:69`).
- `server/services/invoice-memory.js:25-77` teaches the supplier name and VAT habit memory after an apply; it asks `mayLearnFrom`
  (`:48`).

Diagnosis (the consultant's tool)
- `diagnosisSchema`: `menu[].sellPrice`, `pricesIncludeVat`, `vatPct` (default 18), `invoiceIds`, `homeBusinessId`
  (`shared/schemas/entities/diagnosis.schema.ts:11-16`). Router gate `requireHomeModule('consultant_diag')` and `editMoney`
  (`server/routes/diag.js:14-15` setup lines `server/routes/diag.js:29-32`), data read `GET /api/v1/diag/:id/data` (`:164`) returns
  price volatility from `priceHistory` (`:169-174`). It computes no revenue and no overhead. Plans 633, 634, 646, 652 (all done,
  `plans/600-700/`) added the records, the screens, the alerts and the dashboard card.

Modules and permissions
- Five module keys, the defaults, and the table that gates a collection by module: `shared/schemas/modules-pure.ts:4,8,26-34`; the
  business field `modules` (`business.schema.ts:102`), written only by the platform admin; server gates `requireModule` and
  `requireHomeModule` (`server/middleware/require-module.js:47,55`).
- `can()`: owner may do all (`server/utils/permissions.js:52`); a consultant may do everything except `manageTeam` and
  `editSettings` (`:22,53`); staff are refused every `OWNER_ONLY_ACTIONS` action including `editMoney` (`:20,56`);
  `OWNER_ONLY_TYPES` lists the types staff cannot create or change (`:25`). The route-only money guard is `stripMoneyFields`
  and `moneyFieldsChanged` (`:121,170`), and covers staff, not a lock for the owner.
- `aiPrivate` is written by the platform admin only (`business.schema.ts:106-107`); `mayLearnFrom` is the single consent test
  (`server/utils/ai-learning.js:10-12`); the admin learning stats leave out private businesses' drafts (`server/routes/admin-learning.js:33-40`).

Dashboard and settings
- The dashboard shows event-based cards, the baseline comparison, the diagnosis card and price rises
  (`src/app/pages/dashboard/components/`: `business-performance`, `diagnosis-card`, `price-rises-card`); none show a month plan.
- Searches for finance data: `git grep -n -i -E "expense|salary|payroll|payslip|overhead|rent|revenue" -- shared server src`.
  Real business-finance hits are only: event revenue and profit (`menu-event.schema.ts:36,53,104`, `event-pricing.ts`,
  `event-closing.ts:16,61-69`, `business-stats.js`, `business-report.js`, `report.js`), the baseline estimates
  (`business.schema.ts:32,50`), and the seed data (`server/scripts/lib/demo-data.js:141-147,302`). The other hits are the
  English word inside "current", "parent", "different" and the logistics section `rentals` (`shared/schemas/entities/event-logistics.ts:6`,
  `server/services/logistics-seed-items.js:21-49`), which is equipment hire for an event, not a fixed expense.
  No hit at all for `payroll`, `payslip`, `salary` (a Hebrew `שכר` hit in `public/assets/data/dictionary.json:1769` is "השכרות וציוד").

## 4. Requirements matrix

Status: `exists`, `partial` or `missing`. A `missing` row names its searches; the folders searched are `shared`, `server`,
`src` and `public/assets/data` (tests excluded) unless the row says otherwise.

| Requirement | Status | Evidence | What a build needs | Risk to the number's correctness |
| --- | --- | --- | --- | --- |
| M1 expected revenue for a month (owner input) | missing | Searches: `git grep -n -i -E "monthly.?revenue\|expectedRevenue\|revenue.?plan\|plannedRevenue" -- shared server src`: hits are only the per-event `plannedRevenue` (`shared/schemas/entities/menu-event.schema.ts:36`); closest stored values are the baseline `avgRevenuePerEvent` and `eventsClosedPerMonth` (`business.schema.ts:30-32`) | New entity `monthPlans` (one per business and month) with `plannedRevenue`; start value may be offered from the baseline (`avgRevenuePerEvent × eventsClosedPerMonth`) or the last months of `GET /api/v1/stats/report` (`server/routes/stats.js:52`) | A guessed or copied start value looks like a plan; a fixed-price month and an events month differ a lot |
| M2 actual revenue for a month with its source | partial | Event revenue only: `closing.actualRevenue` (`menu-event.schema.ts:53`), rule actual → planned → pricing (`server/services/business-stats.js:38-42`, `server/services/business-report.js:17-19`), monthly buckets (`business-report.js:24`). Searches for a sales file or POS: `git grep -n -i -E "pos\b\|point.?of.?sale\|sales.?report\|csv\|xlsx" -- shared server/routes server/services src/app/core` found only admin CSV exports (`server/routes/admin.js:178,417`) | Entity field `actualRevenue` + `source` on the month; either typed by hand, or summed from closed events with a clear label; a file import is a later slice | A restaurant's walk-in sales are not events: the event sum under-counts; the rule falls back to planned revenue for a closed event with no actual (`business-stats.js:41`), which is not "actual" |
| M3 planned food cost as percent of revenue | partial | Only the pre-FoodVibe estimate `baseline.foodCostPct` (`business.schema.ts:35`, asked in `baseline-tab.component.ts:59`); measured per event `foodCostPct` (`business-report.js:78`, from recipe cost at today's prices) | Month field `plannedFoodCostPct`, offered from the baseline or the measured report value | The recipe-based % uses today's price, not the month's; events are not the whole menu; a baseline estimate is a feeling |
| M4 actual food cost for a month in money, from supplier invoices | partial | Invoices exist with `invoiceDate` (optional, `invoice.schema.ts:29`), line `lineTotal`/`unitPrice` (optional, `:13-14`), `vatIncluded` (optional, `:30`), `price` (`:15`); written only by apply (`server/routes/product-import.js:243-267`). Event suppliers' `actualPaid` is a second source (`menu-event.schema.ts:47`). Details in section 5 | Server read that sums a month of invoices (new endpoint), a stored invoice total or a rule for lines, and an opening/closing stock value; the screen shows what part of the month is covered | Purchases are not usage; no invoice total; an invoice with no date has no month; unpaid lines count as 0; invoices never imported through the price import are missing |
| M5 profit target percent of the business | exists | `settings.profitTargetPct` (`business.schema.ts:12`, default 25 at `:8`), edited at `business-settings-tab.component.ts:52,75`, route `server/routes/business.js:50` | Read it as the start value of the month; decide if the month keeps its own copy | A consultant is refused `editSettings` (`server/utils/permissions.js:22,53`), so he cannot set it for the owner; the event-level target override is a different number (`event-pricing.ts:86`) |
| M6 fixed expense lines (name, monthly amount, plan and actual, owner adds a line) | missing | Searches: `git grep -n -i -E "expense\|overhead\|fixed.?cost\|rent\b\|electricity\|insurance\|municipal" -- shared server src public/assets/data/dictionary.json` — only the event `extraCosts` (one amount per event, `event-pricing.ts:8,78`) and `closing.actualExtraCosts` (`menu-event.schema.ts:52`); `rentals` is event equipment (`event-logistics.ts:6`) | New entity: a month's `fixedLines[]` (`name`, `planAmount`, `actualAmount`, `source`), a fixed starter list of names that is the owner's to edit, a new route and schema, money-field registration (`money-fields.ts`) | Seasonal bills (water, tax paid every two months) spread wrongly across months; VAT included or not in a bill |
| M7 team and salary lines with a per-employee sub-list | missing | Searches: `git grep -n -i -E "salary\|payroll\|payslip\|employee\|wage\|שכר" -- shared server src public/assets/data/dictionary.json` — nothing but the dictionary's "השכרות". The only people model is business members (`server/routes/business.js:303-361`: users and roles, no pay) | New entity `teamLines[]` (role, planned employer cost, optional `employees[]` with name and cost, actual); owner-only | Employer cost (salary plus social contributions) vs gross salary mixes; a person on two roles counted twice; part-time and a changing team during the month |
| M8 rough mode: one total instead of lines | missing | Same searches as M6 and M7 | A month field per group: `fixedTotalPlan/Actual`, `salaryTotalPlan/Actual`, with a mode flag; a rule for switching between modes without losing numbers | A rough total typed by hand cannot be told from a sum of lines; switching mode mid-month can double count |
| M9 provenance of every actual, lock, manual change with approval | missing | Searches: `git grep -n -i -E "changedByHand\|lockedAt\|approvedBy\|provenance\|auditTrail" -- shared server src` — no hit. What exists: invoice `source` photo/pdf/text and `fileId` (`invoice.schema.ts:31-32`), `closing.finishedBy` (`menu-event.schema.ts:55`), `VERSION_HISTORY` collection of older entity versions (`server/constants/collections.js:33`), and a money guard that blocks staff only (`server/utils/permissions.js:121,170`) | A value object `{ amount, source, enteredBy, enteredAt, changedByHand?: { by, at, previous } }` on each actual; server refuses a write that changes a locked value without the explicit approve flag; a source list including standing payment | Without a lock a later invoice or edit changes a closed month silently; a typed value is not distinguishable from a read one |
| M10 missing data counts as 0, listed on the screen | partial | Partial-price warnings exist for event costs: `partial` in the pricing result (`src/app/core/engine/event-pricing.ts:33,42,104`) and `partialPricesPct` in the report (`server/constants/report.js:15`); an invoice line can be `needsReview` and `result: 'no_price'` (`invoice.schema.ts:5,16,20`). No month-level missing list | A server-computed `missing[]` per month (a group with no actual, a month with no invoices, a line with plan and no actual) and the banner "better than reality" | A zero that is really "not entered" makes profit look high; this is the largest wrong-number risk of the screen |
| M11 document capture by AI (bill or payslip into a line) | partial | The pipeline exists for supplier invoices: route `server/routes/ai/invoices.js:36-120`, prompt `server/utils/invoice-read.js:37` (product lines only, totals and VAT lines skipped), file store with a kind list of `invoice` and `voice` only (`stored-file.schema.ts:4,10`), AI draft trail (`server/services/ai-drafts.js:51`). Nothing reads an electricity bill or a payslip | A new AI feature key and route (e.g. `ai/expense-read`) through `server/routes/ai.js` family (INV-6), its own prompt and Zod answer schema (amount, period, vendor; for a payslip only role and employer cost), reuse of `putPrivateFile`, `saveAiDraft`, the limiter pattern and the client's capture flow | The model misreads a number or a period; a bill covering two months; the draft holds the document text (`ai-drafts.js:57-60`): a payslip must never enter it |
| M12 derived numbers (profit, room for the team, break-even, overhead %, dish price) | partial | Only the event version of profit and a minimum price exist: `computeEventPricing` (`src/app/core/engine/event-pricing.ts:84,85,91`). No break-even or overhead; VAT rate is stored only inside a diagnosis (`diagnosis.schema.ts:12-13`, default 18) | A new pure engine `monthly-plan` in the same family as C-PRICING (one place for the formulas, tested), reading plan and actual month values; a VAT rate source for the dish-price formula | Divide by zero or near zero when food cost % plus profit % reaches 100; overhead % from an incomplete month; the dish price needs the dish cost, which is partial when an ingredient has no price |
| M13 a month as a period, history, fixed lines carried forward | partial | A month is only a report bucket for events (`server/services/business-report.js:24`, `:181`); settings and baseline are single, unversioned values (`business.schema.ts:90-92`). No month document. `VERSION_HISTORY` is per entity | New collection `monthPlans` keyed `(businessId, 'YYYY-MM')` with a unique index, a "start next month from this one" server action that copies fixed lines (INV-3: one request), a closed flag | Months in Asia/Jerusalem time (as `monthKeys` does) vs UTC; a settings change (profit target) rewriting past months if the month does not keep its own copy |
| M14 who may see and change; which module switches it on | partial | Owner may do all; consultant everything except `manageTeam` and `editSettings`; staff no `editMoney` (`server/utils/permissions.js:20,22,53,56`); `invoices` and `diagnoses` are owner-only types (`:25`). The module table has no finance key (`shared/schemas/modules-pure.ts:4,26-34`); the diagnosis module is the consultant's own, gated on the home business (`server/routes/diag.js:14`) | New type `monthPlans` in `OWNER_ONLY_TYPES` and in `MONEY_FIELDS`, a new module key (section 6) and a `MODULE_OF_TYPE` row, the owner-read-only staff projection; decide if the consultant may enter numbers | The consultant cannot change salary lines if the team rule is copied (`manageTeam`); a staff projection that forgets a field leaks pay to staff (INV-1) |
| M15 privacy of salary data and payslip photos; `aiPrivate` | partial | `aiPrivate` is platform-admin-only and absent means shared (`business.schema.ts:106-107`, `server/utils/ai-learning.js:10-12`); `invoice_read` drafts hold the document's extracted rows (`server/routes/ai/invoices.js:103-109`); invoice files kept 30 days unless saved (`:100-102`, `file-store.js:149-170`). Nothing special for salary | Rule: payslip photo is not stored and not drafted, the model gets the image and only amount and role are returned; salary data excluded from every platform learning read, whatever `aiPrivate` says; the owner cannot switch `aiPrivate` himself (removed route, `docs/modules/modules-map.md` C-LEARN) | A payslip carries an identity number, a bank account and an address: if any reaches `aiDrafts`, `storedFiles` or a log, it is a privacy breach; default sharing with the platform owner covers drafts of any feature |

## 5. Data-quality risks

Actual food cost (M4), from invoices:
- Totals: an invoice stores lines only; there is no per-invoice total (`shared/schemas/entities/invoice.schema.ts:23-36`). A month's
  food cost would be the sum of `lineTotal`, and `lineTotal` is optional (`:14`), as are `quantity` and `unitPrice` (`:12-13`). A
  line with none of them has no amount; falling back to `quantity × unitPrice` or to `price` (`:15`, the per-unit price the app
  saved, set only when the price was applied, `server/utils/invoice-trail.js:22`) gives a different figure.
- Dates: `invoiceDate` is optional (`invoice.schema.ts:29`; the apply input has it optional too, `:47`). An invoice without it
  has no month; `createdAt` of the document (from `baseDocShape`) is the day the owner saved it, not the invoice date. A
  late entry puts an invoice into the wrong month.
- VAT: `vatIncluded` is optional (`:30`, `:48`); the model sets it true, false or null (`server/utils/invoice-read.js:30`), and
  "false" also means VAT is a separate line, which the prompt skips (`:37`). No stored VAT rate exists on the business; the only
  `vatPct` is inside a diagnosis (`diagnosis.schema.ts:13`). So amounts cannot be made all "before VAT" without the owner
  stating a rate and the flag, and a null flag is a guess.
- Lines the owner did not finish: a line with `needsReview: true` or `result: 'no_price'` or `'invalid'` is still stored
  (`invoice.schema.ts:5,16,20`) and would be counted unless excluded. Lines the model never read (rows beyond the 1,000 cap or the
  200-line invoice cap, `invoice.schema.ts:7`, `ai-invoice-read.schema.ts:34`) are silently absent; the AI read reports a
  `truncated` flag but the saved invoice does not keep it (`ai-invoice-read.schema.ts:65`, no field in `invoice.schema.ts`).
- Coverage: an invoice exists only when the owner imported prices through apply (`server/routes/product-import.js:73-78,267`).
  Purchases that were never photographed (market cash, a delivery note not imported) are missing, and a supplier who bills
  monthly in one document is seen once.
- Purchase is not usage: a month's invoices measure what was bought. Real use is opening stock + purchases − closing stock.
  Stock counts hold quantities in the base unit per product and no value (`stock-count.schema.ts:15-20`); `on-hand` returns the
  latest final count per product, not the count at a month's end (`server/routes/stock.js:195-208`). Valuing a count needs the
  product price at that date (price history rows, `price-history.schema.ts:6-19`). Counts are optional and per product, so the
  correction is only as good as the owner's counting. Until stock is counted, purchases stand in for use and the screen must say so.
- Second source: events' `closing.suppliers[].actualPaid` (`menu-event.schema.ts:47`) is also money paid to suppliers; using both
  sources double counts an event's purchase that also has an invoice (`hasInvoice`, `:49`). One source per month must be chosen.

Other numbers
- Missing counts as 0 (M10): a month with no salaries typed shows a profit that is too high. Section 7's first slices must carry the
  missing list before any derived number is shown.
- Plan vs actual drift: the dish price and the overhead % are derived from a month; a month with a partial food cost (`partial`,
  `event-pricing.ts:104`) must carry its partial flag to the dish price.
- Revenue from events only (M2) leaves walk-in sales out; revenue fallback to the plan for a closed event without an actual
  (`business-stats.js:41`).
- A target or baseline changed later must not rewrite a past month (M13); store the target used in the month.
- Hebrew calendar and Israeli VAT changes (the rate is not a constant): keep the VAT rate on the month.

Document capture (M11, M15)
- Specific to supplier invoices: the prompt (product lines only, `server/utils/invoice-read.js:37`), the answer schema with
  `rows` of products and a `category` (`ai-invoice-read.schema.ts:27-34`), the supplier suggestion by tax id, phone and name
  (`server/routes/ai/invoices.js:92-98`), the product-name memory (`server/services/invoice-memory.js`), the `editMoney`-on-`products`
  guard (`:37`).
- Reusable: the model call and its error mapping (`callGemini`, `respondFromGeminiFailure`; `:54-70`), `extractJsonPayload`
  (`:73`), the private file store `putPrivateFile` (`:100`), `saveAiDraft` (`:103`), the limiter pattern (`:29-34`), the AI usage
  feature list (`server/constants/ai-features.js`, `isAiFeature` `server/services/ai-drafts.js:12`), and the `fileBase64` limits
  (`stored-file.schema.ts:7`).
- The photo is kept at the provider (`provider: 'cloudinary'`, `stored-file.schema.ts:22`): an AI-read invoice file is kept 30 days
  unless the invoice is saved, then forever (`file-store.js:166-170`); a voice file is kept 24 months (`stored-file.schema.ts:14`);
  `kind` accepts only `invoice` and `voice` (`:4`), so a payslip needs either a new kind or no storage at all.
- `aiPrivate` covers only what the learning code asks it about (alias and supplier profile copy, `server/services/invoice-memory.js:48`,
  and the admin learning listing, `server/routes/admin-learning.js:33-40`); the draft trail stores the model's draft whatever the flag.
  Default is shared (`ai-learning.js:10`). A payslip must be excluded by design, not by hoping `aiPrivate` is set.
- Fields of a payslip that must never be stored or sent on: identity number, bank account, home address, phone, birth date, and
  the employee's national insurance and tax numbers; only role and employer cost leave the model call. The prompt must forbid
  them and a server check must drop any key outside the allowed list before anything is saved or logged.

## 6. Architecture impact of a future build

- INV-1 Ownership — touched (new type `monthPlans` in `server/utils/permissions.js:25`, `MONEY_FIELDS` and a staff projection).
  Can be preserved: owner and consultant read and write, staff never see it. The open point is the consultant rule (a decision in
  section 8). No change to the rule itself.
- INV-2 Tenancy — touched (new collection scoped through `server/utils/business-scope.js`; not cloneable, like
  `invoices`, `server/constants/collections.js:62`). Preserved. The master clone must not copy it.
- INV-3 Server owns consistency — touched: carrying fixed lines to a new month and locking a month are multi-field server
  actions in one request. Preserved if they are server routes.
- INV-4 One Zod schema — touched: new entity schemas in `shared/schemas/entities/`, registered in the collections registry and
  the generated schemas (`pnpm run build:schemas`). Preserved.
- INV-5 Taxonomy — touched only if the expense names become a taxonomy; recommended: they do not (a starter list of names stored in
  the month, owner can add). Preserved.
- INV-6 AI only through the server — touched by M11 (a new feature key and a route under `server/routes/ai/`). Preserved.
- C-PRICING (`src/app/core/engine/event-pricing.ts:4`) says it is the only place profit, profit % and minimum price are
  computed. A monthly engine computes `profit`, `profit %` and a "recommended dish price" too. Options: a second engine in the same
  folder that says it is the monthly counterpart and reuses the event engine for dish food cost; or extend the contract by an
  explicit sentence. Either needs the contract text changed and the Human's decision (section 8); do not compute profit in a
  component.
- Consultant diagnosis (`shared/schemas/entities/diagnosis.schema.ts`, `server/routes/diag.js`, plans 633, 634, 646, 652): it
  already has `vatPct`, `pricesIncludeVat`, a menu with `sellPrice`, invoice ids and price volatility. Shared: the invoice records
  and `priceHistory`, the VAT choice, the owner-only type plus the module gate pattern, the dashboard card pattern (plan 652).
  Would be duplicated if not shared: the VAT fields (stored per diagnosis today, would also sit on the month), the menu sell price
  used by the dish-price formula, and the "consultant acting in a client business" access. Recommended: read the VAT rate from one
  business-level place and let diagnosis and month both use it; do not embed the monthly screen in the diagnosis.
- Module key: add `'monthly_plan'` to `MODULE_KEYS` after `consultant_diag` (`shared/schemas/modules-pure.ts:4`) and to the Zod
  names in `shared/schemas/modules.ts`; leave `DEFAULT_MODULES` unchanged (`:8`) so existing businesses see nothing; add the
  `MODULE_OF_TYPE` row for `monthPlans` (`:26`); the screen's own routes use `requireModule('monthly_plan')`
  (`server/middleware/require-module.js:47`), not `requireHomeModule`, because the data belongs to the active business. Platform admin
  switches it on, as for every module (`docs/modules/modules-map.md` C-MODULES).
- Folder structure: a new page folder needs breadcrumbs (`.claude/skills/breadcrumbs/SKILL.md`), and routes in `src/app/app.routes.ts`
  (append only).

## 7. Proposed build slices

Each slice is one Worker session, in dependency order. Files are the likely scope.

1. Module key and the empty month. Files: `shared/schemas/modules-pure.ts`, `shared/schemas/modules.ts`, a new
   `shared/schemas/entities/month-plan.schema.ts`, `server/constants/collections.js`, `server/utils/permissions.js`,
   `shared/schemas/money-fields.ts`, `server/routes/month-plans.js`, tests. Delivers: the platform admin can switch the screen on, the
   owner can create a month, enter revenue, food cost % and profit target (M1, M3, M5, M13 base); staff see nothing.
2. Month rules in one engine plus the missing list. Files: `src/app/core/engine/monthly-plan.ts` (and its spec), a short change to the
   contract line in `event-pricing.ts` only if the Human decides so. Delivers: profit, room for the team, break-even, overhead % and
   the "missing" list with "better than reality" (M10, M12 except dish price).
3. Fixed expense lines and rough mode. Files: month-plan schema, route, a new page folder under `src/app/pages/`, `dictionary.json`
   (append), `app.routes.ts`. Delivers: the owner adds rent, tax, electricity and so on with plan and actual, or one total (M6, M8).
4. Team and salary lines, with sub-lists. Files: same schema family, a team-lines route, the page. Delivers: roles and employees with
   employer cost, plan and actual; owner only (M7, M8). Needs the section 8 privacy decisions first.
5. Provenance, lock and the approved change. Files: month-plan route and schema, a small dialog component from the families
   registry. Delivers: every actual shows its source; a typed change of an actual asks for approval and is marked "changed by hand"
   with who, when and the earlier value (M9).
6. Actual food cost from invoices. Files: a new read in `server/routes/month-plans.js` or `server/services/`, optional stored invoice
   total. Delivers: a month's purchases from approved invoices, with the dates and VAT rules of section 5, and the share of invoices
   without a date or with unfinished lines (M4).
7. Actual revenue entry and a derived dish price. Files: month route, engine, a dish-price card. Delivers: typed monthly revenue with a
   source label, later closed events' revenue as a second source; the recommended dish price (M2, M12).
8. Document capture for bills. Files: `server/routes/ai/expense-read.js`, `shared/schemas/ai-expense-read.schema.ts`,
   `server/constants/ai-features.js`, the capture control. Delivers: a photo of a bill fills amount and period (M11).
9. Payslip capture, only after the privacy decision. Files: the same route with a second document type and an allow-list of answer
   keys. Delivers: role and employer cost only, no photo kept (M11, M15).
10. Stock correction of food cost. Files: the month read in slice 6, stock-count read. Delivers: opening and closing stock value so
    that food cost is usage (M4 correction).
11. Carry forward and history. Files: month routes, the page. Delivers: "start next month" copies the fixed lines and shows the last
    months side by side (M13).

## 8. Decisions for the Human

Each decision lists the options, the recommended one first.

1. Who owns the screen.
   - Recommended: the business's own module (`monthly_plan`), with the consultant able to enter and read numbers when he acts in the
     business, as for other money screens.
   - Or: the consultant's module (`consultant_diag` style), gated on the consultant's home business.
   - Or: owner only, a consultant sees nothing.
2. May the consultant set the profit target? Today he is refused `editSettings` (`server/utils/permissions.js:22`), so the month would
   keep its own copy of the target.
   - Recommended: the month stores its own target, copied from the settings at creation; the consultant may change the month's copy.
   - Or: the target stays only in the business settings; the consultant asks the owner.
3. A payslip photo: kept or only its amounts.
   - Recommended: not kept at all; the model reads it and only role and employer cost are returned, with no draft saved.
   - Or: kept as a private file with a short expiry (like the 30-day invoice rule, `server/routes/ai/invoices.js:100-102`).
   - Or: kept for good, owner only.
4. Salary data and the default AI sharing with the platform owner.
   - Recommended: salary and payslip data are never part of platform learning and never read by the platform admin's learning
     tools, whatever `aiPrivate` is.
   - Or: follow `aiPrivate` like everything else (shared by default, `server/utils/ai-learning.js:10-12`).
5. How overhead is spread over dishes (M12).
   - Recommended: a percent of the dish price (the formula in the requirement; simple, one number for the month).
   - Or: an equal amount per dish sold (needs sales quantities, which the app does not hold).
   - Or: by preparation time (needs step times, `recipe.schema.ts` has `laborTimeMinutes`, and sales quantities).
6. Which source gives actual food cost.
   - Recommended: approved supplier invoices dated in the month, with the stock correction in a later slice, and a clear line
     "purchases, not usage" until stock is counted.
   - Or: the events' `actualPaid` supplier amounts only.
   - Or: typed by hand each month.
7. VAT.
   - Recommended: the month stores one VAT rate (starting at 18) and all money is entered and shown before VAT; invoices with an
     unknown `vatIncluded` are flagged, not guessed.
   - Or: reuse the diagnosis's `vatPct` and `pricesIncludeVat`.
8. C-PRICING (the only place profit is computed).
   - Recommended: a second engine file that names C-PRICING as its event counterpart and reuses it for dish food cost; the contract
     line gets one sentence added.
   - Or: extend `event-pricing.ts` itself (it is a hotspot for the events screens).
9. What counts as a month's revenue before a POS exists.
   - Recommended: typed by hand; closed events' revenue is shown next to it as a hint, not added automatically.
   - Or: events only.
10. Order of building: recommended is slices 1 to 3 first (a month, the engine and the fixed lines) because they need no AI and no
    payroll data; salary and AI capture after the privacy answers.

## 9. Updated decisions (2026-11-24)

Dandan approved every recommended option on 2026-11-24 ("decisions: all recommended"). The reasons and sources are in
[the research report](dish-and-month-research.md), section "Updated decisions". Section 8 above is kept as the
original question; this table is the answer the build plans follow.

| # | Status | Chosen option |
|---|---|---|
| 1 | keep | The business's own `monthly_plan` module; the consultant enters and reads numbers when acting in the business. Per-employee pay is the exception (N-M3). |
| 2 | keep, refined | The month stores its own target set, copied from the settings at creation: food %, labour %, prime % and profit %, plus fixed and overhead %. The consultant may change the month's copy. |
| 3 | keep | A payslip photo is never kept and never drafted; payslip capture itself is deferred until an owner asks. |
| 4 | keep | Salary data is never part of platform learning, whatever `aiPrivate` says. |
| 5 | keep, reworded | Percent of price in industry terms: price = plate cost ÷ target food-cost %, where target food-cost % = 100 − labour % − overhead % − profit %. Computed net and shown × 1.18; an "overhead per dish sold" figure appears only as information once dish sales exist. |
| 6 | keep, refined | Approved invoices keyed on the tax-invoice date, labelled "purchases, not usage", with the stock correction later. Invoices without a date and unfinished lines are flagged and left out; header discounts are spread across lines; a typed purchases total is allowed for cash buys. |
| 7 | change | The rate and dealer type are read from the single business setting (dish decision 6, N-X1); each month keeps a copy of the rate for history. All money is net; an unknown `vatIncluded` is flagged, not guessed. |
| 8 | keep | A second engine file that names C-PRICING as its counterpart, plus one sentence added to the contract. |
| 9 | keep, refined | Revenue is typed by hand, net of VAT and discounts, without tips. Closed events, and later the dish sales import's net total, are shown as hints and never added automatically. |
| 10 | change | The revised slice order below: labour as a total, invoice food cost and carry-forward move ahead of AI capture; per-employee lines move late and payslip capture is deferred. |
| N-M1 | new | The owner types an employer-cost labour total; if only gross is known, gross × an editable factor (default 1.25), labelled "estimate". |
| N-M2 | new | Each line is null (not entered) or a number, where 0 is a real value. The month shows a completeness badge; profit and break-even are labelled "partial" until the key lines exist. |
| N-M3 | new | Per-employee pay lines are owner-only; the server computes labour totals and the consultant and every other non-owner reader receives totals only. INV-1 changed with Dandan's `approve arch change INV-1` (2026-11-24); see ADR 0034. |
| N-M4 | new | Targets are seeded with Israeli bands: food 30–35%, labour 30–35%, fixed and overhead 20–25%, net 5–10%, prime at most 65%. All are editable and the bands are shown next to the actuals. |
| N-M5 | new | "Start next month" copies fixed lines and targets with an optional ±%; missing prior values come across blank, not zero. |
| N-M6 | new | The whole month is Open or Closed; reopening needs a typed reason, and the log records who, when, field, old value and new value. This replaces per-value approval. |
| N-M7 | new | Break-even = fixed ÷ (1 − variable %); daily target = monthly ÷ the month's stored open days. |
| N-M8 | new | Kashrut supervision is one of the starter fixed lines. |
| N-X1 | new | One business-level VAT rate and dealer-type setting, read by dish analysis, the month and the diagnosis (plan 723). |
| N-X2 | new | Closing a month locks the monthly actuals and freezes the dish costs in one server request (INV-3). |
| N-X3 | new | One sales import per month, owned by dish analysis; its net total is offered as the month's revenue hint. The dish import is built before the monthly revenue-source slice. |

**Revised build order** (monthly planning, as chosen):

1. Module and the empty month — unchanged (plan 727).
2. Engine and missing list with null-vs-zero, prime cost, break-even and completeness — unchanged plus N-M2 (plan 728).
3. Fixed lines, rough mode and the labour total with burden factor; labour moves in from old slice 4 (plan 729).
4. Actual food cost from invoices — moved up from 6.
5. Carry-forward — moved up from 11.
6. Month close, reopen and audit — was 5, reshaped by N-M6.
7. Revenue sources and dish price — unchanged.
8. Daily target and break-even progress — new.
9. Per-employee team lines with server-side totals — moved late from 4; owner-only by N-M3 and ADR 0034.
10. Stock correction — unchanged.
11. Bill capture by AI — was 8.
12. Payslip capture — deferred until an owner asks; was 9.

The shared business VAT setting (N-X1) is plan 723.
