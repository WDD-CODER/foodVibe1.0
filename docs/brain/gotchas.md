# Gotchas

Running list. Each entry: what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a split by domain (e.g. `gotchas/ci.md`, `gotchas/git-workflow.md`, `gotchas/angular.md`) as a brain proposal at the next Merge Gate, rather than letting it grow unbounded.

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

---

## Pasted plans that never hit `plans/`

**What hurt:** Big plans authored in one IDE (or chat) were copy-pasted into Cursor/Claude for brief-by-brief execution, but nothing forced a write under `plans/`. Mid-flight stages lived only in conversation or `.claude/todo.md`, so agents could not see the live contract.

**Why the obvious fix is wrong:** Relying on “remember to save the plan” fails — save-plan only ran on an explicit phrase, and number-collision checks did not catch same-topic renames.

**What to do instead:** Any pasted Plan Contract triggers `.claude/skills/save-plan/SKILL.md` first. Run `node scripts/plan-name-similarity.mjs --name="…"`. Ask rewrite/save-as-new/cancel **only** on similar name hits. Append mid-brief tasks to the parent plan’s Atomic Sub-tasks + ledger. Claude PreToolUse: `scripts/plan-write-guard.sh`; Cursor: `.cursor/rules/save-plan-must-use-skill.mdc`.

---

## PreCompact FAIL substring matches review PASS/FAIL

**What hurt:** A PreCompact transcript grep used loose `FAIL` / `Verify:` tokens. Ordinary `/review-it` tables (`| PASS/FAIL |`, `| Verify cmd |`) and quoted session text were dumped into `.claude/todo.md` as “unresolved signals,” polluting the compact-time ledger.

**Why the obvious fix is wrong:** Dropping signal capture entirely loses the Brief 1 goal (preserve open blockers across `/compact`). Matching only “FAIL” with `\b` still hits `PASS/FAIL` because `/` is a word boundary.

**What to do instead:** Anchor real tool tokens (`UPGRADE_AVAILABLE`, `ROUTING_DECLINED`, `BLOCKED`); require `Verify:` + whitespace; require `FAIL` with a non-`/` predecessor; truncate each match (`cut -c1-300`) so JSONL lines cannot flood `todo.md`.

---

## Existing save-plan mitigations still let a plan skip plans/

**What hurt:** The gotcha above ("Pasted plans that never hit `plans/`") already
documents save-plan + `plan-write-guard.sh` + the Cursor `.mdc` rule as the fix —
yet Plan 285 (AI Menu Phase 1) still executed end-to-end with ~22 `.claude/todo.md`
items marked `[x]` and no `plans/285-*.plan.md` ever created. The mitigations
existed on paper and were still bypassed, silently, with no error.

**Why the obvious fix is wrong:** Assuming "the gate exists" means "the gate
caught it" ignores two concrete bypass paths neither gate covers: (1)
`.claude/commands/plan.md` / `feat.md` / `review-it.md` documented a second,
ungated plan-path convention (`plans/[feature]_v[N].md`) that
`plan-name-similarity.mjs` and `plan-write-guard.sh` never recognized — a plan
saved under that name skips both checks; (2) `brief-detection`'s 3-marker H2
threshold also matches a genuine Plan Contract (Milestones + Atomic Sub-tasks),
and its execute-as-is route goes straight to `/feat` without ever mentioning
save-plan.

**What to do instead:** Treat "the skill exists" as necessary but not
sufficient — verify with a ledger-integrity check
(`scripts/plan-ledger-check.mjs`, wired into `.husky/pre-commit` and `/ship`
Phase 1) that every plan path referenced in `.claude/todo.md` / session briefs
actually resolves on disk. Collapse to one plan-path convention
(`plans/NNN-slug.plan.md` only). Make `brief-detection` check for a
Milestones/Atomic-Sub-tasks shape *before* offering the brief a/b/c gate,
routing Plan-Contract-shaped pastes to save-plan first. See
`plans/291-plan-persistence-brief-sync-hardening.plan.md`.

---

## Orphaned instruction file looks wired but nothing loads it

**What hurt:** `.claude/instructions/validation-checklist.md` fully specified HOW TO VALIDATE, but it was only `@`-included from `execute-it.md`. After that command was removed, agents still had JOB DONE close-out and looked compliant — Humans never got click-test bullets.

**Why the obvious fix is wrong:** Adding more “remember to show a checklist” reminders (or leaving the orphan file intact) does not restore enforcement. Agents follow hard gates they already load (`job-validation`, ship, done), not orphaned instruction paths.

