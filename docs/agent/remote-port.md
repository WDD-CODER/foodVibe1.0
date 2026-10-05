# Remote validation link (plan 388)

On-demand public link to a checkout's running app, so the Human can validate `[human]` items
away from the PC and the home Wi-Fi. Not always-on: open it when asked, close it when done.

## Use

```bash
node scripts/remote-port.mjs on [--hours=3]   # prints REMOTE: on url=https://….trycloudflare.com/?k=… expires=…
node scripts/remote-port.mjs status
node scripts/remote-port.mjs off
```

Agent entry point: `/remote` (`.claude/commands/remote.md`).

## How it works

| Piece | What it does |
| --- | --- |
| `scripts/lib/remote-proxy.mjs` | One origin on `localhost:4290+N` (main = 4290, wt-1..3 = 4291..4293). `/api/*` → the checkout's backend, everything else (incl. the live-reload WebSocket) → its dev server. Rewrites `Host`/`Origin`/`Referer` to localhost so the dev-server host check and the backend's `ALLOWED_ORIGIN` CORS check pass unchanged. |
| `scripts/remote-port.mjs` | Starts a detached worker that runs the proxy and a Cloudflare quick tunnel (`cloudflared tunnel --url`, no account), writes `.worktree-remote` (gitignored: pids, url, secret, expiry), and stops both at the time limit. Log: `.claude/remote.log`. |
| `src/environments/environment.local.ts` | Opened on any host but `localhost`, the app calls the API on the same origin (`apiUrl: ''`), which the proxy routes. `take-plan.mjs` copies this into each slot's `environment.slot.ts`. |

## Security model

- The tunnel hostname is random but **not** the protection. The proxy refuses every request
  (403) without the secret: the first visit with `?k=<secret>` sets an HttpOnly cookie and
  redirects to the clean URL. New secret on every `on`; default limit 3 h, max 12 h.
- The gate cookie is stripped before forwarding, so the secret never reaches the app servers.
- The dev guest auto-login is localhost-only on the server (`/auth/guest` → 404 from the
  tunnel), so a remote visitor must sign in with a real account.
- The secret lives only in the chat reply and in the gitignored `.worktree-remote`.

## One-time setup

`winget install --id Cloudflare.cloudflared` (Windows). The script looks it up on PATH and in
the default install folders.

## Troubleshooting

- `502 Bad gateway — the backend on port 300N is not answering` → that slot's backend is down;
  `node scripts/take-plan.mjs <NNN>` resumes the slot's servers (check with
  `curl http://localhost:300N/api/v1/health`).
- Page loads but you're signed out → expected from a phone; sign in with your account.
