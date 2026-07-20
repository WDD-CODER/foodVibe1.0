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

## Path A — Formal ship (commit / push)

Order is hard (see `.claude/commands/ship.md` Phase 4 On approval):

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

### Required close-out block

```text
JOB DONE — awaiting your validation
Matched todos (still [ ]):
  - {plan / id / short text}
  - …
Reply: done  |  not yet  |  edit list
```

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
