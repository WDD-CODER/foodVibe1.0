import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RestoreChoiceModalService } from '@services/restore-choice-modal.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-restore-choice-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ModalShellComponent],
  templateUrl: './restore-choice-modal.component.html',
  styleUrl: './restore-choice-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestoreChoiceModalComponent {
  protected readonly modalService = inject(RestoreChoiceModalService)
}
