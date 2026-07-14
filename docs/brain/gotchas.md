# Gotchas

Running list. Each entry: what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry.

---

## Removing a git worktree from inside itself

**What hurt:** `git worktree remove <path>` fails (or leaves a dangling lock) when the shell's cwd is still inside that worktree — the process holds an open handle on the directory.

**Why the obvious fix is wrong:** Retrying with `--force` clears the worktree registration but can leave orphaned `.git/worktrees/<name>` metadata behind; it doesn't address the actual cause (cwd still inside the target).

**What to do instead:** `cd` back to the main repo root before running `git worktree remove`; follow up with `git worktree prune` if metadata lingers. See `.claude/skills/worktree-setup/SKILL.md` and `scripts/prune-merged-worktrees.sh`.

---

## `gh pr create` failing on PAT scope

**What hurt:** `gh pr create` fails (often with an unhelpful permissions error) when the token behind `gh auth` lacks the scope a PR touching `.github/workflows/*` needs — common with fine-grained PATs issued without `workflow` scope.

**Why the obvious fix is wrong:** Re-running the command or re-authenticating with the same token doesn't help — the scope is fixed at token-issue time, not session time.

**What to do instead:** When a workflow-touching PR fails to create, check `gh auth status` scopes first; regenerate the PAT with `workflow` scope rather than retry-looping the same command.

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

## Context compaction can silently drop decisions

**What hurt:** When a long Claude Code session's context window compacts, decisions or task state that only ever lived in conversation (never written to a file) can be summarized away — especially something decided a few tool calls before a compaction boundary.

**Why the obvious fix is wrong:** Trusting "the summary will capture it" isn't safe — summarization prioritizes recent/salient content, not necessarily the one decision that turns out to matter later.

**What to do instead:** Persist load-bearing state to disk as it's decided (`docs/session-state.md`, `.claude/todo.md`, plan files under `plans/`) rather than leaving it only in conversation. This is also why `docs/brain/` exists as its own durable layer — see [[0002-file-based-memory-over-tool-memory]].

---

## `npm audit fix --force` would force an unplanned Angular major bump

**What hurt:** Remaining root `npm audit --audit-level=high` findings sit in the Angular/* cluster (plus related CLI/build toolchain packages: vite, piscina, http-proxy-middleware, serialize-javascript). Running `npm audit fix --force` would auto-bump Angular to satisfy them — but the app is on Angular 19 and isn't ready for that jump.

**Why the obvious fix is wrong:** `--force` looks like the fast way to clear audit noise, but it silently majors-bumps a framework dependency outside any planned migration window, which can break the build in ways unrelated to the actual vulnerability.

**What to do instead:** Leave these findings alone until the Angular 22 migration. CI temporarily runs `--audit-level=critical` in `.github/workflows/security.yml` as the interim gate; restore `--audit-level=high` after the migration. Server-side `npm audit` is already clean. See `.claude/todo.md`.

---

## Login reload bypasses deferred constructor load

**What hurt:** Plan 289 deferred venue / menu-event / section-category constructor fetches, but Equipment and Preparations still hit the network on cold dashboard after login. Removing constructor `loadInitialData()` alone was not enough — `UserService._reloadDataServices()` still called `reloadFromStorage()` unconditionally for those services on every auth hydrate.

**Why the obvious fix is wrong:** Treating “no constructor load” as “no bootstrap GET” ignores the login/guest path, which constructs the service and forces a full rehydrate. Keeping the service eager “because recipe-builder needs it” also skips the cheaper fix: wire `ensureLoaded()` on the recipe-builder route.

**What to do instead:** For every deferred singleton data service, gate login reload with `hasLoaded()` (skip until first route/tab hydrate). Wire `ensureLoaded()` on owning resolvers / first UI surface. See [[defer-singleton-data-ensureLoaded]].
