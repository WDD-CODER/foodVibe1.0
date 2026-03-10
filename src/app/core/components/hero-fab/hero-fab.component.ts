import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { UserService } from '@services/user.service';
import type { HeroFabAction } from '@services/hero-fab.service';
import { HeroFabService } from '@services/hero-fab.service';

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
  private heroFab_ = inject(HeroFabService);
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;

  readonly isExpanded_ = signal(false);
  readonly isOnMenuIntelligence_ = signal(false);
  readonly isOnRecipeBuilder_ = signal(false);

  /** Actions to show: page-only (replace), page + default (append), or default only. */
  protected readonly effectiveActions_ = computed(() => {
    const state = this.heroFab_.pageActions();
    const defaultActions: HeroFabAction[] = [
      { labelKey: 'recipe_creation', icon: 'plus', run: () => this.goToRecipeBuilder() },
      { labelKey: 'cook', icon: 'cooking-pot', run: () => this.goToCook() }
    ];
    if (!state) return defaultActions;
    if (state.mode === 'replace') return state.actions;
    return [...state.actions, ...defaultActions];
  });

  constructor() {
    const setRoute = (): void => {
      const url = this.router.url;
      this.isOnMenuIntelligence_.set(url.includes('menu-intelligence'));
      this.isOnRecipeBuilder_.set(url.includes('recipe-builder'));
    };
    setRoute();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(setRoute);
  }

  expand(): void {
    this.isExpanded_.set(true);
  }

  collapse(): void {
    this.isExpanded_.set(false);
  }

  protected runAction(action: HeroFabAction): void {
    action.run();
    this.collapse();
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
