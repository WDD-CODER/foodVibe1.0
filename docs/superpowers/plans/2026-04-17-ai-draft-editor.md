# AI Draft Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the read-only AI recipe preview card with a fully interactive `AiDraftEditorComponent` that lets users edit all draft fields (name, type, yield, ingredients, workflow steps/prep-refs) before opening in the recipe builder.

**Architecture:** Extract a new `AiDraftEditorComponent` that receives the AI draft as input, owns working-copy signals for all editable fields, and emits the final edited draft on approval. `AiRecipeModalComponent` keeps all generation logic and simply swaps the old static preview for the new editor component.

**Tech Stack:** Angular 17+ signals (`signal`, `computed`, `effect`, `input`, `output`), `CustomSelectComponent`, `UnitRegistryService`, `TranslatePipe`, project Liquid Glass CSS engine classes (`.c-input`, `.c-select`, `.c-btn-primary`, `.c-btn-ghost`).

---

## File Map

| File | Action |
|---|---|
| `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts` | **CREATE** — component class with signals + methods |
| `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.html` | **CREATE** — always-edit form template |
| `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss` | **CREATE** — scoped styles (ingredients table, steps list, type button, scrollbar hidden) |
| `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts` | **MODIFY** — add `onDraftApproved()`, import + declare editor component |
| `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html` | **MODIFY** — swap static preview block for `<app-ai-draft-editor>` |

---

## Task 1 — Create `AiDraftEditorComponent` class

**Files:**
- Create: `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts`

- [ ] **Step 1: Create the component file**

