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
