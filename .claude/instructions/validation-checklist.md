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

  ✅ VALIDATION CHECKLIST
  ├── 📍 UI Checks
  │   ├── [ ] Navigate to [specific screen] and confirm [expected state]
  │   ├── [ ] Perform [specific action] — expected: [result]
  │   └── [ ] Confirm [element] appears / does not appear
  │
  ├── 🔧 Logic & Data Checks
  │   ├── [ ] Trigger [specific flow] and verify [expected behavior]
  │   └── [ ] Open DevTools / Network tab — confirm [request/response]
  │
  ├── 🗄️ Database Checks (if relevant)
  │   └── [ ] Check MongoDB — confirm [document/field/value]
  │
  └── ⚠️  Edge Cases
      ├── [ ] Try [edge case] — expected: [no crash / graceful handling]
      └── [ ] Test with [empty / invalid / Hebrew input] if applicable

Rules for checklist items:
- Concrete and specific to what was actually built — not generic
- Ordered: UI first, then logic/data, then edge cases
- Each item is actionable and testable by the user

IF USER SAID NO:
Standard completion summary only. No checklist.

---

## Behavior Reference

  Execution task received        → Ask validation question FIRST, before any tool use
  User says yes                  → Execute, then append ✅ VALIDATION CHECKLIST
  User says no                   → Execute, standard summary only
  Planning / architecture task   → Skip question entirely
  Multi sub-task session         → Ask once at start, apply to whole session
