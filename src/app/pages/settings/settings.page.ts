import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
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

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    ScrollRailComponent,
    TeamTabComponent
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPage {
  // 1. INJECTED
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly permission = inject(PermissionService)

  // 4. SIGNALS & CONSTANTS
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

  // 6. METHODS (UI handlers)
  setTab(tab: SettingsTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true })
  }
}
