# Validation Checklist Instruction

## When to Apply
Apply this only if you are an execution agent — your role involves writing code,
fixing bugs, building features, or making direct changes to the codebase.
Skip entirely if you are a planning, architecture, QA, or orchestration agent.

---

## Step 1 — Ask Before Anything Else

Immediately upon receiving the task — before reading any files, using any tools,
or doing any analysis — ask the user ONE question:

  "Should I verify this myself when done, or will you check it? (verify / I'll check)"

Wait for the response before doing anything else.

---

## Step 2 — Execute Normally

Proceed with full execution as you normally would.

---

## Step 3 — Always Show the Validation Checklist

### Brief-sourced criteria (if applicable)
If the conversation contains a `Session: .claude/sessions/` path, read that
session's `brief.md` and prepend its `## Success Criteria` items as the first
HOW TO VALIDATE bullets. Then add task-specific bullets below, separated by a
blank line. If no session path in conversation, generate bullets from scratch
as before.

After completing all file changes, always append:

✅ HOW TO VALIDATE
- [action] → [expected result]
- [action] → [expected result]
...

Rules for every bullet:
- One action, one expected result — nothing more
- Must be completable in under 30 seconds
- Use plain language — no technical jargon, no file paths, no grep commands
- For UI/behavior changes: describe exactly where to go and what to look for
  Example: "Open the feature page → perform the action → expected result appears"
- For bug fixes: describe how to trigger the scenario that was broken
  Example: "Submit the form with an empty name field → error message should appear"
- For non-visible changes (config, refactor, backend): one sentence explaining
  what changed and the simplest observable proof it works
  Example: "Save a new record → it should appear in the list without a page refresh"
- If a change truly has no user-visible effect: write one sentence explaining
  what was changed and why no user action is needed to verify it
- Never ask the user to open DevTools, run commands, or check files

---

## Step 4 — Act on the Answer

### If user said "I'll check":
Stop after the checklist. Wait for the user's next message.

### If user said "verify":
Work through every checklist item one by one:
- For each item: perform the action (open page, trigger behavior, check output)
- If the item passes → mark ✓
- If the item fails → fix it, re-verify, then mark ✓
- If an item cannot be agent-verified (e.g. requires real authenticated data, production
  environment, or manual physical interaction) → skip it, mark ⚠ with a note

When all items are resolved, report:

```
## Verified by agent
- ✓ [checklist item] — [what was confirmed]
- ✓ [checklist item] — [what was confirmed]
- ⚠ [checklist item] — needs your check: [reason agent couldn't verify]

Ready for your final pass.
```

Then stop and wait for the user.

---

## Behavior Reference

  Execution task received        → Ask "verify / I'll check?" before any tool use
  After execution                → Always show ✅ HOW TO VALIDATE checklist
  User said "I'll check"         → Show checklist, stop, wait
  User said "verify"             → Show checklist, then work through each item, fix failures, report back
  Item can't be agent-verified   → Mark ⚠, note reason, skip — don't fake it
  Planning / architecture task   → Skip entirely
