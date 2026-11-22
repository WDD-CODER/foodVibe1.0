import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { Directionality } from '@angular/cdk/bidi'
import { canStep, footprintFor, MAX_TABLES, type StepArrow } from 'src/app/shared/floor-map/floor-geometry.util'
import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import { MAX_SEATS, NUMBER_MAX_LENGTH, numberError, type TablePatch } from '../../floor-plan-edit.util'

/** Plan 684: the panel for the selected table. Inputs in, events out: every rule lives in `floor-plan-edit.util`. */
@Component({
  selector: 'app-floor-table-panel',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    FormFieldComponent,
    CounterComponent,
    CustomSelectComponent
  ],
  templateUrl: './table-panel.component.html',
  styleUrl: './table-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TablePanelComponent {
  private readonly translation = inject(TranslationService)
  private readonly directionality = inject(Directionality)
  private readonly numberInput = viewChild<ElementRef<HTMLInputElement>>('numberInput')

  readonly table = input.required<FloorTable>()
  readonly plan = input.required<FloorPlanBody>()
  /** True right after a duplicate: the number field takes the focus. */
  readonly focusNumber = input(false)

  readonly tableChange = output<TablePatch>()
  readonly duplicate = output<void>()
  readonly remove = output<void>()
  readonly closed = output<void>()
  /** Plan 666: one cell in the direction the arrow points on the screen. */
  readonly move = output<StepArrow>()

  protected readonly arrows = [
    { arrow: 'up', icon: 'arrow-up', labelKey: 'fp_move_up' },
    { arrow: 'down', icon: 'arrow-down', labelKey: 'fp_move_down' },
    { arrow: 'right', icon: 'arrow-right', labelKey: 'fp_move_right' },
    { arrow: 'left', icon: 'arrow-left', labelKey: 'fp_move_left' }
  ] as const

  protected readonly maxSeatsLimit = MAX_SEATS
  protected readonly numberMax = NUMBER_MAX_LENGTH
  protected readonly shapes = [
    { value: 'round', labelKey: 'fp_shape_round' },
    { value: 'square', labelKey: 'fp_shape_square' },
    { value: 'rect', labelKey: 'fp_shape_rect' }
  ] as const

  /** What the owner typed in the number field, and for which table; null = nothing typed yet. */
  private readonly typed_ = signal<{ key: string; text: string } | null>(null)

  protected readonly title_ = computed(() =>
    this.translation.translate('fp_panel_title').replace('{number}', this.table().number)
  )
  protected readonly numberError_ = computed(() => {
    const typed = this.typed_()
    const table = this.table()
    return typed && typed.key === table.key ? numberError(this.plan(), table.key, typed.text) : null
  })
  protected readonly areaOptions_ = computed(() =>
    [...this.plan().areas].sort((a, b) => a.order - b.order).map((a) => ({ value: a.key, label: a.name }))
  )
  protected readonly atLimit_ = computed(() => this.plan().tables.length >= MAX_TABLES)

  constructor() {
    effect(() => {
      this.table().key
      if (this.focusNumber()) {
        queueMicrotask(() => this.numberInput()?.nativeElement.focus())
      }
    })
  }

  protected canMove(arrow: StepArrow): boolean {
    const table = this.table()
    return canStep(
      { x: table.x, y: table.y },
      footprintFor(table),
      arrow,
      this.directionality.value === 'ltr' ? 'ltr' : 'rtl',
      this.plan().grid
    )
  }

  protected onNumberInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value
    const table = this.table()
    this.typed_.set({ key: table.key, text })
    if (numberError(this.plan(), table.key, text) === null) this.tableChange.emit({ number: text.trim() })
  }

  protected onNumberBlur(event: Event): void {
    // A wrong value is only shown while typing; on leaving, the field shows the number the draft keeps.
    if (this.numberError_()) {
      ;(event.target as HTMLInputElement).value = this.table().number
      this.typed_.set(null)
    }
  }

  protected setShape(shape: FloorTable['shape']): void {
    if (shape !== this.table().shape) this.tableChange.emit({ shape })
  }

  protected setFlag(field: 'turned' | 'active' | 'online', event: Event): void {
    this.tableChange.emit({ [field]: (event.target as HTMLInputElement).checked })
  }
}
