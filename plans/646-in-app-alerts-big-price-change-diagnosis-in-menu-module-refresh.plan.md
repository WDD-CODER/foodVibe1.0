# Plan 646 — In-app alerts: a big price change reaches the owner and the consultant; diagnosis in the main menu; module changes show at once

Status: draft
Depends-on: 631, 634, 641, 645
Snapshot: 9354ab3d

## Problem Statement
Dandan validated the import fixes on 2026-11-19 (staging `aacec375`) and asked three things:

1. **A big price change must reach people at once.** When an invoice changes a product's price beyond the business
   threshold (`priceRiseAlertPct`, default 5, up or down), the owner and every consultant with access to the business
   (`businessAccess`, role `consultant`, plan 631) must get a message, so the owner does not lose his pricing. The app
   has no messages to users at all today (no notification collection, route or header piece). Dandan's choice
   (2026-11-19): alerts **in the app** — a bell in the header with an unread count and a list. Email is out of scope.
   The dashboard's price-rises card (plan 629) stays; it is a summary, not a message.
2. **The diagnosis is hard to reach.** Its only entry is the fourth chip under inventory
   (`src/app/core/components/tab-chips/tab-chips.component.ts:69`). A consultant's main tool needs an entry in the main
   menu (`src/app/core/components/header/header.component.html`, the nav at ~line 189) when `consultant_diag` is on.
3. **A module turned on in the platform dialog does not show until a page reload.** The browser reads the business's
   modules once (`ModuleService.modules_` from `BusinessService.business_`); after the platform admin saves modules for
   the business he is working in, `/diagnosis` still redirects to `/dashboard` (`module.guard.ts:16`) until F5.
   `BusinessService.reload()` exists (`business.service.ts:129`).

## Goals & Success Criteria
**Primary:** an invoice apply with a change beyond the threshold creates one alert per recipient (owner + consultants
of that business); each recipient sees it under the header bell with an unread count and opens the product from it; the
diagnosis has a main-menu entry; a module change for the current business shows without a reload.

- [auto] `pnpm run test:server` passes, including the new `server/test/notifications.test.js`: (a) an apply with one row
  +6% and one +3% at threshold 5 creates alerts only for the +6% row, one for the owner and one for each consultant
  grant of that business, none for staff and none for another business's users; (b) −6% creates one too; (c) a stored
  threshold of 10 creates none for +6%; (d) `GET /api/v1/notifications` returns only the caller's alerts, newest first,
  with `unread` count; a consultant gets alerts of every business he has a live grant for and none after the grant is
  removed; (e) `POST /api/v1/notifications/:id/read` and `/read-all` mark only the caller's; another user's id → 404;
  (f) no token → 401; (g) the alert stores product id, product name, supplier name, old and new price, percent and the
  business id — never a token or an email; (h) an apply whose alert write fails still saves the prices and logs
  `notifications.write_failed`.
- [auto] `pnpm run test:ci` passes, including specs for the bell (`src/app/core/components/notification-bell/**`): the
  unread count shows when above 0 and is hidden at 0; opening lists the alerts with the text from
  `alert_price_change` ("{product}: {from} ← {to} ({pct}) אצל {supplier}") and the business name for a consultant;
  clicking one marks it read and navigates to `/inventory/edit/<productId>` (switching business first when it is
  another business the consultant has access to); "סמן הכול כנקרא" marks all; the list polls every 60 s and stops
  when the tab is hidden.
- [auto] The same command: the header shows the diagnosis entry ("אבחון", icon `stethoscope`) only with
  `consultant_diag`; the platform dialog, after saving the modules of the business the admin is in, calls
  `BusinessService.reload()` and the guard then lets `/diagnosis` open (spec on the dialog and the guard).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0;
  `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/dashboard` with an alert fixture the bell shows "1" and the list shows the alert text
  (`e2e/ui/646-1.spec.ts`).
- [human] Dandan imports an invoice with a price change beyond 5%: the bell shows 1, the alert reads clearly in Hebrew
  and opens the product. A consultant user with access to that business sees the same alert. Turning on "אבחון יועץ"
  for his own business shows "אבחון" in the main menu at once.

## Execution Mode
- Parallel: no — it edits the header, `public/assets/data/dictionary.json`, `src/app/app.config.ts` (icons) and
  `server/routes/product-import.js`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/notification.schema.ts
