import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecipeBookListComponent } from './recipe-book-list.component';
import { KitchenStateService } from '@services/kitchen-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { LucideAngularModule, Search, Trash2, Pencil, Plus, Menu, X, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-angular';
import { Recipe } from '@models/recipe.model';
import { TranslationService } from '@services/translation.service';

describe('RecipeBookListComponent', () => {
  let component: RecipeBookListComponent;
  let fixture: ComponentFixture<RecipeBookListComponent>;

  const mockRecipesSignal = signal<Recipe[]>([
    {
      _id: 'r1',
      name_hebrew: 'סלט ירקות',
      recipe_type_: 'dish',
      ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 100, unit_: 'gram' }],
      steps_: [],
      yield_amount_: 4,
      yield_unit_: 'dish',
      default_station_: '',
      is_approved_: true
    } as Recipe
  ]);

  const mockProductsSignal = signal([{ _id: 'p1', allergens_: ['gluten'] }]);

  beforeEach(async () => {
    const mockKitchenState = {
      recipes_: mockRecipesSignal,
      products_: mockProductsSignal,
      deleteRecipe: jasmine.createSpy('deleteRecipe').and.returnValue({ subscribe: () => {} })
    };

    await TestBed.configureTestingModule({
      imports: [
        RecipeBookListComponent,
        LucideAngularModule.pick({ Search, Trash2, Pencil, Plus, Menu, X, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown })
      ],
      providers: [
        { provide: KitchenStateService, useValue: mockKitchenState },
        { provide: RecipeCostService, useValue: { computeRecipeCost: () => 10 } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeBookListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute filtered recipes from kitchen state', () => {
    const filtered = (component as any).filteredRecipes_();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name_hebrew).toBe('סלט ירקות');
  });

  it('should aggregate allergens from product ingredients', () => {
    const recipe = mockRecipesSignal()[0];
    const allergens = (component as any).getRecipeAllergens(recipe);
    expect(allergens).toContain('gluten');
  });

  it('should change sort order when sort column is clicked', () => {
    (component as any).setSort('name');
    expect((component as any).sortBy_()).toBe('name');
    expect((component as any).sortOrder_()).toBe('asc');

    (component as any).setSort('name');
    expect((component as any).sortOrder_()).toBe('desc');

    (component as any).setSort('cost');
    expect((component as any).sortBy_()).toBe('cost');
    expect((component as any).sortOrder_()).toBe('asc');
  });

  it('should filter list when search input is set', () => {
    let filtered = (component as any).filteredRecipes_();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name_hebrew).toBe('סלט ירקות');

    (component as any).searchQuery_.set('סלט');
    fixture.detectChanges();
    filtered = (component as any).filteredRecipes_();
    expect(filtered.length).toBe(1);

    (component as any).searchQuery_.set('לא קיים');
    fixture.detectChanges();
    filtered = (component as any).filteredRecipes_();
    expect(filtered.length).toBe(0);
  });

  it('should call deleteRecipe when delete is confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const stateService = TestBed.inject(KitchenStateService);
    (stateService.deleteRecipe as jasmine.Spy).and.returnValue({ subscribe: () => {} });

    const recipe = mockRecipesSignal()[0];
    (component as any).onDeleteRecipe(recipe);

    expect(window.confirm).toHaveBeenCalledWith('האם אתה בטוח שברצונך למחוק?');
    expect(stateService.deleteRecipe).toHaveBeenCalledWith(recipe);
  });

  it('should not call deleteRecipe when delete is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const stateService = TestBed.inject(KitchenStateService);

    const recipe = mockRecipesSignal()[0];
    (component as any).onDeleteRecipe(recipe);

    expect(stateService.deleteRecipe).not.toHaveBeenCalled();
  });
});
