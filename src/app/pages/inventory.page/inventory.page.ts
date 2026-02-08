// // INJECTIONS
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { KitchenStateService } from '@services/kitchen-state.service';

@Component({
  selector: 'inventory-page',
  standalone: true,
  // ADD: ProductEditForm to imports
  imports: [RouterOutlet, RouterLink, RouterLinkActive,],
  templateUrl: './inventory.page.html',
  styleUrl: './inventory.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryPage {

  // INJECTIONS
  private kitchenStateService = inject(KitchenStateService)
  public readonly isDrawerOpen_ = this.kitchenStateService.isDrawerOpen_;
  public readonly selectedProductId_ = this.kitchenStateService.selectedProductId_;

  // // CORE SIGNALS
  readonly navRoutes_ = signal([
    { label: 'Produce List', path: 'list' },
    { label: 'Add Produce', path: 'add' },
  ]);



  // // CREATE / UPDATE / DELETE


  // UPDATE section 
  // onOpenEdit(_id: string): void {
  //   this.kitchenStateService.selectedProductId_.set(_id);
  //   this.kitchenStateService.isDrawerOpen_.set(true);
  // }

  onClose(): void {
    this.kitchenStateService.isDrawerOpen_.set(false); // 
    setTimeout(() => this.kitchenStateService.selectedProductId_.set(null), 300);
  }


}