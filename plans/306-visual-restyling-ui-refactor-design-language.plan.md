---
name: Visual Restyling — Bring Live Screens to UI Refactor Design Language
overview: Screen-by-screen CSS pass to bring every live screen's actual look in line with `UI refactor/`'s Liquid Glass design language. Audit-first per screen before any code, same discipline that closed plan 305 at 55/55 with almost no new code needed.
isProject: true
---

# Plan 306 — Visual Restyling: UI Refactor Design Language

**Plan only — not executed.** Written to be picked up and run in a separate session.

## Where this picks up

Plan 305 ("Design Migration — UI refactor port with zero functionality loss", closed 2026-08-20)
covered **functionality only** — confirming nothing the app already does was lost, and building the
handful of things that genuinely were missing. It explicitly did **not** cover making every screen
*look* like the new design. That's this plan.

Read `plans/305-design-migration-ui-refactor-port.plan.md` and
`_claude-data/design-migration/ACTION-LIST.md` before starting — they record what's already been
touched visually (see "Already done — don't redo" below) and the governing rule this plan inherits.

## Source of truth

| What | Where |
| --- | --- |
| The design | `UI refactor/` (repo root, **untracked**) — 13 `.dc.html` screens, `shell.js`, `colors_and_type.css`, `mobile-pass.css` |
| Design tokens already landed | `src/styles.scss` — full `--fs-*`/`--fw-*`/`--lh-*`/`--tracking-*`/`--space-*`/`--dur-*`/`--tap` scales (plan 305 M1). Colours/surfaces/shadows were already matching before that — `colors_and_type.css` was derived from this app's own `styles.scss`, not the other way round |
| What's already visually done | This file's "Already done — don't redo" section |
| Functional baseline this must not regress | `plans/305-design-migration-ui-refactor-port.plan.md` + `ACTION-LIST.md` (55/55, closed) |

## Governing rule (inherited from plan 305, unchanged)

**The design is a skin. Never lose a function.** Every change in this plan is CSS/template-presentation
only — no business logic, no persisted-field changes, no removed functionality. If a visual change would
require removing or hiding something the app currently does, stop and flag it; don't trade function for
look.

## The one hard lesson from plan 305 — apply it here too

Plan 305 was scoped at ~46-55 "gaps." After actually checking live source screen by screen, 54.5 of 55
needed either zero code or a small additive change — the app was already far closer to the design than
the original design-vs-app comparison suggested, because a prior modernization pass (plan 273) had
already pushed much of the UI toward this same "Liquid Glass" visual language (glass cards, teal accents,
backdrop blur) before this migration ever started.

**Assume the same is true here.** Do not write CSS for a screen before comparing it against the design
side by side. Milestone 0 exists specifically to produce that comparison — treat it as mandatory, not
optional, even though it feels like it delays "real" work. It's what makes every later milestone accurate
instead of guessed.

## Already done — don't redo

From plan 305's M3 (shell) and M7 (Menu Intelligence touch floor):

- Contextual chip row under the top nav (`TabChipsComponent`) — built, composes `.c-tab-pill`
- Brand mark logo + "foodCo" wordmark in the header
- Hero FAB tray items show text labels, not bare icons
- Menu Intelligence toolbar: all 5 pills meet the 44px touch floor
- Full type/spacing/motion token scale in `src/styles.scss` (M1) — available to use everywhere, already
  matches the design's values exactly since M1 landed them from `colors_and_type.css`

## Scope — 13 screens

