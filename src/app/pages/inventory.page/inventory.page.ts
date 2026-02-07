// // INJECTIONS
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { QuickEditDrawerComponent } from '@components/inventory/quick-edit-drawer/quick-edit-drawer.component';
import { KitchenStateService } from '@services/kitchen-state.service';

@Component({
  selector: 'inventory-page',
  standalone: true,
  // ADD: QuickEditDrawerComponent to imports
  imports: [RouterOutlet, RouterLink, RouterLinkActive, QuickEditDrawerComponent],
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
  readonly navItems_ = signal([
    { label: 'Produce List', path: 'list' },
    { label: 'Add Produce', path: 'add' },
  ]);



  // // CREATE / UPDATE / DELETE


  // UPDATE section 
  onOpenEditDrawer(_id: string): void {
    this.kitchenStateService.selectedProductId_.set(_id);
    this.kitchenStateService.isDrawerOpen_.set(true);
  }

  onCloseDrawer(): void {
    this.kitchenStateService.isDrawerOpen_.set(false); // 
    setTimeout(() => this.kitchenStateService.selectedProductId_.set(null), 300);
  }


}