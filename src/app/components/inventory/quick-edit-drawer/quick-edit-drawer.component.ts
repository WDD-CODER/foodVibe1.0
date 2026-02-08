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
    
 
    this.kitchenState_.updateProduct(finalProduct).subscribe({
      next: () => this.onClose(),
      error: (err) => console.error('Update failed', err)
    });
  }

  onClose() {
    this.close.emit();
  }
}