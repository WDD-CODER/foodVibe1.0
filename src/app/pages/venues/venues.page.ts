import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-venues-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './venues.page.html',
  styleUrl: './venues.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenuesPage {
  readonly navRoutes_ = signal([
    { labelKey: 'venue_list', path: 'list' },
    { labelKey: 'add_venue', path: 'add' },
  ]);
}
