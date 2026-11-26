import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TranslationService } from '@services/translation.service'
import { formatMoney, roundMoney } from '../../../../core/engine/rounding'

export type PairSide = 'plan' | 'actual'

interface SideView {
  key: PairSide
  value: number | null
  open: boolean
  chipText: string
  chipLabel: string
  boxLabel: string
  placeholder: string
  /** Set on an empty actual box whose forecast is shown faded (the placeholder is never a value). */
  hint: string | null
}

const SIDE_KEY: Record<PairSide, string> = { plan: 'mp_chip_plan', actual: 'mp_actual' }

/**
 * Plan 749: one forecast / actual pair of the monthly plan. Each side starts closed as a small chip (teal when
 * filled); a press opens its short number box, a second press or Escape closes it. Controlled: the page owns the
 * values; only the open state lives here.
 */
@Component({
  selector: 'app-month-pair',
  standalone: true,
  imports: [FormsModule, NumberBoxDirective, SelectOnFocusDirective],
  templateUrl: './month-pair.component.html',
  styleUrl: './month-pair.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthPairComponent {
  // 1. INJECTED
  private readonly translation_ = inject(TranslationService)
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly changes_ = inject(ChangeDetectorRef)

  // 2. INPUTS
  /** The row's name, for the screen-reader labels: a dictionary key, or an own line's name. */
  readonly labelKey = input.required<string>()
  readonly plan = input<number | null>(null)
  readonly actual = input<number | null>(null)
  readonly sides = input<'both' | 'actual'>('both')
  readonly disabled = input(false)
  readonly idPrefix = input.required<string>()

  // 3. OUTPUTS
  readonly planChange = output<number | null>()
  readonly actualChange = output<number | null>()
  readonly boxLeave = output<PairSide>()

  // 4. SIGNALS & CONSTANTS
  private readonly openSides_ = signal<Record<PairSide, boolean>>({ plan: false, actual: false })

  // 5. COMPUTED
  protected readonly rowName_ = computed(() => this.translation_.translate(this.labelKey()))
  protected readonly views_ = computed<SideView[]>(() => {
    const keys: PairSide[] = this.sides() === 'both' ? ['plan', 'actual'] : ['actual']
    return keys.map((key) => this.view_(key))
  })

  // 6. METHODS
  protected toggle(side: PairSide): void {
    if (this.disabled()) return
    const open = !this.openSides_()[side]
    this.openSides_.update((s) => ({ ...s, [side]: open }))
    if (!open) return
    // Render now so the focus stays inside the press (a phone opens its keyboard only then).
    this.changes_.detectChanges()
    this.host_.nativeElement.querySelector<HTMLInputElement>(`#${CSS.escape(`${this.idPrefix()}-${side}`)}`)?.focus()
  }

  protected close(side: PairSide, chip: HTMLButtonElement, event: Event): void {
    event.preventDefault()
    // Moving the focus first lets the box report that it was left.
    chip.focus()
    this.openSides_.update((s) => ({ ...s, [side]: false }))
  }

  protected setValue(side: PairSide, value: number | string | null): void {
    if (this.disabled()) return
    const n = value === null || value === '' ? null : Number(value)
    const next = n === null || !Number.isFinite(n) ? null : n
    if (side === 'plan') this.planChange.emit(next)
    else this.actualChange.emit(next)
  }

  private view_(key: PairSide): SideView {
    const value = key === 'plan' ? this.plan() : this.actual()
    const open = this.openSides_()[key] && !this.disabled()
    const sideName = this.translation_.translate(SIDE_KEY[key])
    const amount = value === null ? null : formatMoney(value)
    // The open chip is the small close control; its amount is in the box beside it.
    const chipText = open || amount === null ? sideName : `${sideName} · ${amount}`
    const forecast = key === 'actual' && this.sides() === 'both' && value === null ? this.plan() : null
    return {
      key,
      value,
      open,
      chipText,
      chipLabel: [this.rowName_(), sideName, amount].filter((part) => part !== null).join(' · '),
      boxLabel: `${this.rowName_()} · ${sideName}`,
      placeholder:
        forecast === null
          ? this.translation_.translate('mp_not_entered')
          : roundMoney(forecast).toLocaleString('en-US', { maximumFractionDigits: 2 }),
      hint: forecast === null ? null : this.translation_.translate('mp_from_forecast_hint')
    }
  }
}
