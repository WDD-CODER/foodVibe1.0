# Menu Intelligence — Bistro Elegance Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Menu Intelligence page to look like a physical paper menu — warm linen background, double-border card, Georgia serif, inline-editable event header chips, ▾-expand annotation rows, ornamental dividers, and a pill toolbar row above the paper.

**Architecture:** Visual layer only — SCSS partials and HTML templates. Zero changes to `menu-intelligence.page.ts`, all services, pipes, models, or component TypeScript files. All Angular signals, reactive form bindings, keyboard navigation, and export logic are preserved exactly.

**Tech Stack:** Angular 17 standalone components, SCSS partials, RTL (Hebrew), CSS custom properties.

---

### Task 1: Layout shell

**Files:**
- Modify: `src/app/pages/menu-intelligence/_layout.scss`

- [ ] **Step 1: Replace entire file**

```scss
/* ============================================================
   Layout — Shell, grid containers
   ============================================================ */

:host {
  --color-ink: #1a1a1a;
  --font-serif: 'Georgia', serif;
  --color-ornament: #8a7450;
  --color-frame-ink: #1a1a1a;
  --border-warm: #d0c8b4;

  display: block;
  min-height: 100vh;
  min-height: 100dvh;
  background: #edeae2;
}

.menu-editor-shell {
  padding: 20px 16px 40px;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.paper-outer {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: `Build at:` with 0 errors.

---

### Task 2: Paper frame, ornaments, dividers (`_paper-ui.scss` — structural rules)

**Files:**
- Modify: `src/app/pages/menu-intelligence/_paper-ui.scss`

- [ ] **Step 1: Replace `.paper` block (lines 5–14)**

```scss
.paper {
  position: relative;
  width: 100%;
  margin: 0 auto;
  padding: 7px;
  background: #fdfdfa;
  border: 2px solid #1a1a1a;
  border-radius: 16px;
  box-shadow: 4px 6px 20px rgba(0,0,0,0.16);
}
```

- [ ] **Step 2: Replace `.paper-inner` block (lines 17–29)**

```scss
.paper-inner {
  position: relative;
  min-height: 320px;
  padding: 28px 32px 24px;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  background: transparent;

  @media (max-width: 600px) {
    padding: 20px 16px 20px;
  }
}
```

- [ ] **Step 3: Replace `.paper-ornament` block (lines 31–48)**

```scss
.paper-ornament {
  position: relative;
  height: 24px;
  margin: 0 auto 20px;
  text-align: center;

  &::before {
    content: '— ✦ —';
    font-family: var(--font-serif);
    font-size: 0.62rem;
    color: #8a7450;
    letter-spacing: 9px;
    font-weight: 400;
  }

  &.bottom {
    margin: 24px auto 0;
  }
}
```

- [ ] **Step 4: Replace `.info-menu-divider` block (lines 58–65)**

```scss
.info-menu-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 18px 0 22px;
  font-size: 0.65rem;
  color: #c8b890;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, #c8b890, transparent);
  }
}
```

- [ ] **Step 5: Replace `.section-divider` block (lines 327–334)**

```scss
.section-divider {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 14px 0 18px;
  font-size: 0.65rem;
  color: #c8b890;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, #c8b890, transparent);
  }
}
```

- [ ] **Step 6: Replace `.event-type-dropdown` and `.event-type-search` blocks (lines 282–289)**

```scss
.event-type-chip-wrap {
  position: relative;
  display: inline-block;
}

.event-type-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  min-width: 220px;
  background: #fdfdfa;
  border: 1px solid #d0c8b4;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  overflow: hidden;
}

