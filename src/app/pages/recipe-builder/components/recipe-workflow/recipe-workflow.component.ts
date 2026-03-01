import { Component, input, output, inject, signal, computed, effect, ViewChildren, QueryList, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { UnitRegistryService } from '@services/unit-registry.service'
import { PreparationRegistryService } from '@services/preparation-registry.service'
import { GlobalSpecificModalService } from '@services/global-specific-modal.service'
import { PreparationSearchComponent } from '../preparation-search/preparation-search.component'
import type { PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'

@Component({
  selector: 'app-recipe-workflow',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    PreparationSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective,
    CustomSelectComponent
  ],
  templateUrl: './recipe-workflow.component.html',
  styleUrl: './recipe-workflow.component.scss'
})
export class RecipeWorkflowComponent implements OnChanges {
  private fb = inject(FormBuilder)
  private readonly unitRegistry_ = inject(UnitRegistryService)
  private readonly prepRegistry_ = inject(PreparationRegistryService)
  private readonly globalSpecificModal_ = inject(GlobalSpecificModalService)

  workflowFormArray = input.required<FormArray>()
  type = input.required<'preparation' | 'dish'>()
  resetTrigger = input<number>(0)

  /** When set, focus the instruction textarea (prep) or prep search (dish) at this row index; parent clears after focus. */
  @Input() focusRowAt: number | null = null
  protected focusRowAt_ = signal<number | null>(null)

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['focusRowAt']) {
      this.focusRowAt_.set(this.focusRowAt ?? null)
    }
  }

  addItem = output<void>()
  removeItem = output<number>()
  sortByCategory = output<void>()
  focusRowDone = output<void>()

  @ViewChildren('instructionField') instructionFields!: QueryList<ElementRef<HTMLTextAreaElement>>
  @ViewChildren('laborTimeInput') laborTimeInputs!: QueryList<ElementRef<HTMLInputElement>>

  editingLaborTimeIndex_ = signal<number | null>(null)

  constructor() {
    effect(() => {
      const idx = this.focusRowAt_()
      if (idx === null || idx === undefined) return
      if (this.type() !== 'preparation') return
      setTimeout(() => {
        const el = this.instructionFields?.get(idx)?.nativeElement
        if (el) {
          el.focus()
          this.focusRowDone.emit()
        }
      }, 0)
    })
  }

  protected workflowGroups_ = computed(() => {
    this.resetTrigger();
    return this.workflowFormArray().controls as FormGroup[];
  })

  getAllUnitKeys(): string[] {
    return this.unitRegistry_.allUnitKeys_()
  }

  protected categoryOptionsForGroup(): { value: string; label: string }[] {
    const cats = this.getPreparationCategories()
    return [
      { value: '', label: 'choose_category' },
      ...cats.map((c) => ({ value: c, label: c })),
      { value: '__add_new__', label: 'add_preparation_category' },
    ]
  }

  protected unitOptionsForWorkflow(): { value: string; label: string }[] {
    return this.getAllUnitKeys().map((u) => ({ value: u, label: u }))
  }

  getPreparationCategories(): string[] {
    return this.prepRegistry_.preparationCategories_()
  }

  incrementQuantity(group: FormGroup, index: number): void {
    const ctrl = group.get('quantity')
    const val = (ctrl?.value ?? 0) + 1
    ctrl?.setValue(val)
  }

  decrementQuantity(group: FormGroup, index: number): void {
    const ctrl = group.get('quantity')
    const val = Math.max(0, (ctrl?.value ?? 0) - 1)
    ctrl?.setValue(val)
  }

  incrementLaborTime(group: FormGroup): void {
    const ctrl = group.get('labor_time')
    ctrl?.setValue((ctrl?.value ?? 0) + 1)
  }

  decrementLaborTime(group: FormGroup): void {
    const ctrl = group.get('labor_time')
    ctrl?.setValue(Math.max(0, (ctrl?.value ?? 0) - 1))
  }

  enterLaborTimeEdit(index: number): void {
    this.editingLaborTimeIndex_.set(index)
    setTimeout(() => this.laborTimeInputs?.get(0)?.nativeElement?.focus(), 0)
  }

  onLaborTimeKeydown(event: Event, group: FormGroup): void {
    const e = event as KeyboardEvent
    const val = (group.get('labor_time')?.value ?? 0) as number
    if (e.key === 'ArrowDown' && val <= 0) {
      e.preventDefault()
    }
  }

  exitLaborTimeEdit(group: FormGroup): void {
    const ctrl = group.get('labor_time')
    const raw = ctrl?.value
    const parsed = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
    const sanitized = !isNaN(parsed) && parsed >= 0 ? parsed : 0
    ctrl?.setValue(sanitized)
    this.editingLaborTimeIndex_.set(null)
  }

  onPreparationSelected(entry: PreparationEntry, group: FormGroup): void {
    group.patchValue({
      preparation_name: entry.name,
      category_name: entry.category,
      main_category_name: entry.category
    })
  }

  clearPreparation(group: FormGroup): void {
    group.patchValue({
      preparation_name: '',
      category_name: '',
      main_category_name: ''
    })
  }

  async onCategoryChange(group: FormGroup, value: string): Promise<void> {
    if (value === '__add_new__') {
      const hebrewLabel = prompt('Enter category name (Hebrew):')
      if (!hebrewLabel?.trim()) {
        group.patchValue({ category_name: '' })
        return
      }
      const englishKey = prompt(
        'Enter English value for this category (e.g., vegetables, cuts):',
        hebrewLabel.toLowerCase().replace(/\s+/g, '_')
      )
      if (!englishKey?.trim()) {
        group.patchValue({ category_name: '' })
        return
      }
      const key = englishKey.trim().toLowerCase().replace(/\s+/g, '_')
      await this.prepRegistry_.registerCategory(key, hebrewLabel)
      group.patchValue({ category_name: key })
      return
    }

    const preparationName = (group.get('preparation_name')?.value ?? '') as string
    const mainCategory = (group.get('main_category_name')?.value ?? '') as string

    if (!preparationName || !mainCategory) {
      group.patchValue({ category_name: value })
      return
    }
    if (value === mainCategory) {
      group.patchValue({ category_name: value })
      return
    }

    const choice = await this.globalSpecificModal_.open({
      preparationName,
      mainCategory,
      newCategory: value
    })

    if (choice === 'global') {
      const onRevert = () =>
        group.patchValue({ category_name: mainCategory, main_category_name: mainCategory })
      await this.prepRegistry_.updatePreparationCategory(preparationName, mainCategory, value, {
        onRevert
      })
      group.patchValue({ category_name: value, main_category_name: value })
    } else if (choice === 'specific') {
      group.patchValue({ category_name: value })
    } else {
      group.patchValue({ category_name: mainCategory })
    }
  }

  onInstructionEnter(event: Event): void {
    event.preventDefault()
    this.addItem.emit()
  }
}
