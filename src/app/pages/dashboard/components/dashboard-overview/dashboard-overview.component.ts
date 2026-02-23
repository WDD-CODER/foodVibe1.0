import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { KitchenStateService } from '@services/kitchen-state.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

type ActivityKind = 'product' | 'recipe';

interface ActivityItem {
  id: string;
  name: string;
  type: ActivityKind;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  private readonly kitchenState = inject(KitchenStateService);
  private readonly router = inject(Router);

  protected readonly totalProducts_ = computed(
    () => this.kitchenState.products_().length
  );

  protected readonly totalRecipes_ = computed(
    () => this.kitchenState.recipes_().length
  );

  protected readonly lowStockCount_ = computed(
    () => this.kitchenState.lowStockProducts_().length
  );

  protected readonly unapprovedCount_ = computed(() => {
    return this.kitchenState
      .recipes_()
      .filter(r => !r.is_approved_).length;
  });

  protected readonly recentActivity_ = computed<ActivityItem[]>(() => {
    const products = this.kitchenState.products_();
    const recipes = this.kitchenState.recipes_();
    const productItems: ActivityItem[] = products.map(p => ({
      id: p._id,
      name: p.name_hebrew,
      type: 'product',
    }));
    const recipeItems: ActivityItem[] = recipes.map(r => ({
      id: r._id,
      name: r.name_hebrew,
      type: 'recipe',
    }));
    const combined = [...productItems, ...recipeItems];
    return combined.slice(0, 5);
  });

  protected goToInventory(): void {
    void this.router.navigate(['/inventory']);
  }

  protected goToAddProduct(): void {
    void this.router.navigate(['/inventory', 'add']);
  }

  protected goToRecipeBuilder(type: 'preparation' | 'dish' = 'preparation'): void {
    void this.router.navigate(['/recipe-builder'], {
      queryParams: type === 'dish' ? { type: 'dish' } : {},
      queryParamsHandling: type === 'dish' ? 'merge' : '',
    });
  }

  protected goToRecipeBook(): void {
    void this.router.navigate(['/recipe-book']);
  }
}
