# Monthly planning screen — feasibility audit (report only)

Plan 661. Checked commit: `67048d0f` (branch base). Read-only audit: no code, schema or data changed.
All `path:line` references are on that commit. Money is before VAT unless stated.

## 1. Summary for Dandan (Hebrew)

- **הכנסות ויעדים — צריך נתונים חדשים קודם.** יעד הרווח כבר שמור לעסק (`profitTargetPct`), אבל אין "הכנסה צפויה לחודש" ואין "הכנסה בפועל לחודש"; ההכנסות היום שייכות לאירועים (קייטרינג), לא לחודש של מסעדה.
- **עלות מזון בפועל — אפשר להתחיל, עם סייג.** חשבוניות ספק נשמרות עם תאריך ושורות, אבל אין סכום כולל לחשבונית, ורכישות בחודש אינן מה שנצרך בחודש (ספירת מלאי נותנת כמויות בלבד, בלי שווי).
- **הוצאות קבועות — צריך נתונים חדשים קודם.** אין שום מקום שמחזיק שכירות, ארנונה, חשמל וכו'; צריך ישות חדשה, שורות, ושורת "הוסף שורה".
- **צוות ושכר — צריך נתונים חדשים קודם, ורגיש.** אין נתוני שכר בכלל; צריך ישות חדשה, הרשאה לבעלים בלבד, והחלטה על פרטיות (שיתוף עם בעל הפלטפורמה כברירת מחדל).
- **צילום מסמך וקריאה ב-AI — צריך נתונים חדשים קודם.** קריאת חשבונית ספק קיימת וניתנת לשימוש חוזר חלקית (העלאה, שמירת קובץ, טיוטה), אבל ההנחיה והסכמה מיועדות לשורות מוצר; תלוש שכר צריך הנחיה נפרדת ושדות מותרים בלבד.
- **מספרים נגזרים — מוכן לבנייה.** רווח, נקודת איזון, "מקום לצוות" ותקורה הם נוסחאות טהורות; הן נבנות בבטחה רק אחרי שהקלטים קיימים.
- **נעילת ערך בפועל ומקור הערך — צריך נתונים חדשים קודם.** אין שדה מקור/נעילה/"שונה ידנית" בשום ישות פיננסית.
- **חודש כתקופה, היסטוריה והעברת שורות — לא קיים; נבנה מאפס.** יש `monthKeys` לדוחות אירועים, אבל אין ישות חודש.
- **מי רואה — מוכן לבנייה.** בעלים ויועץ כבר זהים בהרשאות כסף (`editMoney`), צוות לא; חסר מפתח מודול חדש.
- **המלצה:** להתחיל בפרוסות קטנות (ישות חודש והכנסות, עלות מזון מחשבוניות, הוצאות קבועות), ורק אחר כך שכר וצילום מסמכים (סעיף 7).
- **החלטות שלך:** מי הבעלים של המסך, האם נשמר צילום תלוש, שיתוף נתוני שכר, ואיך מחלקים תקורה על מנות (סעיף 8).

## 2. Constraints from the project's rules

- Every item belongs to exactly one business; staff never see owner-only money data. Source: `docs/brain/invariants.md`, INV-1 (Ownership).
- The business is the tenant; a new per-business collection is scoped with `scopeFilter` / `stampNew` and is covered by business erase. Source: INV-2, `server/utils/business-scope.js`.
- One Zod schema package in `shared/schemas`; the server validates every write against it (`checkStoredDoc`). A new entity needs a schema, a collection entry and money-field registration. Source: INV-4, `docs/agent/standards-backend.md`, `shared/schemas/money-fields.ts`.
- Cross-document changes (carrying fixed lines forward, closing a month) run in one server request, never a client loop. Source: INV-3.
- Every AI call goes through the server (`server/routes/ai.js`, `server/routes/ai/**`); the browser holds no key. Source: INV-6, `AGENTS.md` hard rules.
- Hebrew UI strings through `translatePipe` + `dictionary.json`; signals only; `inject()`; no `any`. Source: `AGENTS.md`, `_shared/tech-stack.md`.
- Profit is computed only in `src/app/core/engine/event-pricing.ts` (contract C-PRICING, plan 445); a monthly engine must be a separate pure engine, not a second profit formula inside C-PRICING. Source: `src/app/core/engine/event-pricing.ts:4`.
- Modules: a business has a list of switched-on modules; only the platform admin writes it; routes gate with `requireModule` / `requireHomeModule`. Source: `docs/modules/modules-map.md` (C-MODULES), `shared/schemas/modules-pure.ts:4`.
- Invoice, file, draft and learning contracts: C-INVOICE, C-FILES, C-AIDRAFT, C-LEARN, C-AICAP. Source: `docs/modules/modules-map.md`.
- Logs carry ids and counts only, never an amount or a name. Source: `_shared/tech-stack.md` (Logging), `server/routes/diag.js:5`.
- A question to the Human whose answer could break an invariant is asked as INV-n · rule · change · who loses what. Source: `AGENTS.md`.

