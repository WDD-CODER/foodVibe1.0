import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { GlobalSpecificModalService } from '@services/global-specific-modal.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-global-specific-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, ModalShellComponent],
  templateUrl: './global-specific-modal.component.html',
  styleUrl: './global-specific-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalSpecificModalComponent {
  protected readonly modalService = inject(GlobalSpecificModalService)
}