.event-type-search {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid #e8e0d0;
  font-family: var(--font-serif);
  font-size: 0.85rem;
  background: transparent;
  outline: none;
}
```

- [ ] **Step 7: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: no errors.

---

### Task 3: Section headers, add buttons, event chips, financial footnote styles (`_paper-ui.scss` — content rules)

**Files:**
- Modify: `src/app/pages/menu-intelligence/_paper-ui.scss`

- [ ] **Step 1: Replace `.section-title-plain` block (lines 337–362)**

```scss
.section-title-plain {
  font-family: var(--font-serif);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  color: #5a4a2a;
  margin: 0;
  padding: 4px 0;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  transition: color 0.15s;
  text-align: center;
  width: 100%;

  &:hover {
    color: #8a7450;
  }

  &:focus {
    border-radius: 2px;
    box-shadow: 0 0 0 2px rgba(138, 116, 80, 0.25);
  }
}
```

- [ ] **Step 2: Replace both `.add-dish-btn` and `.add-section-btn` blocks (lines 506–544)**

```scss
.add-dish-btn {
  grid-column: 1 / -1;
  display: block;
  margin: 8px auto;
  padding: 4px 16px;
  font-family: var(--font-serif);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: #b0a080;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  text-align: center;

  &:hover {
    color: #8a7450;
  }
}

.add-section-btn {
  display: block;
  margin: 6px auto 0;
  padding: 4px 16px;
  font-family: var(--font-serif);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: #b0a080;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  text-align: center;

  &:hover {
    color: #8a7450;
  }
}
```

- [ ] **Step 3: Append event-header chip styles and financial footnote styles to end of file (before final `@media (max-width: 620px)` block)**

```scss
/* ---------- Event Header Chips ---------- */

.event-tag-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-bottom: 10px;
  font-family: var(--font-serif);
}

.event-chip {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  border: none;
  border-bottom: 1px dashed transparent;
  background: transparent;
  font-family: var(--font-serif);
  font-size: 0.6rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8a7450;
  cursor: pointer;
  transition: background 0.15s;
  outline: none;

  &:hover,
  &:focus {
    background: rgba(138, 116, 80, 0.1);
    border-bottom-color: #c8b890;
  }
}

.event-chip-sep {
  color: #c8b890;
  margin: 0 4px;
  font-size: 0.6rem;
  letter-spacing: normal;
  font-family: var(--font-serif);
}

.event-chip-select ::ng-deep .custom-select-trigger {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  border: none;
  border-bottom: 1px dashed transparent;
  background: transparent;
  font-family: var(--font-serif);
  font-size: 0.6rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8a7450;
  cursor: pointer;
  transition: background 0.15s;
  min-height: unset;
  height: auto;
  box-shadow: none;

  &:hover,
  &:focus {
    background: rgba(138, 116, 80, 0.1);
    border-bottom-color: #c8b890;
    box-shadow: none;
  }
}

.menu-title-input {
  display: block;
  width: 100%;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 1.85rem;
  font-style: italic;
  color: #1a1a1a;
  background: transparent;
  border: none;
  outline: none;
  margin-bottom: 8px;
  padding: 0;

  &::placeholder {
    color: #c8b890;
    font-style: italic;
  }

  &:focus {
    box-shadow: none;
  }
}

.event-meta-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
  margin-bottom: 4px;
  font-family: var(--font-serif);
  font-size: 0.78rem;
  color: #7a6a50;
}

.event-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 3px;
  border-bottom: 1px dashed transparent;
  cursor: pointer;
  transition: background 0.15s;
  font-family: var(--font-serif);
  font-size: 0.78rem;
  color: #7a6a50;
  position: relative;

  &:hover {
    background: rgba(138, 116, 80, 0.08);
    border-bottom-color: #c8b890;
  }
}

.guest-chip-input {
  width: 3ch;
  font-family: var(--font-serif);
  font-size: 0.78rem;
  color: #7a6a50;
  background: transparent;
  border: none;
  outline: none;
  text-align: center;
  padding: 0;
  -moz-appearance: textfield;
  appearance: none;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 0;
    pointer-events: none;
  }

  &:focus {
    box-shadow: none;
  }
}

/* ---------- Financial Footnote ---------- */

.financial-footnote {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #e6dece;
  margin-top: 20px;
  padding-top: 12px;
}

.financial-footnote .fin-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.financial-footnote .fin-label {
  font-family: var(--font-serif);
  font-size: 0.55rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b0a080;
}

.financial-footnote .fin-value {
  font-family: var(--font-serif);
  font-size: 0.82rem;
  font-weight: 600;
  color: #6a5a3a;

  &.fin-value--warning {
    color: #b05a2a;
  }
}
```

- [ ] **Step 4: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: no errors.

---

### Task 4: Toolbar SCSS — pill row replaces `.financial-bar`

**Files:**
- Modify: `src/app/pages/menu-intelligence/_toolbar.scss`

- [ ] **Step 1: Replace entire file**

```scss
/* ============================================================
   Toolbar — Pill row above paper, print styles
   ============================================================ */

