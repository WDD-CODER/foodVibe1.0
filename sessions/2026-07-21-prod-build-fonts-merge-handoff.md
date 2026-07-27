# Handoff — 2026-07-21 evening — Todo ledger mismatch + fonts branch merge stuck

**Audience:** next agent / Human Director  
**Date:** 2026-07-21 (~19:00–19:15 IDT)  
**Session branch (local):** `feat/session-20260721-1902` @ `592012e`  
**Related branch:** `chore/prod-build-fonts-offline` (commit `2aa4c53`)  
**Primary handoff file:** this document  
**Related notes:** `docs/session-state-chore-prod-build-fonts-offline.md`, `notes/github-sync/2026-07-21.md`, `sessions/2026-07-21.md` (Plan 291 earlier today)

---

## 1. One-sentence status

The lean `.claude/todo.md` + offline fonts build **are merged locally into `main`**, but **`origin/main` was never updated** (push blocked / cancelled / network), so GitHub still has the fat ledger and the fonts branch still exists on the remote.

---

## 2. What the Human noticed (trigger)

Human opened `.claude/todo.md` (~254 lines / ~185 non-blank) and said it looked wrong: they remembered pruning it down to ~90 lines after an audit, and suspected an unmerged / unpushed branch still held the “real” ledger while `main` had a stale rearranged copy full of “MARK DONE / ARCHIVE” plans that should already be gone.

**They were correct.**

---

## 3. Root cause (todo ledger)

### 3.1 Two versions of the same day’s audit rearrange

| Location | Approx size | Sections | Meaning |
| --- | --- | --- | --- |
| `origin/main` (still) | ~185 non-blank / ~254 total | §1 EXECUTE + **§3 MARK DONE / ARCHIVE** + §6 DEFERRED | Post-audit rearrange that **listed** stale shipped work but did **not** prune it yet |
| `chore/prod-build-fonts-offline` @ `2aa4c53` | **94 total lines** | §1 EXECUTE + §6 DEFERRED only | Same audit day, but **§3 (and other piles) already pruned** — this is the ledger Human remembered |

The audit report that drove the rearrange lives at:

- `.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`

That report’s workflow was: rearrange → Human says `mark done` / `prune` → then shrink. Someone (fonts-branch session) **already pruned** on `chore/prod-build-fonts-offline`, but that tip **never merged to `main`**.

### 3.2 Why it looked like “we already removed it on a merged branch”

Human memory matched **`2aa4c53`**, not `main`:

- Commit: `2aa4c53` — `chore(build): skip Google Fonts inlining so prod builds work offline` (2026-07-21 16:03 +0300)
- That single commit mixed:
  1. Real product/tooling: `angular.json` fonts optimization off for prod / gh-pages
  2. Session cleanup: AGENTS trim, `.mcp.json`, settings, TRIAGE stamp, brain gotcha
  3. **Todo prune:** deleted the big §3 “already shipped” block (~160 lines removed from todo)
- Branch tip was **1 commit ahead of `main`, 0 behind** at investigation time
- Remote tracking existed: `origin/chore/prod-build-fonts-offline`
- **No PR was merged** for this branch (create later failed; see §5)

So nothing was “missing from git forever” — it was stranded on an unmerged chore branch that also happened to carry the fonts fix.

### 3.3 What was *not* the problem

- Current session branch was **not** secretly behind with a better todo.
- Stashes did **not** contain a better `todo.md`.
- Working tree on `main` before the merge matched `origin/main`’s fat ledger (no uncommitted rearrange left behind).
- Plan 291 / ship-fast-lane work earlier the same day is separate (see `sessions/2026-07-21.md`).

---

## 4. Timeline of what the agent did this evening

### Step A — Investigate (no writes intended)

- Confirmed GitHub sync note for today already existed: `notes/github-sync/2026-07-21.md`.
- Compared todo line counts across history; shortest recent tip was **`2aa4c53` (67 non-blank / 94 total)**.
- Confirmed only `chore/prod-build-fonts-offline` (local + remote) contained that tip.
- Confirmed unmerged vs `main`: fonts branch ahead by 1.

### Step B — Wrong first fix (todo-only restore)

- Agent initially `git checkout chore/prod-build-fonts-offline -- .claude/todo.md` onto the session branch (todo-only), then reported that to Human.
- Human replied: **don’t patch todo alone — merge the whole fonts branch**, because the lean todo lives inside that commit.

### Step C — Attempt proper merge path

