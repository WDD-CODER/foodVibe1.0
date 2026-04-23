# CookView Redesign — Design Spec

**Date:** 2026-04-23  
**Status:** Approved  
**Branch:** feat/session-20260423  

---

## Overview

The CookView page (`/cook/:id`) is the primary page users spend the most time on. It must function as a cooking assistant — guiding the user step-by-step through a recipe while making scaling effortless. The page needs to be fast, attractive, and usable with one hand in a kitchen environment.

**Target users:** Advanced home cooks + semi-pro food business operators (catering, small food businesses).  
**Target devices:** Mixed — tablet and phone, both equally supported.  
**Language:** Hebrew, RTL layout throughout.

---

## Layout Architecture

### Tablet / Desktop (≥ 48rem)

Two side-by-side independent scrolling panes. No tabs.

```
┌─────────────────────────────────────────────────────┐
│                    HEADER (sticky)                   │
├────────────────────────┬────────────────────────────┤
│   Ingredients Pane     │      Cook Steps Pane        │
│   (overflow-y: auto)   │      (overflow-y: auto)     │
│   height: calc(100vh   │      height: calc(100vh     │
│         - header)      │            - header)        │
│                        │                             │
│   [scrolls indep.]     │      [scrolls indep.]       │
└────────────────────────┴────────────────────────────┘
```

- Grid: `display: grid; grid-template-columns: 1fr 1fr`
- Each pane fills `calc(100vh - var(--header-height))` and scrolls independently
- Both sections always visible simultaneously — no toggling needed
- No tab bar on tablet

### Phone (< 48rem)

Single scrollable body. Two sections stacked vertically.

```
┌──────────────────┐
│  HEADER (sticky) │
├──────────────────┤
│ [🧪 מצרכים] [⏱ בישול]  ← swap buttons
├──────────────────┤
│  PRIMARY section │  ← whichever was tapped
│  (top position)  │
├──────────────────┤
│  ── divider ──   │
│  SECONDARY sect. │  ← always accessible by scrolling
└──────────────────┘
```

- Swap buttons reorder the DOM (`insertBefore`) and scroll to top
- Both sections always accessible by scrolling — no content is ever hidden
- Hint text below the swap buttons: `"מצרכים למעלה — גלול מטה לשלבי הבישול"` (updates when swapped)
- Default order: Ingredients on top, Steps below

---

## Header (always sticky, full width)

The header is not part of any tab. It stays fixed at the top of the viewport at all times.

### Contents (RTL order)

**Right side (leading):**
- Recipe name — large, prominent (`font-size: 1.25rem`, `font-weight: 800`)
- Rating stars + cost badge (`₪XX`) + approval checkmark (`✓ מאושר`) — second row, smaller

**Center:**
- Multiplier chips: `½x` · `1x` · `2x` · `3x` — pill buttons; active = white fill + green text; inactive = ghost/transparent
- Quantity stepper: `− N מנות +` (inline stepper, compact)

**Left side (trailing):**
- Edit icon button (pencil `✎`)
- Export icon button (download `↓`)

### Scaling behavior
- Tapping a multiplier chip sets `targetQuantity_` = `baseQuantity × multiplier`
- Quantity stepper increments/decrements `targetQuantity_` directly
- `scaleFactor_` computed signal drives all downstream scaled values
- Scale-by-ingredient (tap ingredient to anchor) overrides the chip selection

---

## Ingredients Pane

### Structure
- Section header: `🧪 מצרכים` with scaled cost badge
- Ingredient list: one row per ingredient

### Ingredient Row
```
○  [quantity] [unit]  [name]
```
- `○` = circle checkbox (tap to check off, session-only — not persisted)
- Checked state: strikethrough text, muted color, filled circle
- Quantity shows scaled value from `scaledIngredients_` computed signal
- Long-tap (or dedicated icon) on an ingredient sets `scaleByIngredientIndex_` — anchors the whole recipe to that ingredient's quantity

### Dish mode (`isDish_` = true)
- Shows prep items from `scaledPrep_` instead of ingredients
- Same checklist UI; no step tab shown

---

## Cook Steps Pane

### Core Rule: All Steps Always Visible

All steps are rendered in the DOM at all times. Full text is always shown. No collapse, no "tap to expand." The only difference between steps is visual hierarchy via opacity.

### Step States

#### Active Step (`i === activeStepIndex_`)
- Background: `#E1F5EE`
- Border: `2px solid #1D9E75`
- Box shadow: `0 4px 16px rgba(29,158,117,0.18)`
- Opacity: `1.0` (100%)
- Green header bar (`background: #1D9E75`) containing:
  - Step number circle (white, semi-transparent background)
  - `"פעיל עכשיו"` label
  - Timer button: `⏱ טיימר`
  - Stopwatch button: `⌚ שעון` (shows elapsed time + pause/resume when running)
- Full step text at full size (`font-size: 0.88rem`)
- Full-width `"✓ סיימתי שלב זה"` button at bottom (green, tapping advances `activeStepIndex_`)

#### All Non-Active Steps (done OR pending)
- Opacity: `0.62` (uniform — no gradient fading by distance)
- Background: white
- Border: `1px solid #e0eceb`

