# Session state — feat/337-header-avatar-fallback-mobile-space-menu-icon

Slot: wt-2 (fe 4202 / be 3002, shared DB)

## Done
- A1: avatar `(error)` fallback via `imgFailed_` (linkedSignal reset on imgUrl change) + `showAvatarImg`; header spec case added.
- A2: Human confirmed the photo renders — no CSP change needed.
- A3: `.mobile-avatar-fab` removed; avatar is the 5th `.bottom-nav` item ("פרופיל", new `profile` key) with an upward `.profile-menu` (name + logout). Guests get a sign-in item.
- A4: removed the `.c-tab-chips` avatar-clearance rule in `src/styles.scss`; `.app-content` at ≤620px has top padding = safe area only, and bottom padding now uses the same 620px breakpoint (was 767px).
- A5: menu-intelligence chip icon `sparkles` → `clipboard-list`.

## Evidence
- `npm run lint:icons` → exit 0
- header + tab-chips specs → 8/8 SUCCESS
- `npm run build` → exit 0

## Open
- A6 human checks at 360px / 620px (see plan Success Criteria `[human]` items).