/* ---------- Pill Row ---------- */

.pill-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  width: 100%;
  max-width: 680px;
}

.pill-wrap {
  position: relative;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d0c8b4;
  border-radius: 20px;
  font-family: var(--font-serif);
  font-size: 0.7rem;
  color: #5a4a2a;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: #fff;
    border-color: #8a7450;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.pill--save {
    background: #1a1a1a;
    color: #fff;
    border-color: #1a1a1a;

    &:hover:not(:disabled) {
      background: #333;
      border-color: #333;
    }
  }
}

.pill-wrap .view-export-modal {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 300;
  min-width: 140px;
  background: var(--bg-pure, #fff);
  border: 1px solid #d0c8b4;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  overflow: hidden;
}

.pill-wrap .checklist-export-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 300;
  min-width: 220px;
  background: var(--bg-pure, #fff);
  border: 1px solid #d0c8b4;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  overflow: hidden;
}

.view-export-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  font-family: var(--font-serif);
  font-size: 0.875rem;
  color: var(--color-text-main, #1a1a1a);
  cursor: pointer;
  text-align: right;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-glass-hover, rgba(0,0,0,0.04));
  }
}

.checklist-export-option-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  border-bottom: 1px solid var(--border-default, #e8e0d0);

  &:last-child {
    border-bottom: none;
  }
}

.checklist-export-option-label {
  flex: 1;
  font-family: var(--font-serif);
  font-size: 0.8rem;
  color: var(--color-text-main, #1a1a1a);
  text-align: right;
}

.toolbar-glass-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #d0c8b4;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--color-text-main, #1a1a1a);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(0,0,0,0.04);
  }

  &.icon {
    padding: 4px;
  }
}

/* ---------- Print Styles ---------- */

