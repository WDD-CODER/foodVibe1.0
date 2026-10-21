import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ModalShellComponent],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModalComponent {
  protected readonly modalService = inject(ConfirmModalService)

  protected readonly cardClass_ = computed(() => {
    const variant = this.modalService.variant()
    return variant === 'default' ? '' : `c-modal-card--${variant}`
  })
}
