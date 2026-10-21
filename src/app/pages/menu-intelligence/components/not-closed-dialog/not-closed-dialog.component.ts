import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { NOT_CLOSED_REASONS } from '@schemas/entities'
import type { NotClosedReason } from '@models/menu-event.model'

export interface NotClosedAnswer {
  reason: NotClosedReason
  reasonText: string
}

/**
 * Plan 443: asks why an event did not close. It only collects the answer; the stage bar sends it.
 * «שמור» stays disabled until a reason is chosen. Escape or a click outside cancels.
 */
@Component({
  selector: 'app-not-closed-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './not-closed-dialog.component.html',
  styleUrl: './not-closed-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancelled.emit()' }
})
export class NotClosedDialogComponent {
  // 1. INJECTED
  private readonly host_ = inject<ElementRef<HTMLElement>>(ElementRef)

  // 3. OUTPUTS
  readonly confirmed = output<NotClosedAnswer>()
  readonly cancelled = output<void>()

  // 4. SIGNALS & CONSTANTS
  protected readonly reasons: readonly NotClosedReason[] = NOT_CLOSED_REASONS
  protected readonly maxText = 500
  protected readonly reason_ = signal<NotClosedReason | null>(null)
  protected readonly text_ = signal('')

  constructor() {
    afterNextRender(() => this.host_.nativeElement.querySelector<HTMLInputElement>('input[type="radio"]')?.focus())
  }

  // 6. UI handlers
  protected onSave(): void {
    const reason = this.reason_()
    if (!reason) return
    this.confirmed.emit({ reason, reasonText: this.text_().trim() })
  }
}
