import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import type { DashboardTab } from '../../dashboard.page';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHeaderComponent {
  readonly activeTab = input.required<DashboardTab>();
  readonly tabChange = output<DashboardTab>();

  private readonly router = inject(Router);

  protected goToSuppliers(): void {
    void this.router.navigate(['/suppliers']);
  }

  protected backToDashboard(): void {
    this.tabChange.emit('overview');
  }
}