**Done step extras:**
- Step number circle shows `✓` (green background)
- `"הושלם"` label
- Step text has `text-decoration: line-through`

**Pending step extras:**
- Step number circle shows the step number
- No label

#### Timer/Stopwatch on Non-Active Steps
| Timer state | Visual |
|---|---|
| Running on non-active step | Green pill badge: `⏱ 2:14 ▶` or `⌚ 1:14 ▶` |
| **Finished** on non-active step | Red pill badge: `⏱ הטיימר הסתיים!` + **red border on entire card** |

The red border (`1.5px solid #fca5a5`) on the whole card ensures a finished timer is never missed even when the user is focused on a different step.

### Step Progression
- Tapping `"✓ סיימתי שלב זה"` adds current index to `stepDoneSet_` and increments `activeStepIndex_`
- If `activeStepIndex_` exceeds the last step, `cookingComplete_` becomes true → show completion state
- Auto-scroll to newly active step on advancement (smooth scroll)

---

## Timer & Stopwatch Logic

Each step can independently have one timer OR one stopwatch running (or neither).

### Timer (countdown)
- Signal: `activeTimerStepIndex_`, `timerSecondsLeft_`, `timerRunning_`
- Started from the active step's header timer button
- If the step has `cooking_time_secs_`, pre-fills that value; otherwise user sets time
- When `timerSecondsLeft_` reaches 0: mark as finished, show red alert on that step's card

### Stopwatch (count-up)
- Signal: `stopwatchStepIndex_`, `stopwatchSecondsElapsed_`, `stopwatchRunning_`
- Started from the active step's header stopwatch button
- Persists and continues counting even when the step is no longer active
- Can be paused/resumed from the pill badge visible on non-active steps
- No "finished" state — user stops it manually

### Persistence across step changes
Both timer and stopwatch survive step transitions. The step card always shows the current state of its own timer/stopwatch via the pill badge system described above.

---

## Edit Mode

- Triggered by the header edit button (`✎`)
- `editMode_` signal toggles in-place editing
- In edit mode: ingredient quantities/units/names become editable inputs; step text becomes editable textareas
- Edit mode disables the step progression flow (mark-done button hidden)
- Saving returns to view mode

---

## Export

- Triggered by the header export button (`↓`)
- Export bar slides in (existing behavior preserved)
- Options: recipe info, shopping list, cooking steps, dish checklist

---

## Signals Reference (cook-view.page.ts)

All existing signals are preserved as-is. No signal renames.

| Signal | Purpose |
|---|---|
| `recipe_` | Loaded recipe object |
| `targetQuantity_` | Current desired quantity (drives scaling) |
| `selectedUnit_` | Unit for quantity display |
| `scaleFactor_` | Computed: `targetQuantity_ / recipe base quantity` |
| `scaledIngredients_` | Computed scaled ingredient list |
| `scaledPrep_` | Computed scaled prep items (dish mode) |
| `scaledCost_` | Computed cost at current scale |
| `isDish_` | True if recipe type is "dish" |
| `editMode_` | Edit mode toggle |
| `activeStepIndex_` | Which step is currently active |
| `stepDoneSet_` | Set of completed step indices |
| `peekedStepIndex_` | Step the user is inspecting (future use) |
| `activeTimerStepIndex_` | Which step owns the running timer |
| `timerSecondsLeft_` | Countdown seconds remaining |
| `timerRunning_` | Timer running state |
| `stopwatchStepIndex_` | Which step owns the running stopwatch |
| `stopwatchSecondsElapsed_` | Stopwatch elapsed seconds |
| `stopwatchRunning_` | Stopwatch running state |
| `checkedIngredients_` | Set of checked ingredient indices (session-only) |
| `scaleByIngredientIndex_` | Index of anchor ingredient for scale-by-ingredient |
| `cookingComplete_` | Computed: all steps done |

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `≥ 48rem` | Side-by-side split pane, no swap buttons |
| `< 48rem` | Single scroll, swap buttons visible, stacked sections |

---

## Color Palette (CSS custom properties)

| Token | Value | Usage |
|---|---|---|
| `--cv-active-border` | `#1D9E75` | Active step border, header bar |
| `--cv-active-bg` | `#E1F5EE` | Active step background |
| `--cv-done-circle-bg` | `#d4ede6` | Done step circle background |
| `--cv-done-circle-color` | `#1d9e75` | Done step checkmark |
| `--cv-inactive-opacity` | `0.62` | All non-active steps |
| `--cv-timer-alert-bg` | `#fee2e2` | Finished timer pill background |
| `--cv-timer-alert-color` | `#b91c1c` | Finished timer pill text |
| `--cv-timer-alert-border` | `#fca5a5` | Finished timer card border |

---

## RTL Notes

- All layout uses `direction: rtl`
- Flex row direction: right-to-left (leading = right side in Hebrew)
- `margin-right` / `padding-right` used for list indentation
- Step number circles positioned on the right edge of each card header

---

## Out of Scope

- Persistent ingredient check-off (stays session-only)
- Multi-recipe cooking (one recipe per session)
- Social sharing from cook view
- Offline/PWA mode
- Nutritional info display
