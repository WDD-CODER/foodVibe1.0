import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EquipmentDataService } from '@services/equipment-data.service';
import { Equipment, EquipmentCategory } from '@models/equipment.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

type SortField = 'name' | 'category' | 'owned';

@Component({
  selector: 'app-equipment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CustomSelectComponent],
  templateUrl: './equipment-list.component.html',
  styleUrl: './equipment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentListComponent {
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly router = inject(Router);

  protected searchQuery_ = signal('');
  protected categoryFilter_ = signal<EquipmentCategory | ''>('');
  protected sortBy_ = signal<SortField>('name');
  protected deletingId_ = signal<string | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');

  protected filteredEquipment_ = computed(() => {
    let list = this.equipmentData.allEquipment_();
    const search = this.searchQuery_().trim().toLowerCase();
    const cat = this.categoryFilter_();
    const sortBy = this.sortBy_();
    const order = this.sortOrder_();

    if (search) {
      list = list.filter(e => (e.name_hebrew ?? '').toLowerCase().includes(search));
    }
    if (cat) {
      list = list.filter(e => e.category_ === cat);
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
  protected categoryFilterOptions = [
    { value: '', label: 'all' },
    ...this.categories.map((c) => ({ value: c, label: c })),
  ];

  protected setSort(field: SortField): void {
    if (this.sortBy_() === field) {
      this.sortOrder_.update(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set('asc');
    }
  }

  protected categoryLabel(cat: EquipmentCategory): string {
    return cat;
  }

  onEdit(id: string): void {
    this.router.navigate(['/equipment/edit', id]);
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
