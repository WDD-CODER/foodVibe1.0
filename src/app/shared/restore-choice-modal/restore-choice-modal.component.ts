import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestoreChoiceModalService } from '@services/restore-choice-modal.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-restore-choice-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './restore-choice-modal.component.html',
  styleUrl: './restore-choice-modal.component.scss',
})
export class RestoreChoiceModalComponent {
  protected readonly modalService = inject(RestoreChoiceModalService);
}
