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
