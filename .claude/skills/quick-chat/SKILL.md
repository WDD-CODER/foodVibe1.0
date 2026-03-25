---
name: quick-chat
description: Bypasses standard planning gates for a fast, credit-efficient single-turn interaction in foodVibe 1.0 — 100% procedural, no plan file written.
---

# Skill: quick-chat

**Trigger:** User invokes `/quick-chat` or explicitly requests skipping standard gates for a brief interaction.
**Standard:** Quick-chat rules are self-contained in this skill — no standards files needed.

> This skill disables `github-sync` and `session-handoff` auto-triggers for the **duration of this turn only**. Mandatory gate reads (CLAUDE.md, agent.md, copilot-instructions.md) remain active.

---

## Phase 1: Context Isolation `[Procedural — Haiku/Composer (Fast/Flash)]`

**Bypass Execution:** Disable automatic triggers for `github-sync` and `session-handoff` for this turn only.

**Scope Check:** Verify the request is a "Small" task (Section 0.4).

> **Escalation Rule:** If the request evolves into a feature or complex refactor → transition to the standard Gatekeeper Protocol immediately. Do not continue in quick-chat mode.

---

## Phase 2: Rapid Response `[Procedural — Haiku/Composer (Fast/Flash)]`

**Direct Answer:** Provide the requested code snippet, explanation, or fix immediately — no `.plan.md` file.

**Minimalist Markup:** Use concise markdown. Avoid lengthy architectural explanations unless explicitly requested.

---

## Phase 3: Silent Ledger Update `[Procedural — Haiku/Composer (Fast/Flash)]`

**Todo Sync:** If a small change was made, silently update the relevant `[ ]` to `[x]` in `.claude/todo.md`.

**Breadcrumb Check:** If a file was created or moved, run a targeted `update-docs` (Section 0) for that directory only.

---

## Completion Gate

Respond directly to the user's query.

If a todo was updated, append: `"Quick-chat complete. Ledger updated."`

---

## Cursor Tip
> This is the ultimate "Credit Saver." Use Composer 2.0 (Fast/Flash) for **all** `/quick-chat` requests — 100% of this skill is procedural.
> If you find yourself needing Gemini 1.5 Pro, switch to the `save-plan` workflow instead.
> Credit-saver: 100% Flash-eligible — the most efficient skill in the registry.
