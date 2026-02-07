// // INJECTIONS
import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Product } from '@models/product.model';

@Component({
  selector: 'app-quick-edit-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './quick-edit-drawer.component.html',
  styleUrl: './quick-edit-drawer.component.scss'
})
export class QuickEditDrawerComponent {
  // // INJECTIONS
  private kitchenState_ = inject(KitchenStateService);

  // // CORE SIGNALS
  isOpen = input.required<boolean>();
  productId = input.required<string | null>();
  close = output<void>();

  // Derived signal: Automatically finds the product whenever productId changes [cite: 6]
  selectedProduct_ = computed(() => {
    const id = this.productId();
    return id ? this.kitchenState_.products_().find(p => p._id === id) : null;
  });

  // // CREATE / UPDATE / DELETE
  // UPDATE section
  onSave(updatedData: Partial<Product>) {
    const current = this.selectedProduct_();
    if (!current) return;

    const finalProduct: Product = { ...current, ...updatedData };
    
    // Logic: Call service to update storage and sync signals [cite: 15, 18]
    this.kitchenState_.updateProduct(finalProduct).subscribe({
      next: () => this.onClose(),
      error: (err) => console.error('Update failed', err)
    });
  }

  onClose() {
    this.close.emit();
  }
}