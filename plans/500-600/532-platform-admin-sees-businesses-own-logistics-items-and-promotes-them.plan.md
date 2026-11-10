# Plan 532 — The platform admin sees every business's own logistics items and promotes good ones to the shared list

Status: done
Depends-on: 523
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
Product decision of the Human (site-visit chat, 2026-10-27; open-items brief 2026-11-07, item B3): every business
starts from one shared logistics checklist, adds its own items and sees only its own; the **platform admin sees every
business's additions, to learn what to add to the shared template**. Plans 518–523 build the checklist and deliberately
leave this out (518 "any admin view", 523 "the cross-business admin view and 'promote to shared'"). No plan covers it.

Verified at 5895243:
- Admin routes live in `server/routes/admin.js`, mounted at `/api/v1/admin` (`server/app.js:200`), each route
  `verifyToken, requirePlatformAdmin` (`server/middleware/auth.js:102`). They return counts and dates, never content
  (`admin.js:74`). Through the generic API an admin cannot read another business's terms (`server/routes/generic.js:68-71`
  `termWriteOwner`, `business-scope.js:18-24` `readScope` = own ∪ master), so the cross-business read needs an admin route.
- **Promote already exists as a mechanism**: a platform admin's `POST /api/v1/data/taxonomyTerms` with `shared: true`
  inserts a `__master__` term and then **folds** every business's own term with the same `kind` + `key` into it
  (`generic.js:534-536`; test `taxonomy-terms-api.test.js:218` "an admin adds a shared term, which folds users' own
  same-key terms"). The client does it through `TaxonomyStore.add(kind, key, extras, { shared: true })`
  (`taxonomy-store.service.ts:155-166`). References are by key, so a business's answers keep pointing at a live term.
- The platform admin's page is `/platform` (`src/app/app.routes.ts:236-240`, `platformAdminGuard`),
  `src/app/pages/platform-dashboard/` with `PlatformAdminService` (`src/app/core/services/platform-admin.service.ts`).

## Goals & Success Criteria
**Primary:** on `/platform` the admin sees every business's own logistics items grouped by question, with which
businesses added each, and one tap makes a question part of the shared checklist for everyone.

- [auto] `pnpm run test:server` exits 0, including `server/test/admin-taxonomy.test.js` (A2).
- [auto] `pnpm run test:ci` exits 0, including `src/app/pages/platform-dashboard/components/platform-logistics-items/platform-logistics-items.component.spec.ts` (A6).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/532-platform-admin-sees-businesses-own-logistics-items-and-promotes-them.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/532-platform-admin-sees-businesses-own-logistics-items-and-promotes-them.plan.md` exits 0.
- [human] Signed in as a business owner (not platform admin), add the own logistics item "בדיקת קידום" on the Metadata Manager card (plan 523). Then signed in as the platform admin, `/platform` shows the section "פריטי לוגיסטיקה של עסקים" with "בדיקת קידום" and that business's name.
- [human] As the platform admin, tap "הפוך למשותף" on "בדיקת קידום" and confirm: the toast "הפריט נוסף לרשימה המשותפת" shows and the row leaves the list. Signed in as the owner again, the Metadata Manager card shows "בדיקת קידום" as shared (no delete), and an event that answered it still shows the answer.

## Execution Mode
- Parallel: yes, after 523.
- Concurrent plans: none share its files (it appends to `dictionary.json`, a hotspot that `plan-order` serializes).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/admin.js
server/test/admin-taxonomy.test.js
src/app/core/services/platform-admin.service.ts
src/app/core/services/platform-admin.service.spec.ts
src/app/pages/platform-dashboard/components/platform-logistics-items/**
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/breadcrumbs.md
public/assets/data/dictionary.json
docs/brain/component-families.md
src/app/pages/platform-dashboard/components/platform-logistics-items/platform-logistics-items.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new read is a platform-admin route (`verifyToken, requirePlatformAdmin`, like `GET /admin/businesses`); members still read nothing from another business, and the only write is the existing admin-only shared-term POST ("only a platform admin writes shared `__master__` items").
- INV-2: preserves — promote is the existing `shared: true` POST: the master term belongs to no business, taxonomy stays master ∪ own, and the fold of same-key own terms is today's rule (`generic.js:534-536`); no business-scoped query is added outside `business-scope.js` (the admin read is deliberately cross-business, like plan 448's table).
- INV-5: preserves — logistics items stay `taxonomyTerms` of kind `logisticsItem`; no new collection.

## Reuse Check
- `app-platform-logistics-items` (`src/app/pages/platform-dashboard/components/platform-logistics-items/`) — family: none — rung: 4 — why: a page-local admin list next to plan 448's page-local table; no shared piece lists grouped rows with a per-group action, and it is used on this one admin page.
- Group cards and the business list — family: engine-classes — rung: 1 — why: `.c-glass-card` / `.c-chip--tag` from `src/styles.scss`, no new `.c-*` class.
- Promote confirm — family: modal-controller — rung: 1 — why: `ConfirmModalService.open(message)`.
- Toasts — family: feedback — rung: 1 — why: `UserMsgService`.
- Empty list — family: empty-state — rung: 1 — why: `app-empty-state`.
- Promote write — family: taxonomy — rung: 1 — why: `TaxonomyStore.add(kind, key, extras, { shared: true })` as is.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to see the checklist items each kitchen added for itself so that I learn what the shared checklist is missing.
- As the platform admin, I want to add a good item to the shared checklist in one tap so that every kitchen gets it without retyping.
- As a chef, I want an item I added to keep working after the admin shares it so that my events' answers are not lost.

## Functional Requirements

### Must Have (P0)
- [x] `GET /api/v1/admin/taxonomy?kind=logisticsItem` in `server/routes/admin.js` (`verifyToken, requirePlatformAdmin`): `kind` must be in an allowlist `ADMIN_TERM_KINDS = ['logisticsItem']` (else 400 `{ error: 'Unsupported kind' }`). Reads `taxonomyTerms` with `{ kind, businessId: { $nin: ['__master__', null] }, ...LIVE }` (`LIVE` from `server/jobs/purge-deleted`, already imported), projection `_id businessId key phase section answerType environments hint createdAt`, sorted by `key` then `createdAt`; joins business names from `businesses` in one `$in` query (as `GET /users` does at `admin.js:22-26`). Response `{ rows: [{ id, businessId, businessName, key, phase, section, answerType, environments, hint, createdAt }] }`. No other field, no user id or email.
- [x] `PlatformAdminService.loadTerms(kind: 'logisticsItem')` → GET above into a `termRows_` signal (`AdminTermRow` interface next to `BusinessRow`).
- [x] `app-platform-logistics-items` (OnPush, `inject()` only, signals): on init calls `loadTerms`; `groups_ = computed(...)` groups rows by `key` (trimmed); each group: the key, phase + section labels (from the first row; `logistics_section_<section>` / `logistics_tab_intake` / `logistics_tab_site_visit` keys from plans 522–523), `<n> עסקים` count, the business names as `.c-chip--tag` chips with `createdAt` as `dd/MM/yy`, and a button `platform_logistics_promote` ("הפוך למשותף"). Groups with 2+ businesses sort first (near-duplicates stand out), then by key.
- [x] Promote: `confirmModal.open(t('platform_logistics_promote_confirm') + '\n' + key)`; on confirm → `taxonomy.add('logisticsItem', key, { phase, section, answerType, environments, hint }, { shared: true })` with the extras of the group's oldest row (omit `environments` / `hint` when absent); success → toast `platform_logistics_promoted`, then `loadTerms` again (the server folded every business's same-key term, so the group disappears). On cancel nothing happens.
- [x] Mounted on `/platform` under the businesses table with a section title `platform_logistics_title` ("פריטי לוגיסטיקה של עסקים"); the page change is one import, one `imports` entry and one tag.
- [x] Empty: `app-empty-state` with `platform_logistics_empty` ("אין עדיין פריטים שעסקים הוסיפו").

### Should Have (P1)
- [x] `docs/brain/component-families.md`: the new component under the users of `modal-controller` / `feedback` / `empty-state`; `src/app/pages/breadcrumbs.md`: one line under `platform-dashboard`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL, logical properties only; mobile first (`$break-mobile` 768): each group is one card, chips wrap, the button under the chips on a phone and at the inline end on desktop.
- Dictionary keys (`general`, append-only): `platform_logistics_title` ("פריטי לוגיסטיקה של עסקים"), `platform_logistics_businesses` ("עסקים"), `platform_logistics_promote` ("הפוך למשותף"), `platform_logistics_promote_confirm` ("להוסיף את הפריט לרשימה המשותפת של כל העסקים? העותקים הפרטיים של העסקים יתאחדו איתו."), `platform_logistics_promoted` ("הפריט נוסף לרשימה המשותפת"), `platform_logistics_promote_failed` ("ההוספה לרשימה המשותפת נכשלה"), `platform_logistics_already_shared` ("הפריט כבר קיים ברשימה המשותפת"), `platform_logistics_empty` ("אין עדיין פריטים שעסקים הוסיפו"), `platform_logistics_load_failed` ("טעינת הפריטים נכשלה").
- Icons: `users` (already registered in `src/app/app.config.ts`) before the business count; the promote button is text only. No new icon.

## Atomic Sub-tasks
- [x] A1: Give the admin a cross-business read of own logistics items — the route, the kind allowlist, the business-name join, the exact response shape — server/routes/admin.js
- [x] A2: Prove who may read it and what it returns — vitest with `buildTestApp`: two businesses each with an own `logisticsItem` and one master item → the admin gets exactly the two own rows with business names and no master row; an owner → 403; no token → 401; `kind=unit` → 400; a soft-deleted own term is absent; the response keys are exactly the listed ones. Plus one case through the existing generic POST: the admin posts the same `kind` + `key` with `shared: true` → both businesses' own rows are gone from the admin read (the fold) — server/test/admin-taxonomy.test.js
- [x] A3: Load the rows on the client — `AdminTermRow`, `termRows_`, `loadTerms`; spec with `HttpTestingController` — src/app/core/services/platform-admin.service.ts, src/app/core/services/platform-admin.service.spec.ts
- [x] A4: Build the grouped list with the promote action — class per `.claude/skills/angularComponentStructure/SKILL.md`; template; component-local SCSS — src/app/pages/platform-dashboard/components/platform-logistics-items/platform-logistics-items.component.{ts,html,scss}
- [x] A5: Mount it on `/platform` with one tag; add the Hebrew strings — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, public/assets/data/dictionary.json
- [x] A6: Unit-test the component with stubbed services — groups two rows with the same key into one group with `2` businesses and puts it first; promote opens the confirm; confirm calls `TaxonomyStore.add('logisticsItem', key, extras, { shared: true })` with the oldest row's extras and then `loadTerms`; cancel calls nothing; a 409 shows `platform_logistics_already_shared`; empty rows show the empty state — src/app/pages/platform-dashboard/components/platform-logistics-items/platform-logistics-items.component.spec.ts
- [x] A7: Record the piece in the maps — docs/brain/component-families.md, src/app/pages/breadcrumbs.md
- [x] A8: Run every `[auto]` check and paste the outputs under Execution Notes

## What happens when
- On load error: toast `platform_logistics_load_failed`; the section shows the empty state; the businesses table above is unaffected.
- On promote, the master already has that key (another admin action, or two groups that trim to the same key): the server answers 409 → toast `platform_logistics_already_shared`, then reload.
- On promote, any other error: toast `platform_logistics_promote_failed`; nothing changes; the group stays.
- On cancel (the confirm): nothing changes.
- On leave (navigating away mid-promote): the POST finishes on the server; the next visit shows the new state.
- A business's events that answered the promoted item: their answers keep the same `itemKey` (= key), which now resolves to the shared term.

## Technical Considerations
- Dependencies: `requirePlatformAdmin`, `LIVE`, `buildTestApp` / `signTestToken`; `TaxonomyStore.add` (kind `logisticsItem` from plan 518, extras typed by plan 521's `TermExtras`); `ConfirmModalService`, `UserMsgService`, `TranslationService`, `app-empty-state`; plan 522–523 dictionary keys for phase and section names.
- New files needed: the route test, the component folder (4 files).
- Model changes: `AdminTermRow` (client only).
- Backend / API: new `GET /api/v1/admin/taxonomy?kind=logisticsItem` (platform admin). Promote reuses `POST /api/v1/data/taxonomyTerms` with `shared: true`.
- Auth and validation: platform admin only (route + `platformAdminGuard` on the page); `kind` allowlisted; no client input reaches a query except the allowlisted kind.
- Security surface: the first admin route that returns business content (item labels and business names) — limited to one taxonomy kind, no personal data.
- Data / migration: none. Promote writes one master term and folds same-key own terms, as today.
- Project checks: log-query `[auto]` present; Reuse Check present; dictionary keys listed; RTL / logical CSS; hotspots append-only.

## Out of Scope
- Editing or deleting shared items from this screen (the Metadata Manager card of plan 523 covers admin edits of shared terms). Other taxonomy kinds. Merging near-duplicate keys automatically. Notifying businesses about a promoted item.

## Critical Questions
- Q1: What happens to a business's own copy on promote? A: it is folded into the shared item (today's rule for every shared term: `generic.js:534-536`). Planner decision 2026-11-07 — the brief's "leave it and mark it as promoted" would leave a same-key own term next to the master one, which the code forbids elsewhere (a non-shared POST of a key master has → 409 at `generic.js:523-525`) and would show the item twice in that kitchen's lists. Nothing is lost: the answers reference the key, and the shared item carries the same label, phase and section.

## Execution Notes
- Planner 2026-11-07 (brief 6, item B3). One plan instead of two: promote needs no new server write (the existing shared-term POST does it), so the server part is one read route.
- Planner 2026-11-08: scope now names the test files this plan writes (run-517 parked 374, 510 and 535 because a folder glob does not list the tests under it).
- Builder 2026-11-10: build 0; lint 0 errors; test:ci 1873 SUCCESS; test:server 862 passed (admin-taxonomy 3/3); lint:icons ok; breadcrumbs clean; scope-check --arch ARCH: ok, --reuse ok.
- scope: platform-dashboard.page.spec.ts edited (beside scoped page.ts) — stubs the new child so the 5 existing page tests keep passing.