## 3. What exists today

**Business settings and baseline.**
- `businessSettingsSchema` holds `profitTargetPct` (default 25), `safetyMarginPct`, `overrunThresholdPct`, `priceRiseAlertPct`: `shared/schemas/entities/business.schema.ts:8-18`. Saved by `PUT /api/v1/business/settings` (owner only, `editSettings`): `server/routes/business.js:50-55`. This is the profit target the screen needs (M5).
- `baselineInputSchema` holds `avgRevenuePerEvent`, `estProfitPct` and the optional owner estimate `foodCostPct` (0-100): `business.schema.ts:29-47`. Saved by `PUT /baseline`: `server/routes/business.js:132`. These are averages of "the last 3 months before FoodVibe", not a plan for a month.
- Nothing in the business document holds a month, a fixed expense or a salary: `business.schema.ts:82-108`.

**Revenue.**
- Revenue exists per event only: planned `shared/schemas/entities/menu-event.schema.ts:36` (`plannedRevenue`), actual `menu-event.schema.ts:53` (`closing.actualRevenue`), cached `pricing.revenue` (`src/app/core/engine/event-pricing.ts:93-95`, `toPricingCache` at line 107).
- A monthly figure is computed for events only: `monthKeys` (`server/services/business-report.js:24`) and `closedRevenue` (lines 17-19: actual, then planned, then pricing); `server/services/business-stats.js:38-65`. Exposed by `GET /api/v1/stats/business`: `server/routes/stats.js:23-49`. These are catering events, not restaurant sales.
- A screen that already asks for actual revenue (per event): `src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.html:183-191`.
- No sales report, POS file or daily-sales entity exists (searches under M2 in section 4).

**Supplier invoices (the only stored actual purchases).**
- `invoiceSchema`: supplier, optional `invoiceNumber`, optional `invoiceDate` (`YYYY-MM-DD`), optional `vatIncluded`, `source` photo/pdf/text, `fileId`, `lines[]`: `shared/schemas/entities/invoice.schema.ts:23-36`. A line has optional `quantity`, `unit`, `unitPrice`, `lineTotal`, plus `price` (nullable) and `result`: lines 9-21. There is no invoice-level total and no period field.
- Written only by `POST /api/v1/product-import/apply` (owner or consultant, `editMoney` on products): `server/routes/product-import.js:64-66`; the invoice document is built at lines 249-266 and inserted at line 267. The write is the last step of a non-transactional trail, so prices can be saved while the invoice is not: `product-import.js:18-21`, 203-221, 247, 320.
- Stored lines are copied as printed: `server/utils/invoice-trail.js:14-27` (lines 18-20 copy `quantity`, `unit`, `unitPrice`, `lineTotal`). The AI reads product lines only; subtotals, delivery fees and discounts are skipped: `server/utils/invoice-read.js:37`.
- `invoices` is owner-only for staff writes: `server/utils/permissions.js:25`.
- Price history: one row per created or changed price with `source` invoice/import and `invoiceId`; a price trail, not an amount ledger: `shared/schemas/entities/price-history.schema.ts:6-19`.

**Invoice reading with AI.**
- `POST /api/v1/ai/invoices/read`: `editMoney`, its own limiter (60 per 15 min), one image or PDF up to 1.8 MB base64 in, header + rows out: `server/routes/ai/invoices.js:29-37`, 42-51. Supplier-specific parts: the prompt (`server/utils/invoice-read.js:9-39`), the model-answer schema with `supplierTaxId`, `supplierPhone`, `rows[]` (`shared/schemas/ai-invoice-read.schema.ts:18-35`), supplier matching (`invoices.js:92-98`).
- The file is kept privately: `putPrivateFile(... kind: 'invoice', deleteAfterDays: 30)` at `invoices.js:100-102`; `keepStoredFile` clears the expiry when an invoice is saved (`server/services/file-store.js:166-170`, called at `product-import.js:272-278`). Stored-file kinds are only `invoice` and `voice`: `shared/schemas/entities/stored-file.schema.ts:4`. Voice files are kept 730 days: `stored-file.schema.ts:14`.
- The draft trail `aiDrafts` stores the model's read of the document: `invoices.js:103-109`.

