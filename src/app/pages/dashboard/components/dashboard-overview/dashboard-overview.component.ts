import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'

import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { DishDataService } from '@services/dish-data.service'
import { UserService } from '@services/user.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ActivityLogService, ActivityEntry, ActivityChange, ActivityEntityType } from '@services/activity-log.service'
import { TranslationService } from '@services/translation.service'
import { ScrollIndicatorsDirective } from '@directives/scroll-indicators.directive'
import { ActivityValuePipe } from 'src/app/core/pipes/activity-value.pipe'
import {
  ALL_CHANGES_FIELD,
  ChangePopoverComponent
} from '../../../../shared/change-popover/change-popover.component'
import type { DashboardTab } from '../../dashboard.page'

/** Change lines shown inline per activity entry before "+N more" (plan 351, Critical Question 1 → a). */
const MAX_INLINE_CHANGES = 3

const ENTITY_ICONS: Record<ActivityEntityType, string> = {
  product: 'package',
  recipe: 'chef-hat',
  dish: 'utensils'
}

interface ActivityDayGroup {
  key: string
  label: string
  items: ActivityEntry[]
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    ActivityValuePipe,
    ScrollIndicatorsDirective,
    ChangePopoverComponent
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardOverviewComponent {
  readonly activeTab = input.required<DashboardTab>()
  readonly tabChange = output<DashboardTab>()

  private readonly kitchenState = inject(KitchenStateService)
  private readonly recipeData = inject(RecipeDataService)
  private readonly dishData = inject(DishDataService)
  private readonly router = inject(Router)
  private readonly activityLog = inject(ActivityLogService)
  private readonly translation = inject(TranslationService)
  private readonly relativeTimeFormat = new Intl.RelativeTimeFormat('he', { numeric: 'auto', style: 'short' })
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  protected readonly openChange_ = signal<{
    activityId: string
    field: string
    top: number
    left: number
  } | null>(null)

  // Recipe/dish counts via the lightweight /count endpoint (plan 301 M3 / 304 M2) — RecipeDataService
  // and DishDataService are now deferred, so reading kitchenState.recipes_() here would force a full
  // collection load (or show 0) just for these two badges.
  protected readonly totalRecipes_ = signal(0)
  protected readonly unapprovedCount_ = signal(0)

  constructor() {
    // Sync in-memory signal when dashboard opens (e.g. after navigating here)
    this.activityLog.syncFromStorage()

    void Promise.all([this.recipeData.getCount(), this.dishData.getCount()]).then(([recipes, dishes]) =>
      this.totalRecipes_.set(recipes + dishes)
    )
    void Promise.all([this.recipeData.getCount('unapproved'), this.dishData.getCount('unapproved')]).then(
      ([recipes, dishes]) => this.unapprovedCount_.set(recipes + dishes)
    )
  }

  protected readonly totalProducts_ = computed(() => this.kitchenState.products_().length)

  protected readonly lowStockCount_ = computed(() => this.kitchenState.lowStockProducts_().length)

  /** Recent activity: read directly from localStorage so the list always reflects current storage (not in-memory cache). */
  protected getRecentActivity(): ActivityEntry[] {
    return this.activityLog.getRecentEntriesFromStorage(10)
  }

  /** Recent activity grouped by calendar day, newest first. Day headers render only when there are 2+ groups. */
  protected activityGroups(): ActivityDayGroup[] {
    const groups: ActivityDayGroup[] = []
    for (const entry of this.getRecentActivity()) {
      const key = this.dayKey(entry.timestamp)
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.items.push(entry)
      else groups.push({ key, label: this.dayLabel(entry.timestamp), items: [entry] })
    }
    return groups
  }

  protected entityIcon(type: ActivityEntityType): string {
    return ENTITY_ICONS[type] ?? 'package'
  }

  protected visibleChanges(item: ActivityEntry): ActivityChange[] {
    return (item.changes ?? []).slice(0, MAX_INLINE_CHANGES)
  }

  protected hiddenChangeCount(item: ActivityEntry): number {
    return Math.max(0, (item.changes?.length ?? 0) - MAX_INLINE_CHANGES)
  }

  protected moreChangesLabel(count: number): string {
    return this.translation.translate('activity_more_changes').replace('{n}', String(count))
  }

  protected isoTime(timestamp: number): string {
    return new Date(timestamp).toISOString()
  }

  /** "לפני רגע" under a minute, then minutes / hours / days via Intl.RelativeTimeFormat('he'). */
  protected relativeTime(timestamp: number, now = Date.now()): string {
    const diffSec = Math.round((timestamp - now) / 1000)
    const abs = Math.abs(diffSec)
    if (abs < 60) return this.translation.translate('activity_just_now')
    if (abs < 3600) return this.relativeTimeFormat.format(Math.round(diffSec / 60), 'minute')
    if (abs < 86400) return this.relativeTimeFormat.format(Math.round(diffSec / 3600), 'hour')
    return this.relativeTimeFormat.format(Math.round(diffSec / 86400), 'day')
  }

  protected toggleChangePopover(activityId: string, field: string, event: Event): void {
    const current = this.openChange_()
    if (current && current.activityId === activityId && current.field === field) {
      this.openChange_.set(null)
      return
    }
    const el = event.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    this.openChange_.set({
      activityId,
      field,
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2
    })
  }

  /** "+N more changes" → the popover with every change of the entry. */
  protected toggleAllChanges(activityId: string, event: Event): void {
    this.toggleChangePopover(activityId, ALL_CHANGES_FIELD, event)
  }

  /** Activity entry for the currently open popover (used by fixed popover). */
  protected getOpenActivity(): ActivityEntry | undefined {
    const open = this.openChange_()
    if (!open) return undefined
    return this.getRecentActivity().find((e) => e.id === open.activityId)
  }

  /** Close popover when clicking outside; ignore clicks on the "+N" button (it toggles instead). */
  protected closeChangePopoverOnOutsideClick(target: HTMLElement): void {
    if (target.closest?.('.act-more')) return
    this.openChange_.set(null)
  }

  protected goToInventory(): void {
    void this.router.navigate(['/inventory'])
  }

  protected goToAddProduct(): void {
    void this.router.navigate(['/inventory', 'add'])
  }

  protected goToRecipeBook(): void {
    void this.router.navigate(['/recipe-book'])
  }

  protected goToRecipeBookUnapproved(): void {
    void this.router.navigate(['/recipe-book'], {
      queryParams: { filters: 'Approved:false' },
      queryParamsHandling: 'merge'
    })
  }

  protected goToInventoryLowStock(): void {
    void this.router.navigate(['/inventory'], {
      queryParams: { lowStock: '1' },
      queryParamsHandling: 'merge'
    })
  }

  private dayKey(timestamp: number): string {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }

  private dayLabel(timestamp: number): string {
    const today = new Date()
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    const key = this.dayKey(timestamp)
    if (key === this.dayKey(today.getTime())) return this.translation.translate('activity_today')
    if (key === this.dayKey(yesterday.getTime())) return this.translation.translate('activity_yesterday')
    return new Date(timestamp).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
  }
}
