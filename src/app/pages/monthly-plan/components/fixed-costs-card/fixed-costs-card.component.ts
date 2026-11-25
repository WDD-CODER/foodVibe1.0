import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { FIXED_LINES_MAX, type FixedGroup, type FixedLine } from '@schemas/month/month-rules'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { fixedInputOf } from '../../../../core/engine/month-plan'
import { formatMoney } from '../../../../core/engine/rounding'

type Side = 'plan' | 'actual'

/** Plan 729: fixed costs as lines (starter + own) or as one rough total. Controlled: the page owns the group. */
@Component({
  selector: 'app-fixed-costs-card',
  standalone: true,
  imports: [FormsModule, NumberBoxDirective, TranslatePipe],
  templateUrl: './fixed-costs-card.component.html',
  styleUrl: './fixed-costs-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FixedCostsCardComponent {
  private readonly confirm_ = inject(ConfirmModalService)
  private readonly translation_ = inject(TranslationService)

  readonly group = input.required<FixedGroup>()
  readonly disabled = input(false)
  readonly groupChange = output<FixedGroup>()

  protected readonly sides: readonly { key: Side; labelKey: string }[] = [
    { key: 'plan', labelKey: 'mp_plan' },
    { key: 'actual', labelKey: 'mp_actual' }
  ]
  protected readonly maxReached_ = computed(() => this.group().lines.length >= FIXED_LINES_MAX)
  private readonly sums_ = computed(() => {
    const g = this.group()
    // The engine is the one place that sums lines (never double counts the rough total).
    return fixedInputOf(g)
  })
  protected readonly enteredLine_ = computed(() =>
    this.translation_
      .translate('mp_fixed_entered')
      .replace('{{entered}}', String(this.sums_().entered))
      .replace('{{lines}}', String(this.sums_().lines))
  )
  protected readonly planTotal_ = computed(() => this.total_(this.sums_().plan))
  protected readonly actualTotal_ = computed(() => this.total_(this.sums_().actual))
  protected readonly showMax_ = signal(false)

  protected nameKey(line: FixedLine): string {
    return line.starterKey ? `mp_fixed_${line.starterKey}` : ''
  }

  protected setMode(mode: FixedGroup['mode']): void {
    if (this.disabled() || mode === this.group().mode) return
    this.groupChange.emit({ ...this.group(), mode })
  }

  protected setRough(side: Side, value: number | string | null): void {
    const g = this.group()
    this.groupChange.emit({ ...g, rough: { ...g.rough, [side]: this.num_(value) } })
  }

  protected setLine(id: string, side: Side, value: number | string | null): void {
    const g = this.group()
    this.groupChange.emit({ ...g, lines: g.lines.map((l) => (l.id === id ? { ...l, [side]: this.num_(value) } : l)) })
  }

  protected rename(id: string, name: string): void {
    const g = this.group()
    this.groupChange.emit({ ...g, lines: g.lines.map((l) => (l.id === id ? { ...l, name } : l)) })
  }

  protected add(): void {
    const g = this.group()
    if (this.disabled()) return
    if (g.lines.length >= FIXED_LINES_MAX) {
      this.showMax_.set(true)
      return
    }
    const taken = new Set(g.lines.map((l) => l.id))
    let n = g.lines.length + 1
    while (taken.has(`own${n}`)) n++
    const id = `own${n}`
    this.groupChange.emit({ ...g, lines: [...g.lines, { id, name: '', plan: null, actual: null }] })
    // Focus the new, empty name box once it is rendered.
    setTimeout(() => document.getElementById(`fc-name-${id}`)?.focus())
  }

  protected async remove(id: string): Promise<void> {
    if (this.disabled()) return
    const ok = await this.confirm_.open('mp_fixed_remove_confirm', { saveLabel: 'mp_fixed_remove', variant: 'danger' })
    if (!ok) return
    const g = this.group()
    this.groupChange.emit({ ...g, lines: g.lines.filter((l) => l.id !== id) })
  }

  private num_(value: number | string | null): number | null {
    if (value === null || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(0, n) : null
  }

  private total_(value: number | null): string {
    return value === null ? this.translation_.translate('mp_not_entered') : formatMoney(value)
  }
}
