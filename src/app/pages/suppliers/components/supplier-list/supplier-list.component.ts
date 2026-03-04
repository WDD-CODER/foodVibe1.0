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
import { UserService } from '@services/user.service';
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective],
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['embeddedInDashboard'],
})
export class SupplierListComponent {
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;
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
  protected isPanelOpen_ = signal(true);
  protected carouselHeaderIndex_ = signal(0);
  /** Delivery days to filter (0=Sun .. 6=Sat). Empty set = show all. */
  protected selectedDays_ = signal<Set<number>>(new Set());
  protected hasLinkedOnly_ = signal(false);

  protected isEmptyList_ = computed(() => this.supplierData.allSuppliers_().length === 0);

  protected hasActiveFilters_ = computed(() => {
    const days = this.selectedDays_();
    const linked = this.hasLinkedOnly_();
    return (days.size > 0) || linked;
  });

  protected filteredSuppliers_ = computed(() => {
    let list = this.supplierData.allSuppliers_();
    const search = this.searchQuery_().trim().toLowerCase();
    const days = this.selectedDays_();
    const linkedOnly = this.hasLinkedOnly_();

    if (search) {
      list = list.filter(
        s =>
          (s.name_hebrew ?? '').toLowerCase().includes(search) ||
          (s.contact_person_ ?? '').toLowerCase().includes(search)
      );
    }
    if (days.size > 0) {
      list = list.filter(s => (s.delivery_days_ ?? []).some(d => days.has(d)));
    }
    if (linkedOnly) {
      list = list.filter(s => this.linkedProductCount_(s._id) > 0);
    }
    return [...list].sort((a, b) =>
      (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he')
    );
  });

  protected togglePanel(): void {
    this.isPanelOpen_.update(v => !v);
  }

  protected carouselHeaderPrev(): void {
    this.carouselHeaderIndex_.update(i => (i <= 0 ? 2 : i - 1));
  }

  protected carouselHeaderNext(): void {
    this.carouselHeaderIndex_.update(i => (i >= 2 ? 0 : i + 1));
  }

  protected getCarouselHeaderLabel_(): 'contact_person' | 'delivery_days' | 'min_order' {
    const labels: ('contact_person' | 'delivery_days' | 'min_order')[] = ['contact_person', 'delivery_days', 'min_order'];
    return labels[this.carouselHeaderIndex_()] ?? 'contact_person';
  }

  protected toggleDay(day: number): void {
    this.selectedDays_.update(set => {
      const next = new Set(set);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  protected clearAllFilters(): void {
    this.selectedDays_.set(new Set());
    this.hasLinkedOnly_.set(false);
  }

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
