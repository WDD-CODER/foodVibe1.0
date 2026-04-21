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
import { FormsModule } from '@angular/forms'
import { AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { take } from 'rxjs/operators'
import { CdkDragDrop, moveItemInArray, CdkDrag, CdkDropList, CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop'

export interface DraftIngredient {
  id: number
  name: string
  amount: number
  unit: string
  isNew: boolean
}

export interface DraftWorkflowItem {
  id: number
  text: string
  qty: number
  unit: string
}

@Component({
  selector: 'app-ai-draft-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, CustomSelectComponent, CdkDrag, CdkDropList, CdkDragHandle, CdkDragPlaceholder],
  templateUrl: './ai-draft-editor.component.html',
  styleUrl: './ai-draft-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiDraftEditorComponent {
  private readonly unitRegistry = inject(UnitRegistryService)
  private nextId_ = 0
  private newId(): number { return ++this.nextId_ }

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
      this.ingredients_.set(d.ingredients.map(i => ({ ...i, isNew: false, id: this.newId() })))
      this.workflowItems_.set(d.steps.map(s => ({ text: s, qty: 1, unit: 'unit', id: this.newId() })))
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
      { id: this.newId(), name: '', amount: 0, unit: 'gram', isNew: true },
    ])
  }

  protected removeIngredient(index: number): void {
    this.ingredients_.update(list => list.filter((_, i) => i !== index))
  }

  protected onDropIngredient(event: CdkDragDrop<DraftIngredient[]>): void {
    if (event.previousIndex === event.currentIndex) return
    this.ingredients_.update(list => {
      const copy = [...list]
      moveItemInArray(copy, event.previousIndex, event.currentIndex)
      return copy
    })
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
      { id: this.newId(), text: '', qty: 1, unit: 'unit' },
    ])
  }

  protected removeWorkflowItem(index: number): void {
    this.workflowItems_.update(list => list.filter((_, i) => i !== index))
  }

  protected onDropWorkflow(event: CdkDragDrop<DraftWorkflowItem[]>): void {
    if (event.previousIndex === event.currentIndex) return
    this.workflowItems_.update(list => {
      const copy = [...list]
      moveItemInArray(copy, event.previousIndex, event.currentIndex)
      return copy
    })
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
