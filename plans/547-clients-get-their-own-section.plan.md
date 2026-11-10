# Plan 547 — Give clients their own section: list, add, search, filters and a navigation group

Status: draft
Depends-on: 546
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Front Desk map row 5 (FD-02, contract C-NAV). A business's clients exist only inside menu screens. There is no page
that lists them and no place in the navigation for the Front Desk. This plan adds the `/clients` list (search, filters,
sort, owner-only add) and the new navigation group `frontdesk` ("לקוחות והזמנות"). Later Front Desk plans hang their
chips from this group (552 requests and bookings, 553 settings, 554 knowledge, 561 inbox).

Verified on `origin/main` (5702f6d1, 2026-11-10):
- No `src/app/pages/clients/`, no `/clients` route. `clientsEnsureLoadedResolver` (`src/app/core/resolvers/clients-ensure-loaded.resolver.ts`, imported at `src/app/app.routes.ts:19`) is used on the `menu-library`, `menu-intelligence` and `menu-intelligence/:id` routes.
- `src/app/core/components/tab-chips/tab-chips.component.ts` (158 lines): `type TabGroup = 'dashboard' | 'inventory' | 'recipes' | 'menus'` (line 23), `GROUP_BY_PATH_PREFIX` (lines 26–37), `CHIPS_BY_GROUP` (lines 39–64).
- Header: desktop links in `src/app/core/components/header/header.component.ts:12–15` (`{ path, key, icon }`: dashboard, inventory, recipe_book, menu_library); the mobile nav repeats them as `<a routerLink>` blocks in `header.component.html:155–170`.
- List screens use `app-list-shell` (`src/app/shared/list-shell/`, slots `shell-title`, `shell-search`, `shell-actions`, `shell-filters`, `shell-filter-clear`, `shell-table-header`, `shell-table-body`, `shell-modal`; inputs `gridTemplate`, `mobileGridTemplate`, `isPanelOpen`, `resultCount`, `resultTotal`) with `useListState()` (`src/app/core/utils/list-state.util.ts`). Example: `src/app/pages/suppliers/components/supplier-list/`.
- `matchesClientQuery(c, q)` (`src/app/core/utils/client-display.util.ts`) returns false for an empty query (picker rule), so a list must treat "empty search" as "all".
- Icons already registered in `src/app/app.config.ts`: `Users`, `Phone`, `MessageCircle`. The dictionary has no `clients`, `frontdesk_section`, kinds, lifecycle or last-contact keys.
- After plan 544, `Client` carries `kinds`, `tags`, `lifecycle`, `lastContactAt`, `counters`; staff receive `name`, `phone`, `tags`, `kinds` only (`STAFF_READ_FIELDS.clients`). After plan 546, `app-client-form` (`src/app/shared/client-form/`) is the add-client form.

## Goals & Success Criteria
**Primary:** an owner or a host opens "לקוחות והזמנות" from the header, sees the business's clients, finds one by name
or phone, filters and sorts them; an owner adds a new client from the list.

