import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PermissionService } from '@services/permission.service'
import { PageHeaderComponent } from '../../shared/page-header/page-header.component'
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component'
import { SETTINGS_TABS, SettingsTab } from './settings-tabs'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { TeamTabComponent } from './components/team-tab/team-tab.component'
import { BusinessSettingsTabComponent } from './components/business-settings-tab/business-settings-tab.component'
import { BaselineTabComponent } from './components/baseline-tab/baseline-tab.component'
import { warnBeforeUnload } from 'src/app/core/utils/leave-warning.util'
import type { PendingChangesComponent } from 'src/app/core/guards/pending-changes.guard'

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    ScrollRailComponent,
    TeamTabComponent,
    BusinessSettingsTabComponent,
    BaselineTabComponent
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * The settings route has `canDeactivate: [pendingChangesGuard]` and runs it on query-param changes, so a tab switch
 * (`?tab=`) and leaving the page both ask when the open tab holds an unsaved value.
 */
export class SettingsPage implements PendingChangesComponent {
  // 1. INJECTED
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly permission = inject(PermissionService)

  // 4. SIGNALS & CONSTANTS
  private readonly business_ = viewChild(BusinessSettingsTabComponent)
  private readonly baseline_ = viewChild(BaselineTabComponent)
  private readonly queryParams_ = toSignal(this.route.queryParams, { initialValue: {} as Record<string, string> })

  // 5. COMPUTED
  /** Tabs the signed-in user may open; empty for staff. */
  readonly visibleTabs_ = computed(() => SETTINGS_TABS.filter((tab) => !tab.ownerOnly || this.permission.isOwner_()))

  /** The `?tab=` value when it is a visible tab, else the first visible tab. */
  readonly activeTab_ = computed<SettingsTab | null>(() => {
    const visible = this.visibleTabs_()
    const wanted = this.queryParams_()['tab']
    return visible.find((tab) => tab.key === wanted)?.key ?? visible[0]?.key ?? null
  })

  constructor() {
    warnBeforeUnload(() => this.hasRealChanges())
  }

  // 6. METHODS (UI handlers)
  /** The leave question's «שמור ועזוב»: saves the open tab; true when nothing is left unsaved. */
  async saveAndWait(): Promise<boolean> {
    const business = this.business_()
    if (business?.hasRealChanges()) return business.saveAll()
    const baseline = this.baseline_()
    if (baseline?.hasRealChanges()) return baseline.save()
    return true
  }

  /** Only the open tab is rendered, so only its form can hold edits. */
  hasRealChanges(): boolean {
    return !!this.business_()?.hasRealChanges() || !!this.baseline_()?.hasRealChanges()
  }

  setTab(tab: SettingsTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true })
  }
}