**Stock counts.**
- `stockCountSchema`: `countedAt`, `status` draft/final, `lines[]` of `productId`, `quantity`, `unit`, `baseQuantity`: `shared/schemas/entities/stock-count.schema.ts:8-23`. Quantities only: no price, no value. Written only by `server/routes/stock.js:3`.

**Diagnosis (consultant).**
- `diagnosisSchema`: a consultant's menu with sell prices over a period, `pricesIncludeVat`, `vatPct` (default 18), `invoiceIds`: `shared/schemas/entities/diagnosis.schema.ts:7-17`. `GET /api/v1/diag/:id/data` returns the diagnosis and price volatility from `priceHistory`: `server/routes/diag.js:164-177`. Gated by `requireHomeModule('consultant_diag')`: `diag.js:28-30`. It has no revenue, no overhead and no profit.

**Permissions and modules.**
- `editMoney` is owner and consultant, never staff: `server/utils/permissions.js:20`, 52-56. `manageTeam` and `editSettings` are refused for a consultant: `permissions.js:22`.
- Module keys `events`, `event_logistics`, `frontdesk`, `ai_create`, `consultant_diag`; defaults exclude `consultant_diag`: `shared/schemas/modules-pure.ts:4-8`. Type-to-module table: `modules-pure.ts:26-34`.
- `aiPrivate` is a platform-admin flag; the default is to share: `server/utils/ai-learning.js:4,10-12`; written by `server/services/business.js:87-89`.

**Screens.** Dashboard cards read `/stats/business` (`src/app/pages/dashboard/components/business-performance/business-performance.component.ts:85-90`). Settings tabs are team, access, business, baseline: `src/app/pages/settings/settings-tabs.ts:18-30`.

**Free-text search for finance data** (`git grep -n -i -E "expense|salary|payroll|payslip|overhead|rent|revenue" -- shared server src`): the real finance hits are event revenue (`menu-event.schema.ts:36,53,104`, `server/utils/closing-rules.js:89`, `business-report.js`, `business-stats.js`, `src/app/core/engine/event-closing.ts:16-69`), the event `extraCosts` (`event-pricing.ts:9,56`) and the baseline `avgRevenuePerEvent`. The `rent` hits are "rentals" logistics checklist labels (`server/services/logistics-seed-items.js:21-49`), not money. There is no hit for salary, payroll, payslip, overhead or a fixed expense.

**Existing screens that already ask for a number the new screen needs.**
- Profit target: Settings, business tab (`business.schema.ts:8`).
- Food cost % estimate and estimated profit %: Settings, baseline tab (`business.schema.ts:35,33`). A build should read these as the default plan values instead of asking twice.
- Actual revenue of an event: the event closing dialog (`event-closing-dialog.component.html:183-191`).

## 4. Requirements matrix

Status is `exists`, `partial` or `missing`; one row per requirement.

