---
name: Backend Collection Registry Standard
overview: Create standards-backend.md and wire it into all agent entry points so every feature touching persistence automatically considers MongoDB collections and API contracts.
todos: []
isProject: false
---

# Backend Collection Registry Standard

## Goal
Add a Backend Collection Registry standard and wire it into all agent entry points so that any feature touching data persistence automatically considers the correct MongoDB collection and backend API implications.

# Atomic Sub-tasks

- [ ] `.claude/standards-backend.md` — create with 6 sections: collection registry (22 rows, corrected from brief's 24), when-applies, new-collection checklist, existing-feature check, API contract, plan annotation rule; no reference to entity.model.js (does not exist); cross-ref standards-security.md §9–17
- [ ] `.claude/copilot-instructions.md` — add standards table row for standards-backend.md
- [ ] `.claude/copilot-instructions.md` — add §0 Backend persistence trigger bullet after "Auth, logging, routes, CRUD" line
- [ ] `.cursor/rules/backend-persistence.mdc` — create with specified globs and body
- [ ] `.claude/commands/plan-implementation.md` — add Backend Impact output block at end of output format section
- [ ] `.claude/commands/execute-it.md` — add Backend Impact check bullet to Execution Rules section

## Rules

- Do NOT duplicate backend security rules already in standards-security.md §9–17 — cross-reference only
- Do NOT modify any Angular or server source code — documentation only
- Collection registry table must match BACKUP_ENTITY_TYPES exactly (22 entries, not 24)
- Keep standards-backend.md under 200 lines
- Use same markdown conventions as existing standards files (YAML front matter, --- separators)
- entity.model.js does not exist — server uses native collection(type) access, no Mongoose model

## Done When

- standards-backend.md exists with all 6 sections
- copilot-instructions.md has new standards table row and §0 trigger
- .cursor/rules/backend-persistence.mdc exists with correct globs
- plan-implementation.md and execute-it.md reference the Backend Impact section
- /validate-agent-refs still passes