1. Discarded the todo-only staged change on `main` (`git restore`).
2. Checked out `chore/prod-build-fonts-offline`.
3. Tried `gh pr create` → **failed** (see §5).
4. With Human “just merge it”, agent merged **locally**:
   - `git checkout main`
   - `git merge --no-ff chore/prod-build-fonts-offline`
   - Merge commit: **`592012e`** — `Merge branch 'chore/prod-build-fonts-offline'`
5. Local branch cleanup:
   - **Deleted local** `chore/prod-build-fonts-offline` (`git branch -d`)
   - Reset/switched `feat/session-20260721-1902` to `592012e` so the session branch points at the merge
6. Push / remote branch delete:
   - First attempt: **`fatal: Could not resolve host: github.com`** (DNS / network)
   - Second attempt: Cursor auto-review **blocked** direct `git push origin main` + remote branch delete; Human approval card was **cancelled / failed**
7. Result: **local `main` and session branch have the merge; GitHub does not.**

---

## 5. The GitHub / `gh` / token problem (exact)

### 5.1 Symptoms seen in this session

| When | Symptom |
| --- | --- |
| Early investigation | `git fetch` / `git push` → `Could not resolve host: github.com` |
| `gh pr list` / create | Intermittent API failures; then **`GraphQL: Resource not accessible by personal access token (createPullRequest)`** |
| Mid-session `gh auth status` | Reported **invalid** `GITHUB_TOKEN` and **invalid** keyring token for `WDD-CODER` |
| Later re-check (handoff write time) | `gh auth status` showed **Logged in** again via `GITHUB_TOKEN` + inactive keyring account — so auth state was **flaky / environment-dependent**, not a stable diagnosis |

### 5.2 What this means in practice

There are **two separate failure modes** that got conflated:

1. **Network / DNS** — machine temporarily could not resolve `github.com`. That alone blocks `git fetch`, `git push`, and `gh` API calls. No amount of token fix helps while DNS is down.

2. **GitHub CLI auth / permissions** — even when the network worked briefly:
   - `gh pr create` returned **Resource not accessible by personal access token (createPullRequest)**.
   - That usually means the active token (`GITHUB_TOKEN` env and/or keyring `gho_` / `github_pat_`) lacks permission to open PRs on `WDD-CODER/foodVibe1.0`, or the wrong token is preferred.
   - Cursor/agent shells often inject a **`GITHUB_TOKEN`** that takes precedence over the interactive `gh auth login` keyring session. If that env token is fine-scoped (read-only, or missing `pull_requests: write`), PR create fails even when “logged in” looks OK.

**Do not paste or log raw tokens.** If re-auth is needed, Human should run locally:

```powershell
gh auth status
gh auth login -h github.com
# then verify:
gh pr list --limit 1
```

And ensure Cursor/agent environment is not overriding with a weaker `GITHUB_TOKEN`.

### 5.3 Why the agent could not finish “merge to GitHub”

Project rules prefer:

- never develop on `main`
- merge via `gh pr create` + Merge Gate + `gh pr merge --merge --delete-branch`

That path was blocked by token/API. Fallback local merge onto `main` **did** run after Human asked to merge, but **publishing** (`git push origin main`) then hit:

1. DNS failure, then  
2. Smart-mode / auto-review block on pushing `main` + deleting remote branch, then  
3. Human cancelled the approval card.

So GitHub still believes:

- `origin/main` == pre-merge tip (`2407fb2` era — fat todo)
- `origin/chore/prod-build-fonts-offline` still exists @ `2aa4c53`

Locally we believe:

- `main` @ `592012e` (**ahead 2** of `origin/main`: `2aa4c53` + merge `592012e`)
- `feat/session-20260721-1902` @ `592012e`
- local fonts branch **deleted**
- `.claude/todo.md` = **94 lines** (lean)

---

## 6. Exact current git state (as of handoff write)

```text
Local branch:  feat/session-20260721-1902  → 592012e
Local main:    592012e  [origin/main: ahead 2]
Remote main:   still at old tip (fat todo) until push succeeds
Remote fonts:  origin/chore/prod-build-fonts-offline still present @ 2aa4c53
Local fonts:   deleted

Commits not on origin/main yet:
  2aa4c53 chore(build): skip Google Fonts inlining so prod builds work offline
  592012e Merge branch 'chore/prod-build-fonts-offline'
```

### Files brought by `2aa4c53` / merge

