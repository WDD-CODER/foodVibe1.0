# Job validation — when a task is “done”

> Load when: finishing any requested job, marking todos `[x]`, or the Human says `done` / `mark done` / `/done`.  
> Hard rule lives in `AGENTS.md`. This file is the full procedure.

---

## Core rule

A job is **not done** until the **Human validates** it. Agents never self-approve.

| Validation (counts) | Does **not** count |
| --- | --- |
| `/ship` Approve **Y** or `--yes` | `thanks` / `ok` / `cool` / `nice` |
| `done` / `mark done` / `mark it` | Emoji alone |
| `verified` / `approved` | Silence / moving to another topic |
| `LGTM for this job` | CI green without Human looking |
| `/done` then Human confirms the list | Agent: “I think we’re finished” |

---

## HOW TO VALIDATE checklist (mandatory before validation ask)

Whenever an **execution** job finishes and needs Human validation (brief, milestone, feature, bugfix, or chat job that changed behavior), the agent **must** show a HOW TO VALIDATE block **before** the JOB DONE ask or the `/ship` Approve **Y** gate.

Skip only for pure planning / architecture / docs-only turns with no behavior change to validate.

### Format

```text
HOW TO VALIDATE
- [action] → [expected result]
- [action] → [expected result]
```

### Bullet rules

- One action, one expected result — nothing more
- Completable in under 30 seconds each
- Plain language — no technical jargon, no file paths, no grep/DevTools/commands
- Cover the **happy path** and any **edge / failure rule** the job introduced
  (example: “Search with a number → validation error appears”)
- UI/behavior: say where to go and what to look for
  (example: “Open recipe builder → add an ingredient → unit pill should be draggable”)
- Bug fixes: how to trigger the previously broken scenario
- Non-visible changes (config, refactor, backend): one bullet with the simplest
  observable proof, **or** one sentence: what changed and why no user action is needed
- Never ask the Human to open DevTools, run shell commands, or inspect source files

### Brief-sourced criteria

If a session brief exists (e.g. `.claude/sessions/…/brief.md`), prepend its Success Criteria / Done-when items as the first bullets, then add task-specific bullets below (blank line between groups).

### Optional agent verify

After the checklist is shown, the Human may reply `verify`. Then the agent walks each item:

- Pass → mark ✓
- Fail → fix, re-check, then ✓
- Cannot agent-verify (needs real auth data, production, physical interaction) → ⚠ with reason — do not fake it

Report:

```text
## Verified by agent
- ✓ [item] — [what was confirmed]
- ⚠ [item] — needs your check: [reason]

Ready for your final pass.
```

Then wait for `done` / **Y** (or `not yet`).

Do **not** ask “verify / I’ll check?” at task start — the checklist is unconditional at close-out; `verify` is opt-in after.

---

## Path A — Formal ship (commit / push)

Order is hard (see `.claude/commands/ship.md` Phase 4 On approval):

0. Show **HOW TO VALIDATE** in the Phase 4 approval tree (before Approve?)
1. Human **Y**
2. Mark matching todos / plan Atomic Sub-tasks `[x]`
3. Stage with the job (+ brain if any)
4. Commit → push if asked

One commit. No second push just for checkboxes.

---

## Path B — Chat / small job (no ship, maybe no PR)

When the agent finishes a requested job and is **not** immediately entering `/ship`:

1. **Must** end the turn with the close-out block below (do not skip).
2. Wait for Human reply.
3. On `done` / `mark done` / `verified` / `approved` / `mark it` / `LGTM for this job`:
   - Mark matching `.claude/todo.md` / plan Atomic Sub-tasks `[x]`
   - If a commit is about to happen in the same turn → stage todo/plan files in that commit
   - If no commit yet → mark on disk and say: `Todo: marked [x] (uncommitted — include in next commit)`
4. On `not yet` → leave `[ ]`; continue work.
5. On `edit list` → revise the matched-todo list; re-show the block; wait again.
6. On `verify` → run the optional agent-verify flow above, then re-show JOB DONE and wait.

### Required close-out block

```text
HOW TO VALIDATE
- {action} → {expected result}
- …

JOB DONE — awaiting your validation
Matched todos (still [ ]):
  - {plan / id / short text}
  - …
Reply: done  |  not yet  |  verify  |  edit list
```

If the job has no user-visible effect, replace the bullet list with one line under HOW TO VALIDATE explaining what changed and why no click-test is needed — still show the block.

Never show the JOB DONE ask without HOW TO VALIDATE above it.

If no todo/plan items match, still show the block with:

```text
Matched todos (still [ ]):
  - (none in .claude/todo.md / plan — chat-only job)
```

Human `done` still counts as validation of the chat job (no checkbox to flip).

---

## `/done` command

Human (or agent after finishing work) may run `/done` → follow `.claude/commands/done.md` (same close-out + mark flow as Path B).

---

## Matching todos

Mark only items that clearly match **this** validated job (milestone ID, files touched, or Human-named task). Never invent completion for unrelated open checkboxes.

---

## Plan file sync (mid-flight)

If during a brief you discover work that was not in the parent plan (review fallout, extra stage, Human-added scope):

1. **Before** doing that work, append a new `[ ]` item under Atomic Sub-tasks in the parent `plans/….plan.md` (and a milestone row if needed).
2. Mirror the same `[ ]` into `.claude/todo.md` under that Plan section.
3. Only then execute. On later Human validation, mark both places `[x]`.

Do not leave new stages only in chat or only in a session brief.

---

## Todo archive volumes (Plan 292)

When matching todos are marked `[x]` and a plan section is **fully** done:

1. Run `node scripts/todo-archive.mjs` (ship / done / sweep do this — do not hand-append).
2. Fully-done sections leave `.claude/todo.md` and land in `.claude/todo-archive/NNN.md`
   (max **300 lines** per volume; rolls to the next number).
3. Keep `.claude/todo.md` **open-work-only** (`### Plan` checkbox sections). No Plan Index
   table in this file — Done history is `.claude/todo-archive/` (+ `INDEX.md` for old
   catalog rows); all plan files live under `plans/`.
4. Skip archiving sections that contain `(deferred)`, `(skipped)`, or `[~]`.
5. Duplicate-name checks (`scripts/plan-name-similarity.mjs`) also scan the **last two**
   archive volumes — agents must not reload the full archive history on every save-plan.
