# Plan 337 — Header: avatar image fallback, reclaim mobile top space, menu-building icon

Status:
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Three header and navigation issues:

1. Broken avatar. The user's photo always shows as a broken image. Both `<img [src]="user_()!.imgUrl" class="avatar-img">` in `src/app/core/components/header/header.component.html` (L7 `.user-chip`, L142 `.mobile-avatar-fab`) have no error fallback. Likely causes, which aren't confirmed yet:
   - The CSP `imgSrc` in `server/app.js:35` only allows `res.cloudinary.com`, so any other stored URL is blocked.
   - The stored `imgUrl` is dead.
   - The `imgUrl` in sessionStorage is stale.
2. Wasted space at the top on mobile (≤620px). The bottom tab bar stays (Dandan's decision). The fixed `.mobile-avatar-fab` (top-end, 2.875rem circle) forces two clearances:
   - `src/styles.scss` ~L928 pads the `.c-tab-chips` row by `0.75rem + 2.875rem + var(--space-2) + safe-area`.
   - `app.component.scss` adds `padding-block-start: 0.5rem + safe-area` to `.app-content`.
   - Roughly 4rem of every mobile screen is empty.
3. Menu-building icon. The "בניית תפריטים" tab chip uses `icon: 'sparkles'` (`tab-chips.component.ts:55`), the same icon as every AI action.

## Goals & Success Criteria

- Primary: the avatar shows the photo, or the initials when the photo can't load. It never shows a broken image.
- Primary: on ≤620px, page content starts directly under the safe area, with no empty band reserved for the avatar.
- Success: the menu-building chip no longer looks like AI.

## Execution Mode

Parallel: yes
Concurrent plans: none touching `src/app/core/components/tab-chips/**` (the equipment/navigation plan does: run this one first).
Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

scope
```
src/app/core/components/header/**
src/app/core/components/tab-chips/**
src/app/appRoot/app.component.scss
server/app.js
```

`src/styles.scss` ~L928: this plan removes the avatar-clearance padding rule. That's an approved exception to append-only for that single rule.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef on my phone, I want the screen space used by content, not by an empty band at the top.
- As a user, I want to see my picture, or at least my initial, never a broken-image icon.

## Functional Requirements

### Must Have (P0)

- [ ] An `imgFailed_` signal in `HeaderComponent`. Both `.avatar-img` get `(error)="imgFailed_.set(true)"`, and the template shows `.avatar-initials` when `!imgUrl || imgFailed_()`. Reset the flag when `user_()` changes.
- [ ] Diagnose the root cause (A2 gate) and fix it in scope. If the URLs are on a legitimate host the CSP blocks, add that host to `imgSrc` in `server/app.js`. If they're dead or stale, the fallback is the fix and the finding is noted.
- [ ] Mobile ≤620px: remove the fixed `.mobile-avatar-fab`. The avatar becomes the last item of `nav.bottom-nav` (avatar or initials at 22px, label "פרופיל"), and its menu (`mobileAvatarOpen()` content) opens upward from there.
- [ ] Delete the avatar-clearance padding in `styles.scss` ~L928, and reduce the `.app-content` top padding at ≤620px to `env(safe-area-inset-top)` only.
- [ ] `tab-chips.component.ts:55`: change `icon: 'sparkles'` to `icon: 'clipboard-list'` (already registered in `app.config.ts`).

### Should Have (P1)

- [ ] Unify the `.app-content` bottom padding breakpoint (767px) with the bottom-nav breakpoint (620px), so 621–767px doesn't reserve space for a bar that isn't shown.

### Nice to Have (P2)

- None.

## UI/UX Notes

The bottom nav goes from 4 to 5 items. Keep each item ≥44px wide at 320px viewport width (shrink labels with `--fs-2xs` if needed).
New dictionary key: `profile = "פרופיל"` (only if missing; check first).
RTL: the avatar is the last item, at the visual left end.

## Atomic Sub-tasks

- [ ] A1: Add the avatar `(error)` fallback plus `imgFailed_`, and a header spec case where the image error shows initials.
- [ ] A2: Human gate. Dandan opens the deployed app, checks the DevTools console for a CSP "img-src" violation, and copies the `imgUrl` host from sessionStorage `user`. STOP until he reports; fix in scope per the result.
- [ ] A3: Move the avatar into `.bottom-nav` at ≤620px, remove `.mobile-avatar-fab` and its styles, and anchor the avatar menu above the bar.
- [ ] A4: Remove the top clearance (`styles.scss` ~L928, `app.component.scss`). Apply the P1 breakpoint alignment.
- [ ] A5: Swap the chip icon to `clipboard-list`. Run `npm run lint:icons`.
- [ ] A6: Build, run specs, check at 360px and 620px. Update the session-state file.

## Technical Considerations

Dependencies: `HeaderComponent`, `UserService.user_`, `TabChipsComponent`, the global `.c-tab-chips` engine.
New files: none.
Model changes: none.
`--tabbar-h` and the toast/FAB offsets are unchanged (the bottom bar stays).

## Out of Scope

- Avatar upload/edit after signup.
- The page-title redesign (separate plan).
- Equipment navigation (separate plan).

## Critical Questions

Where does the mobile avatar go?
a) Last item in the bottom bar (default)
b) Inline at the end of the tab-chips row (not fixed)

## Success Criteria

- `[auto]` `npx ng test --watch=false --include=src/app/core/components/header/**/*.spec.ts --include=src/app/core/components/tab-chips/**/*.spec.ts` → 0 failures.
- `[auto]` `npm run lint:icons` → exit 0.
- `[auto]` `npm run build` → exit 0.
- `[human]` Phone (≤620px): no empty band at the top; the tab chips or page content start right at the top. The bottom bar shows 5 items, and the avatar opens its menu (logout etc.).
- `[human]` The avatar shows your photo. With a broken URL (set `sessionStorage user.imgUrl` to `https://x.invalid/a.png` and reload) it shows your initial, not a broken image.
- `[human]` The "בניית תפריטים" chip shows a clipboard icon, not sparkles.