- `angular.json` — prod/gh-pages `optimization.fonts: false` (offline build fix)
- `.claude/todo.md` — lean ledger (EXECUTE + DEFERRED)
- `AGENTS.md`, `.mcp.json`, `.claude/settings.json` — session cleanup
- `.claude/reports/mobile-audit/TRIAGE.md` — Human-closed stamp
- `docs/brain/gotchas.md` — fonts CDN build gotcha
- `docs/session-state-chore-prod-build-fonts-offline.md` — original fonts session state

### Todo content that should be on `main` after push

Only open execute leftovers + deferred:

- Plan **289** §6.2 verify (trash empty-all + backup-import)
- Plan **255** Tasks 8–9 (prod confirm before deleting repair/migration scripts)
- Plan **234** ops smoke rows
- Deferred: Angular 22 audit park, Plan **122** chatbot decisions, Plan **248** Transloco

---

## 7. What went wrong (judgment for next agent)

1. **Bundling ledger prune into an unrelated fonts chore commit** made the “good todo” invisible to anyone living on `main`/session branches — classic stranded-docs problem.
2. **Todo-only checkout** was the wrong recovery once Human clarified they wanted the whole branch merged.
3. **Cannot treat local merge as done** until `origin/main` advances — otherwise the next clone/CI/agent on GitHub will resurrect the fat ledger and “lose” the fonts fix again.
4. **`gh` + `GITHUB_TOKEN` + DNS** stacked failures; diagnose network first, then token scopes, then PR vs direct-push policy.

---

## 8. Next steps (Human / next agent) — do these in order

### A. Publish the local merge (required)

When network works and Human approves pushing `main`:

```powershell
git checkout main
git status -sb
# expect: ahead 2 of origin/main, clean tree preferred
git push origin main
git push origin --delete chore/prod-build-fonts-offline
```

Preferred alternative if branch protection forbids direct push to `main`:

1. Recreate a PR from the already-pushed fonts tip **or** from a new branch that contains `592012e`.
2. Fix `gh` auth / token scopes so `createPullRequest` works.
3. `gh pr merge --merge --delete-branch`.

### B. Re-auth GitHub CLI if PR path is needed

```powershell
gh auth status
# If createPullRequest still fails:
# - unset a weak GITHUB_TOKEN in the agent shell, or
# - gh auth login with a PAT that can open PRs on this repo
gh pr create --base main --head chore/prod-build-fonts-offline
```

Note: local fonts branch was deleted; remote still has it until deleted. Recreate local tracking if needed:

```powershell
git fetch origin
git checkout -b chore/prod-build-fonts-offline origin/chore/prod-build-fonts-offline
```

(After `main` has `592012e`, that remote branch is redundant and should be deleted.)

### C. Do **not** re-inflate `.claude/todo.md`

If a future agent sees the fat §3 ledger again, first check:

```powershell
git log -1 --oneline origin/main
(Get-Content .claude/todo.md).Count
# lean ≈ 94; fat ≈ 254
```

If remote is still fat, **push/merge is incomplete** — do not re-run the audit rearrange from the report blindly.

### D. Optional verify after push

- `ng build --configuration production` offline / without Google Fonts fetch
- Confirm GitHub `main` `.claude/todo.md` is ~94 lines
- Confirm remote fonts branch gone

---

## 9. Explicit non-goals / do not redo

- Do not re-execute Plan 297 / 259 / 249 / etc. from the old §3 list — those were audit “mark done / archive”, already pruned in `2aa4c53`.
- Do not cherry-pick only `.claude/todo.md` again if the full merge commit can be published.
- Do not force-push or rewrite `592012e` unless Human asks; the local history is a normal merge.

---

## 10. Quick copy-paste status block for chat

```text
PROBLEM: Lean todo (~94 lines) + offline fonts build lived only on unmerged
         chore/prod-build-fonts-offline (2aa4c53). main kept fat audit ledger.

DONE LOCALLY: main + feat/session-20260721-1902 @ 592012e (merge).
NOT DONE ON GITHUB: push origin/main failed (DNS then approval cancelled).
REMOTE STILL HAS: origin/chore/prod-build-fonts-offline @ 2aa4c53
                  origin/main with fat todo.

GH ISSUE: intermittent DNS; gh pr create blocked (token cannot createPullRequest /
          flaky GITHUB_TOKEN vs keyring). Re-auth + push/merge still required.

NEXT: push main (or PR-merge) + delete remote fonts branch.
HANDOFF: sessions/2026-07-21-prod-build-fonts-merge-handoff.md
```
