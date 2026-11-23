import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import type { Booking } from '@models/booking.model'

export interface UnassignedView {
  booking: Booking
  name: string
}

/** Plan 672: "not assigned" — confirmed table bookings of the day with no table, each with an "assign" action. */
@Component({
  selector: 'app-unassigned-list',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './unassigned-list.component.html',
  styleUrl: './arriving-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnassignedListComponent {
  readonly rows = input.required<UnassignedView[]>()
  /** The assign action starts a write, so it is offered at the live moment only. */
  readonly live = input(false)
  readonly assign = output<string>()
}
