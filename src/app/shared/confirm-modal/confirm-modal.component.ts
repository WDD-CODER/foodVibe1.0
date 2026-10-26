import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { FormFieldComponent } from '../form-field/form-field.component'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ModalShellComponent, FormFieldComponent],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModalComponent {
  protected readonly modalService = inject(ConfirmModalService)

  private readonly typedInput_ = viewChild<ElementRef<HTMLInputElement>>('typedInput')

  protected readonly cardClass_ = computed(() => {
    const variant = this.modalService.variant()
    return variant === 'default' ? '' : `c-modal-card--${variant}`
  })

  constructor() {
    // The popup is mounted once in the app root, so focus the box whenever it appears.
    effect(() => {
      this.typedInput_()?.nativeElement.focus({ preventScroll: true })
    })
  }

  protected onTypedInput(event: Event): void {
    this.modalService.setTypedText((event.target as HTMLInputElement).value)
  }

  protected onTypedEnter(): void {
    if (this.modalService.canConfirm()) this.modalService.choose('confirm')
  }
}
