# Project Brief — FoodVibe

FoodVibe is a solo-dev kitchen/venue management app: recipes, dishes, inventory (products/suppliers), equipment, menu events, and a metadata registry (units, categories, allergens, preparations), with a cook-facing view for execution. Hebrew is the primary UI language (RTL), with English as the underlying canonical/storage layer.

## Stack

Angular 19 (signals-only state, standalone components) + Express/Mongoose backend + MongoDB Atlas (free M0 tier) + Gemini AI (always proxied through `server/routes/ai.js`, never a client-side key). Deployed to Render (free tier). See `docs/agent/standards-backend.md` §0 for verified versions.

## Core goals

- Single kitchen/venue operator can plan, cost, and execute recipes/menus without a team.
- Hebrew-first data entry that resolves to canonical English keys (units, categories, allergens) so the same concept is never stored twice.
- Recoverable data — soft-delete (tombstone) rather than destructive delete across all major entities.

## Hard constraints

- **Free-tier stack**: MongoDB Atlas M0, Render free tier — no infra spend. Design choices should not assume paid-tier scaling.
- **Solo dev**: no team review process; CI + pre-commit hooks + this brain are the only persistent "second opinion."
- **Hebrew RTL**: all user-facing strings route through `translatePipe` + `dictionary.json`; logical CSS properties only (no left/right).
- **Signals-only state**: no `BehaviorSubject`; see [[signals-only-state]].

## Scope areas

Recipes, Inventory (products + suppliers), Menus (menu events, menu intelligence/AI), Equipment, Cook View, Metadata Manager (units/categories/allergens/preparations/labels/section-categories).

## Where else to look

- Hard rules and skill triggers: `AGENTS.md`
- Path-scoped conventions: `docs/agent/*.md`
- Current work / in-flight state: `docs/session-state.md`, `.claude/todo.md` — **not** this brain.
