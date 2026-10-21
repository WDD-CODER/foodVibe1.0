# Plan 456 — Show every message and error the same way, and remove the duplicated plumbing behind them

Status: draft
Track: code
Depends-on: 450, 454
Conflicts-with: 451, 452, 453, 454, 455
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
The reuse audit (`docs/mvp/reuse-audit-2026-10-20.md`, P7) found the message, error and HTTP/server plumbing copied
instead of shared. Counts below are from `mvp` at drafting; Step 0 re-counts on `main`.
- **Raw-Hebrew toasts**: ~55 `userMsg.onSet*Msg('<Hebrew literal>')` calls (the audit said 47) in 15 files, most in
  `metadata-manager.page.component.ts` (16), `unit-registry.service.ts` (9), `kitchen-state.service.ts` (7),
  `metadata-registry.service.ts` (6). They bypass `translatePipe` + `dictionary.json`.
- **Error path**: the rule is `logging.error` + `userMsg.onSet*Msg(translate(key))`; several catch blocks only toast.
- **Dead UI**: `shared/change-popover` and `shared/floating-info-container` have no consumer (no `app-change-popover` /
  `app-floating-info` selector outside their own folders).
- **HTTP**: `gemini-usage.util.ts` calls raw `fetch` to `/api/v1/ai/usage`, bypassing the auth interceptor. `/api/v1/...`
  paths are string literals in 13 client files (`http-storage.adapter`, `gemini.service`, `gemini-shots.service`,
  `user.service`, `user-admin.service`, `platform-admin.service`, `business.service`, `team.service`,
  `product-import.service`, `event-pipeline.service`, `server-heartbeat.service`, `auth.interceptor`, `logging.service`).
- **Server**: `jwt.verify` of the access token is repeated in `routes/log.js`, `middleware/write-limit.js` (and
  `middleware/auth.js`); `isAdmin` is re-declared in `routes/generic.js` (MVP: `isPlatformAdmin === true`, plus the gate
  `requirePlatformAdmin` in `middleware/auth.js`); `express-rate-limit` is configured by hand in `ai.js`, `auth.js` (x3),
  `log.js`, `business.js`, `product-import.js`, `write-limit.js`; `ai.js` has ~30 hand-written `res.status(400)` checks.

## Goals & Success Criteria
- Primary: one way to show an error/toast, one place for API paths, one helper each for token verify, admin check,
  rate limiting and request validation. **No behaviour change** other than wording moving into the dictionary.
- Success:
  - [ ] [auto] `npx ng build` and `npx ng test --watch=false` pass; `npm --prefix server test` passes with the same or more tests than before.
  - [ ] [auto] `rg "onSet(Success|Error|Warning)Msg\(\s*['\"\`]" src/app --glob "!*.spec.ts"` → no matches.
  - [ ] [auto] `rg "fetch\(" src/app --glob "!*.spec.ts"` → only `logging.service.ts` (deliberate: must not recurse through the interceptor).
  - [ ] [auto] `rg "'/api/v1|\`[^\`]*/api/v1" src/app --glob "!*.spec.ts"` → matches only in `http-storage.adapter.ts`.
  - [ ] [auto] `rg "jwt\.verify" server/routes server/middleware` → only the shared helper (and the refresh-token call in `auth.js`); `rg "const isAdmin" server` → none; `rg "rateLimit\(" server` → only the factory; `rg -c "status\(400\)" server/routes/ai.js` is lower than before and each remaining 400 has a reason in the plan evidence.
  - [ ] [auto] `src/app/shared/change-popover` and `src/app/shared/floating-info-container` no longer exist and `npx ng build` still passes.
  - [ ] [auto] Frozen files `recipe-builder.page.ts` (1 toast) net lines <= 0 (`git diff --numstat`); hotspots `dictionary.json` only gains lines.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Smoke each touched page with `ng serve -c local`: Settings/metadata manager (add, duplicate, delete a term; unit add/delete), recipe/dish delete + restore, supplier add from a product, version history restore, AI modal usage counter, login/logout. Every message still appears, now in Hebrew from the dictionary, with the same meaning.

