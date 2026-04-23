# CookView Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the CookView page into a split-pane cooking assistant with a unified sticky header, a new step-card visual hierarchy, and a phone-friendly pane-swap layout.

**Architecture:** The existing `cook-view.page.ts/.html/.scss` are modified in place — no new components or services. All signals already exist; we add only `timerFinishedStepIndex_`, `cookingComplete_`, and `phoneFirstPane_`. The HTML shell gets a unified `.cv-header` row replacing the current two-row header + scale-bar split. The `.cv-body` grid already exists as `1fr 1fr`; we wire it for phone swap via CSS `order`.

**Tech Stack:** Angular 17+ standalone components, signals (`signal()`, `computed()`), SCSS with CSS custom properties, `dir="rtl"` throughout.

---

## File Map

| File | What changes |
|---|---|
| `src/app/pages/cook-view/cook-view.page.ts` | Add `timerFinishedStepIndex_`, `cookingComplete_`, `phoneFirstPane_`; update `startTimer`; add `swapPanes()`, `dismissTimerDone()`, `scrollToActiveStep()` |
| `src/app/pages/cook-view/cook-view.page.html` | Unify header rows; add phone swap buttons; rework step card markup for active green bar + non-active pill badges |
| `src/app/pages/cook-view/cook-view.page.scss` | Header gradient; step card active green bar; uniform non-active opacity; phone swap layout; red timer alert styles |

---

## Task 1: Timer "done" state signal + `cookingComplete_`

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.ts`

Currently when the countdown hits 0, `cancelTimer()` is called — this clears all timer state so there's no way to know a timer finished on a non-active step. We need a separate "finished" signal so the red alert can persist until the user dismisses it.

- [ ] **Step 1.1: Add signals after the existing stopwatch signals (around line 151)**

In `cook-view.page.ts`, after the `stopwatchIntervalId_` declaration, add:

```typescript
  /** Step index whose countdown just finished (null = none). Cleared by dismissTimerDone(). */
  protected timerFinishedStepIndex_ = signal<number | null>(null)
```

- [ ] **Step 1.2: Add `cookingComplete_` computed signal after `isDish_`**

```typescript
  protected cookingComplete_ = computed(() => {
    const recipe = this.recipe_()
    if (!recipe) return false
    if (this.isDish_()) {
      return this.stepDoneSet_().size >= this.scaledPrep_().length && this.scaledPrep_().length > 0
    }
    return this.stepDoneSet_().size >= (recipe.steps_?.length ?? 0) && (recipe.steps_?.length ?? 0) > 0
  })
```

- [ ] **Step 1.3: Update `startTimer` so countdown reaching 0 sets `timerFinishedStepIndex_` instead of calling `cancelTimer()`**

Find `startTimer` (around line 834). Replace the inner interval callback:

```typescript
  protected startTimer(stepIndex: number, totalSeconds: number): void {
    if (this.timerIntervalId_ !== null) {
      clearInterval(this.timerIntervalId_)
    }
    this.timerFinishedStepIndex_.set(null)
    this.activeTimerStepIndex_.set(stepIndex)
    this.timerSecondsLeft_.set(totalSeconds)
    this.timerIntervalId_ = setInterval(() => {
      this.timerSecondsLeft_.update(s => s - 1)
      if (this.timerSecondsLeft_() <= 0) {
        clearInterval(this.timerIntervalId_!)
        this.timerIntervalId_ = null
        this.timerFinishedStepIndex_.set(this.activeTimerStepIndex_())
        this.activeTimerStepIndex_.set(null)
        this.timerSecondsLeft_.set(0)
      }
    }, 1000)
  }
```

- [ ] **Step 1.4: Add `dismissTimerDone()` method (place after `cancelTimer`)**

```typescript
  protected dismissTimerDone(): void {
    this.timerFinishedStepIndex_.set(null)
  }
```

- [ ] **Step 1.5: Update `cancelTimer` to also clear `timerFinishedStepIndex_`**

```typescript
  protected cancelTimer(): void {
    if (this.timerIntervalId_ !== null) {
      clearInterval(this.timerIntervalId_)
      this.timerIntervalId_ = null
    }
    this.activeTimerStepIndex_.set(null)
    this.timerFinishedStepIndex_.set(null)
    this.timerSecondsLeft_.set(0)
  }
```

- [ ] **Step 1.6: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -10
```
Expected: `Build at:` line with no errors.

