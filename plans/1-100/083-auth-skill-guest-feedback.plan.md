---
name: Auth skill guest feedback
overview: Update the existing auth-and-logging skill so that when new features add add/edit/delete (or other protected) actions, agents know to apply the sign-in check and user-message pattern for both route-based and non-route flows (modals, embedded views, in-place actions).
todos: []
isProject: true
---

# Encode "guest action feedback" in auth skill

## Do we need a change?

**Yes.** The project already has an auth skill and HOW-WE-WORK; neither documents the pattern we implemented: when a **guest** tries an add/edit/delete (or any protected action), the app must **not** silently fail or only redirect — it must show a **user message** (toast) and open the sign-in modal. That applies to:

- **Route-based flows**: auth guard already does this (we added `UserMsgService` + `TranslationService` there).
- **Non-route flows**: modals, embedded dashboard tabs, in-place handlers (e.g. supplier add via `AddSupplierFlowService`, venue add via dashboard tab, metadata-manager actions) must run the same check **in the handler** and show the same feedback.

Without writing this down, future work (new lists, new modals, new "add X" buttons) can reintroduce guest-accessible actions with no feedback.

---

## Where to change

**Single place:** [.claude/skills/auth-and-logging/SKILL.md](.claude/skills/auth-and-logging/SKILL.md)

- This skill is already the authority for auth, routes, and critical operations.
- HOW-WE-WORK already tells agents to use it for "any feature touching routes, user data, auth, persistence, HTTP, or critical operations" — no change needed there; the skill content is what we extend.
- No new Cursor rule, new skill, or workflow file is required.

---

## What to add in the auth skill

Add a **new subsection** under **"1. Auth awareness"** (after the current bullets about protected routes and credentials), titled **"Guest action feedback (add/edit/delete)"**.

Content: when it applies, two cases (route vs non-route), pattern for non-route handlers (inject services, check at start of handler, use `sign_in_to_use`), buttons (prefer clickable + feedback), and reference implementations (auth.guard.ts, supplier-list onAdd, venue-list onAddPlace, metadata-manager requireSignIn).

---

## Optional: HOW-WE-WORK hint

In [.claude/copilot-instructions.md](.claude/copilot-instructions.md), under the **"Auth, logging & security"** bullet, extend the "When" line so agents think about guest feedback when adding new add/edit/delete actions.

---

## Summary (executed)

| What | Where | Action |
|------|--------|--------|
| Guest action feedback rules + pattern + references | `.claude/skills/auth-and-logging/SKILL.md` | Added subsection under "1. Auth awareness" |
| Reminder for new protected actions | `.claude/copilot-instructions.md` | Extended "When" for Auth skill |

Done. No new skills, no new Cursor rules, no workflow changes.
