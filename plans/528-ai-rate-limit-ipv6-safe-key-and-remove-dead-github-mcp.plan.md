# Plan 528 — Give the AI rate limiter an IPv6-safe key and remove the dead GitHub MCP server

Status: draft
Depends-on: none
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
Two small leftovers that were each decided and never done (open-items brief 2026-11-07, items A1 + A5).

- **A1.** On startup the server prints `ValidationError … ERR_ERL_KEY_GEN_IPV6` from express-rate-limit
  (`server/package.json:26` `^8.3.1`, 8.5.2 installed). The cause is `server/routes/ai.js:16-21`:
  `keyGenerator: (req) => req.user?.userId || req.ip` with no `validate` option. Every route that uses `aiLimiter`
  runs `verifyToken` first (ai.js:318, 399, 469, 540, 655, 764, 902, 998, 1123, 1212, 1268, 1316, 1415, 1483, 1521),
  so the IP fallback never runs today, but a bare `req.ip` key would let an IPv6 user rotate addresses around the
  20-per-15-minutes budget if a route ever mounted the limiter before auth. The project's pattern is
  `server/middleware/write-limit.js:15-19` (`user:<id>`, else `ipKeyGenerator(req.ip)`).
- **A5.** `.mcp.json` holds only the `github` server (`@modelcontextprotocol/server-github`, token
  `${GITHUB_MCP_TOKEN}`), which is disabled (`.claude/settings.json:109-112` `disabledMcpjsonServers`) and unused: no
  agent, command, hook, script or rule calls `mcp__github__*`; `gh` covers every use. Nothing parses `.mcp.json`
  (`scripts/kit-manifest-check.mjs:30` only lists it as a root file).

## Goals & Success Criteria
**Primary:** the server starts without the IPv6 key warning, the AI budget stays per user, and the project has no
GitHub MCP server.

- [auto] `pnpm run test:server` exits 0, including `server/test/rate-limit-key.test.js` (A2).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/528-ai-rate-limit-ipv6-safe-key-and-remove-dead-github-mcp.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/528-ai-rate-limit-ipv6-safe-key-and-remove-dead-github-mcp.plan.md` exits 0.
- [human] Restart the server in the main folder (`npm run dev:local` in `server/`): the console shows no line containing `ERR_ERL_KEY_GEN_IPV6`.
- [human] Start a new Claude Code session in the main folder and run `/mcp`: no `github` server is listed and no MCP config error is shown.

## Execution Mode
- Parallel: yes — no shared file with 517–523 or 510.
- Concurrent plans: any; plan 529 (read-only Mongo MCP) waits for this one (both edit `.mcp.json`).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/middleware/rate-limit.js
server/routes/ai.js
server/test/rate-limit-key.test.js
.mcp.json
.claude/settings.json
docs/workflow-kit/manifest.json
docs/workflow-kit/manifest.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/middleware/rate-limit.js` gains a key helper only; no authorization, scoping or ownership check changes.
- INV-6: preserves — `server/routes/ai.js` changes only the limiter's key; every Gemini call still goes through this route and the browser holds no key.

## Reuse Check
- `userOrIpKey(req)` in `server/middleware/rate-limit.js` — family: server-auth — rung: 3 — why: the same rule as `writeLimitKey` (`user:<id>`, else `ipKeyGenerator`) for a limiter that runs after `verifyToken`, so it reads `req.user` instead of re-verifying the token; it sits next to `createRateLimiter`, which every limiter already uses.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the AI budget counted per signed-in user so that nobody can use up everyone's AI calls by switching addresses.
- As the person who runs the builds, I want no dead MCP server in the project so that no session prompts for a token nobody has.

## Functional Requirements

