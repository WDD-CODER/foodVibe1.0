---
name: Post-execute verification bullets
overview: Add a single, token-efficient instruction so that whenever an agent finishes executing a plan (e.g. after "save and execute"), it must output bullet points telling the user where to go in the app and what to do to visually verify the changes.
---

# Post-execution verification bullets

## Goal

When the user says "save and execute" (or equivalent) and the agent completes execution, the agent must **always** end with a **"How to verify"** section: bullet points that tell the user **where** in the app to go and **what** to do so they can see the changes with their own eyes (e.g. "Go to the Add modal → do X → you should see Y").

## Implementation (Option A)

- **Where**: [.claude/copilot-instructions.md](.claude/copilot-instructions.md) Section 2 — The Gatekeeper Protocol.
- **Change**: Extend Phase 5 (QA Loop) so that after all `[x]`, the agent must output a **How to verify** section (bullet list: where in the app + what to do/expect), then ask *"Update .spec.ts now?"*
- **No** new skill file; **no** new Cursor rule. Single source of truth only.

## Exact wording (Phase 5)

Replace the current Phase 5 line with:

* **Phase 5 (QA Loop)**: After all `[x]`, output a **How to verify** section: bullet list where each item states where in the app to go (e.g. "Add modal", "Recipe builder") and what to do or what to expect so the user can visually confirm the change. Then ask: *"Update .spec.ts now?"*
