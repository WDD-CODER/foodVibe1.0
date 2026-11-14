# Plan 595 — Website imports refuse redirects to internal addresses

Status: done
Depends-on: none
Snapshot: 23295e4e4aed808c1e403f1c7a9f839bcf3be9f6

## Problem Statement
An automated security review (2026-11-13) found a server-side request forgery (SSRF) gap. The Human asked to plan the
fix. Verified on origin/main:

- `POST /api/v1/ai/knowledge-import` (plan 554, `server/routes/ai.js:1633`) and `POST /api/v1/ai/generate-from-url`
  (`server/routes/ai.js:1512`) check the typed address with `isSafeUrl` (`server/routes/ai.js:37`), then call
  `fetch(url)`. `fetch` follows redirects by default (`redirect: 'follow'`), so a public page that answers
  `302 Location: http://127.0.0.1:…` or `http://169.254.169.254/…` makes the server fetch an internal address the check
  never saw.
- `PRIVATE_IP_RANGES` (`server/routes/ai.js:25`) misses `0.0.0.0/8`, `100.64.0.0/10` (carrier NAT) and IPv4 addresses
  written in IPv6 form (`::ffff:127.0.0.1`), so these pass the check today.

Risk today is low: only a signed-in user can start an import, and the local and pilot setups hold little behind the
server. It must be closed before real customers use the import on the live site.

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including `server/test/knowledge-import.test.js` with new cases:
  a URL whose page redirects to `http://127.0.0.1/` answers 400 `url resolves to a disallowed address` and the
  internal address is never fetched; a redirect to another public page is followed and imported; more than 5 redirects
  answer 502; `http://0.0.0.0/`, `http://100.64.0.1/` and `http://[::ffff:127.0.0.1]/` answer 400.
- [auto] `server/test/generate-from-url.test.js` (new) passes inside `pnpm run test:server`: a redirect to
  `http://127.0.0.1/` answers 400 and the internal address is never fetched.
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
Single Worker slot (or an orchestrator run) from `origin/main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
server/routes/ai.js
server/test/knowledge-import.test.js
server/test/generate-from-url.test.js
```

## Read Scope
`server/test/helpers/app.js`, `src/app/core/services/gemini.service.ts` (the client's error handling for these routes).

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — the URL fetches and Gemini calls stay in server/routes/ai.js; this only tightens which addresses the server will fetch. No new data, route, or client change.

## Reuse Check
- none — extends the existing `isSafeUrl` in `server/routes/ai.js`; no new module.

## Step 0 — Reality Check
Confirm both routes still call `isSafeUrl` once and then `fetch` with the default redirect mode, and that no other
server route fetches a user-given URL (`grep -rn "fetch(" server/routes`).

## User Stories
- As the business owner, I want a website import to read only public web pages, so nobody can use it to reach the
  server's own machine or the cloud provider's internal services.

## Functional Requirements

### Must Have (P0)
1. One helper `safeFetch(url, options)` in `server/routes/ai.js`: it calls `fetch` with `redirect: 'manual'`; on a
   3xx answer it reads `Location`, resolves it against the current URL, runs `isSafeUrl` on it, and fetches it again;
   at most 5 redirects. An unsafe hop throws an error marked as disallowed; too many hops throws a fetch error.
2. `fetchImportText` and `/generate-from-url` use `safeFetch` instead of `fetch`. An unsafe redirect answers
   400 `url resolves to a disallowed address` (the same answer as an unsafe typed address); too many redirects
   answers 502 `Could not fetch the provided URL`. Every other answer (404, 403, 5xx, empty text) stays as it is.
3. `isSafeUrl` also refuses `0.0.0.0/8`, `100.64.0.0/10`, and an IPv6 address that maps an IPv4 address
   (`::ffff:a.b.c.d`) when the IPv4 part is in a refused range. Hostnames written in brackets (`[::1]`) are checked
   without the brackets.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none — the client already shows the 400 / 502 errors these routes answer today.

## Atomic Sub-tasks
- [x] A1: Check every redirect of a website import against the safety rules, at most 5 hops — safeFetch helper used by both URL routes — server/routes/ai.js
- [x] A2: Refuse the internal addresses the safety check still lets through — 0.0.0.0/8, 100.64/10, IPv4-mapped IPv6, bracketed hosts — server/routes/ai.js
- [x] A3: Prove a redirect to an internal address is refused and never fetched — server/test/knowledge-import.test.js, server/test/generate-from-url.test.js

## What happens when
- A redirect has no `Location` header → treated as the final answer (not ok → 502, as today).
- A redirect goes from `https` to `http` on a public host → followed (same as today); only the address is checked.
- DNS for a redirect host fails → `isSafeUrl` returns false → 400.

## Technical Considerations
- Tests stub `global.fetch` (as `knowledge-import.test.js` does) and return `{ status: 302, headers: { get } }` for the
  first call; they also need `dns.lookup` to resolve test hostnames to a public address (stub it with `vi.spyOn` on
  `require('node:dns').promises.lookup`, which `server/routes/ai.js:6` uses). Assert the stub was never called with the internal URL.
- Security surface: server-only; `pnpm run test:server` and the CI security workflow are the gates.

## Out of Scope
- DNS rebinding (the name resolves to a public address at check time and a private one at fetch time). Closing it needs
  the fetch pinned to the checked IP (a custom agent); a later plan if the import goes to the live site with many users.
- `server/scripts/**` fetches (operator-run scripts, not user input).

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-13: "plan the SSRF fix" (after the security review finding).
- Overlap: plan 582 (draft) also writes `server/routes/ai.js`; do not run the two in parallel.
- `scripts/next-plan-number.mjs` crashed (`RangeError: Maximum call stack size exceeded` at line 54, `Math.max(...used)`);
  number 595 taken by hand from local, origin/main and branch plan files (highest 594). Kit item.
- Evidence: `pnpm run test:server` -> exit 0, 106 files, 1359 tests pass; `pnpm run build` -> exit 0; `pnpm run lint` -> exit 0 (0 errors).
