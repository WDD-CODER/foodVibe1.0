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

> **Superseded (Plan 382, 2026-10-06):** `logServerUrl` no longer exists — see "Client logs go to `POST /api/v1/log`" at the end of this file.

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

**What to do instead:** Any middleware that can fully terminate a response (`express.static`, a catch-all `res.sendFile()`, an early `res.json()`) must be registered **after** the request logger, not before. (Since plan 383 the request logger is `pino-http`, still registered before `express.static`; it deliberately skips the request-complete line for asset paths via `autoLogging.ignore` — so for this check, temporarily remove that ignore or test an `/api/` path.) To verify the fix actually worked, `curl` a known static asset path directly and confirm a log line appears for that specific 200 — the absence of a log line for a request you know succeeded is the tell, not the presence of errors.

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

---

## Running `node index.js` directly never picks up server code changes

**What hurt:** Editing `server/` files and testing against a manually-launched `node index.js`
process kept serving stale behavior — new routes/logic just didn't appear, with no error to
explain why. Cost time on both a Human session and this session independently (this session hit
`EADDRINUSE: address already in use :::3000` repeatedly — a previous plain `node index.js` was
still bound to the port from an earlier test, invisibly serving old code the whole time).

**Why the obvious fix is wrong:** `server/package.json`'s `"start": "node index.js"` script (and
launching it that way directly, which is the natural thing to type) has no file-watching at all —
Node only reloads code on process restart. It *looks* like a normal dev server, so nothing about
running it suggests a restart is needed after every edit.

**What to do instead:** Use `npm run dev:local` (or `dev:remote`) from `server/`, not
`node index.js` — that script is `node --watch index.js`, which auto-restarts on file changes. If a
restart still doesn't seem to take effect, check for a leftover process on port 3000 first
(`netstat -ano | findstr :3000` on Windows, kill the PID) before assuming the code change is wrong —
`--watch` restarts cleanly but a stray manually-launched instance from an earlier session won't have
been killed by it.

---

## New `__master__` write paths must remember to bump the sync version

**What hurt:** `syncMasterToUser` ran a full multi-collection diff on every `POST /refresh` (every ~13 min per session) even though master docs are essentially never written live — auditing every write path in `server/` turned up only `seed-master.js` and one-off `legacy-import/` scripts. Version-gating (`server/services/master-version.js`) skips the sync when nothing changed, comparing `User.lastSyncedMasterVersion` against a single shared `MASTER_META.lastModified`.

**Why the obvious fix is wrong:** There is no automatic trigger that bumps the version — it's not derived from the docs themselves (no reliable `updatedAt_` field exists across the 13 `CLONEABLE_TYPES` collections; backfilling it just to compute a version would be a bigger migration than the problem warranted). A future script — or worse, a future *live* endpoint — that writes `userId: '__master__'` docs without calling `bumpMasterVersion()` will not error; it will just leave every user's next refresh silently comparing against a stale version and skipping a sync that should have run.

**What to do instead:** Any new code path that writes/edits/removes a `__master__` document — script or live endpoint — must call `bumpMasterVersion()` (`server/services/master-version.js`) afterward, or run `node server/scripts/bump-master-version.js`. If a *live* write path to master docs is ever added (none exists today), version-gating design should be revisited — a shared single-doc version model assumes rare, developer-driven writes, not concurrent live ones.