| Screen | Notes going in |
| --- | --- |
| Shell / Nav | Mostly done (see above). Check remaining: nav-pill active-state gradient, avatar chip treatment vs design's `.av` gradient circle |
| Dashboard | KPI cards, activity feed |
| Inventory (list) | Shares list-shell chassis with 3 other screens below |
| Product form | Full page (plan 305 decision 1) — check against design's field-grouping/spacing, not its modal |
| Recipe Book (list) | Shares list-shell chassis |
| Recipe Builder | Biggest, most complex screen — own milestone, do last among the "big" screens once the pattern is proven elsewhere |
| Menu Library | Shares list-shell-adjacent card-grid pattern |
| Menu Intelligence | Touch floor done. Old screen kept deliberately (plan 305 §F) — this is a *skin* pass on top of unchanged logic, same as everywhere else, not a design-swap |
| Cook View | Design's version already noted as "better than old screen" in plan 305 — check how close current CSS already is; may need little |
| Trash | Same note as Cook View |
| Venues (list) | Shares list-shell chassis. New fields (address/capacity/contact/hours) landed in plan 305 — style those specifically since they're new markup |
| Venue Detail | **No current live screen exists** — the design has one (`VenueDetail.dc.html`), the app doesn't. Confirm whether this plan's scope includes building that screen (it would be new UI, not restyling) or whether the venue-form page stands in for it. Flag as a scoping question before Milestone 6 |
| Suppliers (list) | Shares list-shell chassis |
| Equipment (list) | Shares list-shell chassis |
| Metadata Manager | Grid-of-tiles pattern, already confirmed structurally correct (plan 305) — likely a card-styling pass, not a layout change |

## Milestones

| # | Milestone | Depends on |
| --- | --- | --- |
| M0 | Screenshot baseline + diff catalog — every screen, live vs design | — |
| M1 | Shared engine classes — `.c-glass-card`, `.c-btn-*`, `.c-chip`, `.c-modal-*` etc. in `styles.scss`, only where M0 found a genuine gap | M0 |
| M2 | Shell/Nav — finish the small remainder (nav-pill gradient, avatar) | M0 |
| M3 | List-shell chassis — one pass, benefits Inventory/Recipe Book/Suppliers/Equipment/Menu Library/Venues/Trash simultaneously | M0, M1 |
| M4 | Venues — the new-data fields specifically (address/capacity/contact/hours markup added in plan 305) | M3 |
| M5 | Dashboard | M0, M1 |
| M6 | Venue Detail — **scoping question first** (see table above) | M0 |
| M7 | Cook View | M0, M1 |
| M8 | Metadata Manager | M0, M1 |
| M9 | Product form | M0, M1 |
| M10 | Menu Intelligence — visual pass on top of the unchanged screen | M0, M1 |
| M11 | Recipe Builder — biggest and most complex, done once the pattern is proven on smaller screens | M0-M3 |
| M12 | Cross-screen QA — all 13, both themes if Kitchen dark mode extends beyond Cook View, 3 breakpoints (479/767/1023), RTL | M2-M11 |

# Atomic Sub-tasks

## M0 — Screenshot baseline + diff catalog

- [ ] Task 1: capture a live screenshot of each of the 13 screens via `gstack browse` at desktop (1280px) and phone (390px) widths
- [ ] Task 2: render each corresponding `UI refactor/*.dc.html` file (via `gstack browse goto file://...` or `load-html`) and screenshot the same two widths
- [ ] Task 3: write `_claude-data/design-migration/visual-diff.md` — one section per screen, concrete differences only (exact colours/spacing/shadow/radius deltas, not "looks different"). Note where they already match — that's the majority finding to expect, based on plan 305's pattern
- [ ] Task 4: from the diff catalog, confirm or revise this plan's milestone order — cut any milestone the diff shows is unnecessary, same as plan 305 cut most of its own scope after auditing

## M1 — Shared engine classes

- [ ] Task 5: for each genuine gap M0 found that's shared across screens (e.g. a card shadow, a badge shape), update the one `.c-*` class in `src/styles.scss` — never a per-component override of something that should be a shared engine class (cssLayer skill: compose, don't duplicate)
- [ ] Task 6: `ng build` after each engine-class change; spot-check on two consuming screens via gstack before moving to the next class

## M2 — Shell/Nav remainder