```typescript
// src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { UnitRegistryService } from '@services/unit-registry.service'
import { TranslationService } from '@services/translation.service'
import { FormsModule } from '@angular/forms'
import { AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { take } from 'rxjs/operators'

export interface DraftIngredient {
  name: string
  amount: number
  unit: string
  isNew: boolean
}

export interface DraftWorkflowItem {
  text: string
  qty: number
  unit: string
}

@Component({
  selector: 'app-ai-draft-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './ai-draft-editor.component.html',
  styleUrl: './ai-draft-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiDraftEditorComponent {
  private readonly unitRegistry = inject(UnitRegistryService)
  private readonly translation = inject(TranslationService)

  // ── Inputs / Outputs ──────────────────────────────────────────────
  draft = input.required<AiRecipeDraft>()
  approved = output<AiRecipeDraft>()
  generateAgain = output<void>()

  // ── Working-copy signals ──────────────────────────────────────────
  protected name_ = signal('')
  protected type_ = signal<'dish' | 'preparation'>('preparation')
  protected yieldAmount_ = signal(0)
  protected yieldUnit_ = signal('gram')
  protected ingredients_ = signal<DraftIngredient[]>([])
  protected workflowItems_ = signal<DraftWorkflowItem[]>([])

  // ── Derived ───────────────────────────────────────────────────────
  protected unitOptions_ = computed(() => [
    ...this.unitRegistry.allUnitKeys_().map(k => ({ value: k, label: k })),
    { value: '__add_unit__', label: 'add_new_unit' },
  ])

  protected isDish_ = computed(() => this.type_() === 'dish')

  constructor() {
    // Deep-copy draft into working signals whenever the input changes
    effect(() => {
      const d = this.draft()
      this.name_.set(d.name_hebrew)
      this.type_.set(d.recipe_type)
      this.yieldAmount_.set(d.yield_amount)
      this.yieldUnit_.set(d.yield_unit ?? 'gram')
      this.ingredients_.set(d.ingredients.map(i => ({ ...i, isNew: false })))
      this.workflowItems_.set(d.steps.map(s => ({ text: s, qty: 1, unit: 'unit' })))
    }, { allowSignalWrites: true })
  }

  // ── Type toggle ───────────────────────────────────────────────────
  protected toggleType(): void {
    const next = this.type_() === 'dish' ? 'preparation' : 'dish'
    this.type_.set(next)
    if (next === 'preparation') this.yieldUnit_.set('gram')
  }

  // ── Yield unit ────────────────────────────────────────────────────
  protected onYieldUnitChange(val: string): void {
    if (val === '__add_unit__') {
      this.unitRegistry.openUnitCreator()
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe(newUnit => {
        this.yieldUnit_.set(newUnit)
      })
    } else {
      this.yieldUnit_.set(val)
    }
  }

  // ── Ingredients ───────────────────────────────────────────────────
  protected addIngredient(): void {
    this.ingredients_.update(list => [
      ...list,
      { name: '', amount: 0, unit: 'gram', isNew: true },
    ])
  }

  protected removeIngredient(index: number): void {
    this.ingredients_.update(list => list.filter((_, i) => i !== index))
  }

  protected updateIngredientName(index: number, value: string): void {
    this.ingredients_.update(list =>
      list.map((item, i) => i === index ? { ...item, name: value } : item)
    )
  }

  protected updateIngredientAmount(index: number, value: number): void {
    this.ingredients_.update(list =>
      list.map((item, i) => i === index ? { ...item, amount: value } : item)
    )
  }

  protected onIngredientUnitChange(index: number, val: string): void {
    if (val === '__add_unit__') {
      this.unitRegistry.openUnitCreator()
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe(newUnit => {
        this.ingredients_.update(list =>
          list.map((item, i) => i === index ? { ...item, unit: newUnit } : item)
        )
      })
    } else {
      this.ingredients_.update(list =>
        list.map((item, i) => i === index ? { ...item, unit: val } : item)
      )
    }
  }

  // ── Workflow items ────────────────────────────────────────────────
  protected addWorkflowItem(): void {
    this.workflowItems_.update(list => [
      ...list,
      { text: '', qty: 1, unit: 'unit' },
    ])
  }

  protected removeWorkflowItem(index: number): void {
    this.workflowItems_.update(list => list.filter((_, i) => i !== index))
  }

  protected updateWorkflowText(index: number, value: string): void {
    this.workflowItems_.update(list =>
      list.map((item, i) => i === index ? { ...item, text: value } : item)
    )
  }

  protected updateWorkflowQty(index: number, value: number): void {
    this.workflowItems_.update(list =>
      list.map((item, i) => i === index ? { ...item, qty: value } : item)
    )
  }

  protected onWorkflowUnitChange(index: number, val: string): void {
    if (val === '__add_unit__') {
      this.unitRegistry.openUnitCreator()
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe(newUnit => {
        this.workflowItems_.update(list =>
          list.map((item, i) => i === index ? { ...item, unit: newUnit } : item)
        )
      })
    } else {
      this.workflowItems_.update(list =>
        list.map((item, i) => i === index ? { ...item, unit: val } : item)
      )
    }
  }

  // ── Translate unit key for display ────────────────────────────────
  protected translateUnit(unit: string): string {
    return this.translation.translate(unit)
  }

  // ── Approval / generate again ─────────────────────────────────────
  protected onApprove(): void {
    const draft: AiRecipeDraft = {
      name_hebrew: this.name_(),
      recipe_type: this.type_(),
      yield_amount: this.yieldAmount_(),
      yield_unit: this.isDish_() ? 'dish' : this.yieldUnit_(),
      ingredients: this.ingredients_().map(({ name, amount, unit }) => ({ name, amount, unit })),
      steps: this.workflowItems_().map(w => w.text).filter(t => t.trim().length > 0),
    }
    this.approved.emit(draft)
  }

  protected onGenerateAgain(): void {
    this.generateAgain.emit()
  }
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd C:/foodCo/foodVibe1.0 && npx ng build --configuration development 2>&1 | tail -20
```
Expected: 0 errors (warnings OK). If `unitAdded$` is not found on `UnitRegistryService`, check the service with `grep -n "unitAdded" src/app/core/services/unit-registry.service.ts` and use the correct observable name.

---

## Task 2 — Create the HTML template

**Files:**
- Create: `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.html`

- [ ] **Step 1: Create the template file**

