# Gotchas — backend

Part of the domain split of `docs/brain/gotchas.md` — see that file for the index and the append routing table. Same rules as the parent file: each entry is what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a further split (e.g. a separate AI-proxy-focused domain file under `docs/brain/gotchas/`) as a brain proposal at the next Merge Gate.

Scope: `server/` — routes, auth-adjacent data access, the Gemini AI proxy, logging transport.

---

## Flipping a blocklist to an allowlist without reconciling every real client caller

**What hurt:** `server/routes/generic.js` gated the generic data API with a
`BLOCKED_ENTITY_TYPES` set (deny a few known-bad names, allow everything else).
Swapping it for an allowlist (`ALL_USER_ENTITY_TYPES`, deny everything not listed) is
strictly safer against arbitrary collection creation — but `ALL_USER_ENTITY_TYPES` had
never been the actual source of truth for "what the client calls," because the blocklist
never needed it to be. Two real, working storage keys —
`EQUIPMENT_CUSTOM_CATEGORIES` (`equipment-category-registry.service.ts`) and
`MENU_EVENT_TYPES` (`menu-event-type.service.ts`) — were missing from it and would have
started 403'ing on the next deploy, despite `ng build` passing and the diff looking complete.

**Why the obvious fix is wrong:** The allowlist file existed before this change and looked
authoritative (it's already imported elsewhere, e.g. `admin.js`), so it's tempting to trust
it as complete. Nothing had ever forced it to stay in sync with every literal storage key
used client-side — a blocklist doesn't care about that list, only an allowlist does.

**What to do instead:** Before flipping any deny-list to an allow-list, grep every literal
key passed to the relevant client call sites (here:
`grep -rn "replaceAll(\|query<\|\.put(\|\.post(" src/app/core/services/*.ts`, resolving
`const`-aliased keys back to their string literals) and diff that set against the
allowlist. Treat any gap as a hard blocker, not a warning — add the missing entries before
the allowlist ships, don't discover them from a support ticket.

See also: [[atomic-bulk-replace-with-standalone-fallback]]

---

## `node --watch` full-restart on every server edit

**What hurt:** `server/package.json`'s `dev` / `dev:local` / `dev:remote` scripts all run `node --watch index.js` — any saved file change triggers a full process restart, dropping in-flight requests and any in-memory state.

**Why the obvious fix is wrong:** There's nothing to "fix" here — the restart is `node --watch`'s designed behavior, not a bug. Debouncing or ignoring it doesn't help.

**What to do instead:** Expect a short gap (~1s) after any server-side edit before requests succeed again; don't fire requests immediately after editing server code in the same script/test run.

---

## Production logs silently vanish when `logServerUrl` is unset

**What hurt:** `environment.prod.ts` ships with `logServerUrl: ''`. `LoggingService.sendToLogServer()` (`src/app/core/services/logging.service.ts:19`) silently `return`s when the URL is empty — production logs meant for the remote log server disappear with no error, no console warning, nothing surfaced.

**Why the obvious fix is wrong:** Adding more `logger.*()` calls doesn't help if the transport itself is a silent no-op — the gap is invisible until someone specifically checks whether `logServerUrl` is configured for that environment.

**What to do instead:** Before relying on remote log capture in prod, confirm `environment.prod.ts` actually has `logServerUrl` set — otherwise check the browser console directly instead of assuming server-side logs exist.

---

## Gemini echoes a near-duplicate few-shot example instead of answering fresh

**What hurt:** `/api/v1/ai/generate` 502'd with "Gemini returned invalid JSON." The raw response wasn't broken JSON at all — it was the literal few-shot exemplar block itself: `קלט: "..."\nפלט: {...}`. Gemini matched a live query too closely against an already-approved shot in the injected few-shot block and echoed the demonstration labels back verbatim instead of producing bare JSON for the new request.

**Why the obvious fix is wrong:** Retrying burns another quota slot on a model likely to repeat the same confusion (same shots, same near-duplicate query). Tightening the "return JSON only" instruction in the system prompt doesn't help either — the model isn't ignoring the instruction, it's confusing the demonstration for the answer because nothing marks where the examples end and the live request begins.

**What to do instead:** (1) Insert an explicit delimiter between the few-shot block and the live query (`## הבקשה הנוכחית — החזר JSON בלבד עבורה`) so the model can't conflate them. (2) Make JSON extraction resilient regardless: if a direct `JSON.parse` fails, fall back to slicing the outermost `{...}` from the raw text before giving up — this alone rescues an echoed-exemplar response since the valid JSON is still in there, just wrapped. See `extractJsonPayload()` in `server/routes/ai.js`.

---

## Metered API usage counters must fire at dispatch, not at downstream success

**What hurt:** `server/routes/ai.js`'s shared `GEMINI_USAGE` daily counter only incremented after the full pipeline succeeded (JSON parsed + schema validated). Every 502 caused by Gemini's own errors (bad key, model overload) or by our post-processing (parse/validation failure) left the counter untouched, so `GET /api/v1/ai/usage` read "0/1000" even after several real calls had gone out — looked like a stale/broken counter when it was accurately tracking "successful requests," not "requests made."

**Why the obvious fix is wrong:** Incrementing on every response including outright guard-clause rejections (missing API key, no prompt, already at the daily cap) overcounts — those never reach Gemini at all, so counting them defeats the point of a budget guard.

**What to do instead:** Increment the counter the moment the route actually dispatches the call to the metered API (immediately before `await fetch(GEMINI_URL...)`), not after any downstream success check. This naturally excludes the early-return guard clauses (they never reach that line) while counting every real spend, including the provider's own error responses and timeouts.

---

## A silent list-endpoint cap looks exactly like a client load-order race

**What hurt:** Users reported intermittent blank ingredient names in recipe-builder — some rows resolved, some didn't, and it seemed to "fix itself" after navigating away and back. That pointed straight at a load-order race (component reads a signal before the underlying `ensureLoaded()` finishes) — and there *was* one (fixed via a route resolver gate). But fixing it didn't fix the symptom. The real cause: `server/routes/generic.js`'s `GET /:type` had capped every list response at 500 docs (max 1000) since March, invisible until an account's collection actually exceeded that — which a large data import (`PRODUCT_LIST` 1,478, `RECIPE_LIST` 1,112, `DISH_LIST` 1,001 docs for one account) did for the first time. Every full-collection fetch silently returned a random 500-doc subset; whether a given ingredient resolved was luck of which subset loaded.

**Why the obvious fix is wrong:** Both bugs produce the *identical* symptom — non-deterministic, per-item resolution failures that seem to resolve on reload — because both are "the data a component needs isn't in memory yet/at all when it renders." Fixing the race (a real, legitimate bug) and declaring victory left the actual live-affecting bug in place; only checking the raw HTTP response size (not just status code) against the known collection count surfaced it.

**What to do instead:** When intermittent per-item resolution failures don't reproduce consistently, check the actual byte size / item count of the list responses against the true collection count in the DB *before* assuming a client-side timing bug — `curl`/network-tab a full-list endpoint directly. A 200 status with a suspiciously round item count (500, 1000) is the tell for a silent server-side cap, not a race.

---

## An audit script built from the same derivation logic as the import can't catch the logic's own blind spots

**What hurt:** A re-runnable "verify import against source" script (re-parses the SQL fresh, calls the same `buildImport()` the real import uses, diffs the result against Mongo) reported 0 mismatches — while a real, user-confirmed data-completeness bug (dish mise-en-place list missing valid items) was still present. The script was working correctly; it just couldn't have caught this class of bug by construction.

**Why the obvious fix is wrong:** Trusting "the audit passes" as proof of correctness assumes the audit's *expected* side is itself correct. When the expected side is generated by calling the exact same transformation function the import uses, the audit can only ever detect *drift* between the import and the database — never a flaw in the transformation's own domain assumptions (here: "a dish's prep list = sub-recipe ingredients only," which was simply the wrong rule, not a data-transfer error). An audit built this way will report 0 mismatches even when the underlying rule is wrong, because both sides agree with each other, not with the domain.

**What to do instead:** After any audit script reports clean, still hand-trace a live user-reported discrepancy directly against the raw source (bypassing all of your own transformation code) before trusting the audit's "0 mismatches" as closing the question — especially for derived/inferred fields (grouping rules, categorization, anything without a direct 1:1 source column) rather than straight copied fields.

---

## Registering a request logger after `express.static` makes every static-asset request invisible

**What hurt:** `server/index.js` had `app.use(express.static(STATIC_DIR))` registered *before* `app.use(morgan('tiny'))`. `express.static` fully terminates the response for any file it matches — the request never reaches later middleware. Result: the ~30 static-asset requests a real page load makes (JS chunks, CSS, images) never produced a morgan log line, with no error and no warning. It looked like the app just wasn't serving static assets through the logged path, when it was serving them fine — just silently.

**Why the obvious fix is wrong:** Upgrading the morgan *format* to add `:response-time`/`:res[content-length]` (plan 302 M1's actual goal) doesn't fix this — you get richer logs for whatever traffic still reaches morgan, while static assets remain completely absent, and it's easy to mistake "no static-asset log lines" for "the app makes very few static requests" instead of "the logger never sees them."

**What to do instead:** Any middleware that can fully terminate a response (`express.static`, a catch-all `res.sendFile()`, an early `res.json()`) must be registered **after** the request logger, not before. To verify the fix actually worked, `curl` a known static asset path directly and confirm a log line appears for that specific 200 — the absence of a log line for a request you know succeeded is the tell, not the presence of errors.

## A blanket `immutable` cache on `express.static` poisons every unhashed asset

**What hurt:** Plan 302 M3 said to add `maxAge: '1y', immutable: true` to
`express.static`, justified by `"outputHashing": "all"` in `angular.json`. That option
only hashes the JS/CSS bundles Angular *generates*. Everything under `public/` is copied
verbatim and keeps its name across deploys - including
`public/assets/data/dictionary.json`, which every Hebrew UI string flows through per
AGENTS.md. Shipping the blanket option
would have pinned a stale dictionary in returning browsers for a year, with `immutable`
telling them not even to ask.

**Why the obvious fix is wrong:** Guarding only `index.html` (which the plan does call
out) feels like the whole job, because index.html is the file everyone thinks of as "the
unhashed one". It isn't. Every `public/` asset shares that property, and they fail
silently - no error, just users on stale translations with no way to self-recover short
of a hard reload.

**What to do instead:** Never apply `immutable` to a whole static directory. Gate it on
the filename actually being content-hashed, and default everything else to `no-cache`:
`const HASHED_ASSET = /-[A-Z0-9]{8,}\.[a-z0-9]+$/` checked inside `setHeaders`.
`no-cache` still yields a 0-byte 304, so the unhashed path costs nothing versus before.
Related: you cannot test any of this through `ng serve` (`npm run dev:local` /
`dev:remote`) - it never executes `server/index.js` and hard-codes its own
`Cache-Control: no-cache`, so cache headers always look broken there. Use
`npm run serve:prod`, and uncheck DevTools "Disable cache" before concluding anything.
