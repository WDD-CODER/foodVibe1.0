import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './suppliers.page.html',
  styleUrl: './suppliers.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersPage {
  readonly navRoutes_ = signal([
    { labelKey: 'supplier_list', path: 'list' },
    { labelKey: 'add_supplier', path: 'add' },
  ]);
}
