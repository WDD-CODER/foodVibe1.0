import { Component, OnInit, inject, signal } from "@angular/core";
import { ItemFormComponent } from "../item-form.component";
import { CommonModule } from "@angular/common";
import { ItemDataService } from "@services/items-data.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ItemLedger } from "@models/ingredient.model";

@Component({
  standalone: true,
  imports: [ItemFormComponent , CommonModule],
  templateUrl: './edit-item-form.component.html',
  styleUrl: './edit-item-form.component.scss',
})
export class EditItemFormComponent implements OnInit {
  private service = inject(ItemDataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected item_ = signal<ItemLedger | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const item = await this.service.getItem(id);
      this.item_.set(item);
    }
  }

  async onSave(item: ItemLedger) {
    await this.service.updateItem(item);
    this.onBack();
  }

  onBack() { this.router.navigate(['/inventory/list']); }
}