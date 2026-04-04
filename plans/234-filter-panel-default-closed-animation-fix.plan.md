---
name: Filter panel default-closed + animation fix
overview: Fix the filter panel so it defaults to closed on first visit and animates shut on all breakpoints.
todos: []
isProject: false
---

# Goal
Fix the filter panel so it: (a) animates closed on all breakpoints, and (b) defaults to closed on first visit before any user preference is saved.

# Atomic Sub-tasks

- [ ] `panel-preference.util.ts` — change both `return true` fallbacks in `getPanelOpen()` (null branch line 10 and catch branch line 14) to `return false`
- [ ] `list-shell.component.scss` — add `overflow: visible` to `.list-container` inside the `@media (max-width: #{$panel-overlay-break})` tablet block
- [ ] `list-shell.component.scss` — add `border-inline-start-width 0.3s var(--ease-spring)` to the desktop `.filter-panel` transition
- [ ] `ng build` — verify zero errors

# Constraints

- Do NOT touch `setPanelOpen` — it must still save the user's explicit preference correctly
- Do NOT change any animation timing values or easing functions
- Do NOT add `overflow: visible` to the desktop breakpoint or globally — only inside the ≤1024px media block
- The `.table-body` scroll behavior must remain unchanged

# Verification

- First visit (clear localStorage): sidebar closed on desktop, tablet, and phone
- Opening then closing the sidebar shows a smooth slide/collapse animation on all breakpoints — no instant snap-out
- Resizing from desktop to ≤768px auto-closes the sidebar on inventory list (already implemented)
- Returning to a list page after previously setting a panel state still restores that saved state