| Req | Status | Evidence | What a build needs | Risk to the number |
| --- | --- | --- | --- | --- |
| M1 expected revenue for a month | missing | Revenue is per event only: `menu-event.schema.ts:36`; baseline `avgRevenuePerEvent` is a past average: `business.schema.ts:32`. Searches: `git grep -n -i -E "monthlyPlan\|expectedRevenue\|monthPlan\|revenuePlan" -- shared server src` (no hit; folders shared, server, src). | New `monthlyPlans` entity (businessId, month, expectedRevenue) and an owner input endpoint. | A figure typed once and never revisited makes every derived number look healthy. |
| M2 actual revenue for a month, with source | partial | Only event revenue by month: `business-report.js:17-24`, `business-stats.js:38-65`, `server/routes/stats.js:23-49`. Searches: `git grep -n -i -E "salesReport\|dailySales\|zReport\|cashRegister\|turnover" -- shared server src` (no hit). | A monthly actual-revenue field with `source` (typed, sales-report file); later a POS import. Event revenue may be offered as a suggested value. | Event revenue misses walk-in sales; it falls back to planned revenue when actual is absent (`business-report.js:18`), so a month may mix planned and actual. |
| M3 planned food cost % of revenue | partial | Owner estimate `foodCostPct` in the baseline: `business.schema.ts:35`; per-event food cost % computed from dishes: `business-report.js:78`. Search for a monthly target: `git grep -n -i -E "targetFoodCost\|foodCostTarget\|plannedFoodCost" -- shared server src` finds only the legacy per-event `targetFoodCostPct` (`shared/schemas/field-map.v1-to-v2.ts:258`). | A plan field `foodCostPct` on the monthly plan, defaulted from the baseline estimate. | The baseline value is an optional guess about the past, not a target. |
| M4 actual food cost in money from invoices | partial | Invoices have `invoiceDate`, `lines[].lineTotal`, `vatIncluded`: `invoice.schema.ts:23-36`, 9-21; written at `product-import.js:249-267`. No invoice total; `invoiceDate` and `lineTotal` optional; the VAT flag is stored but never applied to amounts. See section 5. | A server aggregate by `invoiceDate` month (sum of `lineTotal`, else `quantity × unitPrice`, net of VAT by `vatIncluded`), an invoice total field, and a "data complete" flag. | Invoices never approved are absent; purchases are not usage; a missing date drops an invoice out of every month. |
| M5 profit target percent | exists | `profitTargetPct`, default 25: `business.schema.ts:8-12`; saved by `server/routes/business.js:50-55`; used at `event-pricing.ts:76`. | Read as the default; allow a per-month override on the plan. | Low. The event target is a different thing from a business target; the label must say so. |
| M6 fixed expense lines (plan and actual, add a line) | missing | No such entity. Searches: `git grep -n -i -E "fixedExpense\|expenseLine\|utility\|electricity\|arnona\|insurance" -- shared server src` (no hit; the only `rent` hits are logistics labels `server/services/logistics-seed-items.js:21-49`). | A `monthlyLines` entity (kind fixed, name, planAmount, actualAmount, source), owner-added lines, a few seeded names. | A forgotten line understates cost; see M10. |
| M7 team and salary lines with per-employee sub-list | missing | `team` in `server/routes/business.js:303-361` is app login users, not payroll. Searches: `git grep -n -i -E "salary\|payroll\|payslip\|employerCost\|wage\|headcount" -- shared server src` (no hit; the `staff` hits are access roles, `permissions.js:54`). | Lines with a role name and optional `children[]` of employees; `monthlyLines` kind salary; owner and consultant only. | The most sensitive data; employer cost versus gross wage confusion; sub-lines must sum to the parent. |
| M8 rough mode (one total) | missing | Nothing to total. Same searches as M6 and M7. | A group flag `totalOnly` with a single amount while the lines are hidden. | Switching from rough to detail mid-month can double count if both are summed. |
| M9 actual value source, lock, "changed by hand" audit | missing | Invoices record `source` photo/pdf/text and `createdBy` only: `invoice.schema.ts:31`; price history records `by` and `at`: `price-history.schema.ts:14-15`. Nothing exists for an actual value. Searches: `git grep -n -i -E "lockedAt\|changedByHand\|manualOverride\|overrideReason\|previousValue" -- shared server src` (no hit). | On each actual value: `source`, `locked`, `changes[]` (by, at, previousValue); the change route requires an explicit approve flag. | If the lock lives only in the UI, an API write can still change a closed month. |
| M10 missing data counts as 0 and is listed | missing | No month and no required-line list. Searches: `git grep -n -i -E "missingData\|incompleteMonth\|dataComplete" -- shared server src` (no hit). Closest is the onboarding setup status: `server/routes/business.js:265`. | A derived "missing" list: lines with no actual, months with no invoices, no revenue; shown with the "better than reality" warning. | Counting 0 overstates profit; the warning must sit next to the number. |
| M11 document capture of a bill or payslip | partial | Image/PDF upload, model call, private file and draft exist for supplier invoices: `server/routes/ai/invoices.js:36-109`. Prompt, schema and matching are product-invoice specific: `invoice-read.js:9-39`, `ai-invoice-read.schema.ts:18-35`. Stored-file kinds are `invoice` and `voice` only: `stored-file.schema.ts:4`. | A second read route and prompt for expense bills (amount, period, supplier) and payslips (role and employer cost only); a new file kind; an owner confirm step before saving. | The AI misreads an amount or the billing period; a payslip read can capture an identity number or bank account unless the schema forbids it. |
| M12 derived numbers | missing | No monthly engine. Event profit lives only in `event-pricing.ts:4,79-101` (C-PRICING). Searches: `git grep -n -i -E "breakEven\|breakeven\|overheadPct\|roomForTeam" -- shared server src` (no hit). | A pure `monthly-economics` engine with the five formulas, unit-tested; recommended dish price reads dish food cost from the recipe cost. | Division by zero when food cost % plus profit target % reaches 100; the recommended price depends on the overhead choice (section 8). |
| M13 a month as a period; history; carry forward | partial | Month keys exist for event reports: `business-report.js:24-33`. No month entity or carry-forward. Searches: `git grep -n -i -E "carryForward\|copyFromPrevious\|monthStatus\|periodClosed" -- shared server src` (no hit). | `monthlyPlans` with `month` (`YYYY-MM`, Jerusalem time), status open/closed, and a server route that copies the previous month's fixed lines (INV-3). | Month boundaries must use Jerusalem time like `jerusalemDate` in `business-report.js:25`. |
| M14 who may see and change; module switch | partial | `editMoney` allows owner and consultant, never staff: `permissions.js:20,52-56`. Modules: `modules-pure.ts:4-8`, gate `server/middleware/require-module.js:47-55`. No monthly key or type in `MODULE_OF_TYPE` (`modules-pure.ts:26-34`). | A new module key (section 6), type entries, owner and consultant routes, and no staff projection. | A type missing from `OWNER_ONLY_TYPES` (`permissions.js:25`) lets staff create it; salary lines must never be in a staff projection. |
| M15 privacy of salary and payslip photos vs `aiPrivate` | partial | `aiPrivate` only gates platform learning copies: `ai-learning.js:4-12`; the default shares. An invoice read writes the model's read into the draft trail: `invoices.js:103-109`. Search: `git grep -n -i -E "payslip\|salary" -- docs shared server src` (no hit). | A rule that finance reads are never copied into shared learning whatever `aiPrivate` says; a payslip file deleted after the read or after a short fixed period. | A payslip draft would be stored in the AI trail by default, and sharing is on by default. |

