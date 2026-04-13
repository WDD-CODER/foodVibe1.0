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
import { CounterComponent } from 'src/app/shared/counter/counter.component'

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
    CdkDragHandle,
    CounterComponent
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

  /** Tracks which prep-step rows have the timer counter open. */
  timerOpenRows_ = signal<Set<number>>(new Set());

  isTimerOpen(index: number): boolean {
    return this.timerOpenRows_().has(index);
  }

  toggleTimer(index: number): void {
    this.timerOpenRows_.update(set => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }


  /** Tracks which prep-step rows have the cook-time counter open. */
  cookTimeOpenRows_ = signal<Set<number>>(new Set());

  isCookTimeOpen(index: number): boolean {
    return this.cookTimeOpenRows_().has(index);
  }

  toggleCookTime(index: number): void {
    this.cookTimeOpenRows_.update(set => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  toggleAddCategoryPicker() {
    this.showAddCategoryPicker_.update(v => !v);
  }

  onAddWithCategory(category: string) {
    this.showAddCategoryPicker_.set(false);
    this.addItem.emit(category);
  }

  @ViewChildren('instructionField') instructionFields!: QueryList<ElementRef<HTMLTextAreaElement>>
  @ViewChildren('laborTimeInput') laborTimeInputs!: QueryList<ElementRef<HTMLInputElement>>
  @ViewChildren('cookTimeInput') cookTimeInputs!: QueryList<ElementRef<HTMLInputElement>>

  editingLaborTimeIndex_ = signal<number | null>(null)
  editingCookTimeIndex_ = signal<number | null>(null)
  laborTimeEditStr_ = signal<string>('')
  cookTimeEditStr_ = signal<string>('')
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

  onPrepQtyChange(group: FormGroup, value: number): void {
    group.get('quantity')?.setValue(value)
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

  formatMinutesToClock(m: number): string {
    const h = Math.floor(m / 60)
    const min = m % 60
    return `${h}:${min.toString().padStart(2, '0')}`
  }

  parseClockToMinutes(str: string): number {
    const s = str.trim()
    if (!s) return 0
    const parts = s.split(':')
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10) || 0
      const m = parseInt(parts[1], 10) || 0
      return h * 60 + m
    }
    const n = parseInt(s, 10)
    return isNaN(n) || n < 0 ? 0 : n
  }

  /** Format total seconds to hh:mm:ss display string. */
  formatSecsToHms(totalSecs: number): string {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  /** Parse hh:mm:ss or mm:ss or raw-seconds string to total seconds. */
  parseHmsToSecs(str: string): number {
    const raw = str.trim()
    if (!raw) return 0
    const parts = raw.split(':')
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10) || 0
      const m = parseInt(parts[1], 10) || 0
      const s = parseInt(parts[2], 10) || 0
      return h * 3600 + m * 60 + s
    }
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10) || 0
      const s = parseInt(parts[1], 10) || 0
      return m * 60 + s
    }
    const n = parseInt(raw, 10)
    return isNaN(n) || n < 0 ? 0 : n
  }

  enterLaborTimeEdit(index: number, currentMinutes: number): void {
    this.laborTimeEditStr_.set(this.formatMinutesToClock(currentMinutes))
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
    const minutes = this.parseClockToMinutes(this.laborTimeEditStr_())
    group.get('labor_time')?.setValue(minutes)
    this.laborTimeEditStr_.set('')
    this.editingLaborTimeIndex_.set(null)
  }


  incrementCookTime(group: FormGroup): void {
    const ctrl = group.get('cooking_time')
    ctrl?.setValue((ctrl?.value ?? 0) + 30)
  }

  decrementCookTime(group: FormGroup): void {
    const ctrl = group.get('cooking_time')
    ctrl?.setValue(Math.max(0, (ctrl?.value ?? 0) - 30))
  }

  enterCookTimeEdit(index: number, currentSecs: number): void {
    this.cookTimeEditStr_.set(this.formatSecsToHms(currentSecs))
    this.editingCookTimeIndex_.set(index)
    setTimeout(() => this.cookTimeInputs?.get(0)?.nativeElement?.focus(), 0)
  }

  onCookTimeKeydown(event: Event, group: FormGroup): void {
    const e = event as KeyboardEvent
    const val = (group.get('cooking_time')?.value ?? 0) as number
    if (e.key === 'ArrowDown' && val <= 0) {
      e.preventDefault()
    }
  }

  exitCookTimeEdit(group: FormGroup): void {
    const secs = this.parseHmsToSecs(this.cookTimeEditStr_())
    group.get('cooking_time')?.setValue(secs)
    this.cookTimeEditStr_.set('')
    this.editingCookTimeIndex_.set(null)
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
