import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'

import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import type { DashboardTab } from '../../dashboard.page'

/** The header names the active tab — the same keys as its tab-chips label (plan 353). */
const TAB_TITLE_KEYS: Record<DashboardTab, string> = {
  overview: 'dashboard',
  metadata: 'metadata_manager',
  venues: 'venues',
  'add-venue': 'venues',
  trash: 'trash'
}

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeaderComponent {
  // Kept for API parity with dashboard.page.html's binding (Inventory 1 do-not-touch) even
  // though this component only ever mounts on the metadata tab now that the nav duplicating
  // app-tab-chips (venues/metadata/suppliers/trash) has been removed — see tab-chips.component.ts.
  readonly activeTab = input.required<DashboardTab>()
  readonly tabChange = output<DashboardTab>()

  protected readonly titleKey_ = computed(() => TAB_TITLE_KEYS[this.activeTab()])
}