## 5. Data-quality risks

**M4 — can the actual food cost of a month be computed from invoices?** Partly. The gaps (from `invoice.schema.ts` and `product-import.js`):
- **Total.** Only lines are stored; no per-invoice total (`invoice.schema.ts:23-36`). A total must be summed from `lineTotal`, which is optional (`invoice.schema.ts:14`). A line with `unitPrice` and `quantity` can be multiplied; a line with neither adds nothing. Lines the AI skipped (delivery fees, discounts) are never in the stored invoice (`invoice-read.js:37`), so a sum of lines differs from the printed total.
- **Date.** `invoiceDate` is optional (`invoice.schema.ts:29`, and in the apply input at line 47). The AI copies it as printed and the server parses it (`invoice-read.js:29`, `parsePrintedDate` at line 48). An invoice with no date cannot be placed in a month; the fall-back is `createdAt` (the approval day).
- **VAT.** `vatIncluded` is stored as a flag only (`invoice.schema.ts:30`, `product-import.js:258`) and the model may return null (`ai-invoice-read.schema.ts:25`). Nothing converts amounts to net or gross, and no VAT rate is stored on the business (the diagnosis has `vatPct`, `diagnosis.schema.ts:13`, the business does not). Mixed invoices would add gross and net together.
- **Unread or unreviewed lines.** `needsReview` is stored (`invoice.schema.ts:16`) and results `invalid`, `no_price`, `duplicate` too (`invoice.schema.ts:6`). A month sum must decide whether to count them; the safest rule is to count every line with an amount and show how many carry `needsReview`.
- **Not every purchase is entered.** Only invoices passed through the import screen exist (`product-import.js:6-26`); cash purchases and unphotographed invoices are absent. A trail failure also leaves prices saved with no invoice (`product-import.js:18-21`, 320).
- **Purchases are not usage.** A month's purchases include stock bought for the next month. `stock-count.schema.ts:8-23` holds quantities per product at `countedAt` but no price, so opening plus purchases minus closing is possible only as a rough estimate (valued at the current source price) and only if the owner counts at both month ends.
- **Duplicates.** The same invoice photographed twice creates two invoices; nothing enforces uniqueness of `(supplierKey, invoiceNumber)` (`invoice.schema.ts:28,34`).
- **Plan versus actual food cost %.** Event food cost uses recipe cost (`business-report.js:78`); monthly actual would use purchases, so the two will not agree.