```html
<!-- src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.html -->
<div class="ai-draft-editor" dir="rtl">

  <!-- ── Name + Type ── -->
  <div class="editor-row editor-row--header">
    <input
      class="c-input editor-name-input"
      [value]="name_()"
      (input)="name_.set($any($event.target).value)"
      [placeholder]="(isDish_() ? 'dish_name_placeholder' : 'recipe_name_placeholder') | translatePipe"
    />
    <button
      type="button"
      class="type-toggle-btn"
      [class.type-toggle-btn--dish]="isDish_()"
      (click)="toggleType()"
    >
      {{ (isDish_() ? 'dish' : 'preparation') | translatePipe }}
    </button>
  </div>

  <!-- ── Yield ── -->
  <div class="editor-row editor-row--yield">
    <span class="editor-field-label">{{ (isDish_() ? 'serving_portions' : 'yield') | translatePipe }}:</span>
    <input
      class="c-input editor-num-input"
      type="number"
      [min]="isDish_() ? 1 : 0"
      [value]="yieldAmount_()"
      (input)="yieldAmount_.set(+$any($event.target).value)"
    />
    @if (isDish_()) {
      <span class="editor-locked-unit">{{ 'dish' | translatePipe }}</span>
    } @else {
      <app-custom-select
        class="editor-unit-select"
        [options]="unitOptions_()"
        [ngModel]="yieldUnit_()"
        (ngModelChange)="onYieldUnitChange($event)"
        name="yield_unit"
        [typeToFilter]="true"
        addNewValue="__add_unit__"
        [compact]="true"
      />
    }
  </div>

  <div class="editor-divider"></div>

  <!-- ── Ingredients ── -->
  <div class="editor-section">
    <p class="editor-section-title">{{ 'ai_recipe_preview_ingredients' | translatePipe }}</p>
    <div class="editor-ing-table">
      @for (ing of ingredients_(); track $index; let i = $index) {
        <div class="editor-ing-row" [class.editor-ing-row--new]="ing.isNew">
          <div class="editor-ing-name-cell">
            @if (ing.isNew) {
              <span class="editor-new-badge">{{ 'new' | translatePipe }}</span>
            }
            <input
              class="c-input"
              [value]="ing.name"
              (input)="updateIngredientName(i, $any($event.target).value)"
              [placeholder]="'ingredient_name' | translatePipe"
            />
          </div>
          <input
            class="c-input editor-num-input"
            type="number"
            min="0"
            [value]="ing.amount"
            (input)="updateIngredientAmount(i, +$any($event.target).value)"
          />
          <app-custom-select
            class="editor-unit-select"
            [options]="unitOptions_()"
            [ngModel]="ing.unit"
            (ngModelChange)="onIngredientUnitChange(i, $event)"
            [name]="'ing_unit_' + i"
            [typeToFilter]="true"
            addNewValue="__add_unit__"
            [compact]="true"
          />
          <button type="button" class="editor-del-btn c-icon-btn" (click)="removeIngredient(i)">
            <lucide-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
    <button type="button" class="editor-add-row" (click)="addIngredient()">
      <lucide-icon name="plus" [size]="13" />
      {{ 'add_ingredient' | translatePipe }}
    </button>
  </div>

  <!-- ── Workflow: Preparation steps ── -->
  @if (!isDish_()) {
    <div class="editor-section">
      <p class="editor-section-title">{{ 'ai_recipe_preview_steps' | translatePipe }}</p>
      <div class="editor-steps-list">
        @for (item of workflowItems_(); track $index; let i = $index) {
          <div class="editor-step-row">
            <span class="editor-step-num">{{ i + 1 }}</span>
            <textarea
              class="c-input editor-step-textarea"
              [value]="item.text"
              (input)="updateWorkflowText(i, $any($event.target).value)"
              rows="2"
              [placeholder]="'instruction_placeholder' | translatePipe"
            ></textarea>
            <button type="button" class="editor-del-btn c-icon-btn" (click)="removeWorkflowItem(i)">
              <lucide-icon name="x" [size]="14" />
            </button>
          </div>
        }
      </div>
      <button type="button" class="editor-add-row" (click)="addWorkflowItem()">
        <lucide-icon name="plus" [size]="13" />
        {{ 'add_prep_stage' | translatePipe }}
      </button>
    </div>
  }

  <!-- ── Workflow: Dish prep references ── -->
  @if (isDish_()) {
    <div class="editor-section">
      <p class="editor-section-title">{{ 'preparation' | translatePipe }}</p>
      <div class="editor-prep-table">
        <div class="editor-prep-header">
          <span>{{ 'preparation' | translatePipe }}</span>
          <span>{{ 'quantity' | translatePipe }}</span>
          <span>{{ 'unit' | translatePipe }}</span>
          <span></span>
        </div>
        @for (item of workflowItems_(); track $index; let i = $index) {
          <div class="editor-prep-row">
            <input
              class="c-input"
              [value]="item.text"
              (input)="updateWorkflowText(i, $any($event.target).value)"
              [placeholder]="'preparation' | translatePipe"
            />
            <input
              class="c-input editor-num-input"
              type="number"
              min="0"
              [value]="item.qty"
              (input)="updateWorkflowQty(i, +$any($event.target).value)"
            />
            <app-custom-select
              class="editor-unit-select"
              [options]="unitOptions_()"
              [ngModel]="item.unit"
              (ngModelChange)="onWorkflowUnitChange(i, $event)"
              [name]="'wf_unit_' + i"
              [typeToFilter]="true"
              addNewValue="__add_unit__"
              [compact]="true"
            />
            <button type="button" class="editor-del-btn c-icon-btn" (click)="removeWorkflowItem(i)">
              <lucide-icon name="x" [size]="14" />
            </button>
          </div>
        }
      </div>
      <button type="button" class="editor-add-row" (click)="addWorkflowItem()">
        <lucide-icon name="plus" [size]="13" />
        {{ 'add_preparation' | translatePipe }}
      </button>
      <div class="editor-prep-hint">
        <lucide-icon name="info" [size]="13" />
        {{ 'ai_recipe_dish_preps_unlinked_hint' | translatePipe }}
      </div>
    </div>
  }

  <!-- ── Footer ── -->
  <div class="editor-footer">
    <button type="button" class="c-btn-ghost" (click)="onGenerateAgain()">
      <lucide-icon name="rotate-ccw" [size]="14" />
      {{ 'ai_recipe_generate_again' | translatePipe }}
    </button>
    <button type="button" class="c-btn-primary" (click)="onApprove()">
      <lucide-icon name="arrow-left" [size]="14" />
      {{ 'ai_recipe_open_builder' | translatePipe }}
    </button>
  </div>

</div>
```