**Update 2026-09-26:** a live write path now exists — `PUT /api/v1/data/:type/:id/push-to-master` (`server/routes/generic.js`), added deliberately open to any signed-in user for an active dev/testing process, explicitly marked `TEMPORARY` in every file it touches. It already calls `bumpMasterVersion()`. Before this route ships to real users it needs the admin-role gate this entry originally called for (mirror `permanentlyDeleteRecipe`'s `role !== 'admin'` check) — flagged by an automated security review and consciously deferred, not missed.

---

## A fixed CORS/auth bug can still leave a third-party integration dead — check CSP too

**What hurt:** Recipe/venue image upload (direct browser → Cloudinary, `CloudinaryService.upload`) was reported broken on the Render deployment. Session 1 found and fixed a real bug: `auth.interceptor.ts` attached the app's `Authorization` header to the Cloudinary request whenever `environment.apiUrl`/`authApiUrl` was `''` (same-origin prod build), which Cloudinary's CORS policy rejects. That fix shipped and was confirmed live in the deployed bundle — but the user still saw the exact same failure afterward. `curl` to the same Cloudinary endpoint with matching `Origin`/`Referer` succeeded every time; only requests from the actual page failed. The real cause was one layer further out: `server/index.js`'s helmet CSP sets `connect-src 'self'` and `img-src 'self' data: blob:`, so the *browser itself* blocks the fetch to `api.cloudinary.com` before it's even sent — completely independent of whatever CORS headers Cloudinary's response would have carried, and independent of the interceptor being correct.

**Why the obvious fix is wrong:** Fixing the CORS/auth-header bug and confirming it's deployed feels like closing the loop — the request now leaves clean, Cloudinary would accept it, and the code diff clearly addressed a real, reproducible defect. But CORS and CSP are two independent browser gates: CORS is enforced by the *target server's* response headers, CSP is enforced by *this app's own* response headers regardless of what the target allows. A CSP `connect-src`/`img-src` that never accounted for a third-party integration will silently block it forever, no matter how correct the app-side request code becomes. `read_network_requests`-style tooling can even misreport a CSP-blocked request as a generic error status (503 was observed here) rather than surfacing it as blocked — don't trust that number over the browser's own signal.

**What to do instead:** When a direct-browser third-party call (upload widget, analytics beacon, payment SDK, etc.) fails and CORS/auth looks fixed, check the CSP next — specifically listen for the browser's own `document.addEventListener('securitypolicyviolation', ...)` event (fires async; wait a tick before reading) or check DevTools' Console/Network CSP violation entries directly, rather than reasoning from HTTP status codes alone. `server/index.js`'s CSP is allowlist-only by design (`docs/agent/standards-security.md` #6-7) — any new third-party host a component fetches from or renders `<img>`/`<script>`/etc. from must be added explicitly to the matching directive (`connectSrc` for fetch/XHR, `imgSrc` for images, ...). Grep `server/index.js`'s `contentSecurityPolicy.directives` before assuming a "why does this external call still not work" bug is purely app-code.

---

## `server/.env`'s `MONGO_URI` missing the database name silently targets the wrong database

**What hurt:** `server/.env`'s `MONGO_URI` was `mongodb+srv://…@cluster0.objqrlt.mongodb.net/?appName=Cluster0` — no database name segment. Every script using it (`verify-against-source.js`, `import-foodcomposer.js`, a new one-off backfill script) connected fine, read real-looking data, and wrote successfully — but Mongo's driver silently falls back to a default database when the URI has no path segment, so all of it landed in a different, unrelated database than the one Render's deployed server actually reads from (Render's own env var *does* include `/foodvibe`). A direct DB write appeared to succeed (verified by reading it straight back) while the live app kept serving stale/unfixed data — no error at any layer, because nothing was wrong with the *connection*, only with *which* database it silently picked.

**Why the obvious fix is wrong:** Re-checking "did the write succeed" by reading the same URI back always says yes — the bug is invisible from inside the script that has the bug. Assuming local `.env` mirrors whatever Render has configured is also wrong: Render's env vars live only in its dashboard, are never sourced from the committed (gitignored) `.env`, and can drift silently.

**What to do instead:** Any Mongo connection string used by a script that's meant to touch "the real" database must include an explicit `/<dbname>` path segment — never rely on the driver's default-database fallback. When a write against "production" doesn't show up live, suspect a database-name (or whole cluster) mismatch before suspecting caching or deploy lag — verify by comparing the exact URI (including path) against the target platform's own dashboard-configured value, not just the hostname.

## A legacy column that is constant across every row carries no information — deriving from it fabricates data

**What hurt:** The FoodComposer import derived every recipe's `yield_unit_` from `tblRecipies.measureUnit` via `MEASURE_UNIT_MAP`. That column is literally `2` ("gram") on all 2,093 source rows — a default nobody ever changed in the old app. The mapping looked principled and produced a plausible unit for every row, so nothing ever flagged it. ~394 preparations ended up labelled "gram" when their yield value was really a piece count, and `dbTotalLiter` was separately assumed to hold litres when the old app's own header labelled that column מ"ל — it holds millilitres. A beef stock reading `dbTotalLiter=4000` alongside `dbTotalGram=12000` is 4 litres, not 4,000.

