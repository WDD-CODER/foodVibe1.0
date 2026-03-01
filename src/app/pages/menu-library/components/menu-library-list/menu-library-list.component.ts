import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { MenuEventDataService } from '@services/menu-event-data.service';
import { MenuEvent, ServingType } from '@models/menu-event.model';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

export type SortField = 'name' | 'date' | 'food_cost' | 'guest_count';

@Component({
  selector: 'app-menu-library-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CustomSelectComponent],
  templateUrl: './menu-library-list.component.html',
  styleUrl: './menu-library-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuLibraryListComponent {
  private readonly router = inject(Router);
  private readonly menuEventData = inject(MenuEventDataService);
  private readonly confirmModal = inject(ConfirmModalService);

  protected readonly searchQuery_ = signal('');
  protected readonly eventTypeFilter_ = signal('all');
  protected readonly servingStyleFilter_ = signal('all');
  protected readonly dateFrom_ = signal('');
  protected readonly sortBy_ = signal<SortField>('date');
  protected readonly sortOrder_ = signal<'asc' | 'desc'>('desc');
  protected readonly cloningId_ = signal<string | null>(null);
  protected readonly deletingId_ = signal<string | null>(null);

  protected readonly events_ = this.menuEventData.allMenuEvents_;

  protected readonly servingStyleOptions_: { value: string; label: string }[] = [
    { value: 'all', label: 'all' },
    { value: 'buffet_family', label: 'buffet_family' },
    { value: 'plated_course', label: 'plated_course' },
    { value: 'cocktail_passed', label: 'cocktail_passed' },
  ];

  protected readonly eventTypeOptions_ = computed(() => {
    const set = new Set<string>();
    this.events_().forEach(ev => {
      if (ev.event_type_) set.add(ev.event_type_);
    });
    return ['all', ...Array.from(set)];
  });

  protected readonly eventTypeSelectOptions_ = computed(() =>
    this.eventTypeOptions_().map((t) => ({ value: t, label: t }))
  );

  protected readonly sortBySelectOptions_: { value: SortField; label: string }[] = [
    { value: 'date', label: 'sort_by_date' },
    { value: 'name', label: 'sort_by_name' },
    { value: 'food_cost', label: 'menu_food_cost' },
    { value: 'guest_count', label: 'menu_guest_count' },
  ];

  protected readonly filteredEvents_ = computed(() => {
    const query = this.searchQuery_().trim().toLowerCase();
    const type = this.eventTypeFilter_();
    const style = this.servingStyleFilter_();
    const from = this.dateFrom_();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();

    let events = this.events_().filter(event => {
      if (type !== 'all' && event.event_type_ !== type) return false;
      if (style !== 'all' && event.serving_type_ !== style) return false;
      if (from && (!event.event_date_ || event.event_date_ < from)) return false;
      if (query) {
        const haystack = [
          event.name_,
          event.event_type_,
          event.event_date_ || '',
          ...(event.cuisine_tags_ || []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    events = [...events].sort((a, b) => {
      const cmp = this.compareEvents(a, b, sortBy);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return events;
  });

  private compareEvents(a: MenuEvent, b: MenuEvent, field: SortField): number {
    switch (field) {
      case 'name':
        return (a.name_ || '').localeCompare(b.name_ || '', 'he');
      case 'date':
        return (a.event_date_ || '').localeCompare(b.event_date_ || '');
      case 'food_cost':
        return (a.performance_tags_?.food_cost_pct_ ?? 0) - (b.performance_tags_?.food_cost_pct_ ?? 0);
      case 'guest_count':
        return (a.guest_count_ ?? 0) - (b.guest_count_ ?? 0);
      default:
        return 0;
    }
  }

  protected setSort(field: SortField): void {
    if (this.sortBy_() === field) {
      this.sortOrder_.update(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set('asc');
    }
  }

  protected onCreateNew(): void {
    this.router.navigate(['/menu-intelligence']);
  }

  protected onOpen(event: MenuEvent): void {
    this.router.navigate(['/menu-intelligence', event._id]);
  }

  protected async onClone(event: MenuEvent): Promise<void> {
    this.cloningId_.set(event._id);
    try {
      const cloned = await this.menuEventData.cloneMenuEventAsNew(event._id);
      this.router.navigate(['/menu-intelligence', cloned._id]);
    } finally {
      this.cloningId_.set(null);
    }
  }

  protected async onDelete(event: MenuEvent): Promise<void> {
    const ok = await this.confirmModal.open('menu_confirm_delete', {
      saveLabel: 'delete',
      variant: 'danger',
    });
    if (!ok) return;
    this.deletingId_.set(event._id);
    try {
      await this.menuEventData.deleteMenuEvent(event._id);
    } finally {
      this.deletingId_.set(null);
    }
  }

  protected getFoodCostPctDisplay(event: MenuEvent): string {
    const pct = event.performance_tags_?.food_cost_pct_ ?? 0;
    return `${pct.toFixed(1)}%`;
  }

  protected getGuestCountDisplay(event: MenuEvent): string {
    return String(event.guest_count_ || 0);
  }

  protected getSectionCount(event: MenuEvent): number {
    return event.sections_?.length || 0;
  }

  protected getDishCount(event: MenuEvent): number {
    return (event.sections_ || []).reduce((sum, s) => sum + (s.items_?.length || 0), 0);
  }

  /** Translation key for current sort order (א–ת, ת–א, ישן לחדש, etc.). */
  protected getSortOrderLabel(): string {
    const order = this.sortOrder_();
    switch (this.sortBy_()) {
      case 'name':
        return order === 'asc' ? 'sort_name_az' : 'sort_name_za';
      case 'date':
        return order === 'asc' ? 'sort_date_old_new' : 'sort_date_new_old';
      case 'food_cost':
      case 'guest_count':
        return order === 'asc' ? 'sort_number_low_high' : 'sort_number_high_low';
      default:
        return order === 'asc' ? 'sort_number_low_high' : 'sort_number_high_low';
    }
  }

  protected toggleSortOrder(): void {
    this.sortOrder_.update(o => o === 'asc' ? 'desc' : 'asc');
  }

  protected onDateWrapClick(input: HTMLInputElement | undefined): void {
    if (input?.showPicker) {
      input.showPicker();
    }
  }
}
