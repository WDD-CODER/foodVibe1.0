## Goal
Audit the existing Angular codebase against the claude.ai/design bundle, close all token gaps in styles.scss, and implement the Cook Mode overlay (3 variants: Focus, Deck, Cockpit) as designed.

## Scope
- `src/styles.scss` — add 7 missing token categories to `:root`
- `src/app/pages/cook-view/` — implement Cook Mode overlay component (3 variants)
- Possible: correct ambient gradient opacity to match design spec (22% → 12% teal)

## Out of Scope
- Other page redesigns
- Font changes (Heebo already in use; Rubik/Space Grotesk retained as acceptable divergence)
- Design preview HTML files (prototype artifacts only)

## Success Criteria
- [ ] All 7 missing token categories present in styles.scss :root
- [ ] Cook Mode overlay renders in all 3 variants (Focus, Deck, Cockpit) using Angular signals
- [ ] Cook Mode launches from cook-view page via a "Start Cook Mode" button
- [ ] Cook Mode uses existing design tokens + new cv-* local tokens
- [ ] RTL (Hebrew) layout preserved throughout
- [ ] `ng build` passes with 0 new errors

## Session ID
2026-04-19-design-system-token-audit
