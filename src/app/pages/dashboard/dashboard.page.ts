import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { DashboardOverviewComponent } from './components/dashboard-overview/dashboard-overview.component';
import { MetadataManagerComponent } from '../metadata-manager/metadata-manager.page.component';
import { VenueListComponent } from '../venues/components/venue-list/venue-list.component';
import { VenueFormComponent } from '../venues/components/venue-form/venue-form.component';
import { TrashPage } from '../trash/trash.page';

export type DashboardTab = 'overview' | 'metadata' | 'venues' | 'add-venue' | 'trash';

const TAB_QUERY_VALUES: Record<DashboardTab, string | null> = {
  overview: null,
  metadata: 'metadata',
  venues: 'venues',
  'add-venue': 'add-venue',
  trash: 'trash',
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    DashboardOverviewComponent,
    MetadataManagerComponent,
    VenueListComponent,
    VenueFormComponent,
    TrashPage,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams_ = toSignal(this.route.queryParams, {
    initialValue: {},
  });

  protected readonly activeTab = computed<DashboardTab>(() => {
    const params = this.queryParams_() as Record<string, string>;
    const t = params['tab'];
    if (t === 'metadata' || t === 'venues' || t === 'add-venue' || t === 'trash') return t;
    return 'overview';
  });

  protected setTab(tab: DashboardTab): void {
    const value = TAB_QUERY_VALUES[tab];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value ? { tab: value } : {},
      queryParamsHandling: value ? 'merge' : '',
      replaceUrl: true,
    });
  }
}
