import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { QuickEditProductModalService } from '@services/quick-edit-product-modal.service'
import { QuickEditProductPanelComponent } from 'src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-quick-edit-product-modal',
  standalone: true,
  imports: [CommonModule, QuickEditProductPanelComponent, ModalShellComponent],
  templateUrl: './quick-edit-product-modal.component.html',
  styleUrl: './quick-edit-product-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickEditProductModalComponent {
  private readonly modalService = inject(QuickEditProductModalService)
  private readonly router = inject(Router)

  private readonly panel_ = viewChild(QuickEditProductPanelComponent)

  protected isOpen_ = this.modalService.isOpen_
  protected config = this.modalService.config

  /** Escape / backdrop ask before throwing away an edited field (plan 498). */
  protected hasChanges(): boolean {
    return this.panel_()?.hasChanges() ?? false
  }

  protected readonly saveAndClose = (): Promise<boolean> => this.panel_()?.saveAndClose() ?? Promise.resolve(false)

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
