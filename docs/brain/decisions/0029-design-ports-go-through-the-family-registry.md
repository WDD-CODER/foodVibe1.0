---
status: accepted
date: 2026-11-09
review-by: 2027-05-09
---

# 0029. Design ports go through the family registry

## Context

ADR 0019 settled that FoodVibe ports a Claude Design handoff through `/design-port` and `scripts/design-handoff-ingest.mjs`
(`/design-sync` compiles React and does not work for Angular). ADR 0024 added the reuse ladder and
`docs/brain/component-families.md`. The port never asked which family a designed element is, and a handoff could target
only a screen. On 2026-10-22 the Human decided: when a design changes the look of a family piece on one screen, apply it
to the family's shared base by default and flag every screen that uses the family for a check — do not ask each time.

## Decision

- Inventory 3 in `/design-port` has a `Family` column: a family id, `page`, or `new: <id> — <why>` (ladder rung 4, stops
  for the Human). An element that does a family piece's job maps to that family.
- A "Family changes" list follows Inventory 3. A change goes to the family's shared base by default; every screen that
  uses the family is listed for re-check, one `[human]` card each. A change that fits one screen only becomes a variant
  input on the family (ladder rung 3).
- A handoff can target one family (a path under `src/app/shared/` or `src/app/core/components/` listed in the registry).
  The ingest reports a `families:` line; one target per session still holds.
- The checker is `/review-it` plus `reuse-lint` (Step 6, before the validation cards). The registry records a family's
  `Design changes`.

## Rejected

- Asking the Human per screen whether a family change should spread (the decision of 2026-10-22 is the default).
- `/design-sync` for Angular (anthropics/claude-code#71523).
- A new design-checker agent (the existing `orch-check-*` finders and `reuse-lint` cover it).

## Consequences

- A port that restyles a family touches several screens' looks; the re-check cards make that visible.
- A family path missing from the registry makes a handoff `unknown` unless it also names a screen.

## Review

Check whether re-check lists stay short enough to be done, and whether `new:` families get proposed too often.