**M11 and M15 — an expense bill and a payslip.**
- **Reusable from the invoice pipeline:** the upload and size/mime limits (`invoices.js:42-51`, `stored-file.schema.ts:7-12`), `callGemini` with the usage ledger (`invoices.js:54-69`), private file storage (`file-store.js:120-150`), the draft trail (`invoices.js:103-109`), the rate limiter (`invoices.js:29-34`).
- **Specific to supplier product invoices:** the system prompt (`invoice-read.js:9-39`), the answer schema with product `rows` (`ai-invoice-read.schema.ts:18-35`), `normalizeReceiptRows` and supplier suggestion (`invoices.js:90-98`), and the permission check on `products` (`invoices.js:37`).
- **Photo retention.** An unsaved invoice file expires after 30 days (`invoices.js:101`); a saved one is kept with no expiry (`file-store.js:166-170`); voice is 730 days (`stored-file.schema.ts:14`). A payslip needs its own rule; recommended: delete after the owner confirms the amounts.
- **`aiPrivate`.** It only stops the platform from copying an approved AI example into the shared pool (`ai-learning.js:4-12`, `server/routes/ai.js:199-201`). It does not stop the image from reaching the model provider, and the owner cannot set it (platform admin only, `server/services/business.js:87-89`). The default is share, so salary AI reads need an explicit never-share rule.
- **Payslip fields that must never be stored:** identity number, bank account, home address, and anything that is not role and employer cost. The answer schema must list only the allowed fields (a strict object, as `invoice.schema.ts` uses), and the prompt must say not to return the rest.
- **Misreads.** The model copies numbers as printed (`invoice-read.js:35`); a bill's period may span two months, so the owner must confirm the month.

**Other risks.**
- Revenue from events falls back from actual to planned to pricing (`business-report.js:17-19`); a month's "actual" label must say which was used.
- A new entity written through the generic API without an owner-only entry would be creatable by staff: `permissions.js:25,59`.
- Months are Jerusalem time (`business-report.js:24-25`).

## 6. Architecture impact of a future build

- **INV-1 Ownership:** touched; preservable. Every monthly document carries `businessId`; staff read nothing (add the types to `OWNER_ONLY_TYPES`, `permissions.js:25`, and give them no staff-read entry). A consultant reads and writes as the owner does (`permissions.js:53`) except settings.
- **INV-2 Tenancy:** touched; preservable. New collections are per business, not master-synced, and added to business erase.
- **INV-3 Server owns cross-document consistency:** touched; preservable. Carrying fixed lines forward and closing a month are single server requests.
- **INV-4 One Zod schema package:** touched; preservable. New entity schemas in `shared/schemas/entities/`, validated with `checkStoredDoc`; money fields registered in `shared/schemas/money-fields.ts`.
- **INV-5 Taxonomy:** not touched, unless expense-line names become taxonomy terms; recommended not to.
- **INV-6 AI through the server:** touched only by M11; preservable by adding the read route beside `server/routes/ai/invoices.js` and nowhere in the browser.
- **C-PRICING** (`src/app/core/engine/event-pricing.ts:4`) is the only place event profit is computed. A monthly engine must live in its own file (for example `src/app/core/engine/monthly-economics.ts`) and compute month profit and break-even; it must not recompute event profit, and its header comment must say it is the monthly counterpart. The recommended dish price reads dish food cost from the recipe engine, not from event pricing.
- **Share with the diagnosis, and what would be duplicated.** Both read `invoices` and `priceHistory` (`diag.js:164-177`), both gate on `editMoney` (`diag.js:28-30`), and plan 634 prints a margin report from the same invoice data. Shareable: an invoice-aggregation helper and the VAT convention (`diagnosis.schema.ts:12-13`). Duplicated if not shared: VAT handling and the dish food-cost source. The diagnosis holds no revenue or overhead, so it cannot supply M1-M13. Plans 633, 634, 646 and 652 (`plans/600-700/`) cover the diagnosis records, screens, alerts and dashboard card.
- **Module key.** Add `monthly_economics` to `MODULE_KEYS` (`shared/schemas/modules-pure.ts:4`), not to `DEFAULT_MODULES` (line 8), with its type entries in `MODULE_OF_TYPE` (line 26). The switch for a business stays platform-admin only (`business.schema.ts:101`).

