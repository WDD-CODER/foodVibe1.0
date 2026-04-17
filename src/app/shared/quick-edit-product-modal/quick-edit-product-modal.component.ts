import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { QuickEditProductModalService } from '@services/quick-edit-product-modal.service'
import { QuickEditProductPanelComponent } from 'src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component'

@Component({
  selector: 'app-quick-edit-product-modal',
  standalone: true,
  imports: [CommonModule, QuickEditProductPanelComponent],
  templateUrl: './quick-edit-product-modal.component.html',
  styleUrl: './quick-edit-product-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickEditProductModalComponent {
  private readonly modalService = inject(QuickEditProductModalService)
  private readonly router = inject(Router)

  protected isOpen_ = this.modalService.isOpen_
  protected config = this.modalService.config

  protected onSaved(): void {
    this.modalService.save()
  }

  protected onCancelled(): void {
    this.modalService.cancel()
  }

  protected onOpenFullEdit(): void {
    const productId = this.config()?.product?._id
    this.modalService.cancel()
    if (productId) {
      void this.router.navigate(['/inventory/edit', productId])
    }
  }
}
