import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import type { FloorJoin, FloorPlanBody } from '@models/floor-plan.model'
import { joinLabel } from '../../floor-plan-joins.util'

export type JoinPatch = Partial<Pick<FloorJoin, 'minSeats' | 'maxSeats' | 'online'>>

interface JoinRow {
  join: FloorJoin
  label: string
  summary: string
  marked: boolean
  open: boolean
}

const MAX_JOIN_SEATS = 30

/**
 * Plan 666, 700: the joins of the room — one short line each (tables, seats, online), pressing it opens the seats and
 * the online switch; one row is open at a time. Inputs in, events out.
 */
@Component({
  selector: 'app-floor-joins-list',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, CounterComponent],
  templateUrl: './joins-list.component.html',
  styleUrl: './joins-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoinsListComponent {
  private readonly translation = inject(TranslationService)

  readonly plan = input.required<FloorPlanBody>()
  /** The join whose tables are marked on the map. */
  readonly markedKey = input<string | null>(null)

  readonly joinPressed = output<string>()
  readonly joinChange = output<{ key: string; patch: JoinPatch }>()
  readonly joinRemoved = output<string>()

  protected readonly maxSeats = MAX_JOIN_SEATS
  private readonly openKey_ = signal<string | null>(null)

  protected readonly rows_ = computed<JoinRow[]>(() => {
    const plan = this.plan()
    const marked = this.markedKey()
    const open = this.openKey_()
    return plan.joins.map((join) => {
      const seats = this.translation
        .translate('fp_join_summary')
        .replace('{min}', String(join.minSeats))
        .replace('{max}', String(join.maxSeats))
      return {
        join,
        label: joinLabel(plan, join),
        summary: join.online ? `${seats} · ${this.translation.translate('fp_join_online_short')}` : seats,
        marked: join.key === marked,
        open: join.key === open
      }
    })
  })

  protected press(key: string): void {
    this.openKey_.update((current) => (current === key ? null : key))
    this.joinPressed.emit(key)
  }

  protected setOnline(key: string, event: Event): void {
    this.joinChange.emit({ key, patch: { online: (event.target as HTMLInputElement).checked } })
  }
}
