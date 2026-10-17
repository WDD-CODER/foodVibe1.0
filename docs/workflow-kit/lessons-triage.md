# Lessons triage — plan 328 (phase 1)

Verdict for every brain lesson: every `##` entry in `docs/brain/gotchas/*.md`, every ADR, every pattern.
Entries are **not** rewritten here; phase 3 does that.

- **transfer** — copy as-is into the destination.
- **generalize** — keep the lesson, strip FoodVibe/stack specifics; the draft column is the stack-neutral one-liner.
- **stay** — FoodVibe-only; remains in FoodVibe's brain.
- Destination: `core` | `pack:angular` | `pack:node-express` (`-` for stay).

**Totals:** 116 entries — 64 transfer, 26 generalize, 26 stay (30 rows added by plan 390, 2026-10-17).
Verify: `node scripts/kit-manifest-check.mjs --lessons`.

| source | title | verdict | destination | draft lesson (generalize only) / why stay |
| --- | --- | --- | --- | --- |
| docs/brain/gotchas/agent-workflow.md | Context compaction can silently drop decisions | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Pasted plans that never hit `plans/` | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | PreCompact FAIL substring matches review PASS/FAIL | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Existing save-plan mitigations still let a plan skip plans/ | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Orphaned instruction file looks wired but nothing loads it | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Same-directory concurrent session breaks the plans/ numbering scan | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Todo archive footer wording and Plan Index placement | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `scripts/todo-archive.mjs` section-splitting silently corrupts or drops sibling content | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `brain-review-check.mjs` flags `docs/brain/` subfolder-relative refs as dead | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `.claude/todo.md` unchecked box doesn't mean the work wasn't done | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `/design-sync` isn't a skill here, and the synced project isn't a flat export | stay | - | FoodVibe design-sync project; no equivalent in a generic kit |
| docs/brain/gotchas/agent-workflow.md | The Skill tool's plain-name resolution can pick a gstack-vendored skill over this project's own command of the same name | generalize | core | A bare skill/command name can resolve to a vendored skill instead of the project's own — namespace project commands or verify resolution after installing any third-party skill pack. |
| docs/brain/gotchas/agent-workflow.md | `RemoteTrigger` rejects sub-hourly cron and silently attaches every connected MCP connector | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `RemoteTrigger` cloud routines clone from GitHub, not the local working tree | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `/ship`'s ledger and manifest gates can fail on another session's leftovers, not your own diff | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Naive git-status parsing silently drops path characters and undercounts new directories | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | New branch-naming convention colliding with pre-existing branches of the same shape | generalize | core | Pick a branch-naming scheme only after listing existing branches of the same shape; a new prefix/pattern must not collide with refs already in use. |
| docs/brain/gotchas/agent-workflow.md | Bash commands that merely mention `.github` get refused outright | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | An inline `# comment` after a glob in a plan's `scope` block silently makes that glob match nothing | transfer | core |  |
| docs/brain/gotchas/angular.md | Login reload bypasses deferred constructor load | stay | - | FoodVibe auth + KitchenState deferred-load specifics |
| docs/brain/gotchas/angular.md | Unregistered Lucide icon aborts list `@for` CD | stay | - | Lucide icon registry is a FoodVibe library choice |
| docs/brain/gotchas/angular.md | Gating a user action on a fire-and-forget side-write silently breaks it for some users | generalize | pack:angular | Never gate a user action on an un-awaited background write; either await it or decouple so the action works for users whose write has not landed. |
| docs/brain/gotchas/angular.md | Route-resolved data read once in a field initializer goes stale across param-only navigation | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | Local per-page nav duplicates already-existing shared chip row | stay | - | FoodVibe nav chip row |
| docs/brain/gotchas/angular.md | Component-scoped SCSS can't reach styles.scss's $break-* breakpoint variables | generalize | pack:angular | Component-scoped stylesheets cannot see another file's preprocessor variables; expose shared breakpoints/tokens as CSS custom properties or an explicit import. |
| docs/brain/gotchas/angular.md | CSS Grid `auto-fill` shares column-track widths across rows — squeezes mixed-length labels | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | Nested `overflow:auto` inside a `max-height`-capped grid row traps scroll instead of letting the page scroll | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | `ngTemplateOutlet` doesn't inherit `[formGroup]` from the element it's outlet-rendered into | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | Global `HttpInterceptorFn` that unconditionally attaches `Authorization` breaks any direct-to-third-party `HttpClient` call | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | A form-rebuilt save payload silently drops any model field the form has no control for | generalize | pack:angular | A save payload rebuilt from a form silently drops model fields that have no form control; merge the form value onto the original model instead of replacing it. |
| docs/brain/gotchas/angular.md | A service that both `autoLoad`s in its constructor and exposes `reloadFromStorage()` double-fetches on every session bootstrap | generalize | pack:angular | A data service must not both auto-load in its constructor and expose a reload method without a guard, or session bootstrap fetches twice. |
| docs/brain/gotchas/angular.md | Dev-mode "double-fetch" that isn't: HMR eagerly loads `@defer` blocks | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | `cdk-virtual-scroll` is incompatible with the shared `.c-list-row` grid | stay | - | Tied to FoodVibe's shared `.c-list-row` grid |
| docs/brain/gotchas/angular.md | Empty `environment.apiUrl` makes `url.startsWith(apiUrl)` match everything | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | Recipe-builder's five export popovers share one accessible name | stay | - | FoodVibe recipe-builder popovers |
| docs/brain/gotchas/angular.md | `yield_conversions_[0]` is the primary yield, not a conversion — writing anything else there loses data on save | stay | - | FoodVibe yield-conversion data model |
| docs/brain/gotchas/angular.md | A dirty-check built from the form group silently ignores every signal the save path writes | generalize | pack:angular | A dirty check derived only from the form group misses state written elsewhere (signals/stores); compute dirtiness from the same source the save path reads. |
| docs/brain/gotchas/backend.md | Flipping a blocklist to an allowlist without reconciling every real client caller | generalize | pack:node-express | When flipping a blocklist to an allowlist, enumerate every real client caller first, or legitimate requests start failing. |
| docs/brain/gotchas/backend.md | `node --watch` full-restart on every server edit | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | Production logs silently vanish when `logServerUrl` is unset | stay | - | FoodVibe log-server/`logServerUrl` setup |
| docs/brain/gotchas/backend.md | Gemini echoes a near-duplicate few-shot example instead of answering fresh | stay | - | Gemini few-shot prompt tuning (FoodVibe AI features) |
| docs/brain/gotchas/backend.md | Metered API usage counters must fire at dispatch, not at downstream success | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | A silent list-endpoint cap looks exactly like a client load-order race | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | An audit script built from the same derivation logic as the import can't catch the logic's own blind spots | generalize | core | An audit script built from the same derivation logic as the import cannot catch that logic's blind spots; write migration audits independently of the code under test. |
| docs/brain/gotchas/backend.md | Registering a request logger after `express.static` makes every static-asset request invisible | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | A blanket `immutable` cache on `express.static` poisons every unhashed asset | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | Running `node index.js` directly never picks up server code changes | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | New `__master__` write paths must remember to bump the sync version | stay | - | FoodVibe `__master__` sync-version mechanism |
| docs/brain/gotchas/backend.md | A fixed CORS/auth bug can still leave a third-party integration dead — check CSP too | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | `server/.env`'s `MONGO_URI` missing the database name silently targets the wrong database | transfer | pack:node-express |  |
| docs/brain/gotchas/backend.md | A legacy column that is constant across every row carries no information — deriving from it fabricates data | generalize | core | A source column that is constant across every row carries no information; deriving a field from it fabricates data. |
| docs/brain/gotchas/backend.md | An app-required field the source never had will pass every migration audit and still break every save | generalize | core | A field the app requires but the source never had passes every migration audit yet breaks every save; audit against app-required fields, not just source fields. |
| docs/brain/gotchas/backend.md | A server-side aggregation verified against a local DB copy can still be unusably slow against the real one | generalize | core | Verify aggregation/query performance against the real deployment early; a local copy of the data hides unusable latency (cf. Plan 310). |
| docs/brain/gotchas/backend.md | Mongo `listCollections()` silently includes `system.*` namespaces the app DB user can't read | transfer | pack:node-express |  |
| docs/brain/gotchas/ci.md | `npm audit fix --force` would force an unplanned Angular major bump | generalize | core | Never run `npm audit fix --force`; scope audit gates to production deps and plan framework major bumps explicitly. |
| docs/brain/gotchas/ci.md | Prod build fails when Google Fonts CDN is unreachable | transfer | pack:angular |  |
| docs/brain/gotchas/git-workflow.md | Removing a git worktree from inside itself | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | `gh pr create` failing on PAT scope | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | Tracked session-state pointer dirties every ship/merge | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | Splitting one file's uncommitted diff across two branches: no `git stash -p` available | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | A concurrent session's `git add -A` can steal your uncommitted change | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | Recovering a shared working directory after a live `.git/index.lock` | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | A stale dev server on a different port can present as a design-port regression | generalize | core | A stale dev server left running on another port can masquerade as a regression; check which process owns the port before debugging the code. |
| docs/brain/gotchas/git-workflow.md | `todo.md`'s "not merged, no PR opened yet" can be stale — verify with `merge-base`, don't just open the PR | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | A shared-directory branch switch silently carries YOUR uncommitted edits onto someone else's branch — then your next commit lands there | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | Squash-merge breaks `git merge-base --is-ancestor` "is this branch already merged" checks | transfer | core |  |
| docs/brain/gotchas/git-workflow.md | `gh pr merge --delete-branch` from a worktree slot leaves the slot | transfer | core |  |
| docs/brain/decisions/0001-lean-native-workflow.md | 0001 — Lean native workflow over heavier orchestration | generalize | core | Prefer native Claude Code/Cursor mechanisms and plain files over bespoke tooling. |
| docs/brain/decisions/0002-file-based-memory-over-tool-memory.md | 0002 — File-based project memory over a memory tool/service | transfer | core |  |
| docs/brain/decisions/0003-auto-evoke-brain-on-pr.md | 0003 — Auto-evoke brain capture on push / PR / Merge Gate | transfer | core |  |
| docs/brain/decisions/0004-full-draft-brain-proposals.md | 0004. Full-draft brain proposals over one-line labels | transfer | core |  |
| docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md | 0005. Scope CI `npm audit` to production dependencies only | generalize | core | Scope `npm audit` CI gates to `--omit=dev`; dev-tooling churn is noise for a never-shipped tree. |
| docs/brain/decisions/0006-auto-write-brain-capture-by-default.md | 0006 — Auto-write brain capture by default; opt-out per ship | transfer | core |  |
| docs/brain/decisions/0007-ship-fast-decouples-approval-from-classification.md | 0007. `/ship fast` decouples approval cadence from lane classification | transfer | core |  |
| docs/brain/decisions/0008-professional-foundation-refactor.md | 0008. Data layer moves to shared-master tenancy, Zod-validated schemas, and a unified taxonomy | stay | - | FoodVibe plan 321 refactor decision |
| docs/brain/decisions/0009-planner-worker-worktrees.md | 0009. Planner-Worker workflow with 3 permanent worktree slots | generalize | core | Planner-Worker worktree slots with scope-guarded Workers; slot names and ports come from `slots.*` config. |
| docs/brain/decisions/0014-validation-gate-tiers.md | 0014. Split job validation into agent-verified `[auto]` and Human-gated `[human]` tiers | generalize | core | Two-tier validation ([auto] agent-verified vs [human] gate); use the project's build command (`commands.build`) as the example. |
| docs/brain/decisions/0015-workflow-kit-extraction.md | 0015. Extract the FoodVibe AI workflow into a copy-distributed kit, in five phases, with a stack-swappable core | stay | - | Records the kit-extraction effort map; lives in FoodVibe history |
| docs/brain/patterns/atomic-bulk-replace-with-standalone-fallback.md | Pattern: Mongo bulk replace — transaction first, pending-flag swap when standalone rejects it | generalize | pack:node-express | Bulk replace = transaction first, pending-flag swap fallback when the DB is standalone. |
| docs/brain/patterns/defer-singleton-data-ensureLoaded.md | Pattern: Defer singleton data with `ensureLoaded` | transfer | pack:angular |  |
| docs/brain/patterns/gemini-backend-proxy.md | Pattern: Gemini backend-proxy | generalize | pack:node-express | Proxy every LLM call through the backend; never ship an API key to the client. |
| docs/brain/patterns/global-loading-feedback-via-loadingservice.md | Pattern: Global loading feedback via `LoadingService.track()` | stay | - | FoodVibe LoaderComponent/LoadingService wiring |
| docs/brain/patterns/how-to-validate-on-job-gate.md | Pattern: Attach user QA bullets to the job-validation gate | transfer | core |  |
| docs/brain/patterns/signals-only-state.md | Pattern: Signals-only state | transfer | pack:angular |  |
| docs/brain/patterns/split-catalog-scan-from-filter-decoration.md | Pattern: Split a computed()'s expensive catalog scan from its cheap per-toggle decoration | transfer | pack:angular |  |
| docs/brain/patterns/tombstone-soft-delete.md | Pattern: Tombstone soft-delete | generalize | pack:node-express | Soft-delete with tombstones instead of destructive delete when there is no team review safety net. |

