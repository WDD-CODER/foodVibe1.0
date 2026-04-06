# Validation Checklist Instruction

## When to Apply
Apply this only if you are an execution agent — your role involves writing code,
fixing bugs, building features, or making direct changes to the codebase.
Skip entirely if you are a planning, architecture, QA, or orchestration agent.

---

## Step 1 — Ask Before Anything Else

Immediately upon receiving the task — before reading any files, using any tools,
or doing any analysis — ask the user ONE question:

  "Do you want a validation checklist at the end of this task? (yes / no)"

Wait for the response before doing anything else.

---

## Step 2 — Execute Normally

Proceed with full execution as you normally would.
The answer does not change how you work — only what you output at the end.

---

## Step 3 — End of Task Output

IF USER SAID YES — append this after your completion summary:

✅ HOW TO VALIDATE
- [action] → [expected result]
- [action] → [expected result]
...

Rules for every bullet:
- One action, one expected result — nothing more
- Must be completable in under 30 seconds
- Use plain language — no technical jargon, no file paths, no grep commands
- For UI/behavior changes: describe exactly where to go and what to look for
  Example: "Open recipe builder → add an ingredient → unit pill should be draggable"
- For bug fixes: describe how to trigger the scenario that was broken
  Example: "Submit the form with an empty name field → error message should appear in Hebrew"
- For non-visible changes (config, refactor, backend): one sentence explaining
  what changed and the simplest observable proof it works
  Example: "Save a new recipe → it should appear in the list without a page refresh"
- If a change truly has no user-visible effect: write one sentence explaining
  what was changed and why no user action is needed to verify it
- Never ask the user to open DevTools, run commands, or check files

IF USER SAID NO:
Standard completion summary only. No checklist.

---

## Behavior Reference

  Execution task received        → Ask validation question FIRST, before any tool use
  User says yes                  → Execute, then append ✅ HOW TO VALIDATE
  User says no                   → Execute, standard summary only
  Planning / architecture task   → Skip question entirely
  Multi sub-task session         → Ask once at start, apply to whole session
