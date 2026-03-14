import { Component, input, output } from '@angular/core';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-approve-stamp',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './approve-stamp.component.html',
  styleUrl: './approve-stamp.component.scss'
})
export class ApproveStampComponent {
  /** When true, show approved stamp (teal image); click will unapprove. */
  readonly approved = input<boolean>(false);
  /** When true, button is disabled (e.g. while saving). */
  readonly disabled = input<boolean>(false);

  readonly approve = output<void>();

  /** Teal APPROVED stamp (PNG, transparent background). */
  protected readonly stampApprovedUrl = 'assets/images/stamp-approved.png';
  /** Red NOT APPROVED stamp (PNG, transparent background). */
  protected readonly stampNotApprovedUrl = 'assets/images/stamp-not-approved.png';

  protected onStampClick(): void {
    if (this.disabled()) return;
    this.approve.emit();
  }
}
