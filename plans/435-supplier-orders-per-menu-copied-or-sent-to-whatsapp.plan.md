# Plan 435 — Supplier orders per menu, copied or sent to WhatsApp

Status: draft
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110
Track: code

## Problem Statement
After plan 434 the menu's shopping list is right, but it is grouped by category and only leaves the app as Excel,
preview or print. A chef orders by supplier, on WhatsApp. Today there is no per-supplier view, no copy, no share and
no WhatsApp link anywhere in the app (`clipboard|navigator.share|whatsapp|wa.me`: none in `src/`). Suppliers already
carry `nameHebrew`, `phone`, `phone2`, `contactPerson` (`supplier.schema.ts`).

## Goals & Success Criteria
- Primary: from a menu, the chef opens "הזמנות לספקים", sees one card per supplier with the engine's quantities, and
  sends each order to that supplier's WhatsApp (or copies it) in one tap, with the exact message format of spec 04.2.

Done when:
- [auto] `npx ng build` exits 0.
- [auto] `npx ng test --watch=false --include='src/app/core/utils/supplier-orders.util.spec.ts' --include='src/app/pages/menu-intelligence/components/supplier-orders/**/*.spec.ts' --include='src/app/pages/menu-intelligence/components/menu-export-sheet/**/*.spec.ts'`
  passes (0 failures), including, on the plan-433 fixture (`buildFixtureInput()`, `FIXTURE_SUPPLIERS`):
  - `buildSupplierOrders`: card "ירקן" holds עגבנייה and שמן זית; card "ספק א" does not exist (tomato is cheaper at
    "ירקן"); a "ללא ספק" card holds לימון with `partial` true; estimated total of "ירקן" = 157.75.
  - `buildOrderMessage` for "ירקן" with business "מטבח בדיקה" returns exactly (each `‏` is U+200F, `\n` line breaks,
    empty lines carry no RLM):
    `‏הזמנה – מטבח בדיקה\n‏לאירוע: אירוע בדיקה · 20.11.2026\n\n‏עגבנייה – 18.75 ק"ג (2 ארגז)\n‏שמן זית – 1.6 ק"ג\n\n‏תודה!`
  - `buildAllOrdersMessage` → the same header, then per card a supplier-name line, its lines, and one empty line
    between cards ("ירקן" first, "ללא ספק" last), then `‏תודה!`; the "לבדיקה" lines are not in it.
  - An unlinked line, a `no_conversion` line and a `deleted` line land in `review` (the "לבדיקה" card), never in a
    supplier card or a message.
  - `toWhatsAppPhone('050-1234567')` → `'972501234567'`; `'+972 52 765 4321'` → `'972527654321'`; `'03-1234567'` →
    `null`; `''` → `null`.
  - Component: WhatsApp on a supplier with a valid phone calls `window.open` with
    `https://wa.me/972527654321?text=` + `encodeURIComponent(message)`; no phone + `navigator.share` present → calls
    `share({ text })`; no phone, no share → copies and shows `supplier_orders_copied`; invalid phone → copies and shows
    `supplier_orders_invalid_phone`; `clipboard.writeText` rejecting → shows the manual-copy textarea holding the message.
  - Empty plan (no raw lines) → the `supplier_orders_nothing` text, no cards.
  - Export sheet: the new "הזמנות לספקים" button emits `openSupplierOrders` after `close`.
- [auto] `git diff --numstat origin/mvp...HEAD -- src/app/pages/menu-intelligence/menu-intelligence.page.ts` shows
  added ≤ deleted (growth-frozen).
- [auto] Every icon name added to the new templates (`grep -o 'name="[a-z0-9-]*"'`) appears in both the
  `lucide-angular` import and `LucideAngularModule.pick` in `src/app/app.config.ts`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] WhatsApp opens with the order ready on Android, on iPhone and on desktop; copy and "העתק הכל" paste
  correctly right-to-left (cards ①–⑥ below).

Human checks (written for the hand-off cards; use a menu whose products have suppliers, one supplier with a mobile
phone, one product without a supplier):
1. **Open from the toolbar (desktop)** — `/menu-intelligence/<menu id>` → pill "הזמנות לספקים". SEE ✓ one card per
   supplier with name, phone, product · qty · unit lines and "סה״כ משוער ₪"; a "ללא ספק" card without a WhatsApp
   button. Also FAB → "הזמנות לספקים" opens the same screen.
2. **Send on Android** — on an Android phone, same menu → FAB → "הזמנות לספקים" → "שלח ב-WhatsApp" on the supplier
   with a phone. SEE ✓ WhatsApp opens on that supplier's chat with the message typed in; lines right-aligned, quantity
   and unit after the name; a line with an English product name (e.g. Mozzarella) does not flip.
