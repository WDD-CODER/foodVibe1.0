import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-equipment-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './equipment.page.html',
  styleUrl: './equipment.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentPage {
  readonly navRoutes_ = signal([
    { labelKey: 'equipment_list', path: 'list' },
    { labelKey: 'add_equipment', path: 'add' },
  ]);
}
