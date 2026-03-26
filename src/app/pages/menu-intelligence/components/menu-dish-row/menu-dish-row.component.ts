import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';
import { RecipeCostService } from '@services/recipe-cost.service';
import { MenuIntelligenceService } from '@services/menu-intelligence.service';
import { ALL_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model';
import { Recipe } from '@models/recipe.model';
import { filterOptionsByStartsWith } from 'src/app/core/utils/filter-starts-with.util';

@Component({
  selector: 'app-menu-dish-row',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ClickOutSideDirective,
    SelectOnFocusDirective,
    ScrollableDropdownComponent,
  ],
  templateUrl: './menu-dish-row.component.html',
  styleUrl: './menu-dish-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuDishRowComponent {
  // ── Injected ──────────────────────────────────────────────────────────────
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly menuIntelligence = inject(MenuIntelligenceService);

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly itemGroup = input.required<FormGroup>();
  readonly sectionIndex = input.required<number>();
  readonly itemIndex = input.required<number>();
  readonly recipes = input<Recipe[]>([]);
  readonly activeFields = input<DishFieldKey[]>([]);
  readonly dishSearchQuery = input<string>('');
  readonly highlightedIndex = input<number>(0);
  readonly isMetaExpanded = input<boolean>(false);
  readonly editingDishField = input<string | null>(null);
  readonly servingType = input<string>('plated_course');
  readonly guestCount = input<number>(0);
  readonly piecesPerPerson = input<number>(1);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly remove = output<void>();
  readonly selectRecipe = output<{ recipe: Recipe }>();
  readonly startEditName = output<void>();
  readonly searchQueryChange = output<string>();
  readonly metaToggle = output<void>();
  readonly editDishFieldStart = output<string>();
  readonly editDishFieldCommit = output<void>();
  readonly sellPriceKeydown = output<KeyboardEvent>();
  readonly dishFieldKeydown = output<{ fieldKey: string; event: KeyboardEvent }>();
  readonly dishSearchKeydown = output<KeyboardEvent>();
  readonly clearSearch = output<void>();

  // ── Read ──────────────────────────────────────────────────────────────────
  getRecipeName(recipeId: string): string {
    return this.recipes().find(r => r._id === recipeId)?.name_hebrew || '';
  }

  getInputWidth(value: unknown): string {
    const len = String(value ?? '').length;
    return `${Math.max(4, len + 2)}ch`;
  }

  isDishFieldReadOnly(fieldKey: DishFieldKey): boolean {
    return fieldKey === 'food_cost_money';
  }

  getDishFieldLabelKey(fieldKey: DishFieldKey): string {
    return ALL_DISH_FIELDS.find(f => f.key === fieldKey)?.labelKey ?? fieldKey;
  }

  isEditingField(fieldKey: string): boolean {
    return this.editingDishField() === `${this.sectionIndex()}-${this.itemIndex()}-${fieldKey}`;
  }

  getAutoFoodCost(): number {
    const item = this.itemGroup();
    const recipeId = item?.get('recipe_id_')?.value as string | undefined;
    if (!recipeId) return 0;
    const recipe = this.recipes().find(r => r._id === recipeId);
    if (!recipe) return 0;
    const derivedPortions = this.menuIntelligence.derivePortions(
      this.servingType(),
      this.guestCount(),
      Number(item.get('predicted_take_rate_')?.value ?? 0),
      this.piecesPerPerson(),
      Number(item.get('serving_portions')?.value ?? 1)
    );
    const baseYield = Math.max(1, recipe.yield_amount_ || 1);
    const multiplier = derivedPortions / baseYield;
    const scaledCost = this.recipeCostService.computeRecipeCost({
      ...recipe,
      ingredients_: recipe.ingredients_.map(ing => ({
        ...ing,
        amount_: (ing.amount_ || 0) * multiplier,
      })),
    });
    return Math.round(scaledCost * 100) / 100;
  }

  getFoodCostPerPortion(): number {
    const total = this.getAutoFoodCost();
    const derivedPortions = this.getDerivedPortions();
    return Math.round((total / Math.max(1, derivedPortions)) * 100) / 100;
  }

  getDerivedPortions(): number {
    const item = this.itemGroup();
    return this.menuIntelligence.derivePortions(
      this.servingType(),
      this.guestCount(),
      Number(item.get('predicted_take_rate_')?.value ?? 0),
      this.piecesPerPerson(),
      Number(item.get('serving_portions')?.value ?? 1)
    );
  }

  getFilteredRecipes(): Recipe[] {
    const raw = this.dishSearchQuery().trim();
    if (!raw) return [];
    const filtered = filterOptionsByStartsWith(this.recipes(), raw, (r) => r.name_hebrew ?? '');
    return filtered.slice(0, 12);
  }
}
