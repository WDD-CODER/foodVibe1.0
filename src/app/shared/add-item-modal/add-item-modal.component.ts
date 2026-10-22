import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AddItemModalService } from '@services/add-item-modal.service'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-add-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ModalShellComponent],
  templateUrl: './add-item-modal.component.html',
  styleUrl: './add-item-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddItemModalComponent {
  protected modalService = inject(AddItemModalService)

  protected isOpen_ = this.modalService.isOpen_
  protected config = this.modalService.config
  protected value_ = signal('')

  constructor() {
    // Each open starts from the caller's prefill (the typed name), or empty.
    effect(() => {
      const cfg = this.config()
      if (cfg) this.value_.set((cfg.initialValue ?? '').trim())
    })
  }

  protected save(): void {
    const val = this.value_()
    this.value_.set('')
    this.modalService.save(val)
  }

  protected cancel(): void {
    this.value_.set('')
    this.modalService.cancel()
  }

  protected resetAndClose(): void {
    this.cancel()
  }
}
