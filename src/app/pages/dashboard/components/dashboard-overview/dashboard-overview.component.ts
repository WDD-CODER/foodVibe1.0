import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { KitchenStateService } from '@services/kitchen-state.service';
import { TranslationService } from '@services/translation.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ActivityLogService, ActivityEntry, ActivityChange } from '@services/activity-log.service';
import { ClickOutSideDirective } from '@directives/click-out-side';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, ClickOutSideDirective],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  private readonly kitchenState = inject(KitchenStateService);
  private readonly router = inject(Router);
  private readonly activityLog = inject(ActivityLogService);
  private readonly translation = inject(TranslationService);
  protected readonly openChange_ = signal<{
    activityId: string;
    field: string;
    top: number;
    left: number;
  } | null>(null);

  constructor() {
    // Sync in-memory signal when dashboard opens (e.g. after navigating here)
    this.activityLog.syncFromStorage();
  }

  protected readonly totalProducts_ = computed(
    () => this.kitchenState.products_().length
  );

  protected readonly totalRecipes_ = computed(
    () => this.kitchenState.recipes_().length
  );

  protected readonly lowStockCount_ = computed(
    () => this.kitchenState.lowStockProducts_().length
  );

  protected readonly unapprovedCount_ = computed(() => {
    return this.kitchenState
      .recipes_()
      .filter(r => !r.is_approved_).length;
  });

  /** Recent activity: read directly from localStorage so the list always reflects current storage (not in-memory cache). */
  protected getRecentActivity(): ActivityEntry[] {
    return this.activityLog.getRecentEntriesFromStorage(10);
  }

  protected trackByActivityId(_index: number, item: ActivityEntry): string {
    return item.id;
  }

  protected toggleChangePopover(activityId: string, field: string, event: Event): void {
    const current = this.openChange_();
    if (current && current.activityId === activityId && current.field === field) {
      this.openChange_.set(null);
      return;
    }
    const el = (event.currentTarget as HTMLElement);
    const rect = el.getBoundingClientRect();
    this.openChange_.set({
      activityId,
      field,
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2,
    });
  }

  protected isChangeOpen(activityId: string, field: string): boolean {
    const current = this.openChange_();
    return !!current && current.activityId === activityId && current.field === field;
  }

  /** Activity entry for the currently open popover (used by fixed popover). */
  protected getOpenActivity(): ActivityEntry | undefined {
    const open = this.openChange_();
    if (!open) return undefined;
    return this.getRecentActivity().find(e => e.id === open.activityId);
  }

  protected getChange(activity: ActivityEntry, field: string): ActivityChange | undefined {
    return activity.changes?.find(c => c.field === field);
  }

  /** Close popover when clicking outside; ignore clicks on change tags (they toggle instead). */
  protected closeChangePopoverOnOutsideClick(target: HTMLElement): void {
    if (target.closest?.('.change-tag')) return;
    this.openChange_.set(null);
  }

  /** Scroll the activity-changes container left/right (used on mobile for clickable scroll). */
  protected scrollActivityChanges(event: Event, direction: 'left' | 'right'): void {
    const btn = event.currentTarget as HTMLElement;
    const item = btn.closest('.activity-item');
    const changesEl = item?.querySelector('.activity-changes') as HTMLElement | null;
    if (!changesEl) return;
    const delta = Math.max(120, changesEl.clientWidth * 0.6);
    const step = direction === 'left' ? -delta : delta;
    changesEl.scrollBy({ left: step, behavior: 'smooth' });
  }

  /** Format change value: translate each comma-separated segment (e.g. categories, allergens). */
  protected formatChangeValue(value: string | undefined): string {
    if (value == null || value === '') return '';
    return value
      .split(',')
      .map(s => this.translation.translate(s.trim()))
      .join(', ');
  }

  protected goToInventory(): void {
    void this.router.navigate(['/inventory']);
  }

  protected goToAddProduct(): void {
    void this.router.navigate(['/inventory', 'add']);
  }

  protected goToRecipeBuilder(type: 'preparation' | 'dish' = 'preparation'): void {
    void this.router.navigate(['/recipe-builder'], {
      queryParams: type === 'dish' ? { type: 'dish' } : {},
      queryParamsHandling: type === 'dish' ? 'merge' : '',
    });
  }

  protected goToRecipeBook(): void {
    void this.router.navigate(['/recipe-book']);
  }
}
