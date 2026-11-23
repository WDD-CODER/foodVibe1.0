import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import type { Booking } from '@models/booking.model'
import type { ArrivingRow } from 'src/app/core/utils/table-state.util'

export interface ArrivingView {
  row: ArrivingRow<Booking>
  /** Table numbers joined, or '' when the booking has no table. */
  tables: string
  name: string
}

/** Plan 672: "arriving next" — who comes in the next 90 minutes, one line each, with the "arrived" action. */
@Component({
  selector: 'app-arriving-list',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './arriving-list.component.html',
  styleUrl: './arriving-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArrivingListComponent {
  readonly rows = input.required<ArrivingView[]>()
  /** The action is offered only at the live moment. */
  readonly live = input(false)
  readonly busyId = input<string | null>(null)
  readonly arrived = output<string>()
}
