import { ChangeDetectionStrategy, Component, computed, inject, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EquipmentDataService } from '@services/equipment-data.service';
import { Equipment, EquipmentCategory } from '@models/equipment.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { UserService } from '@services/user.service';
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component';
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component';
import { CarouselHeaderComponent, CarouselHeaderColumnDirective } from 'src/app/shared/carousel-header/carousel-header.component';

type SortField = 'name' | 'category' | 'owned';

@Component({
  selector: 'app-equipment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective],
  templateUrl: './equipment-list.component.html',
  styleUrl: './equipment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentListComponent {
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly router = inject(Router);

  /** True when this list is shown under /inventory/equipment (logistics from inventory). */
  protected get isUnderInventory(): boolean {
    return this.router.url.startsWith('/inventory/equipment');
  }

  protected get equipmentBasePath(): string[] {
    return this.isUnderInventory ? ['/inventory/equipment'] : ['/equipment'];
  }

  protected searchQuery_ = signal('');
  protected isPanelOpen_ = signal(true);
  protected carouselHeaderIndex_ = signal(0);

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
        this.isPanelOpen_.set(false);
      }
    });
  }
  /** Selected categories; empty set = show all. */
  protected selectedCategories_ = signal<Set<EquipmentCategory>>(new Set());
  /** null = no filter, true = consumable only, false = non-consumable only. */
  protected consumableFilter_ = signal<boolean | null>(null);
  protected sortBy_ = signal<SortField>('name');
  protected deletingId_ = signal<string | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');

  protected hasActiveFilters_ = computed(() => {
    const cats = this.selectedCategories_();
    const cons = this.consumableFilter_();
    return cats.size > 0 || cons !== null;
  });

  protected filteredEquipment_ = computed(() => {
    let list = this.equipmentData.allEquipment_();
    const search = this.searchQuery_().trim().toLowerCase();
    const cats = this.selectedCategories_();
    const consumableOnly = this.consumableFilter_();
    const sortBy = this.sortBy_();
    const order = this.sortOrder_();

    if (search) {
      list = list.filter(e => (e.name_hebrew ?? '').toLowerCase().includes(search));
    }
    if (cats.size > 0) {
      list = list.filter(e => cats.has(e.category_));
    }
    if (consumableOnly !== null) {
      list = list.filter(e => e.is_consumable_ === consumableOnly);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he');
      } else if (sortBy === 'category') {
        cmp = (a.category_ ?? '').localeCompare(b.category_ ?? '');
      } else {
        cmp = (a.owned_quantity_ ?? 0) - (b.owned_quantity_ ?? 0);
      }
      return order === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  protected categories: EquipmentCategory[] = [
    'heat_source',
    'tool',
    'container',
    'packaging',
    'infrastructure',
    'consumable',
  ];

  protected togglePanel(): void {
    this.isPanelOpen_.update(v => !v);
  }

  protected onCarouselHeaderChange(index: number): void {
    this.carouselHeaderIndex_.set(index);
  }

  protected toggleCategory(cat: EquipmentCategory): void {
    this.selectedCategories_.update(set => {
      const next = new Set(set);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  protected clearAllFilters(): void {
    this.selectedCategories_.set(new Set());
    this.consumableFilter_.set(null);
  }

  protected setSort(field: SortField): void {
    if (this.sortBy_() === field) {
      this.sortOrder_.update(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set('asc');
    }
  }

  protected onAdd(): void {
    this.router.navigate([...this.equipmentBasePath, 'add']);
  }

  onEdit(id: string): void {
    this.router.navigate([...this.equipmentBasePath, 'edit', id]);
  }

  async onDelete(item: Equipment): Promise<void> {
    if (!confirm('האם למחוק את פריט הציוד "' + (item.name_hebrew ?? '') + '"?')) return;
    this.deletingId_.set(item._id);
    try {
      await this.equipmentData.deleteEquipment(item._id);
    } catch (e) {
      console.error(e);
    } finally {
      this.deletingId_.set(null);
    }
  }
}