### Must Have (P0)
- [ ] `server/middleware/rate-limit.js` exports `userOrIpKey(req)`: `req.user?.userId` → `` `user:${req.user.userId}` ``; else `ipKeyGenerator(req.ip)` (imported from `express-rate-limit`, as `write-limit.js:1` does).
- [ ] `server/routes/ai.js` `aiLimiter` uses `keyGenerator: userOrIpKey`. `windowMs`, `max` and `message` stay as they are. Update the comment above it (lines 10-15) to say the key is `user:<id>`, with an IPv6-safe IP fallback.
- [ ] `.mcp.json` becomes `{ "mcpServers": {} }` (valid for Claude Code: an empty server map loads with no servers; deleting the file would drop it from the kit manifest's root-file set).
- [ ] `.claude/settings.json` `disabledMcpjsonServers` becomes `["context7"]` (remove `"github"`); nothing else in the file changes.

### Should Have (P1)
- [ ] `docs/workflow-kit/manifest.json` / `manifest.md`: the `.mcp.json` entry's notes say "no project MCP servers (plan 528)"; add an entry for `server/test/rate-limit-key.test.js` only if `kit-manifest-check` asks for it.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI change. No dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Give limiters behind `verifyToken` an IPv6-safe user key — add and export `userOrIpKey`; switch `aiLimiter` to it and update its comment — server/middleware/rate-limit.js, server/routes/ai.js
- [ ] A2: Prove the key and the warning — vitest: `userOrIpKey({ user: { userId: 'u1' }, ip: '1.2.3.4' })` → `'user:u1'`; `userOrIpKey({ ip: '2001:db8::1' })` equals `ipKeyGenerator('2001:db8::1')` (a /56 subnet key, not the raw address); and an express app built with `createRateLimiter({ windowMs: 60000, max: 5, keyGenerator: userOrIpKey })` on one route, hit once through supertest with `console.error` and `console.warn` spied, logs no message containing `ERR_ERL_KEY_GEN_IPV6` — server/test/rate-limit-key.test.js
- [ ] A3: Remove the GitHub MCP server — `.mcp.json` → `{ "mcpServers": {} }`; `disabledMcpjsonServers` → `["context7"]` — .mcp.json, .claude/settings.json
- [ ] A4: Keep the kit manifest true — update the `.mcp.json` notes; run `node scripts/kit-manifest-check.mjs` and classify anything it reports — docs/workflow-kit/manifest.json, docs/workflow-kit/manifest.md
- [ ] A5: Run every `[auto]` check and paste the outputs under Execution Notes

## What happens when
- A signed-in user hits the AI limit: unchanged — 429 with `Too many AI requests, please try again later`; the bucket is now named `user:<id>`, so in-memory buckets reset once at the deploy (harmless).
- A request reaches the limiter without a user (not possible on today's routes): it is counted per IPv6 /56 subnet instead of per raw address.
- A teammate's own `~/.claude` config still enables a GitHub MCP: unaffected; this plan touches only the project files.

## Technical Considerations
- Dependencies: `express-rate-limit` 8.x `ipKeyGenerator`; `createRateLimiter` (`server/middleware/rate-limit.js`, passes `keyGenerator` through); `server/test/helpers/app.js` is not needed (a bare express app is enough).
- New files needed: `server/test/rate-limit-key.test.js`.
- Model changes: none.
- Backend / API: no endpoint changes; only the AI limiter's bucket key.
- Auth and validation: none changed.
- Security surface: smaller — a dead MCP config that referenced a token is removed; the limiter can no longer be bypassed by IPv6 address rotation.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys.

## Out of Scope
- `.cursor/mcp.json` (kit `managed`; the Human may use GitHub MCP in Cursor) and `docs/agent/standards-git.md:11` "GitHub MCP = read only" (kit `managed`) — both go to the kit brief (K4).
- The other limiters (`business.js`, `product-import.js`) — they key by user only with `keyGeneratorIpFallback: false`, which is correct behind auth.
- Adding a read-only Mongo MCP (plan 529).

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 1, items A1 + A5). Verified at 5895243: the IP fallback is unreachable today (every `aiLimiter` route runs `verifyToken` first; the only public AI route, `GET /usage` at ai.js:70, has no limiter). `.mcp.json` is kit `seed` (project-owned); `.claude/settings.json` is not in `.kit/install.json`.
