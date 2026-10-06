# Fixture — INV-1 preserved, INV-2 change approved with an in-scope ADR

Status: draft

## Read-Write Scope

```scope
server/routes/generic.js
docs/brain/decisions/0099-fixture-tenancy-change.md
```

## Architecture Impact
- INV-1: preserves — writes still go through canWrite
- INV-2: changes — ADR docs/brain/decisions/0099-fixture-tenancy-change.md — Arch-approved: Human 2026-10-06
- INV-3: preserves — no client loops added

## Atomic Sub-tasks
- [ ] A1: fixture only