3. **Send on iPhone** — repeat 2 on an iPhone. SEE ✓ same.
4. **Send on desktop** — repeat 2 on the PC. SEE ✓ WhatsApp Web/Desktop opens with the message ready.
5. **Copy** — "העתק" on a card, paste into a WhatsApp chat. SEE ✓ toast "הועתק – הדבק ב-WhatsApp"; the pasted text
   is one product per line, no prices.
6. **Copy all** — "העתק הכל", paste. SEE ✓ every supplier appears, each starting with its name, separated by an
   empty line; the quantities equal the menu's shopping list (FAB → רשימת קניות → תצוגה).

## Execution Mode
- Parallel: no — writes `menu-intelligence.page.ts` (shared with 434, 437, 441–446) and sits in the
  `menu-export.service.ts` group (434, 436, 437). Never run alongside 434, 436, 437, 441, 442, 443, 444, 445, 446.
- Concurrent plans: lane 1 (424–432, 448) may run alongside; run `node scripts/scope-check.mjs --overlap --plan=<this>`.
- Isolated DB: no — no data written.

## Execution Notes
- Depends on: plan 434 merged (engine wired; `no_supplier`, `partial_total`, `line_status_*` dictionary keys).
- Lane wt-2: 423 → 433 → 434 → **435** → 436 → 437 → 430.
- Must not run at the same time as (map hotspot list): 434, 436, 437 (`menu-export.service.ts` group — this plan does
  not edit that file, the rule stands for the lane); 441–446 (`menu-intelligence.page.ts`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  Under run mode every `origin/main` in a Done-when command reads `origin/mvp`.
- Decision (Planner review): short units in the message come from the existing `units` dictionary group (`kg` ק"ג,
  `gram` גרם, `liter` ליטר, `ml` מ"ל are already short); only `unit_short_unit` "יח'" is new, because `units.unit` is
  "יחידה" — why: no duplicate keys for values the dictionary already holds.
- Cross-lane: 446 (event closing) waits for this plan; 443's stage trigger "offer to open הזמנות לספקים" uses the
  `openSupplierOrders` entry this plan adds.
- Business name: if `src/app/core/services/business.service.ts` (contract C-BUSINESS, lane 1) exists on
  `origin/main` at take time, use `BusinessService.business_()?.name`; otherwise use `UserService.user_()?.name`
  (until plan 426 merges each user is their own business).

## Contracts (verbatim from the approved MVP map)

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
  - `RawLine = { productId: string | null, name: string, unit: string /* base unit */, netQty: number, buyQty: number, purchase?: { unit: string, count: number }, supplierId: string | null, lineCost: number | null, dishIds: string[], status: 'ok' | 'unlinked' | 'deleted' | 'no_conversion' }`
  - `PrepLine = { prepId: string, name: string, qty: number, unit: string, dishId: string, station: string }`
  - `DishCost = { itemKey: string, recipeId: string, cost: number, partial: boolean }`
  - `MissingItem = { kind: 'unpriced' | 'unlinked' | 'deleted', productId?: string, name: string, recipeIds: string[] }`
  - `EngineError = { kind: 'cycle' | 'no_yield', name: string }`
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

**C-BUSINESS (424 creates the collection; 429/431 add fields)** — only the client part is used here:
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

### Contract extension this plan adds
- `src/app/core/utils/supplier-orders.util.ts` exports `buildSupplierOrders(plan, productsById, suppliersById) →
  { cards: SupplierOrderCard[], review: RawLine[] }` with `SupplierOrderCard = { supplierId: string | null, name: string,
  phone: string | null, lines: RawLine[], total: number, partial: boolean }`, plus `buildOrderMessage`,
  `buildAllOrdersMessage`, `toWhatsAppPhone`. Plan 437 (print one page per supplier) reads `buildSupplierOrders`; plan
  446 groups the same `RawLine.supplierId` / `lineCost` itself in `buildPlanSnapshot` — Σ card totals = Σ snapshot
  planned costs = `eventFoodCost`. Plan 444 (P7) later adds a partial badge to this screen's cards.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/supplier-orders.util.ts
src/app/core/utils/supplier-orders.util.spec.ts
src/app/pages/menu-intelligence/components/supplier-orders/**
src/app/pages/menu-intelligence/components/menu-export-sheet/**
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/app.config.ts
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client-only screen reading existing data; no route, schema, taxonomy, data-service write or
  AI call. WhatsApp is an outbound `wa.me` link, no API or key.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `EventPlanService.planFor`,
`buildFixtureInput`, `FIXTURE_SUPPLIERS`, `formatQty`, `formatMoney` (433); `ngOnInit` `heroFab.setPageActions`,
`getCurrentMenuForExport`, `closeAllExportOverlays`, the `pill-row` toolbar in the page html, `<app-menu-export-sheet>`
outputs (434 state); `KitchenStateService.productsById_` / `suppliersById_`; `UserService.user_`; whether
`BusinessService` exists (see Execution Notes). Print `ok` / `conflict: <what>` per symbol.

## User Stories
- As a chef, I want one order per supplier with the right quantities so that I don't regroup the shopping list by hand.
- As a chef, I want to send an order to a supplier's WhatsApp in one tap so that ordering takes a minute, not twenty.
- As a chef, I want unclear lines held back in "לבדיקה" so that a supplier never gets a wrong or unlinked item.
- As a chef, I want to see the estimated cost per supplier (only on my screen) so that I know what to expect.

## Functional Requirements

### Must Have (P0)
- [ ] Entry from the page toolbar (pill "הזמנות לספקים"), from the hero FAB and from the "צ׳קליסט והדפסות" sheet,
      on mobile and desktop.
- [ ] One card per chosen supplier (engine `supplierId`), ordered by supplier name; then "ללא ספק" (lines with
      `supplierId` null, status `ok`); then "לבדיקה" (status `unlinked`, `no_conversion`, `deleted`), never sendable.
- [ ] Card: name, phone (if any), lines `name · qty · unit` (+ purchase units), "סה״כ משוער" ₪ with "חלקי" when any
      line has no cost; buttons "העתק" and (not on "ללא ספק") "שלח ב-WhatsApp". Top: "העתק הכל".
- [ ] Message: exact spec format, RLM at the start of every non-empty line, no prices, no emoji, short Hebrew units,
      `formatQty` rounding, purchase units in parentheses.
- [ ] WhatsApp: valid Israeli mobile → `https://wa.me/9725XXXXXXXX?text=…` in a new tab/app; no phone → native share
      sheet; no share support → copy; invalid phone → copy + "מספר לא תקין – הועתק להדבקה".
- [ ] Copy → toast "הועתק – הדבק ב-WhatsApp"; clipboard blocked → a selected read-only textarea for manual copy.
- [ ] No raw lines → "אין מה להזמין".

### Should Have (P1)
- [ ] `phone` empty but `phone2` set → use `phone2`.

## UI/UX Notes
- New child component `pages/menu-intelligence/components/supplier-orders/` (`app-supplier-orders`): full-screen
  sheet using `.c-modal-overlay` / `.c-modal-card` engine classes; RTL; logical CSS only; cards stack on phone, two
  columns from 768px. Lazy: rendered in the page html as
  `@if (supplierOrdersEvent_(); as ev) { @defer { <app-supplier-orders [event]="ev" (close)="supplierOrdersEvent_.set(null)" /> } }`
  (plan 419 bundle budget). Run the `cssLayer` skill before writing its `.scss`.
- Message date: `eventDate` `YYYY-MM-DD` → `DD.MM.YYYY`; no date → `לאירוע: [שם האירוע]` without ` · `.
- Purchase units show the unit's name as stored (e.g. "ארגז"); Hebrew plural forms are out of scope.
- Icons: `truck`, `copy`, `x` (registered); new `message-circle` (`MessageCircle`) for "שלח ב-WhatsApp" — register in
  `app.config.ts`.
- New dictionary keys (append, `general` group): `supplier_orders` "הזמנות לספקים", `supplier_orders_copy` "העתק",
  `supplier_orders_whatsapp` "שלח ב-WhatsApp", `supplier_orders_copy_all` "העתק הכל", `supplier_orders_copied`
  "הועתק – הדבק ב-WhatsApp", `supplier_orders_invalid_phone` "מספר לא תקין – הועתק להדבקה", `supplier_orders_nothing`
  "אין מה להזמין", `supplier_orders_review` "לבדיקה", `supplier_orders_est_total` "סה״כ משוער",
  `supplier_orders_manual_copy` "ההעתקה נחסמה – סמן את הטקסט והעתק ידנית", `supplier_orders_open` "פתח",
  `order_msg_title` "הזמנה – {business}", `order_msg_event` "לאירוע: {event}", `order_msg_thanks` "תודה!",
  `unit_short_unit` "יח'". Unit labels otherwise reuse the `units` group (`kg`, `gram`, `liter`, `ml`).
  Reused from 434: `no_supplier`, `partial_total`, `line_status_unlinked`,
  `line_status_deleted`, `line_status_no_conversion`.

## Atomic Sub-tasks
- [ ] S1: Group the engine's lines into one order per supplier plus "no supplier" and "to check" — buildSupplierOrders(plan, productsById, suppliersById); card totals and partial; review = unlinked/no_conversion/deleted — src/app/core/utils/supplier-orders.util.ts
- [ ] S2: Write the order message exactly as specified, right-to-left safe — buildOrderMessage(header, card, t), buildAllOrdersMessage(header, cards, t); RLM per non-empty line; short units: unit → t('unit_short_unit'), else t(unit) from the units group; formatQty; purchase in parentheses; DD.MM.YYYY — src/app/core/utils/supplier-orders.util.ts
- [ ] S3: Turn an Israeli mobile number into a WhatsApp number or reject it — toWhatsAppPhone: strip non-digits and a leading +; 05XXXXXXXX (10 digits) → 9725XXXXXXXX; 9725XXXXXXXX (12) kept; else null — src/app/core/utils/supplier-orders.util.ts
- [ ] S4: Test the grouping, the exact message and the phone rule on the 04.1 fixture — cases listed in Done when — src/app/core/utils/supplier-orders.util.spec.ts
- [ ] S5: Show the supplier-order cards with copy, copy-all and WhatsApp — SupplierOrdersComponent: input event, computed plan via EventPlanService, orders via buildSupplierOrders; send(card) with wa.me / navigator.share / copy fallbacks; copy with clipboard → toast, rejection → manual-copy textarea (selected on open); "אין מה להזמין"; output close; Escape closes — src/app/pages/menu-intelligence/components/supplier-orders/supplier-orders.component.ts, .html, .scss
- [ ] S6: Test the send and copy fallbacks without a real phone — window.open, navigator.share and navigator.clipboard stubbed — src/app/pages/menu-intelligence/components/supplier-orders/supplier-orders.component.spec.ts
- [ ] S7: Add "הזמנות לספקים" to the menu's print sheet — new group with one button, output openSupplierOrders emitted after close; spec case — src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.ts, .html, .spec.ts
- [ ] S8: Open supplier orders from the toolbar, FAB and print sheet without growing the frozen page — supplierOrdersEvent_ signal; getCurrentMenuForExport made protected; FAB action { labelKey: 'supplier_orders', icon: 'truck' }; closeAllExportOverlays also clears it; pill-row button and the lazy @defer block in html; offset the added lines (e.g. collapse the multi-line comments on sectionControls_ and profitPerGuest_) so added ≤ deleted — src/app/pages/menu-intelligence/menu-intelligence.page.ts, menu-intelligence.page.html
- [ ] S9: Register the WhatsApp icon and add the Hebrew texts — MessageCircle in app.config.ts; dictionary keys listed in UI/UX Notes — src/app/app.config.ts, public/assets/data/dictionary.json
- [ ] S10: Build, test, check the frozen page and icons, then hand over the six device checks — ng build, ng test include list, numstat, icon grep, log-query; cards ①–⑥ — this plan file

## Technical Considerations
- Dependencies: `EventPlanService` (433), `KitchenStateService.productsById_` / `suppliersById_`,
  `UserMsgService.onSetSuccessMsg` / `onSetWarningMsg`, `TranslationService.translate`, `UserService.user_`
  (or `BusinessService.business_` — Execution Notes).
- `navigator.share` exists on Android Chrome and iOS Safari; desktop Chrome on Windows may have it too — the order is
  phone → share → copy, so a supplier without a phone still gets the share sheet where it exists.
- `window.open(url, '_blank', 'noopener')` from the click handler (user gesture) so mobile browsers hand off to the
  WhatsApp app.
- New files needed: util + spec, component ts/html/scss/spec.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none — "סה״כ משוער" is display only; staff may see money fields (C-PERM: sees, never edits).
- Security surface: message text is URL-encoded with `encodeURIComponent`; no HTML injection (Angular interpolation);
  no data leaves the app except what the chef sends.
- Data / migration: none; no order records are saved.
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; RTL logical CSS; `MessageCircle`
  registered; new UI in a child component, lazy via `@defer`.

## Backend Impact
None — client-only. No route, schema or stored-data change.

## Out of Scope
- Saved order records, order status, auto-send, WhatsApp Business API.
- Changing a line's supplier on this screen (change it on the product).
- Hebrew plural forms of purchase-unit names ("2 ארגז", not "2 ארגזים").
- Printing supplier orders one page per supplier (plan 437).
- Offering this screen when an event enters "הזמנות" (plan 443's stage trigger).

## Critical Questions
None.
