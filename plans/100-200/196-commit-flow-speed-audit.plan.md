# Commit Flow Audit and Refactor Plan

## Overview
Forensic audit of the recent commit/merge run and a concrete refactor plan to reduce latency, avoid manual conflict stalls, and safely automate conflict handling where possible.

## What happened (forensic timeline)
- Base state: work started on branch `chore/remove-tailwind` with a large dirty tree and mixed concerns (workflow/docs/settings/build/ui).
- Plan approval loop happened twice due to state drift (new files appeared between plan and execution).
- Execution started with `A` (approve + merge).
- Sync step detected branch behind `origin/main` by 8 commits.
- First rebase attempt failed due to dirty working tree.
- Workflow stashed all changes, rebased successfully, then `stash pop` produced content conflicts in:
  - `.claude/copilot-instructions.md`
  - `.claude/settings.json`
  - `agent.md`
- Conflict resolution required manual user choices and manual merge edits.
- Four commits were created successfully.
- Push succeeded, PR created, mergeability check passed.
- `gh pr merge --delete-branch` merged the PR but failed deleting remote branch (401 auth on delete call).
- Post-checks confirmed PR merged and main fast-forwarded; remote branch was then deleted via `git push origin --delete`.

## Time audit (high-impact steps)
- `git fetch origin`: ~3.0s
- `git rev-list --count HEAD..origin/main`: ~1.5s
- `git rebase origin/main` (dirty tree fail): ~1.8s
- `git stash push -u`: ~5.7s
- `git rebase origin/main` (successful): ~17.6s
- `git stash pop` (conflicts): ~20.9s
- Commit 1: ~1.7s
- Commit 2: ~4.3s
- Commit 3: ~4.7s
- Commit 4: ~2.5s
- `git push -u origin chore/remove-tailwind`: ~5.9s
- `gh pr create`: ~8.8s
- `gh pr merge --merge --delete-branch`: ~31.6s
- Remote delete fallback `git push origin --delete ...`: ~4.0s

## What worked
- Safety gates prevented destructive actions and preserved changes.
- Conflict stop behavior was correct (no silent auto-resolution).
- Final commit structure and PR merge succeeded.
- Recovery fallback (manual remote branch deletion) succeeded.

## What did not work well
- Commit plan became stale due to working tree drift between planning and execution.
- Rebase strategy on an existing long-lived branch increased conflict probability.
- `stash pop` conflict handling required synchronous human decisions, slowing flow.
- `gh pr merge --delete-branch` partially failed due auth scope mismatch for branch delete.

## Conflict automation boundaries
### Safe to automate
- Mechanical conflict strategies for non-critical docs/config using `git checkout --ours/--theirs` by policy.
- Auto-detect conflict markers and open a deterministic resolution matrix before prompting.
- Auto-stage resolved files once policy is applied.

### Not safe to fully automate
- Semantic merges in rule-heavy files where both sides modify overlapping logic (`copilot-instructions`, `agent.md`, permission models).
- Security-sensitive config merges without explicit policy and validation.

## Refactor strategy
1. Preflight drift lock
   - Re-check `git status --short` immediately before execution and compare to approved tree hash.
   - If drift exists, auto-replan once (no extra user roundtrip unless semantic scope changed).
2. Branch freshness before planning
   - If branch is behind `origin/main`, run sync/rebase before presenting plan tree.
   - This moves conflict risk earlier and avoids approval invalidation.
3. Conflict policy file
   - Add repo policy for known conflict-prone docs:
     - `.claude/copilot-instructions.md`: manual merge required
     - `.claude/settings.json`: policy merge (union allowlist + preserve hooks)
     - `agent.md`: policy merge (prefer latest agent table + append new skills)
4. Fast execution mode split
   - Default commit command to `P` (push + PR) for speed.
   - Use `A` only when explicitly requested (or when no conflict risk and branch fresh).
5. Merge command robustness
   - Replace `gh pr merge --delete-branch` with:
     - `gh pr merge --merge`
     - verify merged state
     - delete remote branch with `git push origin --delete <branch>`
6. Latency telemetry per phase
   - Persist per-phase duration logs to `notes/commit-audits/YYYY-MM-DD.md`.
   - Track median/95th percentile for: preflight, rebase, conflict resolution, PR create, merge.

## Acceptance criteria
- 30-50% reduction in median end-to-end commit flow time on similar change size.
- No stale-plan execution errors due to tree drift.
- Conflict resolution prompts reduced to only semantic conflicts.
- No partial merge success/failure states from branch-delete auth mismatch.
- Clear per-run time report generated automatically.
