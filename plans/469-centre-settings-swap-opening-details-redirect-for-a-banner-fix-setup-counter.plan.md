# Plan 469 — Centre settings, swap the opening-details redirect for a banner, make the setup counter move

Status: draft
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Three problems the Human found in Settings and the dashboard on branch `mvp` (handoff
`docs/mvp/review-handoff-2026-10-21.md`, H1–H3; H4 sign-up business name, decision D1, is not in this plan):
1. **H1 — layout:** on desktop the tabs and the form card sit in the right half of `/settings` and the left half is
   empty, on every tab; on a phone the chips of the Team tab are not centred.
2. **H2 — forced redirect:** an owner without opening details is sent from the dashboard to
   `/settings?tab=baseline&first=1` every time the dashboard overview opens, until they save or press «דלג» (plan 431).
   Owners who wanted another page get bounced. Wanted (the Human's preferred option): NO redirect; while the opening
   details are missing, the business-performance area of the dashboard (plan 447) is replaced by a clear banner asking
   to fill them in; tapping it opens Settings → «פרטי פתיחה»; the skip stays available.
3. **H3 — setup card counter:** after adding a product the card does not change. Also: the goal drops from 10 to 5
   priced products.

Verified in code on `mvp` (file:line), and what was not:
- H1: `settings.page.scss` `.settings-tabs` is `display: flex` and the `app-scroll-rail` child has no `flex: 1`, so in RTL the
  rail is only as wide as its chips and sits at the inline start (right). `baseline-tab.component.scss` `.baseline-form` and
  `business-settings-tab.component.scss` `.business-form` are `inline-size: 100%; max-inline-size: 28rem` inside a flex
  column with no `margin-inline: auto`, so the card sits at the start. `team-tab.component.html` role chip
  (`.team-row__role`) is a grid item with no `justify-self`. Cause read from SCSS, not seen in a browser; "chips on the
  Team list" is read as both the tab chips (visible on the Team tab, the default) and the role chip in each row.
- H2: the redirect is `setup-checklist-card.component.ts:98-103` (`business.baseline === undefined` →
  `router.navigate(['/settings'], { queryParams: { tab: 'baseline', first: 1 } })`, guarded per card instance by
  `redirected_`). The status is NOT loaded while the baseline is missing (`return` before `loadStatus`). «דלג» shows only
  with `first=1` (`baseline-tab.component.html:38-42`, `first` at `baseline-tab.component.ts:~60`). Staff: the effect
  returns early unless `permission.isOwner_()` (`setup-checklist-card.component.ts:~93`), and the Settings tabs are all
  `ownerOnly` (`settings-tabs.ts`), so staff get no redirect and no Settings.
- H3, the handoff's suspected cause is PARTLY right: `statusRequested_` (`.ts:~105-107`) does make the card ask once per card
  instance, but the dashboard route has no reuse strategy (grep `RouteReuseStrategy` → none) and a card is created each time
  the overview opens, so a revisit does ask again. The bigger finding: the card never shows a product count. Step 1 is a
  yes/no tick on `pricedProducts >= PRICED_PRODUCTS_GOAL` (`.ts:20, 52`) and the template (`.html`) shows only «n מתוך 4
  שלבים». With a goal of 10, one added product cannot change anything on screen. Second finding: the server counts only
  products with a price above 0 (`server/routes/business.js:~92`, `sources.price` or `purchaseOptions.priceOverride`);
  quick-create from the recipe builder allows an empty price (`quick-add-product-modal.component.ts:224-228` stores
  `sources: []`), so such a product is never counted (decision D9, assumed below). NOT reproduced in a browser: the Worker
  reproduces first (H3-1).
- Server cap: `SETUP_COUNT_CAP = 10` in `server/routes/business.js:85`; the goal lives only in the client.

## Goals & Success Criteria
- Primary: settings are centred; the dashboard no longer redirects; a missing-details banner stands in for the performance
  area; the setup card shows "x of 5" priced products and moves as soon as a priced product exists.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [auto] `npm --prefix server test` passes, including `server/test/business-baseline.test.js` updated for the lower cap: five priced products → `pricedProducts: 5`; seven priced products → still `5`; an unpriced product is not counted.
  - [ ] [auto] Unit tests pass (`npx ng test --watch=false --include=src/app/pages/dashboard/** --include=src/app/pages/settings/**`): an owner without a baseline causes NO navigation (`navigate` never called) and the banner shows instead of `app-business-performance`; with a baseline `{}` or filled, the banner is gone and the performance area shows; the banner's skip button stores `{}`; the banner's open button navigates to `/settings` with `tab=baseline&first=1`; five priced products tick step 1, four do not, and the step shows "4 מתוך 5".
  - [ ] [auto] Staff regression (INFO in handoff, plan 427/428): a spec with a staff user and a business without a baseline asserts no navigation, no banner, no setup-status request, and the performance area still renders; `npx ng test` for `setup-checklist-card` passes.
  - [ ] [human] H1 replay (desktop, ~1280 px wide): open `/settings`, click each tab («צוות», «הגדרות עסק», «פרטי פתיחה»). On every tab the tab bar and the content are centred on the page (equal empty space left and right), not stuck to the right half.
  - [ ] [human] H1 replay (phone, 375 px): open `/settings` on the Team tab. The tab chips are centred in the bar and each team member's role chip is centred in its row.
  - [ ] [human] H2 replay: sign in as an owner whose business has never saved opening details. Open `/dashboard`: you stay on the dashboard (no jump to Settings). Where the business numbers (inquiries, revenue …) were, a banner asks you to fill in the business details. Open `/dashboard?tab=metadata` from the chips: it opens (no bounce). Tap the banner: Settings opens on «פרטי פתיחה» with «דלג» visible. Tap «דלג»: you return to the dashboard, the banner is gone and the performance area is back. Repeat with a fresh account but save the numbers instead: same result.
  - [ ] [human] H2 staff replay: sign in as a staff member (cook). The dashboard opens with no banner and no jump; `/settings` shows the "owner only" message.
  - [ ] [human] H3 replay: as an owner with no products, open `/dashboard`; the setup card's first line reads «5 מוצרים עם מחיר» with «0 מתוך 5». Add one product WITH a price in «הוסף מוצר», return to the dashboard: «1 מתוך 5». Create another product WITH a price from inside the recipe builder (quick-add), return: «2 מתוך 5». After the fifth the line is ticked.

## Execution Mode
- Parallel: no — writes dashboard, settings and `server/routes/business.js`.
- Concurrent plans: none known touching these files in the 459–469 batch. 461 (product form) and 463 (recipe ingredient matcher) may create products but do not write these files.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`.
- MVP run mode: executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/469.md`, `[auto]` items are marked `[x]` only with evidence in that file.
- Depends on: none from this batch. Builds on plans 431 (baseline, setup card) and 447 (business performance), both on `mvp`.
- Product decisions left open take the recommended option (run mode): D9 → count only products with a price (see Critical Questions).
- Step 0 for H2: plan 431's own tests assert the redirect (`setup-checklist-card.component.spec.ts` "owner without a baseline is sent to the baseline screen once" and "redirects when the business arrives after the card was created"); they are replaced, not deleted silently — record it in the run file.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/settings/**
src/app/pages/dashboard/**
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
server/routes/business.js
server/test/business-baseline.test.js
docs/mvp/runs/469.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — scope touches only settings / dashboard pages, `server/routes/business.js` (owner-only setup-status, still behind `assertCan(…'editSettings')`) and a service comment; no listed invariant's `Touches` glob is reached, no permission, tenancy, schema or taxonomy rule changes.

## Backend Impact
- Collections affected: none written; `products`, `suppliers`, `recipes`, `dishes`, `menuEvents`, users are read for counts (unchanged).
- New collections: no
- Server changes needed: yes, small — `SETUP_COUNT_CAP` 10 → 5 and its tests. No new endpoint, no schema change.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: the redirect block and `redirected_` /
`statusRequested_` / `PRICED_PRODUCTS_GOAL` in `setup-checklist-card.component.ts`; `<app-business-performance />` in
`dashboard-overview.component.html`; `SETUP_COUNT_CAP` in `server/routes/business.js`; `.baseline-form` / `.business-form`
`max-inline-size` in the two tab scss files; `first()` and the skip button in the baseline tab. Print `ok` or
`conflict: <what>` per symbol.

## User Stories
- As a chef who opens the app, I want to reach any page without being thrown into a form so that I can work first and fill in my opening numbers when I choose.
- As a chef, I want the dashboard to tell me clearly that my business details are missing, and to let me skip them, so that I am never blocked.
- As a chef, I want the setup card to count my priced products toward 5 so that I can see progress every time I add one.
- As a chef on a desktop, I want the settings screen centred so that I do not hunt for the form in the right half.

## Functional Requirements

### Must Have (P0)
- [ ] No automatic navigation to Settings for any user; staff behaviour unchanged.
- [ ] A banner replaces the business-performance area for an owner whose opening details are missing; open and skip actions work; once saved or skipped the performance area returns.
- [ ] The setup card loads its status whether or not opening details exist.
- [ ] Priced-products goal is 5 (client and server cap), with a visible "x of 5" count.
- [ ] Settings tabs and tab content centred on every width; Team rows' role chips centred on a phone.

### Nice to Have (P1)
- [ ] The setup card refreshes while mounted when the product list changes (H3-4).

## UI/UX Notes
- Banner: one glass panel (`c-glass-panel`) where the performance area was; title, one short line, a primary button «מלא פרטי פתיחה» and a ghost button «דלג» (existing key `skip`). The whole title row is also tappable to open Settings. RTL, logical properties, stacks on a phone.
- Setup card step 1: label «5 מוצרים עם מחיר» and, while not done, a small «x מתוך 5» next to it (`x` capped at 5).
- New dictionary keys (append to `public/assets/data/dictionary.json`, change `setup_step_products` value only):
  `opening_details_banner_title` «חסרים פרטי פתיחה של העסק», `opening_details_banner_text` «מלאו כמה מספרים על העסק לפני FoodVibe כדי שנשווה אותם לביצועים שלכם.», `opening_details_banner_action` «מלא פרטי פתיחה», `setup_products_progress` «{{done}} מתוך {{goal}}»; `setup_step_products` becomes «5 מוצרים עם מחיר».

## Atomic Sub-tasks
- [ ] H1-1: Centre the settings tab bar on every screen width — let the scroll rail fill the tab row and centre its chips (`flex: 1 1 auto; min-inline-size: 0` on the rail host, `justify-content: center` on the row) — `src/app/pages/settings/settings.page.scss`
- [ ] H1-2: Centre the content of every settings tab — `margin-inline: auto` on the baseline and business forms; give the team tab one width (36rem max) centred, with the "add member" button centred; centre each member's role chip (`justify-self: center`) — `src/app/pages/settings/components/baseline-tab/baseline-tab.component.scss`, `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.scss`, `src/app/pages/settings/components/team-tab/team-tab.component.scss`
- [ ] H1-3: Pin the centred layout by test — spec checks the tab row and each tab root carry the centring classes / computed `margin-inline: auto` in a 1280 px host — `src/app/pages/settings/settings.page.spec.ts`
- [ ] H2-1: Stop sending owners to Settings from the dashboard — delete the redirect block, `redirected_` and the `Router` injection from the setup card; load the status (and read the hidden flag) as soon as the business is known, with or without a baseline — `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.ts`
- [ ] H2-2: Build the missing-details banner — new standalone OnPush component `app-opening-details-banner`: open button navigates to `/settings` with `tab=baseline`, `first=1`; skip button calls `BusinessService.updateBaseline({})` (disabled while saving; on failure the same `save_failed` toast and `logging.error` as the baseline tab); uses `translatePipe` keys from UI/UX Notes — `src/app/pages/dashboard/components/opening-details-banner/opening-details-banner.component.ts`, `src/app/pages/dashboard/components/opening-details-banner/opening-details-banner.component.html`, `src/app/pages/dashboard/components/opening-details-banner/opening-details-banner.component.scss`, `src/app/pages/dashboard/components/opening-details-banner/opening-details-banner.component.spec.ts`
- [ ] H2-3: Show the banner instead of the performance area — in the overview add a computed `needsOpeningDetails_` (owner, business loaded, `business.baseline === undefined`) and render `<app-opening-details-banner />` in place of `<app-business-performance />` while true; staff and anyone with a stored baseline (including `{}`) see the performance area — `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts`, `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html`, `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts`
- [ ] H2-4: Replace plan 431's redirect tests with no-redirect tests and add the staff regression — rewrite the two redirect specs ("sent to the baseline screen once…", "redirects when the business arrives…") to assert `navigate` is never called and the status is requested; add the staff case (no navigation, no banner, no status request) — `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.spec.ts`
- [ ] H2-5: Add the banner texts to the dictionary — the four new keys from UI/UX Notes, appended after `setup_step_staff` — `public/assets/data/dictionary.json`
- [ ] H3-1: Reproduce "counter does not drop" before changing anything — add a failing spec: owner, status `{pricedProducts: 1}` after one product is created, card must show it; record in the run file whether the cause is "no count shown", "status not reloaded" or "product had no price" — `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.spec.ts`, `docs/mvp/runs/469.md`
- [ ] H3-2: Lower the goal to five and show the running count — `PRICED_PRODUCTS_GOAL = 5`; the step carries `progress` text (`setup_products_progress` with `done = min(pricedProducts, 5)` and `goal = 5`) shown next to the link while the step is open; change the `setup_step_products` value to «5 מוצרים עם מחיר» — `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.ts`, `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.html`, `public/assets/data/dictionary.json`
- [ ] H3-3: Lower the server's count cap to five and update the contract text — `SETUP_COUNT_CAP = 5`, adjust the comment; change the `SetupStatus` comment "caps each count at 10" to 5; update the plan 431 fixtures (the 10-product loop → 5, expected `pricedProducts: 5`) and add "seven priced → 5" and "unpriced not counted" cases — `server/routes/business.js`, `server/test/business-baseline.test.js`, `src/app/core/services/business.service.ts`, `src/app/core/services/business.service.spec.ts`
- [ ] H3-4: Refresh the card while it stays open — reload the status when the number of products changes after the first load (effect on `KitchenStateService.products_().length`, skipping the first run), keeping the once-per-card initial request; spec: adding a product re-requests the status once — `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.ts`, `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.spec.ts`
- [ ] V1: Build, run server and client tests, replay the [human] scenarios (desktop 1280 px and phone 375 px), write the run file with evidence and the validation cards — `docs/mvp/runs/469.md`

## Technical Considerations
- Dependencies: `BusinessService` (`business_`, `updateBaseline`, `loadSetupStatus`), `PermissionService.isOwner_`, `KitchenStateService.products_`. `Business.baseline` is `undefined` = never answered, `{}` = skipped, filled = answered (plan 431) — the banner keys on `undefined` only.
- Reuse first: banner uses `.c-glass-panel`, `.c-btn-primary`, `.c-btn-ghost--sm`; no new `.c-*` class. New code: signal APIs, `inject()`, OnPush, `@layer components.opening-details-banner`, logical CSS, double quotes in html, single quotes / no semicolons in ts.
- Settings baseline tab and its `first=1` handling are left as they are (save with `first` returns to the dashboard; «דלג» only with `first=1`). The banner supplies `first=1`.
- Setup card hide flag (`fv_setup_card_hidden_<id>` in localStorage) is unchanged.
- Model changes: none. Security surface: none new; the setup-status route keeps `assertCan(…, 'editSettings')`.
- Project checks: log-query [auto]; chef-side stories; new dictionary keys named above.

## Out of Scope
- H4 — sign-up business name (decision D1); a later plan.
- The fallback "dirty form" option for H2 (keep the redirect but ask to save or skip) — not built; see Critical Questions.
- Counting unpriced products, or telling the user a product was skipped for having no price (decision D9; assumed "priced only").
- Any change to the business-performance cards themselves (plan 447) or to the baseline form fields.
- Sign-up / onboarding flows, a first-run tour.

## Critical Questions
1. D9 — setup step 1 counts: only products WITH a price (recommended; matches today's behaviour and the step's wording «מוצרים עם מחיר»), or all products? If "all", the server count drops the price filter and the label loses «עם מחיר». This plan assumes "priced only".
2. H2 — banner (built here, recommended) or the fallback you also named: keep the form but make it a dirty form that asks to save or skip? This plan builds only the banner.
3. Should staff see anything where the performance area would be while the owner's details are missing? Recommended: no (staff already see the area as today and never see the banner).
4. Chips on the Team list on a phone: I read it as the tab chips (centred, H1-1) AND each member's role chip (H1-2). If you meant something else, say which.
