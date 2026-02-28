import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KitchenStateService } from '@services/kitchen-state.service';

@Component({
  selector: 'inventory-page',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './inventory.page.html',
  styleUrl: './inventory.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryPage {
  protected readonly kitchenStateService = inject(KitchenStateService);
  protected readonly isDrawerOpen_ = this.kitchenStateService.isDrawerOpen_;
  protected readonly selectedProductId_ = this.kitchenStateService.selectedProductId_;

  onClose(): void {
    this.kitchenStateService.isDrawerOpen_.set(false);
    setTimeout(() => this.kitchenStateService.selectedProductId_.set(null), 300);
  }
}