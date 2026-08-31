import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

@Component({
  selector: 'app-approve-stamp',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './approve-stamp.component.html',
  styleUrl: './approve-stamp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApproveStampComponent {
  /** When true, show approved stamp (teal image); click will unapprove. */
  readonly approved = input<boolean>(false)
  /** When true, button is disabled (e.g. while saving). */
  readonly disabled = input<boolean>(false)

  readonly approve = output<void>()

  /** Teal APPROVED stamp (WebP, transparent background — plan 302 M5, 161KB PNG -> 54.6KB). */
  protected readonly stampApprovedUrl = 'assets/images/stamp-approved.webp'
  /** Red NOT APPROVED stamp (WebP, transparent background — plan 302 M5, 177KB PNG -> 64.9KB). */
  protected readonly stampNotApprovedUrl = 'assets/images/stamp-not-approved.webp'

  protected onStampClick(): void {
    if (this.disabled()) return
    this.approve.emit()
  }
}
