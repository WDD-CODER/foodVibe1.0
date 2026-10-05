---
description: Open / close a temporary secret-gated public link to this checkout's running app (validate away from home)
allowed-tools: Bash
---

# /remote on | off | status — remote validation link

Triggers: "open remote", "remote link", "I'm not home, let me validate", "close remote".
Works in the Planner main folder and in any `wt-N` slot — each gets its own link.

1. Run from this checkout's root:
   ```bash
   node scripts/remote-port.mjs on            # optional: --hours=N (default 3, max 12)
   node scripts/remote-port.mjs status
   node scripts/remote-port.mjs off
   ```
2. `REMOTE: on url=…/?k=… expires=…` → give the Human the **full** link (with `?k=`) and the
   expiry time. Send it with a push notification too when that tool is available.
3. `REMOTE: …` refusal lines are self-explanatory:
   - `frontend/backend not running` → start the slot servers (`node scripts/take-plan.mjs <NNN>`
     resumes them), then retry.
   - `cloudflared is not installed` → the Human runs, once:
     `winget install --id Cloudflare.cloudflared`
4. On the link the Human signs in with a **real account** — the dev guest auto-login only works
   from the PC itself (the server answers 404 to `/auth/guest` from anywhere else).
5. When the job is validated, run `off` and say so. The link also dies by itself at the expiry.

Never paste the link anywhere but the chat with the Human. Details and security model:
`docs/agent/remote-port.md`.
