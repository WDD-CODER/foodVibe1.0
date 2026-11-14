# Plan 606 — Style QA opens real records of the signed-in business on detail pages

Status: draft
Depends-on: none
Snapshot: d8b1f68494302471c8afa1da89e5ea6d3af5e8ef
## Problem Statement

The 2026-11-14 Style QA run reported two medium findings on the venue detail page: V3-c20a9ebb, where a red notice
covers the header at 375px, and V8-b685d07d, where the "empty" state shows a card full of blank placeholders. Neither is
an app bug.

- **V3-c20a9ebb.** The engine picks the id for `:id` routes with an unauthenticated
  `context.request.get(<idType url>)` (`scripts/styleqa/sweep.mjs` → `recordId`). Signed out, `/api/v1/data/venues`
  returns only the shared `__master__` catalog (`server/utils/business-scope.js` → `scopeFilter`). The signed-in QA user's
  business has its own copy with other ids, so the page answers "מיקום האירוע לא נמצא" and goes back to the list. The
  screenshot shows that notice over the list.
- **V8-b685d07d.** The `empty` state answers the list request with `[]`, so the detail page never gets its venue and
  keeps its loading skeleton.

So every Style QA detail page (product, equipment, supplier, venue and recipe edit; recipe builder; menu builder; cook
view) is measured on a record the user cannot open. `/clients/:id` is excluded from the page map for the same reason,
because the clients API needs a signed-in request.

## Goals & Success Criteria
**Primary:** Style QA fetches the record id as the signed-in QA user, so every `:id` page is measured on a record of
that user's own business, and the clients detail page is in the map.

Done when:
- [auto] `pnpm run test:scripts` → exit 0
- [auto] `node scripts/styleqa/run.mjs --list` → its output has a line starting with `client-detail`
- [auto] `node scripts/styleqa/run.mjs --layers=static` → its output has `map check ok`
- [auto] `pnpm run build` → exit 0
- [human] Run `/styleqa venue-view`: the venue page screenshot at 375px shows the venue's details, with no "מיקום האירוע לא נמצא" notice.

## Execution Mode

- Parallel: yes. No other open plan writes these files.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/qa/lib/styleqa-sign-in.mjs
scripts/test/styleqa-sign-in.test.mjs
docs/qa/styleqa-pages.json
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves. This is QA tooling and the page map only. No server, schema or app code changes, and the server's
  scoping (INV-1, INV-2) is what this fix relies on, not what it changes.

## Reuse Check

- none. The sign-in module keeps using `loginQa` / `seedQaContext` from `scripts/qa/lib/qa-login.mjs`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As the chef reading a Style QA report, I want detail pages measured on my own records, so that the report shows real
  screens and not "not found" notices.

## Functional Requirements

### Must Have (P0)
- [ ] `scripts/qa/lib/styleqa-sign-in.mjs` → `signIn(context, { appOrigin, apiOrigin })`:
  - After `seedQaContext`, wrap `context.request.get` so that a request whose URL starts with `apiOrigin` carries
    `authorization: Bearer <session.token>`.
  - Keep the original function bound and merge any headers the caller passed.
  - Requests to any other origin stay untouched.
  - Do not use `context.setExtraHTTPHeaders`: it would add the header to page requests too, and cross-origin font
    requests would then need a CORS preflight.
- [ ] `scripts/qa/lib/styleqa-sign-in.mjs`: export the wrapper as `withApiAuth(request, apiOrigin, token)` so a test can
  call it on a fake request object.
- [ ] `scripts/test/styleqa-sign-in.test.mjs` (`node:test`), with a fake `request` whose `get(url, opts)` records its
  arguments:
  - an API URL gets the bearer header;
  - a caller's own headers are kept;
  - a URL on another origin gets no header.
- [ ] `docs/qa/styleqa-pages.json`:
  - Add a page `{ "slug": "client-detail", "aliases": [], "title": "פרטי לקוח", "routes": ["/clients/:id"], "auth": true, "idType": "/api/v1/data/clients?limit=1" }`.
  - Remove `/clients/:id` from `excluded`.

### Should Have (P1)
- [ ] When `loginQa` fails (no credentials), `signIn` still throws its own message unchanged.

## Atomic Sub-tasks

- [ ] 606-A1: Make Style QA look up record ids as the signed-in user, not as a guest — withApiAuth wrapper on context.request.get — scripts/qa/lib/styleqa-sign-in.mjs
- [ ] 606-A2: Prove that only API requests get the sign-in header — node:test with a fake request — scripts/test/styleqa-sign-in.test.mjs
- [ ] 606-A3: Measure the client detail page now that its id can be found — page map entry, drop the exclusion — docs/qa/styleqa-pages.json

## Technical Considerations

- `recordId` runs after `signIn` on the same context (`scripts/styleqa/sweep.mjs`), so the wrapper is in place in time.
  `sweep.mjs` is kit-owned and is not edited.
- The intermittent sweep crash (ECONNRESET at sign-in, seen in 2 of about 7 runs on 2026-11-14) is out of scope here;
  log it if it shows up again.
- Backend / API impact: none. Auth: reads use the QA user's existing token, nothing new is stored. Security surface: the
  token stays in memory and is never printed. Data / migration: none.

## Out of Scope

- Changes to the kit engine (`scripts/styleqa/*`). An engine-level "fetch ids signed in" option is a kit change.
- App code: the venue page's "not found" notice and loading skeleton behave correctly for a missing record.

## Critical Questions

- none

## Execution Notes