- [ ] **Step 2: Verify build**

```bash
cd C:/foodCo/foodVibe1.0 && npx ng build --configuration development 2>&1 | tail -20
```
Expected: 0 errors.

---

## Task 3 — Create the SCSS

**Files:**
- Create: `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss`

- [ ] **Step 1: Create the stylesheet**

```scss
// src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss

.ai-draft-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

// ── Layout helpers ─────────────────────────────────────────────────

.editor-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.editor-row--header {
  gap: 0.5rem;
}

.editor-row--yield {
  gap: 0.5rem;
  flex-wrap: wrap;
}

.editor-field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.editor-name-input {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
}

.editor-num-input {
  width: 62px;
  text-align: center;
}

.editor-unit-select {
  min-width: 80px;
}

.editor-locked-unit {
  padding: 0.45rem 0.75rem;
  background: var(--bg-muted);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-style: italic;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  pointer-events: none;
  white-space: nowrap;
}

.editor-divider {
  height: 1px;
  background: var(--border-default);
}

// ── Type toggle ────────────────────────────────────────────────────

.type-toggle-btn {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-glass);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  backdrop-filter: var(--blur-glass);

  &--dish {
    background: rgba(14, 165, 233, 0.1);
    border-color: rgba(14, 165, 233, 0.4);
    color: #0284c7;
  }

  &:not(.type-toggle-btn--dish) {
    background: var(--color-primary-soft);
    border-color: var(--color-primary-glow);
    color: var(--color-primary);
  }
}

// ── Section ────────────────────────────────────────────────────────

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.editor-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

// ── Ingredient table ───────────────────────────────────────────────

.editor-ing-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-subtle);
}

.editor-ing-row {
  display: grid;
  grid-template-columns: 1fr 62px minmax(72px, auto) 28px;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--border-row);
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-primary-soft);
  }

  &--new {
    background: var(--bg-warning-soft) !important;

    .c-input {
      border-color: var(--border-warning);
    }
  }

  .c-input, app-custom-select {
    font-size: 0.8125rem;
  }
}

.editor-ing-name-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;

  .c-input {
    flex: 1;
    min-width: 0;
  }
}

.editor-new-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  background: var(--bg-warning-strong);
  border: 1px solid var(--border-warning);
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-warning);
  white-space: nowrap;
  flex-shrink: 0;
}

// ── Delete button ──────────────────────────────────────────────────

.editor-del-btn {
  width: 1.6rem;
  height: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: 50%;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: var(--color-text-on-primary);
  }
}

// ── Add row ────────────────────────────────────────────────────────

.editor-add-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  transition: background 0.15s;

  &:hover {
    background: var(--color-primary-soft);
  }
}

// ── Steps (preparation workflow) ───────────────────────────────────

.editor-steps-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.editor-step-row {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
}

.editor-step-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-primary);
  min-width: 1.1rem;
  padding-top: 0.5rem;
  text-align: center;
  flex-shrink: 0;
}

.editor-step-textarea {
  flex: 1;
  resize: none;
  line-height: 1.5;
  font-size: 0.8125rem;
  min-height: 2.5rem;
}

// ── Prep references (dish workflow) ───────────────────────────────

.editor-prep-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-subtle);
}

.editor-prep-header {
  display: grid;
  grid-template-columns: 1fr 62px minmax(72px, auto) 28px;
  gap: 0.35rem;
  padding: 0.3rem 0.5rem;
  background: rgba(14, 165, 233, 0.06);
  border-bottom: 1px solid var(--border-default);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.editor-prep-row {
  display: grid;
  grid-template-columns: 1fr 62px minmax(72px, auto) 28px;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--border-row);
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(14, 165, 233, 0.04);
  }

  .c-input, app-custom-select {
    font-size: 0.8125rem;
  }
}

.editor-prep-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 0.5rem 0.625rem;
  background: rgba(14, 165, 233, 0.06);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: #0369a1;
  line-height: 1.5;

  lucide-icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
}

// ── Footer ─────────────────────────────────────────────────────────

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:/foodCo/foodVibe1.0 && npx ng build --configuration development 2>&1 | tail -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/foodCo/foodVibe1.0
git add src/app/shared/ai-recipe-modal/ai-draft-editor/
git commit -m "feat(ai-draft-editor): scaffold AiDraftEditorComponent with signals, template, and styles"
```