@media print {
  .no-print {
    display: none !important;
  }

  :host {
    background: var(--bg-pure) !important;
  }

  .menu-editor-shell {
    padding: 0;
    max-width: none;
  }

  .paper-outer {
    max-width: none;
  }

  .paper {
    box-shadow: none;
    padding: 10px;
  }

  .paper-inner {
    border: 1px solid #1a1a1a;
    padding: 32px;
  }

  .dish-qty {
    display: none;
  }
}
```

- [ ] **Step 2: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: no errors.

---

### Task 5: Page HTML — toolbar, event header, footnote

**Files:**
- Modify: `src/app/pages/menu-intelligence/menu-intelligence.page.html`

- [ ] **Step 1: Replace lines 2–108 (entire `@if (toolbarOpen_())` block) with pill row**

Remove from `@if (toolbarOpen_()) {` through the closing `}` (lines 2–108). Insert in its place:

```html
  <!-- Pill toolbar row — always visible above paper -->
  <div class="pill-row no-print">

    <!-- Shopping list pill -->
    <div class="pill-wrap" (clickOutside)="closeViewExportModal()">
      <button type="button" class="pill"
        (click)="openViewExportModal('shopping-list'); $event.stopPropagation()"
        [attr.aria-label]="'export_menu_shopping_list' | translatePipe"
        [attr.aria-expanded]="viewExportModal_() === 'shopping-list'">
        🛒 {{ 'toolbar_shopping' | translatePipe }}
      </button>
      @if (viewExportModal_() === 'shopping-list') {
        <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
          <button type="button" class="view-export-option" (click)="onViewMenuShoppingList(); closeViewExportModal()">
            <lucide-icon name="eye" [size]="14"></lucide-icon>
            {{ 'view' | translatePipe }}
          </button>
          <button type="button" class="view-export-option" (click)="onExportMenuShoppingList(); closeViewExportModal()">
            <lucide-icon name="download" [size]="14"></lucide-icon>
            {{ 'export' | translatePipe }}
          </button>
        </div>
      }
    </div>

    <!-- Checklist pill -->
    <div class="pill-wrap" (clickOutside)="closeExportChecklistDropdown()">
      <button type="button" class="pill"
        (click)="toggleExportChecklistDropdown(); $event.stopPropagation()"
        [attr.aria-label]="'export_checklist' | translatePipe"
        [attr.aria-expanded]="exportChecklistDropdownOpen_()">
        📋 {{ 'toolbar_checklist' | translatePipe }}
      </button>
      @if (exportChecklistDropdownOpen_()) {
        <div class="checklist-export-dropdown" (click)="$event.stopPropagation()" (clickOutside)="closeExportChecklistDropdown()">
          <div class="checklist-export-option-row">
            <span class="checklist-export-option-label">{{ 'export_checklist_by_dish' | translatePipe }}</span>
            <button type="button" class="toolbar-glass-btn icon" (click)="onViewChecklist('by_dish'); $event.stopPropagation()" [attr.aria-label]="'view' | translatePipe">
              <lucide-icon name="eye" [size]="12"></lucide-icon>
            </button>
            <button type="button" class="toolbar-glass-btn icon" (click)="onExportChecklist('by_dish'); $event.stopPropagation()" [attr.aria-label]="'export' | translatePipe">
              <lucide-icon name="download" [size]="12"></lucide-icon>
            </button>
          </div>
          <div class="checklist-export-option-row">
            <span class="checklist-export-option-label">{{ 'export_checklist_by_category' | translatePipe }}</span>
            <button type="button" class="toolbar-glass-btn icon" (click)="onViewChecklist('by_category'); $event.stopPropagation()" [attr.aria-label]="'view' | translatePipe">
              <lucide-icon name="eye" [size]="12"></lucide-icon>
            </button>
            <button type="button" class="toolbar-glass-btn icon" (click)="onExportChecklist('by_category'); $event.stopPropagation()" [attr.aria-label]="'export' | translatePipe">
              <lucide-icon name="download" [size]="12"></lucide-icon>
            </button>
          </div>
          <div class="checklist-export-option-row">
            <span class="checklist-export-option-label">{{ 'export_checklist_by_station' | translatePipe }}</span>
            <button type="button" class="toolbar-glass-btn icon" (click)="onViewChecklist('by_station'); $event.stopPropagation()" [attr.aria-label]="'view' | translatePipe">
              <lucide-icon name="eye" [size]="12"></lucide-icon>
            </button>
            <button type="button" class="toolbar-glass-btn icon" (click)="onExportChecklist('by_station'); $event.stopPropagation()" [attr.aria-label]="'export' | translatePipe">
              <lucide-icon name="download" [size]="12"></lucide-icon>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Print pill -->
    <button type="button" class="pill" (click)="printMenu()" [attr.aria-label]="'menu_export_customer' | translatePipe">
      🖨 הדפסה
    </button>

    <!-- All pill -->
    <div class="pill-wrap" (clickOutside)="closeViewExportModal()">
      <button type="button" class="pill"
        (click)="openViewExportModal('all'); $event.stopPropagation()"
        [attr.aria-label]="'export_all_together' | translatePipe"
        [attr.aria-expanded]="viewExportModal_() === 'all'">
        📦 {{ 'toolbar_all' | translatePipe }}
      </button>
      @if (viewExportModal_() === 'all') {
        <div class="view-export-modal" (click)="$event.stopPropagation()" (clickOutside)="closeViewExportModal()">
          <button type="button" class="view-export-option" (click)="onViewAll(); closeViewExportModal()">
            <lucide-icon name="eye" [size]="14"></lucide-icon>
            {{ 'view' | translatePipe }}
          </button>
          <button type="button" class="view-export-option" (click)="onExportAllTogether(); closeViewExportModal()">
            <lucide-icon name="download" [size]="14"></lucide-icon>
            {{ 'export' | translatePipe }}
          </button>
        </div>
      }
    </div>

    <!-- Save pill -->
    <button type="button" class="pill pill--save" (click)="save()" [disabled]="isSaving_()">
      @if (isSaving_()) {
        <app-loader size="small" [inline]="true" />
      }
      {{ isSaving_() ? ('saving' | translatePipe) : ('menu_save' | translatePipe) }}
    </button>

  </div>
```

- [ ] **Step 2: Replace event header (inside paper-inner, before sections-area)**

Remove these blocks from the current HTML:
- The standalone `<div class="meta-row">` containing `menu-name-input` (lines 116–126)
- The entire `<div class="meta-column">` (lines 129–206)
- `<div class="info-menu-divider"></div>` (line 208)

Insert in their place (still inside `<div class="paper-inner">`, after `<div class="paper-ornament top"></div>`):

```html
    <!-- Tag line: event type · serving type -->
    <div class="event-tag-line">
      <div class="event-type-chip-wrap" (clickOutside)="closeEventTypeDropdown()">
        @if (eventTypeDropdownOpen_()) {
          <div class="event-type-dropdown">
            <input
              id="menu-focus-event_type_search"
              type="text"
              class="event-type-search"
              autocomplete="off"
              [ngModel]="eventTypeSearch_()"
              [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="eventTypeSearch_.set($event); eventTypeHighlightedIndex_.set(0)"
              [placeholder]="'search' | translatePipe"
              (keydown)="onEventTypeSearchKeydown($event)"
            />
            <app-scrollable-dropdown [maxHeight]="200">
              @for (t of getFilteredEventTypes(); track t; let i = $index) {
                <button type="button" class="dropdown-item" [class.highlighted]="eventTypeHighlightedIndex_() === i" (click)="selectEventType(t)">{{ t }}</button>
              }
              <button type="button" class="dropdown-item add-new" [class.highlighted]="eventTypeHighlightedIndex_() === getFilteredEventTypes().length" (click)="addNewEventType()">
                <span class="c-add-new-icon">
                  <img src="/assets/images/add_ingrediant.png" alt="" aria-hidden="true" />
                </span>
                {{ 'add' | translatePipe }}
              </button>
            </app-scrollable-dropdown>
          </div>
        } @else {
          <button type="button" class="event-chip" id="menu-focus-event_type_"
            (click)="openEventTypeDropdown()"
            (keydown)="onMetaKeydown('event_type_', $event)">
            {{ ((form_.value.event_type_ ?? '') | translatePipe) || ('menu_event_type' | translatePipe) }}
          </button>
        }
      </div>
      <span class="event-chip-sep">·</span>
      <app-custom-select
        triggerId="menu-focus-serving_type_"
        formControlName="serving_type_"
        [options]="servingTypeOptions_()"
        [placeholder]="'menu_serving_style'"
        [typeToFilter]="true"
        class="event-chip-select"
        (keydown)="onMetaKeydown('serving_type_', $event)" />
    </div>

    <!-- Menu title -->
    <input
      id="menu-focus-name_"
      type="text"
      class="menu-title-input"
      formControlName="name_"
      [attr.aria-label]="'menu_name_placeholder' | translatePipe"
      placeholder="שם האירוע..."
      (keydown)="onMetaKeydown('name_', $event)"
    />

    <!-- Meta line: guests · date -->
    <div class="event-meta-line">
      <span class="event-meta-chip event-meta-chip--guests">
        <input
          id="menu-focus-guest_count_"
          type="number"
          class="guest-chip-input"
          formControlName="guest_count_"
          min="0"
          (keydown)="onMetaKeydown('guest_count_', $event)"
        />
        {{ 'menu_guests' | translatePipe }}
      </span>
      <span class="event-chip-sep">·</span>
      <span class="event-meta-chip meta-date-chip"
        (click)="openDatePicker()"
        role="button"
        tabindex="0"
        (keydown.enter)="openDatePicker()"
        (keydown.space)="$event.preventDefault(); openDatePicker()"
        [attr.aria-label]="'menu_set_date' | translatePipe"
        (keydown)="onDateKeydown($event)">
        <span class="meta-date-display">{{ getEventDateDisplay() || ('menu_no_date' | translatePipe) }}</span>
        <input id="menu-focus-event_date_" type="date" class="meta-date-input" formControlName="event_date_"
          (keydown)="onDateKeydown($event)" />
      </span>
    </div>

    <!-- Ornamental rule -->
    <div class="info-menu-divider">✦</div>
```

- [ ] **Step 3: Add `✦` text to section-dividers and insert financial footnote; remove `.financial-bar` footer**

In the sections loop, find `<div class="section-divider"></div>` and change to:
```html
          <div class="section-divider">✦</div>
```

Before `<div class="paper-ornament bottom"></div>` (inside paper-inner), insert:

```html
    <!-- Financial footnote -->
    <div class="financial-footnote no-print">
      <div class="fin-metric">
        <span class="fin-label">{{ 'menu_total_cost' | translatePipe }}</span>
        <span class="fin-value">₪{{ eventCost_() | number:'1.2-2' }}</span>
      </div>
      <div class="fin-metric">
        <span class="fin-label">{{ 'menu_food_cost' | translatePipe }} %</span>
        <span class="fin-value" [class.fin-value--warning]="totalRevenue_() > 0 && foodCostPct_() > 33">
          @if (totalRevenue_() > 0) {
            {{ foodCostPct_() | number:'1.1-1' }}%
          } @else {
            —
          }
        </span>
      </div>
      <div class="fin-metric">
        <span class="fin-label">{{ 'menu_total_revenue' | translatePipe }}</span>
        <span class="fin-value">₪{{ totalRevenue_() | number:'1.2-2' }}</span>
      </div>
      <div class="fin-metric">
        <span class="fin-label">{{ 'menu_cost_per_guest' | translatePipe }}</span>
        <span class="fin-value">₪{{ costPerGuest_() | number:'1.2-2' }}</span>
      </div>
    </div>
```

Remove the entire `<footer class="financial-bar no-print">` block (4 `fin-metric` divs + footer tags).

- [ ] **Step 4: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd C:/foodCo/foodVibe1.0
git add src/app/pages/menu-intelligence/_layout.scss \
  src/app/pages/menu-intelligence/_paper-ui.scss \
  src/app/pages/menu-intelligence/_toolbar.scss \
  src/app/pages/menu-intelligence/menu-intelligence.page.html
git commit -m "feat(menu-intelligence): bistro paper shell, chip header, pill toolbar, financial footnote"
```

---

### Task 6: Dish row HTML

**Files:**
- Modify: `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html`

Current structure has `dish-name-meta-inner` (name + lucide-icon toggle) and `.dish-data` horizontal carousel.
New: `dish-name-wrap` (inline-flex name + ▾ text toggle) and `.dish-annotation` column row below.

- [ ] **Step 1: Replace entire file**

```html
<div class="dish-row" [formGroup]="itemGroup()">
  <div class="dish-name-cell">
    @if (itemGroup().get('recipe_id_')?.value) {
      <div class="dish-name-wrap">
        <button type="button" class="dish-name-btn"
          [id]="'dish-name-' + sectionIndex() + '-' + itemIndex()"
          [attr.aria-label]="'change_dish' | translatePipe"
          (click)="startEditName.emit(); $event.stopPropagation()">
          {{ getRecipeName(itemGroup().get('recipe_id_')?.value) }}
        </button>
        <button type="button" class="dish-meta-toggle no-print"
          [attr.aria-label]="isMetaExpanded() ? ('hide_metadata' | translatePipe) : ('show_metadata' | translatePipe)"
          (click)="metaToggle.emit()">
          {{ isMetaExpanded() ? '▴' : '▾' }}
        </button>
      </div>
      <span class="dish-sell-price no-print">
        <span class="dish-sell-currency">₪</span>
        <input type="number" formControlName="sell_price" min="0" step="1"
          [id]="'dish-sell-' + sectionIndex() + '-' + itemIndex()"
          class="dish-sell-input" SelectOnFocus
          [style.width]="getInputWidth(itemGroup().get('sell_price')?.value)"
          (click)="$event.stopPropagation()"
          (keydown)="sellPriceKeydown.emit($event)" />
      </span>
      <button type="button" class="dish-remove no-print" (click)="remove.emit()">✕</button>
    } @else {
      <div class="dish-search-wrap" (clickOutside)="clearSearch.emit()">
        <input type="text" class="dish-search-input"
          autocomplete="off"
          [id]="'dish-search-' + sectionIndex() + '-' + itemIndex()"
          [ngModel]="dishSearchQuery()"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="searchQueryChange.emit($event)"
          [placeholder]="'menu_search_dish' | translatePipe"
          (keydown)="dishSearchKeydown.emit($event)" />
        @if (dishSearchQuery().trim()) {
          <app-scrollable-dropdown [maxHeight]="200">
            @for (recipe of getFilteredRecipes(); track recipe._id; let i = $index) {
              <button type="button" class="dropdown-item"
                [class.highlighted]="highlightedIndex() === i"
                (click)="selectRecipe.emit({ recipe })">
                {{ recipe.name_hebrew }}
              </button>
            }
            @if (getFilteredRecipes().length === 0) {
              <span class="dropdown-empty">{{ 'no_recipes_match' | translatePipe }}</span>
            }
          </app-scrollable-dropdown>
        }
      </div>
    }
  </div>
  @if (itemGroup().get('recipe_id_')?.value && isMetaExpanded()) {
    <div class="dish-annotation">
      @for (fieldKey of activeFields(); track fieldKey) {
        <div class="annotation-field"
          [class.annotation-field--editable]="!isDishFieldReadOnly(fieldKey)"
          (click)="!isDishFieldReadOnly(fieldKey) && !isEditingField(fieldKey) && editDishFieldStart.emit(fieldKey)">
          <span class="annotation-label">{{ getDishFieldLabelKey(fieldKey) | translatePipe }}</span>
          @if (isDishFieldReadOnly(fieldKey) || !isEditingField(fieldKey)) {
            <span class="annotation-value">{{ fieldKey === 'food_cost_money' ? getAutoFoodCost() : (itemGroup().get(fieldKey)?.value ?? '') }}</span>
          } @else {
            <input [id]="'dish-' + sectionIndex() + '-' + itemIndex() + '-' + fieldKey"
              type="number" [formControlName]="fieldKey" min="0" step="0.01"
              class="annotation-input" SelectOnFocus
              [style.width]="getInputWidth(itemGroup().get(fieldKey)?.value)"
              (blur)="editDishFieldCommit.emit()"
              (keydown.enter)="editDishFieldCommit.emit()"
              (keydown)="dishFieldKeydown.emit({ fieldKey: fieldKey, event: $event })"
              (click)="$event.stopPropagation()" />
          }
        </div>
      }
      <div class="annotation-field annotation-field--readonly">
        <span class="annotation-label">{{ 'dish_food_cost_per_portion' | translatePipe }}</span>
        <span class="annotation-value">₪{{ getFoodCostPerPortion() }}</span>
      </div>
    </div>
  }
</div>
```

- [ ] **Step 2: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: no errors.

---

### Task 7: Dish row SCSS

**Files:**
- Modify: `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss`

- [ ] **Step 1: Replace entire file**

```scss
:host {
  display: contents;
}

.dish-row {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: stretch;
  min-width: 0;
  border-bottom: 1px dotted #e2d8c6;

  &:last-child {
    border-bottom: none;
  }
}

.dish-name-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 0;
  min-height: 2rem;
  gap: 6px;

  &:hover .dish-remove {
    opacity: 1;
  }
}

.dish-name-wrap {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.dish-name-btn {
  font-family: var(--font-serif);
  font-size: 0.92rem;
  color: #1a1a1a;
  text-align: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.15s;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: #8a7450;
    text-decoration: underline dotted #c8b890;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(138, 116, 80, 0.3);
    border-radius: 2px;
  }
}

.dish-meta-toggle {
  flex-shrink: 0;
  background: transparent;
  border: none;
  padding: 0 2px;
  font-size: 0.6rem;
  color: #c8b890;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;

  &:hover {
    color: #8a7450;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(138, 116, 80, 0.3);
    border-radius: 2px;
  }
}

.dish-sell-price {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 1px;
  direction: ltr;
}

.dish-sell-currency {
  font-family: var(--font-serif);
  font-size: 0.7rem;
  color: #7a6a50;
}

.dish-sell-input {
  width: 4ch;
  padding: 0.125rem 0.25rem;
  font-family: var(--font-serif);
  font-size: 0.78rem;
  color: #7a6a50;
  background: transparent;
  text-align: right;
  border: none;
  border-bottom: 1px solid transparent;
  outline: none;
  -moz-appearance: textfield;
  appearance: none;
  transition: border-color 0.2s;
  direction: ltr;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-bottom-color: #c8b890;
  }
}

.dish-remove {
  flex-shrink: 0;
  background: transparent;
  border: none;
  padding: 2px 4px;
  font-size: 0.75rem;
  color: #d4a0a0;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s, color 0.2s;

  .dish-name-cell:hover & {
    opacity: 1;
  }

  &:hover {
    color: #c05050;
  }
}

/* ---------- Annotation row ---------- */

.dish-annotation {
  display: flex;
  align-items: stretch;
  border-top: 1px dashed #ede5d8;
  margin-bottom: 4px;
}

.annotation-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  border-left: 1px solid #ede5d8;
  cursor: default;

  &:last-child {
    border-left: none;
  }

  &.annotation-field--editable {
    cursor: pointer;

    &:hover {
      background: rgba(200, 184, 144, 0.08);
    }
  }
}

.annotation-label {
  display: block;
  font-family: var(--font-serif);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b0a080;
  margin-bottom: 2px;
  white-space: nowrap;
}

.annotation-value {
  display: block;
  font-family: var(--font-serif);
  font-size: 0.77rem;
  color: #6a5a3a;
  text-align: center;
}

.annotation-input {
  width: 5ch;
  padding: 0;
  font-family: var(--font-serif);
  font-size: 0.77rem;
  color: #6a5a3a;
  background: transparent;
  border: none;
  border-bottom: 1px solid #c8b890;
  outline: none;
  text-align: center;

  &[type='number'] {
    -moz-appearance: textfield;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-bottom-color: #8a7450;
  }
}

/* ---------- Search slot ---------- */

.dish-search-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  text-align: center;

  app-scrollable-dropdown {
    width: 80%;
    margin-inline: auto;
  }
}

.dish-search-input {
  width: 100%;
  padding: 4px 8px;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 0.88rem;
  font-style: italic;
  color: #1a1a1a;
  background: transparent;
  border: none;
  border-bottom: 1px dashed #c8b890;
  outline: none;
  transition: border-bottom-color 0.15s;

  &::placeholder {
    color: #c8b890;
    font-style: italic;
  }

  &:focus {
    border-bottom-color: #8a7450;
    box-shadow: none;
  }
}

/* ---------- Dropdown ---------- */

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: right;
  font-family: var(--font-serif);
  font-size: 0.875rem;
  color: var(--color-text-main);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-glass-hover);
  }

  &.highlighted {
    background: var(--color-primary-soft);
    box-shadow: inset 0 0 0 1px var(--border-focus);
  }
}

.dropdown-empty {
  display: block;
  padding: 8px 12px;
  font-size: 0.8125rem;
  color: var(--color-text-muted-light);
  text-align: center;
}

/* ---------- Mobile ---------- */

@media (max-width: 768px) {
  .dish-meta-toggle {
    color: #8a7450;
  }

  .dish-remove {
    opacity: 1;
    flex-shrink: 0;
  }
}
```

- [ ] **Step 2: Build check**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/foodCo/foodVibe1.0
git add src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html \
  src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss
git commit -m "feat(menu-dish-row): dish-name-wrap, annotation row, bistro search slot"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full production build**

Run: `cd C:/foodCo/foodVibe1.0 && ng build 2>&1 | tail -10`
Expected: `Build at:` timestamp, 0 errors, 0 warnings about missing selectors.

- [ ] **Step 2: Smoke check**

Open the app and navigate to Menu Intelligence. Verify:
1. Background is warm linen (`#edeae2`)
2. Paper card has double border (2px outer, 1px inner), radius 16px/12px
3. Pill row above paper: קניות 🛒, צ׳קליסט 📋, 🖨 הדפסה, 📦 הכל, שמור (dark)
4. Event tag line shows event type chip and serving type chip
5. Menu title is large centered italic input
6. Meta line shows guest count input + date chip
7. `✦` ornamental dividers between sections (with gradient lines)
8. Dish rows: name + ▾ inline, ✕ appears on row hover
9. Clicking ▾ expands annotation row below (4 columns: עלות מזון, מנות, % לקיחה, לפורציה)
10. Financial footnote inside paper above bottom ornament
11. No fixed footer bar visible
12. Shopping list, checklist, print, all buttons trigger their existing logic
