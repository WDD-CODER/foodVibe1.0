import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'

@Component({
  selector: 'app-approve-stamp',
  standalone: true,
  imports: [TranslatePipe, DisabledWhyDirective],
  templateUrl: './approve-stamp.component.html',
  styleUrl: './approve-stamp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApproveStampComponent {
  /** When true, show approved stamp (teal image); click will unapprove. */
  readonly approved = input<boolean>(false)
  /** When true, button is disabled (e.g. while saving). */
  readonly disabled = input<boolean>(false)
  /** Why the stamp cannot be pressed (translated). With a reason it is blocked and says why in a tooltip (plan 747). */
  readonly disabledWhy = input<string | null>(null)

  readonly approve = output<void>()

  /** Teal APPROVED stamp (WebP, transparent background — plan 302 M5, 161KB PNG -> 54.6KB). */
  protected readonly stampApprovedUrl = 'assets/images/stamp-approved.webp'
  /** Red NOT APPROVED stamp (WebP, transparent background — plan 302 M5, 177KB PNG -> 64.9KB). */
  protected readonly stampNotApprovedUrl = 'assets/images/stamp-not-approved.webp'

  /** Cannot be pressed: disabled by the caller, with or without a reason. */
  protected readonly off_ = computed(() => this.disabled() || !!this.disabledWhy())

  protected onStampClick(): void {
    if (this.off_()) return
    this.approve.emit()
  }
}