**Why the obvious fix is wrong:** Trusting the column *name* and the existence of a lookup table. A mapping with six entries implies six values occur; verify that before building on it. Equally, do not "fix" it by picking the unit that makes one sample look right — the avocado prep and the beef stock disagree about which column is authoritative.

**What to do instead:** Before deriving anything from a legacy enum or unit column, check its actual cardinality across the whole dump (`{"2": 2093}` ends the discussion), and sanity-check every numeric column's *magnitude distribution* against real-world plausibility, not its name. Derive the unit from which sibling column the value actually matches. Where the old app rendered the field, its UI label beats the schema's column name as evidence.

## An app-required field the source never had will pass every migration audit and still break every save

**What hurt:** `PUT /api/v1/data/:type/:id` rejects any recipe whose linked ingredients lack a `nameSnapshot`. The legacy importer never wrote one, because `nameSnapshot` is not a legacy column — it is a field *this app* requires. All 1,082 imported recipes were therefore impossible to save from the UI: changing a rating, toggling approval, any edit at all returned HTTP 400. Every migration audit passed the whole time, because every audit compared Mongo against the SQL source, and the SQL source has nothing to say about a field it never contained.

**Why the obvious fix is wrong:** Treating it as a save bug and loosening the validation. The validation is correct — the snapshot exists so a recipe stays readable when a referenced product is deleted. The defect is upstream: the migration produced documents that satisfy the source but violate the application's own contract.

**What to do instead:** When specifying a migration, enumerate the destination's *required* fields as well as the source's columns, and check the imported documents against the write path that will actually be used on them. A source-fidelity audit answers "did we carry everything across", never "is what we wrote usable". Cheapest concrete check: after any import, issue a real round-trip write against one migrated document through the same API the UI calls.

## A server-side aggregation verified against a local DB copy can still be unusably slow against the real one

**What hurt:** Plan 310's recipe-book allergens facet used a `$graphLookup` aggregation, recomputed on every page load/navigation across the full catalog (2,116 items). Verified with 0 mismatches against a local Mongo copy of the data — fast, no issues found. Against the real database (Atlas, free tier, shared CPU, real network latency), the same query made recipe-book take almost a minute to load, and non-cancellable debounced fetches (`switchMap` over a `Promise`) queued up under that latency and landed out of order across page navigations. The Human found this only by testing the finished feature live, and had it fully reverted rather than patched.

**Why the obvious fix is wrong:** Trusting "0 mismatches across the full population" as sufficient verification. That number answers correctness, not performance — a local Mongo instance has no meaningful latency and effectively unlimited CPU headroom compared to a real free-tier Atlas cluster, so an expensive per-request operation can look completely fine in every local test and still be the actual bottleneck in production.

**What to do instead:** For any new work whose risk is *performance* against a real deployment target (not just logical correctness) — new aggregation pipelines, anything recomputed per-request — get it in front of the Human against the real database early and incrementally, one milestone at a time, before building the rest on top of it. If that isn't possible in-session, say so explicitly in the handoff as the specific named risk ("verified for correctness locally; performance against Atlas is untested") rather than folding it into a generic "not live-tested" caveat alongside UI-only risks.

---

## Mongo `listCollections()` silently includes `system.*` namespaces the app DB user can't read

**What hurt:** `server/scripts/db-backup.js` looked like it was working — it printed a clean per-collection line for all 29-30 real collections, in order — but crashed with `not authorized on foodvibe to execute command { find: "system.views"... }` right after the last one, before ever writing `_manifest.json`. Every prior "backup" taken with this script was silently incomplete: the JSON files were all on disk, but with no manifest, `db-restore.js` (Plan 321 Phase 0) couldn't verify anything against it — and a human skimming the console output for "N collections written" would reasonably have assumed it finished.

**Why the obvious fix is wrong:** The bug isn't in *reading* `system.views` (that call correctly fails — the app DB user has no privilege on it) — it's that `db.listCollections().toArray()` enumerates `system.views` as an ordinary collection name in the first place, indistinguishable from a real one until you `find()` it. Filtering by `{ type: 'collection' }` in the `listCollections` call doesn't help either: MongoDB reports `system.views` with `type: 'collection'`, not `type: 'view'` — only the view itself (`RECIPE_BOOK_VIEW`) correctly reports `type: 'view'`.