**What to do instead:** Move the live rules onto `docs/agent/job-validation.md` and the close-out templates agents must print; leave the old path as a pointer stub. Audit `@include` / skill triggers whenever deleting a command that was the only loader. See [[how-to-validate-on-job-gate]].

---

## Same-directory concurrent session breaks the plans/ numbering scan

**What hurt:** Saving Plan 294 needed two renumbers (292 → 293 → 294) within
minutes, and separately, five rounds of unrelated docs edits (the auto-write
brain-capture policy change) kept getting silently reverted mid-session.
`ls plans/` / `plan-name-similarity.mjs` were run once early, then the actual
`Write`/`Edit` calls happened several tool calls later. A concurrent Cursor
session on the *same* branch, in the *same* (non-worktree) working directory,
landed its own commits and full-file rewrites in that gap — including
branch switches that changed HEAD out from under an in-progress edit.
`/ship` Phase 3's overlap check only runs when `git worktree list` shows more
than one worktree — this was a single working directory the whole time, so
the check that exists for exactly this failure mode never fired.

**Why the obvious fix is wrong:** Assuming "I already scanned this
conversation" is safe ignores that the scan/read and the `Write`/`Edit`
aren't atomic — any gap (including waiting on a Human reply) is a window for
another session to land files, rewrite a whole file from a stale read, or
switch branches. Re-running `plan-name-similarity.mjs` doesn't catch a
same-number-different-topic collision either — it only compares *titles*.
Retrying an `Edit` immediately after a revert doesn't help either if the
other session is mid-way through its own multi-file batch — it just races
again on the next round.

**What to do instead:** Re-list `plans/` (or re-`git log -3 --oneline`)
immediately before a `Write`/`Edit` on a shared file, not only once earlier
in the conversation — treat any gap of more than a couple tool calls (or a
Human-reply wait) as stale. Since `git worktree list` doesn't detect
same-directory concurrent sessions, don't rely on it as the sole staleness
trigger. When repeated reverts hit the same shared files, stop making
one-file-at-a-time edits with round-trips in between — batch every remaining
edit into a single parallel tool-call message, then commit immediately, to
minimize the window another session has to land a conflicting full-file
write. Related to [[0001-lean-native-workflow]] and the cross-worktree NNN
hardening in `plans/291-plan-persistence-brief-sync-hardening.plan.md` M6,
which covers stale *origin* state but not same-directory local races.

---

## Todo archive footer wording and Plan Index placement

**What hurt:** Fully-done `### Plan` sections sitting *below* `## Plan Index` were invisible to `scripts/todo-archive.mjs` (footer cut-off), so dead weight stayed in `todo.md`. Separately, changing the `## Done` stub text away from a recognized phrase caused the stub to be swallowed into the last archived plan section. Keeping a large Plan Index table in `todo.md` also re-bloated the open-work file after Done rows were moved out.

**Why the obvious fix is wrong:** Re-running the archive script “successfully” looks healthy while orphan all-`[x]` sections remain. A “slim” Active/Planned index still costs ~90 lines every session and mostly duplicates stale catalog state.

**What to do instead:** Keep every `### Plan` block above the file footer (`## Where things live`). Do not maintain a Plan Index table in `todo.md` — open work is the sections; Done is `todo-archive/`; all files are under `plans/`. Archive only via `node scripts/todo-archive.mjs`. See `docs/agent/job-validation.md` → Todo archive volumes.

---

## Tracked session-state pointer dirties every ship/merge

**What hurt:** `.claude/.session-state-path` was tracked in git but rewritten on every SessionStart (`session-startup.sh`) to a PPID-keyed path. `/ship` also wrote session-state *after* commit/push. Result: perpetual dirty trees and `gh pr merge --delete-branch` failing on local checkout.

**Why the obvious fix is wrong:** Committing the updated pointer “to clean the tree” just schedules the next SessionStart to dirty it again. Leaving Phase 5 until after push guarantees an uncommitted handoff file.

**What to do instead:** Keep `.claude/.session-state-path` gitignored (local pointer only). Save to stable `docs/session-state-${BRANCH}.md` (no PPID). On `/ship`, write that file after commit, amend before push. See Plan 295 / `.claude/commands/ship.md` Phase 5.

---

## Unregistered Lucide icon aborts list `@for` CD

**What hurt:** Inventory (and any list using `app-row-actions-menu`) showed mostly empty rows (checkbox + ₪ only). Data was fine in the signal; `ng.applyChanges` filled every row. Hovering a nutrition badge “woke” a few more. Agents burned time on paint/`backdrop-filter` theories.

