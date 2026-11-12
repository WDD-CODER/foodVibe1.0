import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import type { DayLoad } from '@services/booking-data.service'

/** The day's load as seen by the strip: loaded, failed, or still loading (`null`). */
export type DayLoadState = DayLoad | 'failed' | null

/** Plan 552: one bar per hour of covers already booked that day, the requested hour highlighted, and the day total. */
@Component({
  selector: 'app-day-load-strip',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './day-load-strip.component.html',
  styleUrl: './day-load-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DayLoadStripComponent {
  private readonly translation = inject(TranslationService)

  readonly load = input<DayLoadState>(null)
  /** The requested time (`HH:MM`); its hour is highlighted. */
  readonly time = input('')

  protected readonly failed_ = computed(() => this.load() === 'failed')
  protected readonly requestedHour_ = computed(() => this.time().slice(0, 2))

  protected readonly bars_ = computed(() => {
    const load = this.load()
    if (!load || load === 'failed') return []
    const entries = Object.entries(load.coversByHour).sort(([a], [b]) => a.localeCompare(b))
    const requested = this.requestedHour_()
    if (requested && !entries.some(([h]) => h === requested)) entries.push([requested, 0])
    entries.sort(([a], [b]) => a.localeCompare(b))
    const max = Math.max(1, ...entries.map(([, covers]) => covers))
    return entries.map(([hour, covers]) => ({
      hour,
      covers,
      pct: Math.round((covers / max) * 100),
      requested: hour === requested
    }))
  })

  protected readonly summary_ = computed(() => {
    const load = this.load()
    if (!load || load === 'failed') return ''
    const covers = Object.values(load.coversByHour).reduce((sum, n) => sum + n, 0)
    return this.translation
      .translate('rq_day_load')
      .replace('{covers}', String(covers))
      .replace('{count}', String(load.bookings.length))
  })
}
