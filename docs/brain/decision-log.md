# Decision log

Decisions the Human graded wrong (`docs/agent/decision-review.md`). Written by `node scripts/decision-log.mjs add` after a graded reply — never by hand. Builders do not read this file; they read `agent-rules.md`, where a mistake that repeats becomes a rule.

| Date | Plan | Decision | Verdict | Human | Kind | Checker miss |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-02 | 422 | behaviour: advanced the plan's Snapshot line to origin/main HEAD after Step 0 passed, instead of leaving drift reported — reverse: restore Snapshot: 8d7997e5b732007392f50cc07f40b2aa430f37d6 in the plan file | ✗ | restore the old Snapshot (8d7997e5) | plan-snapshot-advance | no |
| 2026-11-03 | 515 | removes: Enter-in-name-field saves the inquiry (keydown.enter on #inquiry-name) — reverse: re-add (keydown.enter)="onSave()" to the new-client name/phone inputs in new-inquiry-dialog.component.html | ✗ | Enter in the new-client name field moves focus to the phone field; Enter in the phone field saves the client only when valid | enter-between-fields | no |
