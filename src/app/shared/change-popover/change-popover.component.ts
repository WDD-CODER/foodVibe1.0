import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivityEntry, ActivityChange } from '../../core/services/activity-log.service'
import { ActivityValuePipe } from '../../core/pipes/activity-value.pipe'
import { TranslatePipe } from '../../core/pipes/translation-pipe.pipe'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '../../core/directives/click-out-side'
import { FloatingInfoContainerComponent } from '../floating-info-container/floating-info-container.component'

/** `field` value that opens the popover with every change of the entry (the "+N more" button). */
export const ALL_CHANGES_FIELD = '*'

export interface ChangePopoverOpen {
  top: number
  left: number
  activityId: string
  /** A single change field, or `ALL_CHANGES_FIELD` for the full list. */
  field: string
}

@Component({
  selector: 'app-change-popover',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    ActivityValuePipe,
    LucideAngularModule,
    ClickOutSideDirective,
    FloatingInfoContainerComponent
  ],
  templateUrl: './change-popover.component.html',
  styleUrl: './change-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePopoverComponent {
  open = input<ChangePopoverOpen | null>(null)
  activity = input<ActivityEntry | undefined>(undefined)

  closeRequest = output<HTMLElement>()

  getChanges(activity: ActivityEntry | undefined, field: string): ActivityChange[] {
    const changes = activity?.changes ?? []
    return field === ALL_CHANGES_FIELD ? changes : changes.filter((c) => c.field === field)
  }
}