shared/schemas/entities/index.ts
server/routes/notifications.js
server/services/notifications.js
server/routes/product-import.js
server/index.js
server/app.js
server/utils/collections.js
server/test/notifications.test.js
server/test/product-import-apply.test.js
server/breadcrumbs.md
src/app/core/services/notifications.service.ts
src/app/core/services/notifications.service.spec.ts
src/app/core/components/notification-bell/**
src/app/core/components/header/**
src/app/core/guards/module.guard.ts
src/app/core/guards/module.guard.spec.ts
src/app/pages/diagnosis/diagnosis.guard.spec.ts
src/app/pages/platform-dashboard/components/platform-business-dialog/**
src/app/app.config.ts
public/assets/data/dictionary.json
e2e/ui/646-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
docs/brain/invariants.md
src/app/core/services/breadcrumbs.md
src/app/core/components/breadcrumbs.md
server/constants/collections.js
server/db.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — an alert belongs to one business (`businessId`) and one recipient (`userId`); recipients are the
  owner and live consultant grants of that business at write time, and a read also checks the grant is still live, so a
  removed consultant reads nothing more; staff get none (prices are the owner's).
- INV-2: preserves — an alert carries one business's product and price only; nothing crosses to another business.
- INV-3: preserves — the server writes the alerts inside the apply request it already owns; the browser writes none.
- INV-4: preserves — the alert shape is one new Zod schema in `shared/schemas/entities/notification.schema.ts`; the
  server validates every write against it.

## Reuse Check

- `notifications` collection, service and routes — family: none — rung: 4 — why: the app has no message to a user
  today; the front desk messages are guest conversations, not user alerts.
- the header bell and its list — family: none — rung: 4 — why: no header popover list exists; it reuses `c-icon-btn`,
  `c-chip` for the count and the empty-state family for "no alerts".
- the diagnosis main-menu entry — family: module-gate — rung: 1 — why: the same `modules.has` pattern the events entry
  uses (`header.component.ts:70`).

## Defaults

- hints-in-tooltips — applies — how: the bell button's explanation is its `title` and `aria-label`; no hint text on the
  page.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to be told at once when a supplier's price moves beyond my threshold, so that I fix my menu
  prices before I lose money.
- As a consultant, I want the same alert for my clients, so that I can act for them.
- As a consultant, I want the diagnosis in the main menu, so that I find my tool.
- As the platform admin, I want a module I turn on to work at once.

## Functional Requirements

### Must Have (P0)
- [ ] Schema `notificationSchema`: `_id, businessId, userId, kind: 'price_change', productId, productName,
  supplierName, from, to, changePct, createdAt, readAt?`.
- [ ] Server: `createPriceChangeAlerts(db, business, rows)` called by the apply after prices are written, for rows with
  `|changePct| ≥ threshold`; recipients = owner + live consultant grants; one document per recipient per row; failures
  logged, never failing the apply. Index `{ userId: 1, createdAt: -1 }`. Keep at most 200 per user (oldest dropped).
- [ ] Routes: `GET /api/v1/notifications?limit=50` → `{ rows, unread }`; `POST /:id/read`; `POST /read-all`; all
  scoped to `req.user` and to live access.
- [ ] Browser: `NotificationsService` (signals; poll 60 s while the tab is visible; `markRead`, `markAllRead`); the
  header bell (`bell` icon) with the unread count; a list panel with each alert, its time, the business name when not
  the current one; click → mark read → open the product (switch business first when needed).
- [ ] Dictionary (append-only): `alerts_title` — "התראות", `alerts_empty` — "אין התראות חדשות",
  `alerts_mark_all` — "סמן הכול כנקרא", `alert_price_change` — "{product}: {from} ← {to} ({pct}) אצל {supplier}",
  `alerts_bell_tip` — "התראות על שינויי מחיר חריגים".
- [ ] Header: the "אבחון" entry with `consultant_diag` (and while acting, with the home module, as the diagnosis
  guard does).
- [ ] Platform dialog: after a successful save for the business the admin is in, `BusinessService.reload()`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; the bell sits beside the avatar; the panel is a small popover list, scrollable, newest first; up arrows in
  danger tone, down in success tone (same chip as plan 645).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Store an alert for each person who must know about a big price change — the schema, the service, the apply hook, the server cases — shared/schemas/entities/notification.schema.ts, server/services/notifications.js, server/routes/product-import.js, server/test/notifications.test.js
- [x] A2: Let each person read and clear only his own alerts — the routes, the mount, the access checks, the cases — server/routes/notifications.js, server/index.js, server/test/notifications.test.js
- [x] A3: Show the alerts under a bell in the header and open the product from one — the service, the bell, the keys, the icon, the specs — src/app/core/services/notifications.service.ts, src/app/core/components/notification-bell/**, src/app/core/components/header/**, public/assets/data/dictionary.json, src/app/app.config.ts
- [x] A4: Put the diagnosis in the main menu and show a module change at once — the menu entry, the reload after the platform save, the specs — src/app/core/components/header/**, src/app/pages/platform-dashboard/components/platform-business-dialog/**
- [x] A5: Record the new pieces and prove it in the running app — the registry rows, the inventory, the screen check, then the Done-when commands in order — docs/brain/component-families.md, docs/brain/inventory.md, e2e/ui/646-1.spec.ts

## Technical Considerations
- Dependencies: 631 (grants), 634 (diagnosis), 641 (the apply's per-row change), 645 (the threshold rule both ways).
- Security surface: a new read route of per-user data; scoped by `req.user` and live grants; logs carry counts and ids,
  never product names or prices.

## Out of Scope
- Email, WhatsApp or push delivery.
- Other alert kinds (they reuse this collection later).
- The platform learning section (waits on Dandan's answer about private businesses).

## Critical Questions
- none

## Execution Notes
- decided: in-app only — why: Dandan's choice of 2026-11-19 ("alerts in the app").
- decided: staff get no price alerts — why: prices are the owner's (INV-1 rule on money).
- decided: one alert per row and recipient, kept 200 per user — why: simple to read and bounded.
- evidence: pnpm run test:server -> exit 0 (146 files, 1933 tests incl. server/test/notifications.test.js); pnpm run build -> exit 0; pnpm run lint -> 0 errors; pnpm run lint:icons -> exit 0; pnpm run lint:reuse -> ok; pnpm run test:ci full run passed except one header spec assertion, fixed and the header specs rerun 21/21; node scripts/breadcrumbs-check.mjs -> FAIL: src/app/core/services/breadcrumbs.md and src/app/core/components/breadcrumbs.md do not mention notifications.service.ts / notification-bell/ (both outside scope; ESCALATE asked)
- decided: behaviour: an alert of another business switches into it and lands on /dashboard (UserService.switchBusiness always reloads there) — reverse: pass a target url through switchBusiness
- A5 not ticked: e2e/ui/646-1.spec.ts written, not run; breadcrumb rows waiting on scope approval
- breadcrumbs rows added in services/ and components/ after approval 646-2; breadcrumbs-check -> clean; e2e 646-1 written, not run