| docs/brain/gotchas/agent-workflow.md | Worker `[x]` marks reach `main` in the plan file but never in `.claude/todo.md` | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | `scope-check --file` judged every hook path `out` (absolute vs repo-relative) | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | Claude Code sandbox: slot dev servers never listen (plan 336) | generalize | core | A sandboxed agent shell can block the slot dev servers from listening; start them outside the sandbox and check the port before any browser step. |
| docs/brain/gotchas/agent-workflow.md | Windows: a detached process started through cmd.exe writes nothing to its log file | transfer | core |  |
| docs/brain/gotchas/agent-workflow.md | A Human answer to a mid-execution question can silently override a locked ADR (plan 387) | generalize | core | A Human answer given mid-execution can contradict a locked decision record; restate the decision it would change and ask for an explicit supersede before acting. |
| docs/brain/gotchas/angular.md | An HTTP call in a service constructor throws NG0200 through the auth interceptor | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | A `backdrop-filter` card traps `position: fixed` popovers — use the Popover API's top layer | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | `.parent …` selectors inside a nested `@media` under `.parent { }` never match | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | List filters restored from sessionStorage hide a freshly created item | stay | - | FoodVibe list-filter persistence |
| docs/brain/gotchas/angular.md | Capture-phase scroll listener catches a popover's own scroll | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | An approved AI draft says `yield_unit: 'dish'`, not `'portion'` | stay | - | FoodVibe AI recipe draft shape |
| docs/brain/gotchas/angular.md | `container-type` is a `position: fixed` trap too — the list edit modal centred mid-list | transfer | pack:angular |  |
| docs/brain/gotchas/angular.md | Searching taxonomy dropdowns by key misses Hebrew input | stay | - | FoodVibe Hebrew taxonomy search |
| docs/brain/gotchas/angular.md | `.c-list-row.is-selected > .c-list-body-cell` skips column-carousel cells above 768px | stay | - | FoodVibe list engine classes |
| docs/brain/gotchas/angular.md | `overflow: clip` on a grid item stops a `1fr` row from bounding it — the list stops scrolling | transfer | pack:angular |  |
| docs/brain/gotchas/backend.md | Course terms must carry a color: the taxonomyTerms schema requires it | stay | - | FoodVibe taxonomy schema |
| docs/brain/gotchas/backend.md | `npm run dev` runs as NODE_ENV=production — never gate dev behavior on NODE_ENV | stay | - | FoodVibe npm script setup |
| docs/brain/gotchas/backend.md | Client per-doc cascades burn the write limit — the server owns re-key | generalize | pack:node-express | Client-side per-document cascades burn the database write quota; let the server own bulk re-keys in one operation. |
| docs/brain/gotchas/backend.md | Local ports share cookies: one login cookie for every slot | transfer | core |  |
| docs/brain/gotchas/backend.md | Client logs go to `POST /api/v1/log` — not a separate log server (supersedes the `logServerUrl` entry) | stay | - | FoodVibe logging endpoint |
| docs/brain/gotchas/backend.md | A PUT merges over the stored doc — leaving a bad field out doesn't fix it | stay | - | FoodVibe API update semantics |
| docs/brain/gotchas/backend.md | Dropped collections come back empty while an older server still runs | generalize | pack:node-express | A still-running older server recreates dropped collections on its next write; stop every server before a destructive migration. |
| docs/brain/gotchas/backend.md | Gemini free tier is a tiny per-model daily bucket, and Google no longer publishes it | stay | - | FoodVibe AI provider quota |
| docs/brain/gotchas/git-workflow.md | Merging a stacked PR into its base branch strands the work if the base PR is later closed | transfer | core |  |
| docs/brain/decisions/0016-logging-sink-mongo.md | 0016. Mongo `app_logs` (90-day TTL) is the single log sink; the dev log server is retired | stay | - | FoodVibe logging architecture |
| docs/brain/decisions/0017-architecture-invariants-gate.md | 0017. Load-bearing architecture rules live in a checked registry, not only in prose ADRs | transfer | core |  |
| docs/brain/decisions/0018-kit-changes-reach-foodvibe-as-patches.md | supersedes: none. Refines 0015's "change it in the kit, then kit-sync" for FoodVibe only. | stay | - | FoodVibe-only patch mode, retired by plan 392 |
| docs/brain/decisions/0019-design-port-from-handoff.md | 0019. Claude Design handoffs are the design source; a script, not a reader, gates lost features | stay | - | FoodVibe design-port pipeline |
| docs/brain/decisions/0020-plans-design-folder.md | 0020. Open design plans live in `plans/design/`; closed plans still go to the range folder | generalize | core | Open-plan folders are a config list (plans.openDirs); closed plans always move to the range folder. |
| docs/brain/patterns/server-log-events.md | Pattern: every server log line is one JSON record with an `event`, logged through pino | stay | - | FoodVibe pino log shape |
