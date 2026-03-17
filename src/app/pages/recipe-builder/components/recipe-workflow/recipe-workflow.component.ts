import { Component, input, output, inject, signal, computed, effect, ViewChildren, QueryList, ElementRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { UnitRegistryService } from '@services/unit-registry.service'
import { PreparationRegistryService } from '@services/preparation-registry.service'
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service'
import { GlobalSpecificModalService } from '@services/global-specific-modal.service'
import { PreparationSearchComponent } from '../preparation-search/preparation-search.component'
import type { PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TextareaAutoGrowDirective } from '@directives/textarea-auto-grow.directive'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util'
import { take } from 'rxjs/operators'
import { CdkDragDrop, moveItemInArray, CdkDrag, CdkDropList, CdkDragHandle } from '@angular/cdk/drag-drop'

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
    TextareaAutoGrowDirective,
    CustomSelectComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle
  ],
  templateUrl: './recipe-workflow.component.html',
  styleUrl: './recipe-workflow.component.scss'
})
export class RecipeWorkflowComponent {
  private fb = inject(FormBuilder)
  private readonly unitRegistry_ = inject(UnitRegistryService)
  private readonly prepRegistry_ = inject(PreparationRegistryService)
  private readonly translationKeyModal_ = inject(TranslationKeyModalService)
  private readonly globalSpecificModal_ = inject(GlobalSpecificModalService)

  workflowFormArray = input.required<FormArray>()
  type = input.required<'preparation' | 'dish'>()
  resetTrigger = input<number>(0)

  /** When set, focus the instruction textarea (prep) or prep search (dish) at this row index; parent clears after focus. */
  focusRowAt = input<number | null>(null)

  addItem = output<string | void>()
  removeItem = output<number>()
  focusRowDone = output<void>()

  showAddCategoryPicker_ = signal(false);

  toggleAddCategoryPicker() {
    this.showAddCategoryPicker_.update(v => !v);
  }

  onAddWithCategory(category: string) {
    this.showAddCategoryPicker_.set(false);
    this.addItem.emit(category);
  }

  @ViewChildren('instructionField') instructionFields!: QueryList<ElementRef<HTMLTextAreaElement>>
  @ViewChildren('laborTimeInput') laborTimeInputs!: QueryList<ElementRef<HTMLInputElement>>

  editingLaborTimeIndex_ = signal<number | null>(null)
  /** When set, show preparation-search for this row with current name as initialQuery (click display to edit). */
  editingPreparationNameAtRow_ = signal<number | null>(null)

  constructor() {
    effect(() => {
      const idx = this.focusRowAt()
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

  onDropStep(event: CdkDragDrop<FormGroup[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const formArray = this.workflowFormArray();
    const item = formArray.at(event.previousIndex);
    formArray.removeAt(event.previousIndex);
    formArray.insert(event.currentIndex, item);
    if (this.type() === 'preparation') {
      formArray.controls.forEach((group, i) => {
        group.get('order')?.setValue(i + 1);
      });
    }
  }

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
    const opts = this.getAllUnitKeys().map((u) => ({ value: u, label: u }));
    return [...opts, { value: '__add_unit__', label: '+ יחידה חדשה' }];
  }

  onUnitChange(group: FormGroup, val: string): void {
    if (val === '__add_unit__') {
      group.get('unit')?.setValue('');
      this.unitRegistry_.openUnitCreator();
      this.unitRegistry_.unitAdded$.pipe(take(1)).subscribe(newUnit => {
        group.get('unit')?.setValue(newUnit);
      });
    } else {
      group.get('unit')?.setValue(val);
    }
  }

  getPreparationCategories(): string[] {
    return this.prepRegistry_.preparationCategories_()
  }

  incrementQuantity(group: FormGroup, index: number): void {
    const ctrl = group.get('quantity')
    const current = ctrl?.value ?? 0
    ctrl?.setValue(quantityIncrement(current, 0))
  }

  decrementQuantity(group: FormGroup, index: number): void {
    const ctrl = group.get('quantity')
    const current = ctrl?.value ?? 0
    ctrl?.setValue(quantityDecrement(current, 0))
  }

  incrementLaborTime(group: FormGroup): void {
    const ctrl = group.get('labor_time')
    const current = ctrl?.value ?? 0
    ctrl?.setValue(quantityIncrement(current, 0, { integerOnly: true }))
  }

  decrementLaborTime(group: FormGroup): void {
    const ctrl = group.get('labor_time')
    const current = ctrl?.value ?? 0
    ctrl?.setValue(quantityDecrement(current, 0, { integerOnly: true }))
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
    this.editingPreparationNameAtRow_.set(null)
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
      const result = await this.translationKeyModal_.open('', 'category')
      if (!isTranslationKeyResult(result) || !result.englishKey?.trim() || !result.hebrewLabel?.trim()) {
        group.patchValue({ category_name: '' })
        return
      }
      await this.prepRegistry_.registerCategory(result.englishKey, result.hebrewLabel)
      group.patchValue({ category_name: result.englishKey })
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
