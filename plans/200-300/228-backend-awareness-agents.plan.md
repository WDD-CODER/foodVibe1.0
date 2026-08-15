---
name: 228-backend-awareness-agents
overview: Add backend stack awareness to Software Architect, Product Manager, and QA Engineer agents so new feature plans consider API endpoints and MongoDB.
todos: []
isProject: false
---

# Goal
Agent files have zero knowledge of the Express/MongoDB backend. Planning agents default to frontend-only designs, missing API endpoints, DB models, and server-side logic.

# Atomic Sub-tasks
- [ ] `.claude/agents/software-architect.md` — add Backend Stack section
- [ ] `.claude/agents/product-manager.md` — add backend items to Quality Checklist
- [ ] `.claude/agents/qa-engineer.md` — add API Coverage to Test Strategy
- [ ] `server/breadcrumbs.md` — create

# Done when
All 3 agent files reference the backend stack and a new feature plan triggers backend considerations automatically.
