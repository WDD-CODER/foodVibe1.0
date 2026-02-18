import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss'
})
export class ConfirmModalComponent {
  protected readonly modalService = inject(ConfirmModalService);
}