- [ ] **Step 1.7: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.ts
git commit -m "feat(cook-view): add timerFinishedStepIndex_, cookingComplete_ signals; fix timer done state"
```

---

## Task 2: Phone pane-swap signal + method

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.ts`

- [ ] **Step 2.1: Add `phoneFirstPane_` signal after `exportBarExpanded_`**

```typescript
  /** Phone layout: which pane appears on top. Default: ingredients first. */
  protected phoneFirstPane_ = signal<'ingredients' | 'steps'>('ingredients')
```

- [ ] **Step 2.2: Add `swapToPane()` method (place in Focus Mode methods section)**

```typescript
  protected swapToPane(pane: 'ingredients' | 'steps'): void {
    this.phoneFirstPane_.set(pane)
  }
```

- [ ] **Step 2.3: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5
```

- [ ] **Step 2.4: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.ts
git commit -m "feat(cook-view): add phoneFirstPane_ signal and swapToPane() for mobile layout"
```

---

## Task 3: Auto-scroll to active step after marking done

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.ts`
- Modify: `src/app/pages/cook-view/cook-view.page.html`

- [ ] **Step 3.1: Add `ElementRef` import and inject in `cook-view.page.ts`**

At the top of the imports line, ensure `ElementRef` is imported from `@angular/core`. Then inject it:

```typescript
private readonly el = inject(ElementRef)
```

- [ ] **Step 3.2: Add `scrollToActiveStep()` helper**

```typescript
  private scrollToActiveStep(index: number): void {
    setTimeout(() => {
      const card = this.el.nativeElement.querySelector(`[data-step-index="${index}"]`) as HTMLElement | null
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }
```

- [ ] **Step 3.3: Call `scrollToActiveStep` at the end of `markStepDone`**

In `markStepDone`, after the last `this.activeStepIndex_.set(i)` call in each branch, and before `return`, call `this.scrollToActiveStep(i)`. For the fallback (no more steps), add at the very end of the method after the second for loop:

```typescript
  protected markStepDone(index: number): void {
    this.stepDoneSet_.update(s => {
      const next = new Set(s)
      next.add(index)
      return next
    })
    const recipe = this.recipe_()
    const steps = this.isDish_() ? this.scaledPrep_() : (recipe?.steps_ ?? [])
    const doneSet = this.stepDoneSet_()
    for (let i = index + 1; i < steps.length; i++) {
      if (!doneSet.has(i)) {
        this.activeStepIndex_.set(i)
        this.scrollToActiveStep(i)
        return
      }
    }
    for (let i = 0; i < index; i++) {
      if (!doneSet.has(i)) {
        this.activeStepIndex_.set(i)
        this.scrollToActiveStep(i)
        return
      }
    }
    // All done — scroll to top of step pane
    this.scrollToActiveStep(0)
  }
```

- [ ] **Step 3.4: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5
```

- [ ] **Step 3.5: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.ts
git commit -m "feat(cook-view): auto-scroll to active step after marking done"
```

---

## Task 4: SCSS — Step card visual overhaul

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.scss`

This task changes the step card CSS only. The goal:
- Active step: `opacity: 1`, green header bar, box-shadow glow
- All non-active steps: `opacity: 0.62` (uniform — done and pending look the same)
- Remove `--next` variant's different opacity
- Add `--timer-alert` variant for red border when timer done on non-active step

- [ ] **Step 4.1: Update CSS custom properties in `:host`**

Find the `/* Focus Mode tokens */` block in `:host` (around line 23). Replace:

```scss
  /* Focus Mode tokens */
  --cv-active-border: #1D9E75;
  --cv-active-bg: #E1F5EE;
  --cv-active-text: #0F6E56;
  --cv-done-opacity: 0.7;
  --cv-timer-bg: #FAEEDA;
  --cv-timer-color: #633806;
  --cv-step-done-btn-bg: #1D9E75;
  --cv-step-done-btn-color: #E1F5EE;
  --cv-tap-min: 44px;
```

With:

```scss
  /* Focus Mode tokens */
  --cv-active-border: #1D9E75;
  --cv-active-bg: #E1F5EE;
  --cv-active-text: #0F6E56;
  --cv-inactive-opacity: 0.62;
  --cv-done-circle-bg: #d4ede6;
  --cv-done-circle-color: #1d9e75;
  --cv-timer-bg: #FAEEDA;
  --cv-timer-color: #633806;
  --cv-timer-alert-bg: #fee2e2;
  --cv-timer-alert-color: #b91c1c;
  --cv-timer-alert-border: #fca5a5;
  --cv-step-done-btn-bg: #1D9E75;
  --cv-step-done-btn-color: #E1F5EE;
  --cv-tap-min: 44px;
```

- [ ] **Step 4.2: Rework `.cv-step-card` base styles**

Find `.cv-step-card {` (around line 579). Replace the block with:

```scss
.cv-step-card {
  background: var(--bg-pure);

  border: 1px solid var(--cv-border-muted);
  border-radius: 10px;

  overflow: hidden;
  opacity: var(--cv-inactive-opacity);
  transition: opacity 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.cv-step-card--active {
  background: var(--cv-active-bg);

  border: 2px solid var(--cv-active-border);
  border-radius: 12px;

  box-shadow: 0 4px 16px rgba(29, 158, 117, 0.18);
  opacity: 1;
}

.cv-step-card--done {
  opacity: var(--cv-inactive-opacity);
}

.cv-step-card--timer-alert {
  border-color: var(--cv-timer-alert-border) !important;
  border-width: 1.5px !important;
  opacity: var(--cv-inactive-opacity);
}
```

- [ ] **Step 4.3: Rework `.cv-step-card-head` — active vs non-active**

Find `.cv-step-card-head {` (around line 602). Replace `.cv-step-card-head` and `.cv-step-card--active .cv-step-card-head` with:

```scss
.cv-step-card-head {
  display: flex;
  align-items: center;

  gap: 6px;
  padding: 10px 12px 6px;
}

.cv-step-card--active .cv-step-card-head {
  background: var(--cv-active-border);

  gap: 8px;
  padding: 7px 12px;
}

/* Step number circle */
.cv-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  background: #e8f7f1;
  color: var(--cv-active-text);
  font-size: 0.6rem;
  font-weight: 800;

  border-radius: 50%;
  width: 18px;
  height: 18px;
}

.cv-step-num--active {
  background: rgba(255, 255, 255, 0.25);
  color: white;

  width: 22px;
  height: 22px;
  font-size: 0.7rem;
}

.cv-step-num--done {
  background: var(--cv-done-circle-bg);
  color: var(--cv-done-circle-color);
}
```

- [ ] **Step 4.4: Add step card label + active label styles**

```scss
.cv-step-active-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.cv-step-done-label {
  color: #7aaa94;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
```

- [ ] **Step 4.5: Rework `.cv-step-card-body` text styles**

Find `.cv-step-card-body {` (around line 698). Update to:

```scss
.cv-step-card-body {
  padding: 10px 12px 0;

  p {
    margin: 0;
    color: #0a4a38;
    font-size: 0.88rem;
    line-height: 1.65;
  }
}

.cv-step-card:not(.cv-step-card--active) .cv-step-card-body p {
  color: #4a6a5a;
  font-size: 0.78rem;
  line-height: 1.55;
}

.cv-step-card--done .cv-step-card-body p {
  text-decoration: line-through;
}
```

- [ ] **Step 4.6: Update `.cv-step-done-btn` to be full-width**

```scss
.cv-step-done-btn {
  display: block;
  width: 100%;

  background: var(--cv-active-border);
  color: white;
  font-size: 0.88rem;
  font-weight: 700;

  border: none;
  cursor: pointer;
  margin-top: 10px;
  padding: 10px;

  letter-spacing: 0.02em;

  &:hover {
    background: #0f6e56;
  }
}
```

- [ ] **Step 4.7: Add timer/stopwatch pill badge styles**

```scss
/* Pill shown on non-active step cards when timer/stopwatch is running */
.cv-step-timer-pill {
  display: inline-flex;
  align-items: center;

  background: #e8f7f1;
  color: var(--cv-active-text);
  font-size: 0.62rem;
  font-weight: 600;

  border: 1px solid #c8e6db;
  border-radius: 6px;
  gap: 3px;
  margin-inline-start: auto;
  padding: 2px 7px;
}

.cv-step-timer-pill--alert {
  background: var(--cv-timer-alert-bg);
  color: var(--cv-timer-alert-color);

  border-color: var(--cv-timer-alert-border);
  font-weight: 700;

  cursor: pointer;
}

/* Active step: timer/stopwatch buttons in green header */
.cv-step-tool-btn {
  display: inline-flex;
  align-items: center;

  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 0.65rem;

  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  cursor: pointer;
  gap: 3px;
  margin-inline-start: auto;
  padding: 3px 8px;

  &:first-of-type {
    margin-inline-start: auto;
  }
  &:not(:first-of-type) {
    margin-inline-start: 4px;
  }
}
```

- [ ] **Step 4.8: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5
```

- [ ] **Step 4.9: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.scss
git commit -m "feat(cook-view): step card visual overhaul — active green bar, uniform opacity, timer alert styles"
```

---

## Task 5: SCSS — Header unification + phone swap layout

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.scss`

- [ ] **Step 5.1: Update `.cv-header-bar` to include green gradient**

Find `.cv-header-bar {` (around line 162). Replace with:

```scss
.cv-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;

  background: linear-gradient(135deg, #1d9e75, #0f6e56);

  border-radius: 24px 24px 0 0;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
}

.cv-recipe-name {
  color: white;
  font-size: 1.25rem;
  font-weight: 800;

  margin: 0;
}

.cv-name-rating {
  display: flex;
  flex-direction: column;

  gap: 0.25rem;
}
```

- [ ] **Step 5.2: Update `.cv-scale-bar` to match header style**

Find `.cv-scale-bar {` (around line 255). Replace with:

```scss
.cv-scale-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;

  background: linear-gradient(180deg, rgba(29,158,117,0.08) 0%, var(--cv-bg-page) 100%);

  border-bottom: 1px solid var(--cv-border-soft);
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
}
```

- [ ] **Step 5.3: Add phone swap bar styles**

```scss
/* Phone-only pane swap buttons */
.cv-phone-swap-bar {
  display: none;
  align-items: center;

  background: white;

  border-bottom: 2px solid var(--cv-border-soft);
  gap: 0;
}

.cv-phone-swap-btn {
  flex: 1;
  text-align: center;

  background: transparent;
  color: #888;
  font-size: 0.8rem;
  font-weight: 600;

  border: none;
  cursor: pointer;
  padding: 10px 0 8px;

  transition: color 0.15s;

  &.active {
    color: var(--cv-active-border);

    border-bottom: 2px solid var(--cv-active-border);
    margin-bottom: -2px;
  }
}

.cv-phone-swap-hint {
  display: none;

  color: #8aaa99;
  font-size: 0.72rem;
  text-align: center;

  padding: 4px 0 2px;
}

@media (max-width: 48rem) {
  .cv-phone-swap-bar,
  .cv-phone-swap-hint {
    display: flex;
  }

  .cv-phone-swap-hint {
    display: block;
  }

  .cv-body {
    display: flex;
    flex-direction: column;

    overflow-y: auto;
    height: auto;
  }

  .cv-ing-pane {
    order: 1;
    min-height: 0;
    overflow: visible;

    &.cv-pane--second {
      order: 2;
    }
  }

  .cv-step-pane {
    order: 2;
    min-height: 0;
    overflow: visible;

    &.cv-pane--first {
      order: 1;
    }
  }

  .cv-pane-divider {
    display: block;

    background: linear-gradient(90deg, transparent, var(--cv-border-soft), transparent);
    height: 2px;
    order: 1.5;

    margin: 0.5rem 1rem;
  }
}

/* Divider hidden on tablet */
.cv-pane-divider {
  display: none;
}
```

- [ ] **Step 5.4: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5
```

- [ ] **Step 5.5: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.scss
git commit -m "feat(cook-view): header gradient, phone swap bar styles, responsive pane order"
```

---

## Task 6: HTML — Step card markup overhaul

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.html`

This is the largest HTML change. We rework the step card `@for` loop (both recipe mode and dish mode) to match the new visual design.

- [ ] **Step 6.1: Replace the recipe-mode step card `@for` block**

Find the comment `<!-- Recipe mode: steps as cards -->` (around line 317). Replace the entire `@for` block (lines ~319–384) with:

```html
              @if (recipe.steps_ && recipe.steps_.length) {
                @for (step of recipe.steps_; track step.order_; let si = $index) {
                  @if (activeStepIndex_() === si && !stepDoneSet_().has(si)) {
                    <!-- ACTIVE step -->
                    <div class="cv-step-card cv-step-card--active" [attr.data-step-index]="si">
                      <!-- Green header bar -->
                      <div class="cv-step-card-head">
                        <span class="cv-step-num cv-step-num--active">{{ si + 1 }}</span>
                        <span class="cv-step-active-label">פעיל עכשיו</span>
                        <!-- Timer button -->
                        @if (activeTimerStepIndex_() === si) {
                          <button type="button" class="cv-step-tool-btn" (click)="cancelTimer()">
                            ⏱ {{ timerDisplay_() }} ⏸
                          </button>
                        } @else {
                          <button type="button" class="cv-step-tool-btn"
                            (click)="startTimer(si, step.cooking_time_secs_ ?? 180)">
                            ⏱ {{ 'timer' | translatePipe }}
                          </button>
                        }
                        <!-- Stopwatch button -->
                        @if (stopwatchStepIndex_() === si) {
                          <button type="button" class="cv-step-tool-btn"
                            (click)="toggleStopwatch()">
                            ⌚ {{ stopwatchDisplay_() }} {{ stopwatchPaused_() ? '▶' : '⏸' }}
                          </button>
                        } @else {
                          <button type="button" class="cv-step-tool-btn"
                            (click)="startStopwatch(si)">
                            ⌚ {{ 'stopwatch' | translatePipe }}
                          </button>
                        }
                      </div>
                      <div class="cv-step-card-body">
                        <p>{{ step.instruction_ }}</p>
                      </div>
                      <button type="button" class="cv-step-done-btn" (click)="markStepDone(si)">
                        ✓ &nbsp; {{ 'mark_step_done' | translatePipe }}
                      </button>
                    </div>
                  } @else if (stepDoneSet_().has(si)) {
                    <!-- DONE step -->
                    <div class="cv-step-card cv-step-card--done"
                      [class.cv-step-card--timer-alert]="timerFinishedStepIndex_() === si"
                      [attr.data-step-index]="si">
                      <div class="cv-step-card-head">
                        <span class="cv-step-num cv-step-num--done">✓</span>
                        <span class="cv-step-done-label">{{ 'step_done_label' | translatePipe }}</span>
                        <!-- Finished timer alert on done step -->
                        @if (timerFinishedStepIndex_() === si) {
                          <span class="cv-step-timer-pill cv-step-timer-pill--alert"
                            (click)="dismissTimerDone()">
                            ⏱ {{ 'timer_done' | translatePipe }} ✕
                          </span>
                        }
                        <!-- Running stopwatch on done step -->
                        @if (stopwatchStepIndex_() === si) {
                          <span class="cv-step-timer-pill" (click)="toggleStopwatch()">
                            ⌚ {{ stopwatchDisplay_() }} {{ stopwatchPaused_() ? '▶' : '⏸' }}
                          </span>
                        }
                        <!-- Undo done -->
                        <span class="cv-step-status-chip cv-step-status-chip--done cv-step-status-chip--clickable"
                          style="margin-inline-start: auto"
                          (click)="unmarkStepDone(si)">↩</span>
                      </div>
                      <div class="cv-step-card-body">
                        <p>{{ step.instruction_ }}</p>
                      </div>
                    </div>
                  } @else {
                    <!-- PENDING step -->
                    <div class="cv-step-card"
                      [class.cv-step-card--timer-alert]="timerFinishedStepIndex_() === si"
                      [attr.data-step-index]="si">
                      <div class="cv-step-card-head">
                        <span class="cv-step-num">{{ si + 1 }}</span>
                        <!-- Finished timer alert -->
                        @if (timerFinishedStepIndex_() === si) {
                          <span class="cv-step-timer-pill cv-step-timer-pill--alert"
                            (click)="dismissTimerDone()">
                            ⏱ {{ 'timer_done' | translatePipe }} ✕
                          </span>
                        }
                        <!-- Running stopwatch on pending step -->
                        @if (stopwatchStepIndex_() === si) {
                          <span class="cv-step-timer-pill" (click)="toggleStopwatch()">
                            ⌚ {{ stopwatchDisplay_() }} {{ stopwatchPaused_() ? '▶' : '⏸' }}
                          </span>
                        }
                      </div>
                      <div class="cv-step-card-body">
                        <p>{{ step.instruction_ }}</p>
                      </div>
                    </div>
                  }
                }
              } @else {
                <p class="empty-state-text">{{ 'no_steps_defined' | translatePipe }}</p>
              }
```

- [ ] **Step 6.2: Add `timer_done` and `stopwatch` translation keys**

Check if these keys exist:

```bash
grep -r "timer_done\|\"stopwatch\"" C:/foodCo/foodVibe1.0/src/assets/i18n/ | head -5
```

If missing, add them to both `he.json` and `en.json` (or whatever i18n files exist):

```bash
# Find i18n files
ls C:/foodCo/foodVibe1.0/src/assets/i18n/
```

Add to each file:
```json
"timer_done": "הטיימר הסתיים!",
"stopwatch": "שעון"
```

(For `en.json`: `"timer_done": "Timer done!", "stopwatch": "Stopwatch"`)

- [ ] **Step 6.3: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.html src/assets/i18n/
git commit -m "feat(cook-view): rework step card HTML — active green bar, done/pending pills, timer alerts"
```

---

## Task 7: HTML — Phone swap buttons + header visual update

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.html`

- [ ] **Step 7.1: Update `.cv-header-bar` to use white text for recipe name and stars**

The header now has a green gradient background (from Task 5 SCSS). The name and stars need white text. Find the `.cv-name-rating` block (around line 21). The recipe name already uses `.cv-recipe-name` which now gets `color: white` from Task 5. Wrap the approval stamp and cost in the header to group them:

Replace:
```html
      <div class="cv-header-bar">
        <div class="cv-name-rating">
          <h1 class="cv-recipe-name">{{ recipe.name_hebrew }}</h1>
          <app-rating-stars
            [value]="recipe.rating_ ?? 0"
            [readonly]="!isLoggedIn()"
            size="md"
            (ratingChange)="onRatingChange($event)"
          />
        </div>
        <div class="cv-header-actions">
```

With:
```html
      <div class="cv-header-bar">
        <div class="cv-name-rating">
          <h1 class="cv-recipe-name">{{ recipe.name_hebrew }}</h1>
          <div class="cv-header-meta">
            <app-rating-stars
              [value]="recipe.rating_ ?? 0"
              [readonly]="!isLoggedIn()"
              size="sm"
              (ratingChange)="onRatingChange($event)"
            />
            @if (scaledCost_() > 0) {
              <span class="cv-cost">₪{{ scaledCost_() | number:'1.0-0' }}</span>
            }
            @if (recipe.is_approved_) {
              <span class="cv-approved-badge">✓ מאושר</span>
            }
          </div>
        </div>
        <div class="cv-header-actions">
```

- [ ] **Step 7.2: Add SCSS for new header meta elements**

In `cook-view.page.scss`, add:

```scss
.cv-header-meta {
  display: flex;
  align-items: center;

  gap: 0.5rem;
}

.cv-approved-badge {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.7rem;
  font-weight: 600;
}

.cv-cost {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  font-weight: 600;
}
```

(Remove or update the existing `.cv-cost` rule that had `color: var(--color-text-muted)` — it now lives in the green header.)

- [ ] **Step 7.3: Add phone swap bar to HTML**

Immediately before `<div class="cv-body">` (around line 141), insert:

```html
      <!-- Phone-only pane swap buttons -->
      <div class="cv-phone-swap-bar">
        <button type="button" class="cv-phone-swap-btn"
          [class.active]="phoneFirstPane_() === 'ingredients'"
          (click)="swapToPane('ingredients')">
          🧪 {{ 'ingredients_index' | translatePipe }}
        </button>
        <button type="button" class="cv-phone-swap-btn"
          [class.active]="phoneFirstPane_() === 'steps'"
          (click)="swapToPane('steps')">
          ⏱ {{ isDish_() ? ('prep_list_mise_en_place' | translatePipe) : ('prep_workflow' | translatePipe) }}
        </button>
      </div>
      <p class="cv-phone-swap-hint">
        @if (phoneFirstPane_() === 'ingredients') {
          מצרכים למעלה — גלול מטה לשלבי הבישול
        } @else {
          שלבים למעלה — גלול מטה למצרכים
        }
      </p>
```

- [ ] **Step 7.4: Add `cv-pane--first` / `cv-pane--second` classes to panes**

Find `<div class="cv-ing-pane">` (around line 143). Update:

```html
          <div class="cv-ing-pane"
            [class.cv-pane--second]="phoneFirstPane_() === 'steps'">
```

Find `<div class="cv-step-pane" #stepPane>` (around line 259). Update:

```html
          <div class="cv-step-pane"
            [class.cv-pane--first]="phoneFirstPane_() === 'steps'"
            #stepPane>
```

- [ ] **Step 7.5: Add divider element between panes (phone only)**

Between the closing `</div>` of `.cv-ing-pane` and the opening of `.cv-step-pane`, add:

```html
          <div class="cv-pane-divider"></div>
```

- [ ] **Step 7.6: Move `cv-cost` from `.cv-header-actions` (it now lives in `.cv-header-meta`)**

Remove the existing cost line from inside `.cv-header-actions`:
```html
          @if (scaledCost_() > 0) {
            <span class="cv-cost">{{ 'cost' | translatePipe }}: ₪{{ scaledCost_() | number:'1.2-2' }}</span>
          }
```
(This was added to `.cv-header-meta` in Step 7.1.)

- [ ] **Step 7.7: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -10
```

- [ ] **Step 7.8: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.html src/app/pages/cook-view/cook-view.page.scss
git commit -m "feat(cook-view): phone swap bar, green header, approved badge, pane order classes"
```

---

## Task 8: Dish mode step cards + completion state

**Files:**
- Modify: `src/app/pages/cook-view/cook-view.page.html`

- [ ] **Step 8.1: Rework dish mode prep-item cards to match the same active/done/pending structure**

Find the comment `<!-- Dish mode: prep items as cards -->` (around line 283). Replace the entire `@for` block with the same three-branch pattern (active / done / pending) as the recipe-mode cards from Task 6. The main differences:
- No `step.instruction_` — show `{{ row.amount | formatQuantity }} {{ row.unit | translatePipe }} {{ row.name }}`
- No timer/stopwatch (dish mode has no cooking times)

```html
              @if (scaledPrep_().length > 0) {
                @for (row of scaledPrep_(); track row.name + row.unit + row.amount; let si = $index) {
                  @if (activeStepIndex_() === si && !stepDoneSet_().has(si)) {
                    <div class="cv-step-card cv-step-card--active" [attr.data-step-index]="si">
                      <div class="cv-step-card-head">
                        <span class="cv-step-num cv-step-num--active">{{ si + 1 }}</span>
                        <span class="cv-step-active-label">פעיל עכשיו</span>
                      </div>
                      <div class="cv-step-card-body">
                        <p>{{ row.amount | formatQuantity }} {{ row.unit | translatePipe }} {{ row.name }}</p>
                      </div>
                      <button type="button" class="cv-step-done-btn" (click)="markStepDone(si)">
                        ✓ &nbsp; {{ 'mark_step_done' | translatePipe }}
                      </button>
                    </div>
                  } @else if (stepDoneSet_().has(si)) {
                    <div class="cv-step-card cv-step-card--done" [attr.data-step-index]="si">
                      <div class="cv-step-card-head">
                        <span class="cv-step-num cv-step-num--done">✓</span>
                        <span class="cv-step-done-label">{{ 'step_done_label' | translatePipe }}</span>
                        <span class="cv-step-status-chip cv-step-status-chip--done cv-step-status-chip--clickable"
                          style="margin-inline-start: auto"
                          (click)="unmarkStepDone(si)">↩</span>
                      </div>
                      <div class="cv-step-card-body">
                        <p>{{ row.amount | formatQuantity }} {{ row.unit | translatePipe }} {{ row.name }}</p>
                      </div>
                    </div>
                  } @else {
                    <div class="cv-step-card" [attr.data-step-index]="si">
                      <div class="cv-step-card-head">
                        <span class="cv-step-num">{{ si + 1 }}</span>
                      </div>
                      <div class="cv-step-card-body">
                        <p>{{ row.amount | formatQuantity }} {{ row.unit | translatePipe }} {{ row.name }}</p>
                      </div>
                    </div>
                  }
                }
              } @else {
                <p class="empty-state-text">{{ 'no_preparations_defined' | translatePipe }}</p>
              }
```

- [ ] **Step 8.2: Add cooking complete banner at the bottom of `.cv-step-body`**

After the closing `}` of the `@if (isDish_())` block and before `</div>` of `.cv-step-body`, add:

```html
            @if (cookingComplete_()) {
              <div class="cv-complete-banner">
                🎉 {{ 'cooking_complete' | translatePipe }}
              </div>
            }
```

- [ ] **Step 8.3: Add `cooking_complete` translation key to i18n files**

```json
"cooking_complete": "הכנה הושלמה! בתאבון 🎉"
```
(English: `"cooking_complete": "Cooking complete! Enjoy! 🎉"`)

- [ ] **Step 8.4: Add `.cv-complete-banner` SCSS**

```scss
.cv-complete-banner {
  background: var(--cv-active-bg);
  color: var(--cv-active-text);
  font-size: 1rem;
  font-weight: 700;
  text-align: center;

  border: 2px solid var(--cv-active-border);
  border-radius: 12px;
  margin: 0.75rem;
  padding: 1rem;
}
```

- [ ] **Step 8.5: Build check**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -10
```

- [ ] **Step 8.6: Commit**

```bash
git add src/app/pages/cook-view/cook-view.page.html src/app/pages/cook-view/cook-view.page.scss src/assets/i18n/
git commit -m "feat(cook-view): dish mode cards redesign, cooking complete banner"
```

---

## Task 9: Visual verification + responsive smoke test

**Files:** No code changes — this is a QA pass.

- [ ] **Step 9.1: Start dev server**

```bash
cd C:/foodCo/foodVibe1.0 && ng serve
```

- [ ] **Step 9.2: Open a recipe in cook view**

Navigate to `http://localhost:4200/cook/<any-recipe-id>`. Verify:
- Green gradient header visible with recipe name in white
- Rating stars visible in header (white)
- Cost badge visible in header
- Multiplier chips visible in scale bar below header
- Two side-by-side panes on tablet (≥ 48rem width)

- [ ] **Step 9.3: Test step progression**

- Click `✓ סיימתי שלב זה` on the active step
- Verify step transitions to done state (strikethrough, ✓ circle, 62% opacity)
- Verify next step becomes active (green header bar, 100% opacity)
- Verify the view scrolls to the newly active step

- [ ] **Step 9.4: Test timer alert**

- Start a timer on the active step with a short duration (2–3 seconds)
- Mark the step done while timer is running (step becomes non-active but timer keeps running toward 0)
- Wait for timer to reach 0
- Verify: red pill appears on the done step, red border on that card
- Click the pill to dismiss — verify it clears

- [ ] **Step 9.5: Test phone layout**

- In browser DevTools, set viewport to 375px wide
- Verify: phone swap bar appears, two stacked sections visible
- Tap `⏱ בישול` — steps pane jumps to top, ingredients below
- Tap `🧪 מצרכים` — ingredients jump to top again
- Scroll down — verify both sections accessible

- [ ] **Step 9.6: Test dish mode**

- Navigate to a dish-type recipe
- Verify prep items appear as cards with same active/done/pending structure
- Verify no timer/stopwatch buttons in dish mode

- [ ] **Step 9.7: Test edit mode**

- Click the edit button
- Verify ingredient table and workflow editor appear (unchanged from before)
- Verify mark-done button is hidden in edit mode
- Click save — verify return to view mode

- [ ] **Step 9.8: Final build gate**

```bash
cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5
```
Expected: clean build.

- [ ] **Step 9.9: Final commit**

```bash
git add -A
git commit -m "feat(cook-view): complete redesign — split pane, step guidance, timer alerts, phone swap"
```

---

## Self-Review: Spec Coverage Check

| Spec requirement | Covered in task |
|---|---|
| Tablet split pane 1fr 1fr, independent scroll | Task 5 SCSS `.cv-body` |
| Phone pane swap with scroll to top | Task 2 (signal), Task 5 (SCSS), Task 7 (HTML) |
| Phone hint text update on swap | Task 7.3 |
| Header: name + rating + cost + approval | Task 7.1 |
| Header: multiplier chips | Already in `.cv-scale-bar` — kept |
| Header: quantity stepper | Already in `.cv-scale-bar` — kept |
| Header: edit + export icon buttons | Existing — kept |
| Scale-by-ingredient | Existing — untouched |
| Ingredients checklist with circle checkboxes | Existing — untouched |
| All steps always visible, full text | Task 6 (no collapse in new markup) |
| Active step: green header bar | Task 4 SCSS + Task 6 HTML |
| Active step: timer + stopwatch buttons in header | Task 6 HTML |
| Active step: mark-done full-width button | Task 4 SCSS + Task 6 HTML |
| Non-active: uniform 62% opacity | Task 4 SCSS |
| Done steps: strikethrough | Task 4 SCSS `.cv-step-card--done p` |
| Running timer/stopwatch on non-active: green pill | Task 6 HTML |
| Finished timer on non-active: red pill + red border | Task 1 (signal), Task 4 SCSS, Task 6 HTML |
| Auto-scroll to newly active step | Task 3 |
| Cooking complete state | Task 8 |
| Dish mode same card structure | Task 8 |
| Edit mode preserved | Untouched |
| Export preserved | Untouched |
| RTL throughout | Existing + maintained |
| Phone `< 48rem` breakpoint | Task 5 SCSS |
| Tablet `≥ 48rem` breakpoint | Task 5 SCSS |

All spec requirements covered. No gaps found.
