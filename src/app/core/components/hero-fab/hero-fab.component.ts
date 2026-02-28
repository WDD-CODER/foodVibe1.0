import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
