import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'inventory-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './inventory.page.html',
  styleUrl: './inventory.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryPage {
  readonly navItems_ = signal([
    { label: 'Produce List', path: 'list' },
    { label: 'Add Produce', path: 'add' },
    // { label: 'Edit', path: 'edit' }
  ]);
}
