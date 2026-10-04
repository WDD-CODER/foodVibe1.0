# Plan 371 — Venues A: hours on the card, discreet select checkbox, responsive form, unsaved-changes guard

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Four UI issues in venues (`src/app/pages/venues/`):

- **Hours only on the detail page.** Opening hours (`VenueProfile.operatingHours?: {days, time}[]`, `src/app/core/models/venue.model.ts`) appear only on the detail page (`venue-detail.component.html` ~L87-104). The list card body (`venue-list.component.html` ~L101-122) shows name, address, environment, capacity and infrastructure count only.
- **The select checkbox covers the image.** `.venue-card-select` (`venue-list.component.html` ~L85-87; scss ~L140-145, `position:absolute; inset-block-start/inline-end:.75rem`) is always visible and sits over the image (`.venue-card-media`). Dandan wants it shown only on hover or when selected, in the top-left corner of the card, not on the image.
- **The add/edit form isn't responsive.** It's a routed page (`venues/add`, `venues/edit/:id`, `app.routes.ts` ~L50-68) inside `VenuesPage`. Plan 341 centers it; it still has no breakpoints:
  - `.venue-form-container` padding 1.5rem, max-width 35rem
  - `.infra-row` inputs fixed at `width: 5rem`
  - the rows don't wrap
- **No warning when leaving with unsaved changes.** The `pendingChangesGuard` (`src/app/core/guards/pending-changes.guard.ts`) isn't on the venue routes. The form is `protected venueForm_`, which the guard can't see, and the photo lives in the `photoUrl_` signal outside the form.

## Goals & Success Criteria

- Primary: each venue card shows a compact hours line (clock icon + days · time; "+N" for more rows).
- Primary: the card checkbox is hidden until hover, focus or selection mode (always visible on touch devices), at the card's top-left corner and outside the image.
- Primary: the form works at 360px and has a 2-column basic section at ≥768px.
- Primary: leaving add or edit with unsaved changes asks "save and leave / leave without saving / cancel".
- Success: no change to the stored data shape.

## Execution Mode

- Parallel: no. Run after plans 339, 341 and 342, plan 363 (Search fields part 1), and plan 367 (Dashboard chip) (all touch venue-list or venue-form).
- Concurrent plans: none touching `src/app/pages/venues/**`
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/**
src/app/core/utils/venue-hours.util.ts
src/app/core/utils/venue-hours.util.spec.ts
```

`src/app/app.routes.ts`: this plan adds `canDeactivate: [pendingChangesGuard]` to the existing `venues/add` and `venues/edit/:id` entries. That's an approved exception (an additive property on existing entries).

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

- As an event chef, I want to see a venue's hours right on its card.
- As a user, I want the select checkbox out of the way unless I'm selecting.
- As a user on my phone, I want the venue form to fit, and not to lose edits by tapping away.

## Functional Requirements

### Must Have (P0)
- [ ] New `formatVenueHours(hours): { first: string; extra: number }` in `src/app/core/utils/venue-hours.util.ts`. For now it reads the `days` / `time` strings; plan 372 (Venues B) extends it. Use it on the card (`venue-card-body`, a new `.venue-card-hours` line under the address) and on the detail page.
- [ ] Card checkbox:
  - `.venue-card-select` gets `opacity:0; pointer-events:none` by default.
  - It's visible on `.venue-card:hover`, `:focus-within`, when `selection.selectionMode()` is on, or when the item is selected (`[class.is-selected]` on the card).
  - It's always visible under `@media (hover: none)`.
  - Position: top-left corner of the card (physical left; in RTL that's `inset-inline-end`), placed in the card's padding area so it doesn't overlap `.venue-card-media`. Add `padding-block-start` to the card, or offset the media, so the box sits above the image edge.
  - Transition ~150ms; respect reduced motion.
- [ ] Form responsiveness (`venue-form.component.scss`):
  - ≥768px: the basic fields (name, environment, address, capacity, contact) in a 2-column grid; max-width ~44rem.
  - ≤620px: padding `--space-3`; every row stacks.
  - `.infra-row`: the equipment select flexes, the quantity input `min-inline-size:4rem`, and the row wraps.
  - Actions full width on phone.
- [ ] Guard:
  - `VenueFormComponent` implements `PendingChangesComponent`: public `isSubmitted` (set true after a successful save, before navigate), public `hasRealChanges()` (compares a JSON snapshot of `venueForm_.getRawValue()` + `photoUrl_()` taken after `hydrateForm()`), and public `saveAndWait()` (runs the save logic, resolves true or false).
  - Add the guard to both routes.
  - Embedded dashboard usage (`[embeddedInDashboard]`) isn't routed, so leave it without the guard.

### Should Have (P1)
- [ ] Card hours: when `operatingHours` is empty, show nothing (no empty line).

### Nice to Have (P2)
- None.

## UI/UX Notes

- Hours line: clock 14px · "א׳–ה׳ · 08:00–23:00" · "+1".
- Dictionary keys reused: `unsaved_changes_confirm`, `save_and_leave`, `leave_without_saving` (they already exist for the guard). No new keys expected.

## Atomic Sub-tasks

- [ ] A1: `venue-hours.util.ts` plus spec; card and detail use it.
- [ ] A2: Checkbox visibility and position on cards (`venue-list/**`).
- [ ] A3: Responsive venue form (`venue-form.component.scss`).
- [ ] A4: Guard contract on `VenueFormComponent` plus routes, with a spec (dirty → `hasRealChanges` true; after save → `isSubmitted`) (`venue-form/**`, `app.routes.ts`).
- [ ] A5: Build, specs. Check at 360px and 1280px, touch and mouse. Update session-state.

## Technical Considerations

- Dependencies: `VenueListComponent`, `VenueFormComponent`, `VenueDetailComponent`, `ListSelectionState`, `pendingChangesGuard`.
- New files: `venue-hours.util.ts` plus spec.
- Model changes: none.

## Out of Scope

- Structured hours and multiple contacts (plan 372, Venues B).
- Videos and location (plan 373, Venues C).
- Infrastructure dropdown (plan 374, Venues D).

## Critical Questions

- Checkbox on touch devices:
  a) Always visible, in the corner (default)
  b) Visible only after a long-press enters selection mode

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/pages/venues/**/*.spec.ts --include=src/app/core/utils/venue-hours.util.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Venue list, desktop: no checkboxes until hover; hovering shows one at the card's top-left, not on the photo; selecting keeps it. Cards show the hours line.
- [human] Phone: checkboxes visible in the corner, not over the photo. The add-venue form fits with no sideways scroll; infrastructure rows wrap.
- [human] Edit a venue, change the name, tap another tab → the "unsaved changes" dialog → cancel keeps you; leave discards; save saves.