**Why the obvious fix is wrong:** Treating blank cells as a CSS compositing bug (or forcing `detectChanges` hacks) misses the console: Lucide throws `The "more-vertical" icon has not been provided` inside each row’s `RowActionsMenuComponent`. That exception **stops change detection mid-`@for`**, so later bindings never run. Tests can pass while the app is broken if `TEST_LUCIDE_ICONS` includes the icon but `app.config.ts` does not.

**What to do instead:** When list rows are blank but the store has data, open the console first for Lucide provider errors. Register every template icon in `LucideAngularModule.pick` in `app.config.ts` (see glossary **Lucide icon registration**). Keep test picks and app picks in sync when adding shared UI (e.g. `row-actions-menu`). Do not chase paint fixes until the console is clean.

## Prod build fails when Google Fonts CDN is unreachable

**What hurt:** `ng build` (production) failed with `ENOTFOUND fonts.googleapis.com` because Angular's font-inlining plugin fetches `@import url('https://fonts.googleapis.com/...')` at build time. Dev builds passed; `/ship` hard-stopped.

**Why the obvious fix is wrong:** Retrying the build or waiting for network only papers over CI/sandbox environments that cannot reach Google. Leaving `optimization: true` (default) keeps the footgun.

**What to do instead:** Set `optimization.fonts: false` for `production` and `gh-pages` in `angular.json`. Keep the CSS `@import` so browsers still load fonts at runtime when the CDN is available. Self-host fonts only if you need offline runtime too.

---

## `scripts/todo-archive.mjs` section-splitting silently corrupts or drops sibling content

**What hurt:** `splitPlanSections()` only split `.claude/todo.md` on `### Plan` headers. A non-Plan heading sitting between two plan sections (e.g. `## 6. KEEP DEFERRED`) got absorbed into the *preceding* plan's captured text instead of being its own boundary. This silently broke two different things: the swallowed text's literal wording (e.g. `(deferred)`) false-flagged the preceding plan as blocked/deferred, so `isFullyDone()` refused to archive it even when every checkbox was `[x]`.

**Why the obvious fix is wrong:** Narrowing the section boundary (stop at any `## ` heading, not just the next `### Plan`) fixes the false-flagging — but if you stop there, you've introduced a worse bug. `removeSectionsFromTodo()` reconstructed the file from `preamble + kept-sections + footer` only. Once the sibling content is correctly excluded from every section's captured range, it isn't part of *any* section, the preamble, or the footer — so it falls into a gap the reconstruction never accounts for and gets silently deleted the next time a neighboring plan is archived. A partial fix (only the boundary detection) trades a visible bug (false "no all-[x] sections" message) for a silent one (real content vanishing from a tracked file).

**What to do instead:** When a text-splitting function's caller reconstructs the whole document from the parsed pieces, verify the reconstruction accounts for *every* byte of the original — not just the pieces you meant to keep. Prefer excising exact `[start, end)` line ranges of the pieces you're removing from the original line array over rebuilding from `kept.join(...)` fragments; the former can't lose content that was never part of what you're removing. Verify with `--dry-run` before applying, and diff the *unrelated* surrounding content, not just the target section.

---

## Gating a user action on a fire-and-forget side-write silently breaks it for some users

**What hurt:** `ai-recipe-modal.component.ts`'s "approve and go to recipe builder" button did nothing for non-admin accounts. `onDraftApproved()` only called `navigateToBuilder_()` inside the success callback of `saveShot()`, but `POST /api/v1/ai/shots` required `requireAdmin` — a 403 with no `.subscribe()` error handler silently swallowed the navigation. Render logs showed repeated `POST /api/v1/ai/shots 403` with no visible connection to the reported symptom ("button does nothing").

**Why the obvious fix is wrong:** Adding an error handler that also navigates on failure just hides the coupling — the next side-write added to that callback (analytics, notifications, whatever) reintroduces the same class of bug. The real problem is treating a background/curation write as a precondition for the primary user action at all.

**What to do instead:** Any write that exists to feed a secondary system (training data, analytics, audit log) must be fire-and-forget relative to the user-facing action — compute what the UI needs locally (here, `computeWarnings()` already existed client-side) and never gate navigation on the network call's result. `ai-menu-modal.component.ts` already had this right (apply first, `saveMenuShot(...).catch(() => {})` after); mirror that pattern for any future modal with a training-shot side-write.

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