---

## Task 4 — Add i18n translation key

**Files:**
- Modify: `public/assets/data/dictionary.json`

- [ ] **Step 1: Add missing translation key**

Open `public/assets/data/dictionary.json` and add the new key for the dish prep-refs hint. Find the `"ai_recipe_open_builder"` entry and add the new key next to it:

```json
"ai_recipe_dish_preps_unlinked_hint": "שמות ההכנות יוצגו כלא מקושרות בבונה עד שתקשר אותן להכנות קיימות"
```

- [ ] **Step 2: Verify build**

```bash
cd C:/foodCo/foodVibe1.0 && npx ng build --configuration development 2>&1 | tail -20
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd C:/foodCo/foodVibe1.0
git add public/assets/data/dictionary.json
git commit -m "feat(i18n): add ai_recipe_dish_preps_unlinked_hint translation key"
```

---

## Task 5 — Wire editor into `AiRecipeModalComponent`

**Files:**
- Modify: `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts`
- Modify: `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html`

- [ ] **Step 1: Update the component class**

In `ai-recipe-modal.component.ts`:

1. Add the import at the top (after existing imports):
```typescript
import { AiDraftEditorComponent } from './ai-draft-editor/ai-draft-editor.component'
```

2. Add `AiDraftEditorComponent` to the `imports` array in `@Component`:
```typescript
imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent, AiDraftEditorComponent],
```

