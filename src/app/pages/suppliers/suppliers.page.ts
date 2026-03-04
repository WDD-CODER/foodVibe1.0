import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [RouterOutlet],
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
