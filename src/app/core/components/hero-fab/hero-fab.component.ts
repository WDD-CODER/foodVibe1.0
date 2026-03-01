import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-hero-fab',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './hero-fab.component.html',
  styleUrl: './hero-fab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroFabComponent {
  private router = inject(Router);

  readonly isExpanded_ = signal(false);
  /** True when on menu-intelligence so FAB can sit above the financial bar. */
  readonly isOnMenuIntelligence_ = signal(false);

  constructor() {
    this.isOnMenuIntelligence_.set(this.router.url.includes('menu-intelligence'));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.isOnMenuIntelligence_.set(this.router.url.includes('menu-intelligence')));
  }

  expand(): void {
    this.isExpanded_.set(true);
  }

  collapse(): void {
    this.isExpanded_.set(false);
  }

  goToCook(): void {
    this.collapse();
    void this.router.navigate(['/cook']);
  }

  goToRecipeBuilder(): void {
    this.collapse();
    void this.router.navigate(['/recipe-builder']);
  }
}
