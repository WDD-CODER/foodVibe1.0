# Plan 375 — Dish types (courses): remove colors entirely

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Dish types ("סוגי מנות", the courses registry `KITCHEN_COURSES`) show a color dot in the metadata manager (`metadata-manager.page.component.html` ~L263 `.label-color-dot`, `getCourseColor()` .ts ~L178). The colors differ between the admin and users:

- seeding assigns colors by list position (`metadata-registry.service.ts` ~L191-198);
- `registerCourse` picks the first color unused in that user's list (~L423-425);
- an admin "add for everyone" pushes no color, so the server falls back to grey;
- `_userModified` stops sync-master from updating the user's registry.

Dandan's decision: remove color from dish types entirely. Colors appear nowhere else for courses (verified: `getCourseColor` is the only consumer; the recipe builder doesn't show them).

## Goals & Success Criteria

- Primary: no color dot or color logic for dish types anywhere in the client. New courses are stored as `{ key }` only.
- Success: stored `KITCHEN_COURSES` items that still carry `color` keep loading and saving fine (the field is ignored, not removed).

## Execution Mode

- Parallel: no. Run after plan 340 (metadata-manager chips).
- Concurrent plans: none touching metadata-manager or `metadata-registry.service.ts`
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/models/course.model.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/metadata-registry.service.spec.ts
src/app/pages/metadata-manager/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As an admin or user, I want dish types to look the same for everyone, without random colors.

## Functional Requirements

### Must Have (P0)
- [ ] `CourseDefinition.color` becomes optional (`color?: string`) with `/** @deprecated ignored; kept so stored docs stay valid */`.
- [ ] `metadata-registry.service.ts`:
  - Seeding writes `{ key }` only (no positional colors).
  - `registerCourse` writes `{ key }` only (remove the used-color picking).
  - Rename keeps whatever object fields exist but never sets `color`.
- [ ] Metadata manager: remove the `.label-color-dot` for courses and `getCourseColor()`, and any course-specific color styles. Labels keep their colors (labels are not dish types).
- [ ] Spec: registering a course produces `{ key }`; loading `{ key, color }` items still works.

### Should Have (P1)
- [ ] When the admin pushes a course to everyone, the client sends no color. Leave the server's grey fallback untouched; it's harmless now.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Dish-type chips look like the other neutral metadata chips (plan 340).
- No dictionary changes.

## Atomic Sub-tasks

- [ ] A1: Model optional color; registry seeding and register without color; spec (`course.model.ts`, `metadata-registry.service.*`).
- [ ] A2: Remove the color dot and `getCourseColor` from metadata-manager (`metadata-manager/**`).
- [ ] A3: Build, specs. Admin and user check. Update session-state.

## Technical Considerations

- Dependencies: `MetadataRegistryService`, `MetadataManagerPageComponent`, `KITCHEN_COURSES` registry docs (no Zod entity schema; items are free objects).
- New files: none.
- Model changes: `color` optional.
- No server or data change; existing color values are ignored.

## Out of Scope

- Cleaning up which dish types exist (plan 376).
- Label colors.

## Critical Questions

- Strip `color` from stored course items now?
  a) No, just ignore it (default; zero data risk)
  b) Yes, in the dish-types cleanup script later (plan 376)

## Success Criteria

- [auto] `rg -n "getCourseColor" src/app` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/core/services/metadata-registry.service.spec.ts --include=src/app/pages/metadata-manager/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Metadata → סוגי מנות: no color dots, for admin and a regular user. Add a dish type → it appears without color.
