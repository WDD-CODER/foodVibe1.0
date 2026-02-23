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

export type DashboardTab = 'overview' | 'metadata';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    DashboardOverviewComponent,
    MetadataManagerComponent,
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
    return params['tab'] === 'metadata' ? 'metadata' : 'overview';
  });

  protected setTab(tab: DashboardTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: tab === 'metadata' ? { tab: 'metadata' } : {},
      queryParamsHandling: tab === 'metadata' ? 'merge' : '',
      replaceUrl: true,
    });
  }
}
