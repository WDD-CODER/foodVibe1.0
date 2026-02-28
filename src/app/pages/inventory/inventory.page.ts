import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { AddEquipmentModalService } from '@services/add-equipment-modal.service';
import { EquipmentDataService } from '@services/equipment-data.service';
import { UserMsgService } from '@services/user-msg.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'inventory-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  templateUrl: './inventory.page.html',
  styleUrl: './inventory.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryPage {
  private kitchenStateService = inject(KitchenStateService);
  private addEquipmentModal = inject(AddEquipmentModalService);
  private equipmentData = inject(EquipmentDataService);
  private userMsg = inject(UserMsgService);

  public readonly isDrawerOpen_ = this.kitchenStateService.isDrawerOpen_;
  public readonly selectedProductId_ = this.kitchenStateService.selectedProductId_;

  readonly navRoutes_ = signal([
    { label: 'Produce List', path: 'list' },
    { label: 'Add Produce', path: 'add' },
    { label: 'Equipment List', path: 'equipment' },
  ]);

  async onAddEquipment(): Promise<void> {
    const result = await this.addEquipmentModal.open();
    if (!result) return;

    try {
      await this.equipmentData.addEquipment({
        name_hebrew: result.name,
        category_: result.category,
        owned_quantity_: 0,
        is_consumable_: result.category === 'consumable',
        created_at_: new Date().toISOString(),
        updated_at_: new Date().toISOString(),
      });
      this.userMsg.onSetSuccessMsg('הציוד נוסף בהצלחה');
    } catch {
      this.userMsg.onSetErrorMsg('שגיאה בהוספת הציוד');
    }
  }

  onClose(): void {
    this.kitchenStateService.isDrawerOpen_.set(false);
    setTimeout(() => this.kitchenStateService.selectedProductId_.set(null), 300);
  }
}