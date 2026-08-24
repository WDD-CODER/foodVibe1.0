import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'

import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import type { DashboardTab } from '../../dashboard.page'

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
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

  protected backToDashboard(): void {
    this.tabChange.emit('overview')
  }
}