3. Replace `onOpenInBuilder()` with `onDraftApproved()`:
```typescript
onDraftApproved(draft: AiRecipeDraft): void {
  this.shots.saveShot(this.prompt_(), draft, 'approved', this.inputMode_()).subscribe()
  this.aiDraft.set(draft)
  void this.router.navigate(['/recipe-builder'])
  this.resetLocalState_()
  this.modalService.close()
}
```

4. Keep `onGenerateAgain()` as-is — it already handles resetting `draft_` and shot saving.

- [ ] **Step 2: Update the template**

In `ai-recipe-modal.component.html`, replace the entire `} @else { <!-- Create preview card -->` block (lines 240–291, the `<div class="ai-draft-preview">` and its footer) with:

```html
} @else {
  <!-- Create preview — interactive editor -->
  <app-ai-draft-editor
    [draft]="draft_()!"
    (approved)="onDraftApproved($event)"
    (generateAgain)="onGenerateAgain()"
  />
}
```

The `@else` is already there — you are replacing the block that starts at `<!-- Create preview card -->` and ends before `</div>` of the modal card.

- [ ] **Step 3: Verify build**

```bash
cd C:/foodCo/foodVibe1.0 && npx ng build --configuration development 2>&1 | tail -20
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd C:/foodCo/foodVibe1.0
git add src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
git add src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
git commit -m "feat(ai-recipe-modal): replace read-only preview with AiDraftEditorComponent"
```

---

## Task 6 — Smoke test

- [ ] **Step 1: Start dev server**

```bash
cd C:/foodCo/foodVibe1.0 && npm run dev:local
```

- [ ] **Step 2: Test — create mode, preparation type**

1. Open the app, navigate to Recipe Book
2. Click the AI FAB → enter a prompt → Generate
3. Verify preview shows as editable form (not read-only)
4. Change the recipe name — verify it reflects
5. Change yield amount + unit — verify
6. Edit an ingredient amount — verify
7. Change an ingredient unit — select from dropdown, verify
8. Select "+ חדש" on a unit — verify `UnitCreator` panel opens
9. Edit a step textarea — verify
10. Click "+ הוסף שלב" — verify new row appears
11. Click × on a step — verify it's removed
12. Click "+ הוסף מרכיב" — verify new row with yellow "חדש" badge
13. Click × on any row — verify removal
14. Click "פתח בבונה" — verify navigation to `/recipe-builder` with form pre-filled

- [ ] **Step 3: Test — switch to dish type**

1. Generate a recipe in AI modal
2. Click the type toggle button — verify it switches to "מנה"
3. Verify yield row shows "מנות" locked unit (no dropdown)
4. Verify workflow section shows prep-reference table (not step textareas)
5. Verify hint callout appears below the prep table
6. Click "פתח בבונה" — verify navigation and form pre-filled correctly

- [ ] **Step 4: Test — "Generate Again" flow**

1. Generate a recipe → editor shows
2. Click "↺ צור מחדש" — verify editor hides and prompt panel returns

- [ ] **Step 5: Final build check**

```bash
cd C:/foodCo/foodVibe1.0 && npx ng build --configuration development 2>&1 | tail -5
```
Expected: `Build at: ... - Hash: ... - Time: ...ms` with 0 errors.


> **Confirmed:** `UnitRegistryService` exposes `public readonly unitAdded$ = new Subject<string>()` at line 44 — the name used in the plan is correct.
