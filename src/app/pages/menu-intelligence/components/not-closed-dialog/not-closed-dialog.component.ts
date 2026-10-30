import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, output, signal } from '@angular/core'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
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
  imports: [TextareaAutoGrowDirective, FormsModule, TranslatePipe],
  templateUrl: './not-closed-dialog.component.html',
  styleUrl: './not-closed-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancelled.emit()' }
})
export class NotClosedDialogComponent {
  /** Plan 502: true from the first click until the dialog is closed by its parent; a second click does nothing. */
  protected readonly isSaving_ = signal(false)
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
    if (!reason || this.isSaving_()) return
    this.isSaving_.set(true)
    this.confirmed.emit({ reason, reasonText: this.text_().trim() })
  }
}