- [auto] `pnpm run test:ci` passes, including `src/app/pages/clients/components/client-list/client-list.component.spec.ts` (empty search shows all; name and phone search; filter by kind, tag and lifecycle; sort by last contact (newest first, missing last) and by name; owner sees the add button, staff do not; staff rows show no lifecycle, last-contact or counter columns) and the updated `tab-chips.component.spec.ts` (`/clients` → group `frontdesk`, chip `clients` active) and `header.component.spec.ts` (the new link).
- [auto] `pnpm run build` passes and the `/clients` page is a lazy chunk (initial bundle within budget).
- [auto] `pnpm run lint`, `pnpm run lint:icons`, `node scripts/reuse-lint.mjs --diff=origin/main` and `node scripts/breadcrumbs-check.mjs` exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/clients` as the QA owner: "הוסף לקוח חדש" → name `QA לקוח 547` + phone `0501234567` → "שמור" → a row with the text `QA לקוח 547` is in the list (`e2e/ui/547-1.spec.ts`).
- [ui] From `/dashboard`, the header link "לקוחות והזמנות" opens `/clients` and the tab chip "לקוחות" is active (`e2e/ui/547-2.spec.ts`).
- [human] The list reads well in Hebrew on a phone and on a desktop: columns, chips for kinds and tags, the filter panel.

## Execution Mode
- Parallel: no — appends to `app.routes.ts`, `tab-chips.component.ts`, `app.config.ts`, `dictionary.json`, `styles.scss` like plans 551–557; serialise the merges (map must-not-run list).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/clients/**
src/app/core/components/tab-chips/**
src/app/core/components/header/**
src/app/app.config.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
e2e/ui/547-1.spec.ts
e2e/ui/547-2.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a read screen plus the existing owner-only client create through `ClientDataService` (the server still authorises it, D2); no server change.

## Reuse Check

- `ClientListComponent` (`src/app/pages/clients/components/client-list/`) — family: list-page — rung: 1 — why: built on `app-list-shell` + `app-page-header` slots as the supplier list is.
- Search, filters, sort state — family: list-logic — rung: 1 — why: `useListState()` with URL params `q`, `kind`, `tag`, `life`, `sort`.
- Empty list / no results — family: empty-state — rung: 1 — why: `app-empty-state`.
- Add-client window — family: modal-shell — rung: 1 — why: `app-modal-shell` around `app-client-form` (client-picker family, plan 546, rung 1).
- Kind and tag chips — family: chip — rung: 1 — why: `.c-chip--tag` (`--sm`), reserved tags `vip` → `--amber`, `allergy` → `--red`, `repeat_no_show` → `--red`.
- Filter controls — family: multi-pick — rung: 1 — why: the filter panel uses the same `app-custom-select` / chip toggles the supplier list uses; no new control.
- Nav group `frontdesk` and the `clients` chip — family: chip — rung: 1 — why: one more entry in `CHIPS_BY_GROUP` of `app-tab-chips`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want one list of every customer my business knows so that I stop searching through events to find a phone number.
- As a host, I want to find a customer by the last digits of a phone so that I can answer a call fast.
- As an owner, I want to filter by kind and tag (VIP, allergy) so that I can see who needs care before an event.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen):
  **C-NAV (547; used by 551–557, 561)**
  - Section name (Q9): "לקוחות והזמנות"; a request is "בקשה" ("פנייה" keeps meaning an event inquiry). Public pages Hebrew only (Q7); footer "Powered by FoodVibe" on the public page and done page (Q8).
  - Tab group `frontdesk`; chips in this order: `inbox` (1b), `requests`, `bookings`, `clients`, `knowledge`, `settings`. Path prefixes `/inbox`, `/requests`, `/bookings`, `/clients`, `/frontdesk`. Each plan appends its own chip; labels from Q9.
- [ ] Route (append to `src/app/app.routes.ts`): `{ path: 'clients', loadComponent: () => import('./pages/clients/components/client-list/client-list.component').then(m => m.ClientListComponent), canActivate: [authGuard], resolve: { clientsLoaded: clientsEnsureLoadedResolver } }`. The `/clients/:id` route is plan 551's.
- [ ] Tab chips: `TabGroup` gains `'frontdesk'`; `GROUP_BY_PATH_PREFIX` gains `['/clients', 'frontdesk']`; `CHIPS_BY_GROUP.frontdesk = [{ id: 'clients', labelKey: 'clients', icon: 'users', path: '/clients' }]`. Later plans insert their chips in the C-NAV order and add their own prefixes.
- [ ] Header: desktop links gain `{ path: '/clients', key: 'frontdesk_section', icon: 'users' }` after `menu_library`; the mobile nav gains the same link as an `<a routerLink="/clients">` block after the menu-library block. Shown to every signed-in member (staff read clients, trimmed).
- [ ] List (`ClientListComponent`, OnPush, signals, `inject()`): rows from `ClientDataService.allClients_()` minus clients with `mergedInto` set. Search `q`: empty → all; else `matchesClientQuery`. Filters: kind (`diner | event_client | lead`, from `kinds`), tag (every tag in use, reserved tags first), lifecycle (`new | active | dormant`, owner only). Sort: `last_contact` (default; `lastContactAt` newest first, clients without it last, then by name) or `name` (Hebrew collation, `localeCompare(…, 'he')`).
- [ ] Columns, owner: name, phone (`dir="ltr"`), kinds chips, tags chips, last contact (`DatePipe` `d.M.yy`, empty when missing), events (`counters.events ?? 0`), requests (`counters.requests ?? 0`). Staff: name, phone, kinds, tags only. Phone: column on desktop; on a phone width the row shows name, phone under it, then the chips (`mobileGridTemplate`). Rows are not links yet (plan 551 adds the profile and makes rows open it).
- [ ] Add client (owner only, `PermissionService.isOwner_()`): an actions-slot button "הוסף לקוח חדש" (icon `user-plus`) opens `app-modal-shell` (`size="md"`, `titleKey="client_new"`, `[sheet]="true"`) holding `app-client-form`. `saved` → close the window, toast `client_saved`, the new row is in the list (`ClientDataService` already appends it). `cancelled` / Escape → close. Staff: no button.
- [ ] Empty states: no clients at all → `app-empty-state` with `clients_empty` (owner also gets the add button there); search/filter with no match → `clients_no_results` with the existing "clear filters" control.
- [ ] Register `UserPlus` in `src/app/app.config.ts` (the import list and the `LucideAngularModule.pick` set); `users` is already there.
- [ ] Dictionary (append; Hebrew values): `clients` "לקוחות", `frontdesk_section` "לקוחות והזמנות", `add_new_client` "הוסף לקוח חדש", `client_saved` "הלקוח נשמר", `clients_empty` "עדיין אין לקוחות", `clients_no_results` "לא נמצאו לקוחות", `client_kinds` "סוג", `client_kind_diner` "סועד", `client_kind_event_client` "לקוח אירועים", `client_kind_lead` "ליד", `client_tags` "תגיות", `client_tag_vip` "VIP", `client_tag_allergy` "אלרגיה", `client_tag_repeat_no_show` "לא מגיע להזמנות", `client_lifecycle` "מצב", `client_lifecycle_new` "חדש", `client_lifecycle_active` "פעיל", `client_lifecycle_dormant` "רדום", `client_last_contact` "קשר אחרון", `client_requests_count` "בקשות", `sort_by_last_contact` "לפי קשר אחרון". Tags that are not reserved show as typed.
- [ ] `src/app/pages/breadcrumbs.md` gains `clients/` ("Front Desk: the client list (plan 547), profile from plan 551").

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- RTL; logical properties only. Page title `clients`; section in the header `frontdesk_section`.
- Icons: `users` (registered), `user-plus` (new, registered by this plan).
- Dictionary keys: listed above, plus existing `client_name`, `client_phone`, `client_events_count`, `search`, `filter`, `sort`, `sort_by_name`, `client_new`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add the Front Desk group to the navigation — frontdesk tab group with the clients chip, header link on desktop and phone; update both specs — src/app/core/components/tab-chips/**, src/app/core/components/header/**
- [ ] A2: Build the client list on the shared list frame — rows, columns for owner and staff, search, kind/tag/lifecycle filters, sort, empty states; spec — src/app/pages/clients/components/client-list/**
- [ ] A3: Let the owner add a client from the list — button, window with the shared client form, toast; hidden for staff; spec cases — src/app/pages/clients/components/client-list/**
- [ ] A4: Register the route, the icon and the words — /clients route with the clients resolver, UserPlus, dictionary keys, breadcrumbs — src/app/app.routes.ts, src/app/app.config.ts, public/assets/data/dictionary.json, src/app/pages/breadcrumbs.md
- [ ] A5: Write the two screen checks and run every check — e2e/ui/547-1.spec.ts, e2e/ui/547-2.spec.ts (`signInQa`); test:ci, build, lint, lint:icons, reuse-lint, breadcrumbs-check, log-query

## Technical Considerations
- Dependencies: `ClientDataService`, `clientsEnsureLoadedResolver`, `PermissionService`, `app-list-shell`, `useListState`, `app-client-form` (546), the widened `Client` model (544).
- New files needed: `src/app/pages/clients/components/client-list/client-list.component.{ts,html,scss,spec.ts}`, `e2e/ui/547-1.spec.ts`, `e2e/ui/547-2.spec.ts`.
- Model changes: none (544 owns the `Client` model).
- Backend / API: none — reads `GET /api/v1/data/clients`, writes through the existing `POST`.
- Auth and validation: route behind `authGuard`; add is owner-only in the UI and on the server (D2).
- Security surface: none new (phone numbers are already sent to members; never logged by this page).
- Data / migration: none.
- Project checks: log-query `[auto]`; Reuse Check; dictionary keys named; icon registered; lazy route; breadcrumbs; hotspots appended only.

## Out of Scope
- The client profile, `/clients/:id`, row → profile, and the stage-bar chip as a link (plan 551, which creates the target page).
- Editing or deleting a client, merge (plan 551).
- Chips for requests, bookings, knowledge, settings, inbox (plans 552, 553, 554, 561).
- A pending-requests badge on the group (plan 552).

## Critical Questions
- none

## Execution Notes
- Map row 5, renumbered +2 on 2026-11-10 (old 545 → 547).
- Planning card said "the stage-bar chip from 546 becomes a link" here; moved to plan 551 because `/clients/:id` does not exist until 551 (a link to a missing route would open the dashboard fallback).
