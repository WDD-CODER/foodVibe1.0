# Git Standards

> Load this file when: committing, pushing, creating PRs, renaming branches, or any git write operation.

---

## Branch & commit rules

* `main` is protected. Never write on `main`. Work only on `feature/`, `fix/`, or `chore/` branches.
* Human commits and pushes by default. Agents prepare diffs and commit messages; they do not commit/push unless the Human explicitly asks and approves after prep.
* `git-agent` prepares diff + commit message only — never runs commit/push itself unless Human explicitly asks and approves after prep.
* GitHub MCP = read only. Write ops are Human-run unless explicitly overridden.
* Secrets live in `.env` only. Never stage, commit, or print secrets. Never weaken `.gitignore`.
* Build gate: `ng build` must pass before any commit.
* Lint gate: `ng lint` must pass before milestone sign-off.
* Prefer Conventional Commits (`type(scope): subject`). Focus the body on why, not what.
* Never force-push to `main`/`master`. Avoid destructive git ops unless Human explicitly requests them.

---

## Post-push Merge Gate (mandatory)

Applies after **any** successful `git push` of a `feature/` / `fix/` / `chore/` branch (agent-run or Human-asked). Never treat “pushed” or “PR URL returned” as session-complete for mergeable work.

### Feature-complete / chore cleanup / explicit PR work

End the turn with the visual block below and **wait** for Human choice. Do not auto-merge.

```text
╔══════════════════════════════════════════════════════════╗
║  MERGE GATE — push succeeded                             ║
║  Branch: {branch}                                        ║
║  PR:     {url or "none yet — will create on merge"}      ║
║                                                          ║
║  Reply:  merge  |  later  |  open-pr-only                ║
║  (merge = approve merge to main + delete remote branch)  ║
╚══════════════════════════════════════════════════════════╝
```

| Reply | Action |
| --- | --- |
| `merge` | If no open PR, `gh pr create` first. Then `gh pr merge --merge --delete-branch`. Never force-merge. Never merge without this explicit reply (or clear `Y` to the same ask). |
| `later` | Leave branch/PR open. Put the PR URL in session Next Steps. Stop. |
| `open-pr-only` | Ensure a PR exists (`gh pr create` if needed). Do **not** merge. Re-show Merge Gate after PR URL is known, or stop if Human said later. |

Dirty-tree merge fallback (same as `/ship`): if `gh pr merge --merge --delete-branch` fails due to a dirty local tree, use `gh pr merge {n} --merge --auto`. Do not stash/commit unrelated dirty files to unblock merge.

### Checkpoint / milestone push

When the push is an incomplete brief checkpoint (or Human said “no PR” / “checkpoint”), show this variant instead — still mandatory, still visible — and **do not** offer merge:

```text
╔══════════════════════════════════════════════════════════╗
║  CHECKPOINT — DO NOT MERGE YET                           ║
║  Branch: {branch}                                        ║
║  Reason: milestone / brief incomplete / no-PR requested  ║
║                                                          ║
║  Keep working on this branch. Merge only when feature-   ║
║  complete (or Human explicitly asks to merge).           ║
╚══════════════════════════════════════════════════════════╝
```