## 7. Proposed build slices

Each slice fits one Worker session, in dependency order.
1. **Month entity and plan inputs (M1, M3, M5, M13 base).** Files: `shared/schemas/entities/monthly-plan.schema.ts`, `shared/schemas/entities/index.ts`, `shared/schemas/modules-pure.ts`, `server/routes/monthly.js`, `server/utils/permissions.js`. Delivers: the owner can create a month with expected revenue, food cost % and profit target (defaulted from settings and baseline).
2. **Pure monthly engine (M12).** Files: `src/app/core/engine/monthly-economics.ts` and its spec. Delivers nothing visible; fixes the formulas, tested, including the divide-by-zero cases.
3. **Fixed expense lines with plan and actual (M6, M8, M9 base).** Files: `shared/schemas/entities/monthly-line.schema.ts`, `server/routes/monthly.js`, a screen under `src/app/pages/monthly/`. Delivers: the owner adds fixed lines and types actuals, with source "typed by hand" and the lock.
4. **Actual food cost from invoices (M4).** Files: `server/services/monthly-food-cost.js`, an invoice `total` field in `shared/schemas/entities/invoice.schema.ts`, `server/routes/product-import.js`. Delivers: the month's food cost from approved invoices, with counts of invoices missing a date or needing review.
5. **Missing-data list and the derived block (M10, M12 display).** Files: the monthly page and its components. Delivers: profit, break-even and room for the team, with the "better than reality" warning.
6. **Actual revenue entry (M2).** Files: the monthly route and page; later a sales-file import. Delivers: typed monthly actual revenue with its source, with event revenue as a suggestion only.
7. **Team and salary lines (M7, M15).** Files: the line schema (role, children), the owner-only guard, the privacy rule in `server/utils/ai-learning.js` or a new check. Delivers: roles with employees, owner and consultant only.
8. **Carry forward and history (M13).** Files: `server/routes/monthly.js`, the page. Delivers: "start next month from this one".
9. **Document capture for bills and payslips (M11).** Files: `server/routes/ai/expense-bills.js`, `shared/schemas/ai-expense-read.schema.ts`, `shared/schemas/entities/stored-file.schema.ts`. Delivers: a photo becomes a proposed line the owner confirms.
10. **Recommended dish price (M12 last formula).** Files: the recipe or dish page and the monthly engine. Delivers: the price that covers overhead and profit, after the overhead decision.

## 8. Decisions for the Human

1. **Who owns the screen?** (a) The business's own module with consultant access, recommended: matches `editMoney` (`permissions.js:20,53`) and lets the owner use it without a consultant. (b) The consultant module (`consultant_diag`): only consultants see it. (c) Both, with different screens.
2. **A payslip photo: keep it or only its amounts?** (a) Keep only the role and employer cost, delete the photo after confirmation, recommended. (b) Keep the photo 30 days like an unsaved invoice (`invoices.js:101`). (c) Keep it as long as the business exists.
3. **Salary data and the platform owner.** (a) Never shared and never copied into learning, whatever `aiPrivate` says, recommended. (b) Follow `aiPrivate` (shared by default). (c) Shared only when the owner switches it on.
4. **How is overhead spread over dishes?** (a) A percent of the dish price (overhead ÷ revenue), recommended: it is the M12 formula and needs no sales-count data. (b) An equal amount per dish sold: needs a count of dishes sold per month, which does not exist. (c) By preparation time: needs a time per recipe, which the recipe does not hold.
5. **Which revenue counts?** (a) Typed monthly actual, with event revenue offered as a suggestion, recommended. (b) Events only. (c) Wait for a POS import.
6. **Do invoices count as food cost with or without VAT?** (a) Without VAT, using `vatIncluded` and a business VAT-rate setting, recommended. (b) As printed. (c) Ask per invoice.
7. **Month food cost: purchases or usage?** (a) Purchases, labelled as such, recommended. (b) Purchases corrected with stock counts at both month ends, only when two counts exist.
