import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { Router, ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'

import { DashboardOverviewComponent } from './components/dashboard-overview/dashboard-overview.component'
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component'
import { MetadataManagerComponent } from '../metadata-manager/metadata-manager.page.component'
import { VenueListComponent } from '../venues/components/venue-list/venue-list.component'
import { VenueFormComponent } from '../venues/components/venue-form/venue-form.component'
import { TrashPage } from '../trash/trash.page'
import type { PendingChangesComponent } from '../../core/guards/pending-changes.guard'

export type DashboardTab = 'overview' | 'metadata' | 'venues' | 'add-venue' | 'trash'

const TAB_QUERY_VALUES: Record<DashboardTab, string | null> = {
  overview: null,
  metadata: 'metadata',
  venues: 'venues',
  'add-venue': 'add-venue',
  trash: 'trash'
}

/**
 * Plan 482: the dashboard route has `canDeactivate: [pendingChangesGuard]` and runs it on query-param changes too,
 * so a tab switch (`?tab=`) and leaving the page both ask when the metadata tab holds unsaved coefficients.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardOverviewComponent,
    DashboardHeaderComponent,
    MetadataManagerComponent,
    VenueListComponent,
    VenueFormComponent,
    TrashPage
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements PendingChangesComponent {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  private readonly metadata = viewChild(MetadataManagerComponent)

  private readonly queryParams_ = toSignal(this.route.queryParams, {
    initialValue: {}
  })

  protected readonly activeTab = computed<DashboardTab>(() => {
    const params = this.queryParams_() as Record<string, string>
    const t = params['tab']
    if (t === 'metadata' || t === 'venues' || t === 'add-venue' || t === 'trash') return t
    return 'overview'
  })

  hasRealChanges(): boolean {
    return this.metadata()?.hasRealChanges() ?? false
  }

  confirmLeave(): Promise<boolean> {
    return this.metadata()?.confirmLeave() ?? Promise.resolve(true)
  }

  protected setTab(tab: DashboardTab): void {
    const value = TAB_QUERY_VALUES[tab]
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value ? { tab: value } : {},
      queryParamsHandling: value ? 'merge' : '',
      replaceUrl: true
    })
  }
}
