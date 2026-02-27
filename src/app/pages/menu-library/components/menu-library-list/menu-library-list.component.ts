import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MenuEventDataService } from '@services/menu-event-data.service';
import { MenuEvent } from '@models/menu-event.model';

@Component({
  selector: 'app-menu-library-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './menu-library-list.component.html',
  styleUrl: './menu-library-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuLibraryListComponent {
  private readonly router = inject(Router);
  private readonly menuEventData = inject(MenuEventDataService);

  protected readonly searchQuery_ = signal('');
  protected readonly eventTypeFilter_ = signal('all');

  protected readonly events_ = this.menuEventData.allMenuEvents_;

  protected readonly eventTypeOptions_ = computed(() => {
    const set = new Set<string>();
    this.events_().forEach(ev => {
      if (ev.event_type_) set.add(ev.event_type_);
    });
    return ['all', ...Array.from(set)];
  });

  protected readonly filteredEvents_ = computed(() => {
    const query = this.searchQuery_().trim().toLowerCase();
    const type = this.eventTypeFilter_();

    return this.events_().filter(event => {
      const byType = type === 'all' ? true : event.event_type_ === type;
      const byQuery =
        !query ||
        event.name_.toLowerCase().includes(query) ||
        event.event_type_.toLowerCase().includes(query) ||
        (event.event_date_ || '').toLowerCase().includes(query);
      return byType && byQuery;
    });
  });

  protected onCreateNew(): void {
    this.router.navigate(['/menu-intelligence']);
  }

  protected onOpen(event: MenuEvent): void {
    this.router.navigate(['/menu-intelligence', event._id]);
  }

  protected async onClone(event: MenuEvent): Promise<void> {
    const cloned = await this.menuEventData.cloneMenuEventAsNew(event._id);
    this.router.navigate(['/menu-intelligence', cloned._id]);
  }

  protected getFoodCostPctDisplay(event: MenuEvent): string {
    const pct = event.performance_tags_?.food_cost_pct_ ?? 0;
    return `${pct.toFixed(1)}%`;
  }
}
