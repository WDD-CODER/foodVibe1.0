# Session state — feat/388-on-demand-remote-port

Plan: `plans/388-on-demand-remote-port.plan.md` · Slot: wt-3 (fe 4203 / be 3003, proxy 4293)

## Done (checkpoint)
- A1: `scripts/lib/remote-proxy.mjs` (gate, routing, header rewrite, WS upgrade) + `node --test` suite → pass 6 / fail 0.
- A2: `scripts/remote-port.mjs on|off|status` (detached worker owns proxy + cloudflared, TTL, `.worktree-remote` state, `.claude/remote.log`); `.gitignore`. `cloudflared` installed via winget (2026.10.0).
- A3: `environment.local.ts` uses same-origin API when not on localhost; `take-plan.mjs` `generateEnvironmentSlot()` rewrites only the localhost port (old and new shape checked).

## Live check so far
- `remote-port.mjs on --hours=1` → `REMOTE: on url=https://….trycloudflare.com/?k=…`; curl: no secret 403, `?k=` 302, cookie page 200, cookie `/api` 200.
- Browser through the link: page loaded logged-out; `/api/v1/auth/guest` and `/auth/refresh` → 502; port 4203 found not listening afterwards. Cause unknown → A6.
- Link turned off (`REMOTE: off`).

## Next
- A6: debug the 502 / fe down; restart slot servers (`node scripts/take-plan.mjs 388` resumes).
- A4: `/remote` command, AGENTS.md row, commands.md line, `docs/agent/remote-port.md`.
- A5: phone check over mobile data.
