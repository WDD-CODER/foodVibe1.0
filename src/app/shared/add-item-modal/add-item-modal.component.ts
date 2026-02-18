import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { AddItemModalService } from '@services/add-item-modal.service';

@Component({
  selector: 'add-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutSideDirective, TranslatePipe],
  templateUrl: './add-item-modal.component.html',
  styleUrl: './add-item-modal.component.scss'
})
export class AddItemModalComponent {
  protected modalService = inject(AddItemModalService);

  protected isOpen_ = this.modalService.isOpen_;
  protected config = this.modalService.config;
  protected value_ = signal('');

  protected save(): void {
    const val = this.value_();
    this.value_.set('');
    this.modalService.save(val);
  }

  protected cancel(): void {
    this.value_.set('');
    this.modalService.cancel();
  }

  protected resetAndClose(): void {
    this.cancel();
  }
}
