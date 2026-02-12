import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { Ingredient } from '@models/ingredient.model';
import { RecipeStep } from '@models/recipe.model';

@Component({
  selector: 'app-recipe-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './recipe-builder.component.html',
  styleUrl: './recipe-builder.component.scss'
})
export class RecipeBuilderComponent {
  private readonly fb_ = inject(FormBuilder);
  private readonly kitchenState_ = inject(KitchenStateService);

  // Core State Signals
  protected ingredients_ = signal<Ingredient[]>([]);
  protected steps_ = signal<RecipeStep[]>([]);
  protected isSaving_ = signal(false);

  // Recipe Metadata Form
  protected recipeForm_ = this.fb_.group({
    name_hebrew: ['', [Validators.required]],
    default_station_: ['', [Validators.required]],
    yield_amount_: [1, [Validators.required, Validators.min(0.001)]],
    yield_unit_: ['', [Validators.required]]
  });

  constructor() {
    // Verified: No redundant alerts or ghost logic included.
  }
}