**What to do instead:** Filter out any `listCollections()` name starting with `system.` before iterating — `db-backup.js` now does `.filter(name => !name.startsWith('system.'))`. Any other script walking `db.listCollections()` over a database containing a Mongo *view* (this project has exactly one, `RECIPE_BOOK_VIEW`) needs the same filter, or it hits the identical crash the moment it tries to read every listed name.

---

## Course terms must carry a color: the taxonomyTerms schema requires it

**What hurt:** Plan 375 said to save dish types as `{ key }` only. Since plan 321 Phase 3, the `taxonomyTerms` schema declares `kind: 'course'` as a strictObject with a **required** `color` (hex regex). A course saved without a color fails validation and returns a 400.

**Why the obvious fix is wrong:** Dropping `color` from the client's `taxonomy.add('course', …)` looks like a client-only change, but the server rejects it. Older plan files still say "no server change" because they were written before that commit.

**What to do instead:** To make dish types colorless on the client, send one constant (`COURSE_NEUTRAL_COLOR = '#78716C'` in `metadata-registry.service.ts`) and just don't render it. Making `color` optional on the server means changing the schema, running `build:schemas` and updating the server tests (planned for plan 376). Before trusting a plan's "no server change", check `server/generated/schemas/entities/taxonomy-term.schema.js`.

---

## `npm run dev` runs as NODE_ENV=production — never gate dev behavior on NODE_ENV

**What hurt:** Plan 385 needed the write limiter relaxed for local work. `server/package.json`'s `dev` script sets `NODE_ENV=production`, so any `if (NODE_ENV !== 'production')` switch is dead locally too.

**Why the obvious fix is wrong:** Gating on `NODE_ENV` looks like the standard dev/prod split, but here dev and prod report the same value, so the switch never fires anywhere.

**What to do instead:** Use a dedicated env var. The write limiter reads `DATA_WRITE_LIMIT_MAX` (default 1000, `0` = off; see `server/.env.example`).

---

## Client per-doc cascades burn the write limit — the server owns re-key

**What hurt:** Metadata Manager renames looped one PUT per referencing recipe/product (plus a version-history POST per product). A few renames used up the 300-writes-per-15-min budget, and then every save and delete — even a menu-event trash — failed with a 429 (2026-10-05).

**Why the obvious fix is wrong:** Raising the limit only hides it until the catalog grows. The loops were also pure double work: since P3.4 a term PUT that changes `key` makes the server re-key every document in `TERM_REFERENCES` (`renameTermEverywhere` in `server/routes/generic.js`).

**What to do instead:** Rename the term once, then reload the affected client lists (`reloadFromStorage`). Before adding any client-side "update every doc that uses X" loop, check whether the server already does it. Delete still uses client cascade-clear, because the server blocks deleting a referenced term.

---

## Local ports share cookies: one login cookie for every slot

**What hurt:** Cookies ignore the port, so main (4200/3000) and every slot (4201-4203 / 3001-3003) shared one `fv_refresh` cookie. A tab on another slot that auto-signed in as the guest overwrote it. The next reload in your slot renewed the session as Guest Admin, while the header still showed the signed-in user.

**Why the obvious fix is wrong:** Logging out and back in works only until some other FoodVibe tab loads. Closing tabs is a workaround, not a fix.

**What to do instead:** In development the refresh cookie is per port (`fv_refresh_<PORT>`, `server/routes/auth.js`). Deployed, it stays `fv_refresh`. The client takes the identity from the access token after every refresh, so what the screen shows is always the account that saves.

---

## Client logs go to `POST /api/v1/log` — not a separate log server (supersedes the `logServerUrl` entry)

**What hurt:** Browser errors were posted to a dev-only log server on port 9765 that nothing started, and prod had `logServerUrl: ''`. Worse, `auth.interceptor.ts` skipped logging when `req.url.startsWith('')` — always true — so prod never logged `http.error` at all (fixed 2026-10-06, Plan 382).

**Why the obvious fix is wrong:** Setting `logServerUrl` in prod, or starting the log server, still leaves logs on a process users never reach and in a file that dies with the session.

**What to do instead:** `LoggingService` posts to `${apiUrl}/api/v1/log` on the same Express server; warn/error land in Mongo `app_logs` ([[0016-logging-sink-mongo]]). Query them there (`db.app_logs.find({level:'error'}).sort({createdAt:-1})`), not in the browser console. Any "skip this URL" check must compare against a real path (`endsWith('/api/v1/log')`), never against a config value that may be `''`.
