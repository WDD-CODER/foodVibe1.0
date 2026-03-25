import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-venues-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  templateUrl: './venues.page.html',
  styleUrl: './venues.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenuesPage {
  private readonly router = inject(Router);

  readonly navRoutes_ = signal([
    { labelKey: 'add_venue', path: 'add' },
  ]);

  protected readonly isListRoute_ = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/venues/list')),
      startWith(this.router.url.startsWith('/venues/list')),
    )
  );

  goBackToList(): void {
    this.router.navigate(['/venues/list']);
  }
}
