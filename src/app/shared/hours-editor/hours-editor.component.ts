import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, model } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TimeFieldComponent } from 'src/app/shared/time-field/time-field.component'
import {
  HOURS_DAY_LETTERS,
  checkHoursRow,
  isBrokenHours,
  type HoursDraftRow,
  type HoursRowResult
} from 'src/app/core/utils/venue-hours.util'

/**
 * Plan 372: opening-hours rows as 7 day chips plus a "from" and "to" time (plan 537's `app-time-field`).
 * The parent owns the rows (`rows` is a two-way model) and saves them with `draftToHours`.
 * Row marks (plan 537) show only once `showMarks` is true, i.e. after the first blocked save.
 */
@Component({
  selector: 'app-hours-editor',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, TimeFieldComponent],
  templateUrl: './hours-editor.component.html',
  styleUrl: './hours-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HoursEditorComponent {
  readonly rows = model<HoursDraftRow[]>([])
  readonly showMarks = input<boolean>(false)

  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly destroyRef = inject(DestroyRef)

  protected readonly dayLetters = HOURS_DAY_LETTERS
  protected readonly results_ = computed<HoursRowResult[]>(() => this.rows().map((r) => checkHoursRow(r)))

  protected mark_(index: number): HoursRowResult | null {
    if (!this.showMarks()) return null
    const result = this.results_()[index]
    return result && isBrokenHours(result) ? result : null
  }

  protected messageKey_(index: number): string | null {
    switch (this.mark_(index)) {
      case 'missing_days':
        return 'venue_hours_missing_days'
      case 'missing_time':
        return 'venue_hours_missing_time'
      case 'same_time':
        return 'venue_hours_same_time'
      default:
        return null
    }
  }

  protected timeFlagged_(index: number, which: 'open' | 'close'): boolean {
    const mark = this.mark_(index)
    if (mark === 'same_time') return true
    if (mark !== 'missing_time') return false
    return !this.rows()[index]?.[which]
  }

  protected isOvernight_(index: number): boolean {
    return this.results_()[index] === 'overnight'
  }

  protected hasDay_(index: number, day: number): boolean {
    return !!this.rows()[index]?.dayIndexes.includes(day)
  }

  private patch_(index: number, change: Partial<HoursDraftRow>): void {
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...change } : r)))
  }

  protected toggleDay_(index: number, day: number): void {
    const cur = this.rows()[index]?.dayIndexes ?? []
    const next = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort((a, b) => a - b)
    this.patch_(index, { dayIndexes: next })
  }

  protected setTime_(index: number, which: 'open' | 'close', value: string): void {
    if (this.rows()[index]?.[which] !== value) this.patch_(index, { [which]: value })
  }

  protected setInvalid_(index: number, which: 'open' | 'close', value: boolean): void {
    const key = which === 'open' ? 'openInvalid' : 'closeInvalid'
    if (this.rows()[index]?.[key] !== value) this.patch_(index, { [key]: value })
  }

  protected addRow_(): void {
    this.rows.update((rows) => [
      ...rows,
      { dayIndexes: [], open: '', close: '', openInvalid: false, closeInvalid: false }
    ])
  }

  protected removeRow_(index: number): void {
    const removed = this.rows()[index]
    if (!removed) return
    this.rows.update((rows) => rows.filter((_, i) => i !== index))
    this.userMsg.onLineRemoved(
      this.translation.translate('line_removed'),
      () =>
        this.rows.update((rows) => {
          const next = [...rows]
          next.splice(Math.min(index, next.length), 0, removed)
          return next
        }),
      this.destroyRef
    )
  }
}
