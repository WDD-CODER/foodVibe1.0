# Plan 539 — The toast fits a phone screen: 16 px side gaps, long text wraps, clear of the notch

Status: draft
Depends-on: none
Snapshot: 1e6f0f9ca6c8c910809b2653a39d43c45e7ae544

## Problem Statement
The Human saw the toast (the short message after save / error / line removal) break on a ~390 px phone: text runs
out of the box or is cut, or the box does not fit the screen. It happened before plan 535.

Root cause (code at 1e6f0f9c): `src/app/core/components/user-msg/user-msg.component.scss` sizes the toast as a fixed
desktop box and never wraps long words:
- `width: 250px` with no `max-inline-size` and no phone rule — the same box on every width.
- No `overflow-wrap`: a long unbroken run (a supplier or product name the user typed, e.g. `supplier_added` →
  `הספק "{name}" נוסף בהצלחה`, `item_added_named`, `unit_added_named`, `category_added`) cannot break, so it spills out
  of the 250 px box; in RTL it spills toward the left edge and off the screen.
- `top: 1.25rem` is a physical property and ignores the phone's safe area: `body` pads `env(safe-area-inset-top)`
  (`src/styles.scss:294-300`), but a `position: fixed` toast does not inherit that, so in the installed iPhone app the
  toast sits under the notch / status bar.
- Hard-coded `1.25rem`, `1rem`, `250px` and the physical `margin: 0 0 0.5rem 0` break the cssLayer rules.
`UserMsgService` and the template are fine; only the stylesheet changes.

## Goals & Success Criteria
**Primary:** at 390 px the toast is fully on screen with a 16 px gap on both sides, any text wraps inside it, and the
undo button stays inside; at 1280 px it keeps today's corner and about today's width.

- [auto] `pnpm run test:ci` exits 0, including the new case in `src/app/core/components/user-msg/user-msg.component.spec.ts` (A2).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|[1-9][0-9]*px|\btop:|\bleft:|\bright:|\bwidth:" src/app/core/components/user-msg/user-msg.component.scss` prints only the one `$break-phone-max: 767px; // mirrors src/styles.scss` line.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [human] At 390 px (Chrome device mode, iPhone 12 Pro): on `/suppliers/add`, paste `ספקירקותופירותטריים_בעמ_מרכז_הארץ_סניף_ראשי_מספר_אחת` as the supplier name and save. The toast `הספק "…" נוסף בהצלחה` (shows 2 seconds) is fully on screen with an even gap on both sides, the name wraps onto more lines, nothing is cut. Afterwards delete that test supplier.
- [human] At 390 px: open any product from `/inventory/list`, tap the red bin on one purchase-option line. The toast "השורה הוסרה" with the button "בטל" (stays 30 seconds) is fully on screen; tapping "בטל" brings the line back. Leave with "יציאה בלי לשמור".
- [human] At 1280 px: repeat the supplier save. The toast sits in the top-left corner about as wide as before, the long name wraps inside it.

## Execution Mode
- Parallel: yes — plan 538 changes popups and appends to `src/styles.scss`; this plan touches neither.
- Concurrent plans: 538.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/user-msg/**
src/app/core/components/user-msg/user-msg.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; one component stylesheet and its spec.

## Reuse Check
- none — restyles the existing `app-user-msg` (family: feedback) in its own stylesheet; no new component, util, service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef on my phone, I want every message fully readable on screen so that I know what was saved or went wrong.
- As a chef, I want the undo button always reachable so that I can take back a removed line.

## Functional Requirements

### Must Have (P0)
- [ ] Rewrite `.user-msg` in `user-msg.component.scss` in the five-group order with logical properties and tokens only:
  `position: fixed; inset-block-start: calc(env(safe-area-inset-top, 0px) + var(--space-4)); inset-inline-end: var(--space-4); z-index: 9999` (unchanged number — plan 538 names it `--z-toast` and a later sweep moves it);
  `inline-size: 16rem; max-inline-size: calc(100% - 2 * var(--space-4))` (a fixed element's `100%` is the viewport without its scrollbar);
  `overflow-wrap: anywhere; text-align: center`; `padding: var(--space-4)`; colours, border, radius, shadow and blur unchanged.
  `p`: `margin-block: 0 var(--space-2); margin-inline: 0`.
- [ ] Phone rule (`$break-phone-max: 767px; // mirrors src/styles.scss` at the top of the file, used as
  `@media (max-width: $break-phone-max)`): `inset-inline: var(--space-4); inline-size: auto` — full width minus 16 px each side.
- [ ] The undo button stays centred under the text and never wider than the toast (`max-inline-size: 100%`).

### Should Have (P1)
- [ ] `user-msg.component.spec.ts`: one case — a message of 200 characters with no space renders with computed
  `overflow-wrap: anywhere` on the toast and `scrollWidth <= clientWidth` (nothing spills out sideways).

### Nice to Have (P2)
- [ ] none.

## What happens when
- Two messages in a row: unchanged (the service queues them).
- The on-screen keyboard is open: unchanged — `body.kb-open .user-msg { visibility: hidden }` (`src/styles.scss:2011-2017`) still hides it.
- An unsaved-changes question opens while a toast shows: after plan 538 the question is in front; this plan does not change that.

## UI/UX Notes
- RTL: `inset-inline-end` keeps the toast on the left in Hebrew, as today. No dictionary keys, no icons.

## Atomic Sub-tasks
- [x] A1: Make the toast fit any width — logical properties, tokens, wrap, safe-area top, phone full-width rule (read `.claude/skills/cssLayer/SKILL.md` first) — src/app/core/components/user-msg/user-msg.component.scss
- [x] A2: Prove a long word wraps inside the toast — the spec case — src/app/core/components/user-msg/user-msg.component.spec.ts
- [x] A3: Run every `[auto]` check plus the cssLayer verify greps on the edited file, paste the outputs under Execution Notes

## Technical Considerations
- Dependencies: `UserMsgService` (read only), tokens `--space-2`, `--space-4` in `src/styles.scss` (read only).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys; logical CSS only; `src/styles.scss` untouched.

## Out of Scope
- Moving the toast to the bottom on phones, new toast kinds, timing changes, the toast's z-index (plan 538 / a later sweep).
- The dev catalog's toast buttons (plan 535) — they will show the fixed toast once both merge.

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-08: drafted from the Human's report; the overflow cause is read from the code, not yet seen in the browser.
- Builder: build exit 0; lint exit 0; test:ci exit 0 (1796 SUCCESS, incl. new wrap case); grep prints the `$break-phone-max` line and the `@media (max-width: $break-phone-max)` line (the `\bwidth:` pattern matches `max-width:`; unavoidable). 1px borders written as `thin`. log-query exit 0, one entry: HTTP 409 POST /business/team (from other tests, not this plan).