- [ ] Task 7: nav-pill active state — compare current gradient against `shell.js`'s `.tab[aria-current]` teal gradient; adjust only if M0 found a real delta
- [ ] Task 8: avatar chip — compare against `shell.js`'s `.av` (gradient circle, initials) if M0 flags a difference

## M3 — List-shell chassis (Inventory, Recipe Book, Suppliers, Equipment, Menu Library, Venues, Trash)

- [ ] Task 9: `list-shell.component.scss` — bring `.table-area`, `.filter-panel`, row/cell treatment in line with the design's list screens, from M0's diff
- [ ] Task 10: apply the same pass to any screen-specific list-row styling that isn't in the shared shell (each screen's own `*-list.component.scss`)
- [ ] Task 11: verify via gstack on at least 2 of the 7 screens sharing this chassis, both breakpoints

## M4 — Venues new-field styling

- [ ] Task 12: style the address/capacity/contact/hours form fields and list-carousel column added in plan 305 — currently functional but built to match the *old* form's plain styling, not the new design's specific treatment

## M5 — Dashboard

- [ ] Task 13: KPI cards, activity feed — from M0's diff

## M6 — Venue Detail (scoping question first)

- [ ] Task 14: **decide with the human before writing code** — does this plan build a new Venue Detail screen (the design has one, the app doesn't), or does the existing venue-form page stand in for it? This is new UI either way, not restyling — treat accordingly if approved

## M7 — Cook View

- [ ] Task 15: from M0's diff — expected to be small, design's version already noted as close to/better than current in plan 305

## M8 — Metadata Manager

- [ ] Task 16: card/tile styling pass — layout already confirmed correct (plan 305), this is surface treatment only

## M9 — Product form

- [ ] Task 17: field grouping/spacing pass against the design's product form fields — remember it's a full page here (plan 305 decision 1), not the design's modal

## M10 — Menu Intelligence visual pass

- [ ] Task 18: restyle the unchanged screen's surfaces/cards/toolbar to the new token scale — logic and markup structure stay exactly as they are (plan 305 §F)
- [ ] Task 19: revisit the breakpoint-renaming item plan 305 descoped (600px/620px → 3-tier vocabulary) if this milestone already has visual QA eyes on the screen — cheap to fold in here, expensive to do standalone

## M11 — Recipe Builder

- [ ] Task 20: the biggest, most complex screen — do this last among the milestones above so the visual pattern (which tokens, which engine classes, how much per-component work is really needed) is already proven elsewhere
- [ ] Task 21: verify no regression to any of the 19 confirmed-working features from plan 305 §C — this screen has the most functional surface area in the whole app

## M12 — Cross-screen QA

- [ ] Task 22: gstack screenshot pass across all 13 screens, 3 breakpoints (479/767/1023px)
- [ ] Task 23: confirm RTL layout intact everywhere touched
- [ ] Task 24: confirm Kitchen dark mode — check whether it's Cook-View-only today or expected elsewhere; don't extend it beyond where it currently exists unless separately scoped
- [ ] Task 25: `ng build` clean, full manual pass or automated check per `docs/agent/job-validation.md` before calling this plan done

## Constraints (cssLayer skill — reload it before M1)

- `.c-*` engine classes → `src/styles.scss` only, never in a component `.scss`
- No hardcoded colours/shadows/radii/blur — every value through `var(--*)` (the full scale already exists from plan 305 M1)
- Logical properties only (`padding-inline`, `margin-block`), no physical directional values
- Responsive breakpoints via the `$break-*` SCSS vars already declared in `styles.scss` — don't invent new pixel values
- Five-Group Vertical Rhythm in every selector touched (layout → dimensions → content → structure → effects)
- `ng build` passes before every commit

## Backend Impact

None. This entire plan is CSS and template-presentation only — no persisted fields, no API changes, no
data model changes anywhere.

## Open scoping question (surface before starting)

M6 (Venue Detail) is the one place this plan might drift from "restyle" into "build new UI" — the design
has a screen the app doesn't. Confirm with the human before that milestone whether it's in scope.
