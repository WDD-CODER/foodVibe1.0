import { Component, inject } from "@angular/core";
import { ItemDataService } from "../../../../core/services/items-data.service";
import { ItemFormComponent } from "../item-form.component";
import { ItemLedger } from "../../../../core/models/ingredient.model";
import { Router } from "@angular/router";

@Component({
  standalone: true,
  imports: [ItemFormComponent],
  templateUrl: './add-item-form.component.html', 
  styleUrl: './add-item-form.component.scss'
})
export class AddItemFormComponent {
  private service = inject(ItemDataService);
  private router = inject(Router);

  async onSave(item: ItemLedger) {
    await this.service.addItem(item);
    this.onBack();
  }

  onSwitch(item: ItemLedger) { this.router.navigate(['/inventory/edit', item.id]); }
  onBack() { this.router.navigate(['/inventory/list']); }
}