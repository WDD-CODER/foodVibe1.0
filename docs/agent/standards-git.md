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

**Brain capture is part of this gate** (auto-evoke — not `/ship`-only). After every successful push / PR create, always include a **Brain capture** block using the same durability rules as `/ship`: omit only when nothing durable happened; otherwise draft path + one-line summary. **Never silent-write** to `docs/brain/` — wait for an explicit brain reply (table below).

### Feature-complete / chore cleanup / explicit PR work

End the turn with the combined visual block below and **wait** for Human choice. Do not auto-merge. Do not write brain files until `brain approve` (or an edited re-approve).

```text
╔══════════════════════════════════════════════════════════╗
║  MERGE GATE — push succeeded                             ║
║  Branch: {branch}                                        ║
║  PR:     {url or "none yet — will create on merge"}      ║
║  BRAIN CAPTURE — proposed | none durable                 ║
║    docs/brain/… — "one-line summary"                     ║
║                                                          ║
║  Reply:  merge  |  later  |  open-pr-only                ║
║          + brain approve | brain skip | brain edit …     ║
║  (merge = approve merge to main + delete remote branch)  ║
║  (combine ok: "merge + brain approve" / "merge, brain skip") ║
╚══════════════════════════════════════════════════════════╝
```

| Reply | Action |
| --- | --- |
| `merge` | If no open PR, `gh pr create` first. Then `gh pr merge --merge --delete-branch`. Never force-merge. Never merge without this explicit reply (or clear `Y` to the same ask). |
| `later` | Leave branch/PR open. Put the PR URL in session Next Steps. Stop. |
| `open-pr-only` | Ensure a PR exists (`gh pr create` if needed). Do **not** merge. Re-show Merge Gate after PR URL is known, or stop if Human said later. |

Dirty-tree merge fallback (same as `/ship`): if `gh pr merge --merge --delete-branch` fails due to a dirty local tree, use `gh pr merge {n} --merge --auto`. Do not stash/commit unrelated dirty files to unblock merge.

### Brain capture — confirm-to-write

| Human / agent reply | Effect |
| --- | --- |
| `brain approve` | Write the proposed entry to `docs/brain/**`, then commit on the PR branch (or open a tiny follow-up PR if already merged). |
| `brain skip` / `brain:none` | Explicit no-op; do not write. Sticky PR comment may be updated to “skipped”. |
| `brain edit …` | Revise the draft, re-show the banner, wait again. |

Never auto-merge brain text without one of the approve paths. Folding is allowed in one reply (e.g. `merge + brain approve` or `merge, brain skip`).

### Checkpoint / milestone push

When the push is an incomplete brief checkpoint (or Human said “no PR” / “checkpoint”), show this variant instead — still mandatory, still visible — and **do not** offer merge. Still include Brain capture when something durable happened:

```text
╔══════════════════════════════════════════════════════════╗
║  CHECKPOINT — DO NOT MERGE YET                           ║
║  Branch: {branch}                                        ║
║  Reason: milestone / brief incomplete / no-PR requested  ║
║  BRAIN CAPTURE — proposed | none durable                 ║
║    docs/brain/… — "one-line summary"                     ║
║                                                          ║
║  Keep working on this branch. Merge only when feature-   ║
║  complete (or Human explicitly asks to merge).           ║
║  Reply: brain approve | brain skip | brain edit …        ║
╚══════════════════════════════════════════════════════════╝
```
