import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SupplierDataService } from '@services/supplier-data.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { AddSupplierFlowService } from '@services/add-supplier-flow.service';
import { TranslationService } from '@services/translation.service';
import { Supplier } from '@models/supplier.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['embeddedInDashboard'],
})
export class SupplierListComponent {
  private readonly supplierData = inject(SupplierDataService);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly addSupplierFlow = inject(AddSupplierFlowService);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);

  /** When true, add button emits addSupplierClick instead of opening modal and navigating. */
  embeddedInDashboard = false;
  readonly addSupplierClick = output<void>();

  protected searchQuery_ = signal('');
  protected deletingId_ = signal<string | null>(null);

  protected isEmptyList_ = computed(() => this.supplierData.allSuppliers_().length === 0);

  protected filteredSuppliers_ = computed(() => {
    let list = this.supplierData.allSuppliers_();
    const search = this.searchQuery_().trim().toLowerCase();
    if (search) {
      list = list.filter(
        s =>
          (s.name_hebrew ?? '').toLowerCase().includes(search) ||
          (s.contact_person_ ?? '').toLowerCase().includes(search)
      );
    }
    return [...list].sort((a, b) =>
      (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he')
    );
  });

  protected linkedProductCount_(supplierId: string): number {
    return this.kitchenState.products_().filter(p =>
      (p.supplierIds_ ?? []).includes(supplierId)
    ).length;
  }

  protected async onAdd(): Promise<void> {
    if (this.embeddedInDashboard) {
      this.addSupplierClick.emit();
      return;
    }
    const added = await this.addSupplierFlow.open();
    if (added) {
      void this.router.navigate(['/suppliers/list']);
    }
  }

  onEdit(id: string): void {
    this.router.navigate(['/suppliers/edit', id]);
  }

  async onDelete(item: Supplier): Promise<void> {
    const count = this.linkedProductCount_(item._id);
    if (count > 0) {
      const msg = this.translation.translate('supplier_in_use_cannot_delete');
      if (!confirm(msg)) return;
    } else if (!confirm('למחוק את הספק "' + (item.name_hebrew ?? '') + '"?')) return;
    this.deletingId_.set(item._id);
    try {
      await this.supplierData.removeSupplier(item._id);
    } catch (e) {
      console.error(e);
    } finally {
      this.deletingId_.set(null);
    }
  }

  protected deliveryDaysDisplay(days: number[] | undefined): string {
    if (!days?.length) return '—';
    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    return days.map(d => dayNames[d] ?? String(d)).join(', ');
  }
}