## Execution Mode
- Parallel: no for the two groups' shared files; the client group (C) and server group (V) touch disjoint files and may run in two slots after C0/V0 checkpoints.
- Concurrent plans: 451–455, 457 are independent of this one but plan 454 (data-service base, KitchenState) also edits `kitchen-state.service.ts`; 452/453/455 may touch `metadata-manager`. Run 456 after any plan whose scope overlaps, or re-read the file at Step 0.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`), and plan 450 (reuse layer: registry, `scope-check --reuse`, lint). Plan 458 (rule sweep) depends on this one.
- Refactor, no behaviour change: no new endpoints, no new messages, no new permissions. Response bodies and status codes stay identical (server tests prove it).
- New dictionary keys are appended only; the Hebrew text moves out of the code unchanged. Key naming: reuse the nearest existing `*_error` / `*_success` convention in `dictionary.json`.
- Checkpoints (human can stop and merge): C2 (all toasts in dictionary), C4 (client done), V4 (server done).
- Scope is large, so the Worker commits per sub-task and runs `npx ng build` (client) or `npm --prefix server test` (server) after each.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/components/user-management/user-management.component.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
src/app/core/services/unit-registry.service.ts
src/app/core/services/kitchen-state.service.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/preparation-registry.service.ts
src/app/core/services/add-supplier-flow.service.ts
src/app/core/services/menu-section-categories.service.ts
src/app/core/services/user-msg.service.ts
src/app/core/services/user-msg.service.spec.ts
src/app/core/resolvers/supplier.resolver.ts
src/app/core/resolvers/recipe.resolver.ts
src/app/core/resolvers/product.resolver.ts
src/app/core/resolvers/equipment.resolver.ts
src/app/core/utils/add-option.util.ts
src/app/core/utils/gemini-usage.util.ts
src/app/core/services/gemini.service.ts
src/app/core/services/gemini-shots.service.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/interceptors/auth.interceptor.ts
src/app/core/services/logging.service.ts
src/app/core/services/user.service.ts
src/app/core/services/user-admin.service.ts
src/app/core/services/platform-admin.service.ts
src/app/core/services/business.service.ts
src/app/core/services/product-import.service.ts
src/app/core/services/event-pipeline.service.ts
src/app/core/services/server-heartbeat.service.ts
src/app/pages/settings/services/team.service.ts
src/app/shared/version-history-panel/version-history-panel.component.ts
src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.ts
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts
src/app/shared/change-popover/**
src/app/shared/floating-info-container/**
src/app/shared/breadcrumbs.md
server/middleware/auth.js
server/middleware/write-limit.js
server/middleware/rate-limit.js
server/middleware/validate.js
server/routes/ai.js
server/routes/auth.js
server/routes/log.js
server/routes/generic.js
server/routes/business.js
server/routes/product-import.js
server/test/**
docs/mvp/runs/456.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Likely case: a caller of `gemini-usage.util.ts`
(the three `ai-*-modal` components) if its signature has to change — try to keep the signature first.

## Architecture Impact
- INV-1: preserves — the owner/staff permission rules in `server/utils/permissions.js` are not touched; the single `isPlatformAdmin` helper returns exactly what `generic.js` computes today.
- INV-2: preserves — `businessId` scoping untouched (`generic.js` scoping lines stay as they are).
- INV-3: preserves — no client-side cascades added.
- INV-4: preserves — Zod schema validation (`checkStoredDoc`) untouched; the new request-validation helper covers only `ai.js` body checks and returns the same 400 shape.

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: yes — internal helpers only (token verify, platform-admin check, rate-limiter factory, request validation). Limits (window, max, message) of every limiter stay exactly as configured today.

## Step 0 — Reality Check
Runs first, always (the MVP changed many of these files). On current `main` print `ok` or `conflict: <what>` per item:
- every file in the scope block exists (renamed/removed → conflict);
- `shared/change-popover` and `shared/floating-info-container`: `rg "app-change-popover|app-floating-info|ChangePopover|FloatingInfo" src` has no hit outside their own folders and `breadcrumbs.md` (a hit → drop that deletion and say so);
- the literal-toast call list: re-run the grep from the success criteria and compare with the file list in C1–C2;
- `fetch(` sites, `/api/v1` literal sites, `jwt.verify`, `const isAdmin`/`isPlatformAdmin`, `rateLimit(`, `status(400)` in `ai.js`: re-run and compare with the Problem Statement;
- symbols: `UserMsgService.onSetSuccessMsg/onSetErrorMsg/onSetWarningMsg`, `translate(` on `TranslationService`, `requirePlatformAdmin`, `checkStoredDoc`, `requireAuth` (names as found in `server/middleware/auth.js`).
Any conflict → stop and report before editing.

## User Stories
- As a chef, I want every message and error in the app to read the same way and in Hebrew from one place so that I can trust what it tells me and the team can fix wording in one file.
- As a chef, I want the app to keep working exactly as before while its internals are tidied so that nothing I rely on changes.

## Functional Requirements

### Must Have (P0)
- [ ] No `onSet*Msg` call receives a string literal; every toast text is `translate('<key>')` with the key appended to `dictionary.json`.
- [ ] Every caught error that shows a toast also calls `logging.error('<domain.action.result>', ...)` first; no catch swallows silently.
- [ ] One API-path map in `http-storage.adapter.ts`; all other client files import it; `gemini-usage.util` goes through `HttpClient` (so the interceptor adds the token and handles refresh).
- [ ] Server: one access-token verify helper, one platform-admin predicate, one `createRateLimiter(options)` factory, one `badRequest`/field-check helper for `ai.js`.
- [ ] Dead folders removed together with their `breadcrumbs.md` lines.

## UI/UX Notes
- Wording is moved, not rewritten. Messages built from variables (`exists(trimmed)`, `success(name)` in `metadata-registry.service.ts`) use a dictionary key with a `{name}` style placeholder only if `translate` already supports params; otherwise concatenate `translate(key) + ' ' + name` as the current text does — check the existing pattern in `translation.service.ts` first.
- New keys listed in the PR description and in `docs/mvp/runs/456.md`.

## Atomic Sub-tasks

Group C — client
- [ ] C0 (checkpoint): Step 0 Reality Check; record the real toast list, `/api/v1` literal list and `fetch` list in the run file — `docs/mvp/runs/456.md`
- [ ] C1: Move the literal toasts in the core services into the dictionary — add keys, switch `onSet*Msg('…')` to `translate(key)`: `unit-registry`, `metadata-registry`, `preparation-registry`, `kitchen-state` (frozen-file rule does not apply), `add-supplier-flow`, `menu-section-categories`, `add-option.util`, the four `*.resolver.ts` — `src/app/core/services/unit-registry.service.ts`, `src/app/core/services/metadata-registry.service.ts`, `src/app/core/services/preparation-registry.service.ts`, `src/app/core/services/kitchen-state.service.ts`, `src/app/core/services/add-supplier-flow.service.ts`, `src/app/core/services/menu-section-categories.service.ts`, `src/app/core/utils/add-option.util.ts`, `src/app/core/resolvers/supplier.resolver.ts`, `src/app/core/resolvers/recipe.resolver.ts`, `src/app/core/resolvers/product.resolver.ts`, `src/app/core/resolvers/equipment.resolver.ts`, `public/assets/data/dictionary.json`
- [ ] C2 (checkpoint): Same for pages and shared components — `metadata-manager` (16), `user-management`, `version-history-panel` (3), `quick-edit-product-panel`, `quick-add-product-modal`, `recipe-builder.page.ts` (frozen: net lines <= 0), `cook-view.page.ts` / `equipment-form` only if Step 0 finds literal text there; then the literal-toast grep must be empty — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `src/app/pages/metadata-manager/components/user-management/user-management.component.ts`, `src/app/shared/version-history-panel/version-history-panel.component.ts`, `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.ts`, `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts`, `src/app/pages/recipe-builder/recipe-builder.page.ts`, `src/app/pages/cook-view/cook-view.page.ts`, `src/app/pages/equipment/components/equipment-form/equipment-form.component.ts`, `public/assets/data/dictionary.json`
- [ ] C3: One error path — for each catch that toasts, add the missing `logging.error(...)` (event name `domain.action.result`) and make sure the toast uses a key; add one `UserMsgService` unit test that a key-translated message is shown — `src/app/core/services/user-msg.service.ts`, `src/app/core/services/user-msg.service.spec.ts`, `src/app/core/services/kitchen-state.service.ts`, `src/app/core/services/metadata-registry.service.ts`, `src/app/core/services/unit-registry.service.ts`
- [ ] C4 (checkpoint): API paths in one place — export a typed `API` map/builders (`data(type)`, `ai(path)`, `auth(path)`, `admin(path)`, `log`, `health`) from the adapter; switch the 13 files; `logging.service.ts` and `auth.interceptor.ts` import the same constants — `src/app/core/services/http-storage.adapter.ts`, `src/app/core/interceptors/auth.interceptor.ts`, `src/app/core/services/logging.service.ts`, `src/app/core/services/gemini.service.ts`, `src/app/core/services/gemini-shots.service.ts`, `src/app/core/services/user.service.ts`, `src/app/core/services/user-admin.service.ts`, `src/app/core/services/platform-admin.service.ts`, `src/app/core/services/business.service.ts`, `src/app/core/services/product-import.service.ts`, `src/app/core/services/event-pipeline.service.ts`, `src/app/core/services/server-heartbeat.service.ts`, `src/app/pages/settings/services/team.service.ts`
- [ ] C5: Put the Gemini usage call behind the interceptor — replace `fetch` in `gemini-usage.util.ts` with `HttpClient` (via `inject` in an injection context or a method on `gemini.service.ts`), same return type and error handling — `src/app/core/utils/gemini-usage.util.ts`, `src/app/core/services/gemini.service.ts`
- [ ] C6: Delete the dead components and their breadcrumb lines (after the Step 0 grep still shows no consumer) — `src/app/shared/change-popover/**`, `src/app/shared/floating-info-container/**`, `src/app/shared/breadcrumbs.md`

Group V — server
- [ ] V1: Shared token verify and platform-admin check — add `verifyAccessToken(req)` (returns payload or null) and `isPlatformAdmin(req)` beside `requirePlatformAdmin` in `middleware/auth.js`; use them in `routes/log.js`, `middleware/write-limit.js`, `routes/generic.js` (delete local `isAdmin`); refresh-token verify stays; tests for both helpers — `server/middleware/auth.js`, `server/middleware/write-limit.js`, `server/routes/log.js`, `server/routes/generic.js`, `server/test/**`
- [ ] V2: Rate-limiter factory — `createRateLimiter({ windowMs, max, messageKey })` in `server/middleware/rate-limit.js` with the default headers/handler; convert each limiter keeping its exact numbers; existing `data-write-limit*.test.js` and `log-route.test.js` must pass unchanged — `server/middleware/rate-limit.js`, `server/middleware/write-limit.js`, `server/routes/ai.js`, `server/routes/auth.js`, `server/routes/log.js`, `server/routes/business.js`, `server/routes/product-import.js`
- [ ] V3: Request-validation helper for `ai.js` — `requireFields(res, body, rules)` / `badRequest(res, messageKey)` in `middleware/validate.js` returning the identical `{ error, ... }` bodies; convert the ~30 `status(400)` checks one handler at a time; keep checks that are not plain presence/type/length as they are — `server/middleware/validate.js`, `server/routes/ai.js`, `server/test/**`
- [ ] V4 (checkpoint): Run all server tests, `ng build`, `ng test`, `log-query`; write the run file with the validation card — `docs/mvp/runs/456.md`

## Technical Considerations
- Dependencies: `TranslationService.translate`, `UserMsgService`, `LoggingService`, `checkStoredDoc`, `requirePlatformAdmin` (all exist on `mvp`).
- New files: `server/middleware/rate-limit.js`; test files under `server/test/`. No new client files.
- Frozen files: only `recipe-builder.page.ts` (and `cook-view.page.ts` if touched) are in scope, net lines <= 0. If a translate call adds a line, offset it in the same file or escalate.
- Hotspots: `dictionary.json` append-only (check for duplicate keys before adding; `tech-stack.md` lists the others).
- Model changes: none. Backend / API: none visible. Auth: the `/ai/usage` call now sends the bearer token via the interceptor — confirm the route already sits behind `requireAuth` (Step 0).
- Security surface: token-verify helper must keep the existing failure behaviour (401 vs anonymous) per file; do not widen what `log.js` accepts without a token.
- Project checks: log-query [auto]; chef-side stories; new dictionary keys named above.

## Out of Scope
- `logging.service.ts`'s own `fetch` (it must not loop through the interceptor); the `auth.js` refresh-token `jwt.verify`.
- Rewording any message; adding new messages; permission or limiter value changes.
- Modal, list, form or chip work (451–455, 457); the repo-wide rule sweep (458).
- Anything in `server/utils/permissions.js`.

## Critical Questions
None. (No invariant conflict found. If Step 0 shows `/ai/usage` is public on purpose, ask before routing it through the interceptor — INV-1 · owner/staff rules are untouched, but anonymous access would change · proposed change: require login · who loses what: nobody signed in; logged-out visitors lose the counter.)
