import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'

import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import type { DashboardTab } from '../../dashboard.page'

/** Title for each dashboard tab — the header names the tab, not "dashboard" again (plan 353). */
const TAB_TITLE_KEYS: Record<DashboardTab, string> = {
  overview: 'dashboard',
  metadata: 'metadata_manager',
  venues: 'venue_list',
  'add-venue': 'add_venue',
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

  /** No back button: the "לוח בקרה" tab chip returns to the overview (plan 367). */
  protected readonly titleKey = computed(() => TAB_TITLE_KEYS[this.activeTab()] ?? 'dashboard')
}
