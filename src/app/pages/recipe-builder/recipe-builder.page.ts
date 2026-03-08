import { Component, inject, signal, computed, OnInit, DestroyRef, afterNextRender, Injector, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith, map, timer, switchMap, of, type Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { UserMsgService } from '@services/user-msg.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { VersionHistoryService } from '@services/version-history.service';
import type { VersionEntityType } from '@services/version-history.service';
import { Ingredient } from '@models/ingredient.model';
import { Recipe, RecipeStep, MiseCategory, FlatPrepItem, PrepCategory } from '@models/recipe.model';
import type { BaselineEntry, EquipmentPhase, LogisticsBaselineItem } from '@models/logistics.model';
import type { Equipment } from '@models/equipment.model';
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service';
import { LogisticsBaselineDataService } from '@services/logistics-baseline-data.service';
import { AddEquipmentModalService } from '@services/add-equipment-modal.service';
import { RecipeDataService } from '@services/recipe-data.service';
import { RecipeFormService } from './services/recipe-form.service';
import { DishDataService } from '@services/dish-data.service';
import { TranslationService } from '@services/translation.service';
import { LoggingService } from '@services/logging.service';
import { RecipeHeaderComponent } from './components/recipe-header/recipe-header.component';
import { RecipeIngredientsTableComponent } from './components/recipe-ingredients-table/recipe-ingredients-table.component';
import { RecipeWorkflowComponent } from './components/recipe-workflow/recipe-workflow.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util';

@Component({
  selector: 'app-recipe-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecipeHeaderComponent,
    RecipeIngredientsTableComponent,
    RecipeWorkflowComponent,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    ScrollableDropdownComponent,
    ClickOutSideDirective
  ],
  templateUrl: './recipe-builder.page.html',
  styleUrl: './recipe-builder.page.scss'
})
export class RecipeBuilderPage implements OnInit {
  private fb = inject(FormBuilder);
  private readonly state_ = inject(KitchenStateService);
  private readonly userMsg_ = inject(UserMsgService);
  private readonly route_ = inject(ActivatedRoute);
  private readonly router_ = inject(Router);
  private readonly unitRegistry_ = inject(UnitRegistryService);
  private readonly recipeCostService_ = inject(RecipeCostService);
  private readonly versionHistory_ = inject(VersionHistoryService);
  private readonly injector_ = inject(Injector);
  private readonly equipmentData_ = inject(EquipmentDataService);
  private readonly addEquipmentModal_ = inject(AddEquipmentModalService);
  private readonly metadataRegistry_ = inject(MetadataRegistryService);
  private readonly recipeDataService_ = inject(RecipeDataService);
  private readonly dishDataService_ = inject(DishDataService);
  private readonly recipeFormService_ = inject(RecipeFormService);
  private readonly logisticsBaselineData_ = inject(LogisticsBaselineDataService);
  private readonly translation_ = inject(TranslationService);
  private readonly logging_ = inject(LoggingService);

  //SIGNALS
  protected isSaving_ = signal(false);
  private recipeId_ = signal<string | null>(null);
  protected resetTrigger_ = signal(0);
  isSubmitted = false;

  /** Bumped when ingredients change so cost/weight computeds re-run (form is not a signal). */
  private ingredientsFormVersion_ = signal(0);

  /** When set, the ingredients table will focus the search input at this row index; cleared after focus. */
  protected focusIngredientSearchAtRow_ = signal<number | null>(null);

  /** When set, the workflow will focus the textarea (prep) or prep search (dish) at this row index; cleared after focus. */
  protected focusWorkflowRowAt_ = signal<number | null>(null);

  /** True when viewing an old version from history (read-only, no save). */
  protected historyViewMode_ = signal(false);

  /** Section cards collapsed by default (true = collapsed). */
  protected tableLogicCollapsed_ = signal(true);
  protected workflowLogicCollapsed_ = signal(true);
  protected logisticsLogicCollapsed_ = signal(true);

  protected toggleTableLogic(): void {
    const next = !this.tableLogicCollapsed_();
    this.tableLogicCollapsed_.set(next);
    localStorage.setItem('rb_col_ingredients', JSON.stringify(next));
  }
  protected toggleWorkflowLogic(): void {
    const next = !this.workflowLogicCollapsed_();
    this.workflowLogicCollapsed_.set(next);
    localStorage.setItem('rb_col_workflow', JSON.stringify(next));
  }
  protected toggleLogisticsLogic(): void {
    const next = !this.logisticsLogicCollapsed_();
    this.logisticsLogicCollapsed_.set(next);
    localStorage.setItem('rb_col_logistics', JSON.stringify(next));
  }

  //COMPUTED
  protected totalCost_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue() as { ingredients?: { total_cost?: number }[] };
    const ingredients = raw?.ingredients || [];
    return ingredients.reduce((acc: number, ing: { total_cost?: number }) => acc + (ing.total_cost || 0), 0);
  });

  protected totalWeightG_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue() as { total_weight_g?: number };
    return raw?.total_weight_g ?? 0;
  });

  protected totalBrutoWeightG_ = signal(0);
  protected totalVolumeL_ = signal(0);
  protected totalVolumeMl_ = signal(0);
  protected unconvertibleForWeight_ = signal<string[]>([]);
  protected unconvertibleForVolume_ = signal<string[]>([]);

  protected recipeForm_ = this.fb.group(
    {
      name_hebrew: ['', Validators.required],
      recipe_type: ['preparation'],
      serving_portions: [1, [Validators.required, Validators.min(1)]],
      yield_conversions: this.fb.array([
        this.fb.group({ amount: [0], unit: ['gram'] })
      ]),
      ingredients: this.fb.array([]),
      workflow_items: this.fb.array([]),
      total_weight_g: [0],
      total_cost: [0],
      labels: [[] as string[]],
      logistics: this.fb.group({
        baseline_: this.fb.array([])
      })
    },
    { validators: (c) => this.recipeFormValidator_(c) }
  );

  protected portions_ = toSignal(
    this.recipeForm_.get('serving_portions')!.valueChanges.pipe(
      startWith(this.recipeForm_.get('serving_portions')?.value ?? 1)
    ),
    { initialValue: 1 }
  );

  protected recipeType_ = toSignal(
    this.recipeForm_.get('recipe_type')!.valueChanges.pipe(
      startWith(this.recipeForm_.get('recipe_type')?.value ?? 'preparation'),
      map((v: string | null) => (v === 'dish' ? 'dish' : 'preparation'))
    ),
    { initialValue: 'preparation' as const }
  );

  /** Auto-labels from current form ingredients (for header preview). */
  protected liveAutoLabels_ = computed(() => {
    this.ingredientsFormVersion_();
    const raw = this.recipeForm_.getRawValue() as { ingredients?: { referenceId?: string; item_type?: string }[] };
    const rows = raw?.ingredients ?? [];
    const productIds = rows
      .filter((r: { referenceId?: string; item_type?: string }) => r?.referenceId && r?.item_type !== 'recipe')
      .map((r: { referenceId?: string }) => r.referenceId!);
    const products = this.state_.products_().filter(p => productIds.includes(p._id));
    const triggerSet = new Set<string>();
    products.forEach(p => {
      (p.categories_ ?? []).forEach(c => triggerSet.add(c));
      (p.allergens_ ?? []).forEach(a => triggerSet.add(a));
    });
    return this.metadataRegistry_.allLabels_()
      .filter(def => def.autoTriggers?.some(t => triggerSet.has(t)))
      .map(def => def.key);
  });

  private destroyRef = inject(DestroyRef);

  private cachedPrepItems_: { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number; unit?: string }[] = [];
  private cachedSteps_: { order?: number; instruction?: string; labor_time?: number }[] = [];

  constructor() {
    this.ingredientsArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateTotalWeightG();
        this.ingredientsFormVersion_.update(v => v + 1);
      });

    this.recipeForm_.get('recipe_type')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onRecipeTypeChange(type));
  }

  private onRecipeTypeChange(type: string | null): void {
    if (type == null) return;
    const isDish = type === 'dish';
    const wasDish = !isDish;

    if (wasDish) {
      const rows = this.workflowArray.controls.map(c => c.getRawValue() as { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number; unit?: string });
      this.cachedPrepItems_ = rows;
    } else {
      const rows = this.workflowArray.controls.map(c => c.getRawValue() as { order?: number; instruction?: string; labor_time?: number });
      this.cachedSteps_ = rows;
    }

    this.workflowArray.clear();
    if (isDish) {
      if (this.cachedPrepItems_.length > 0) {
        this.cachedPrepItems_.forEach(row => this.workflowArray.push(this.recipeFormService_.createPrepItemRow(row)));
      } else {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
      }
    } else {
      if (this.cachedSteps_.length > 0) {
        this.cachedSteps_.forEach((step, i) =>
      this.workflowArray.push(this.recipeFormService_.createStepGroup(step.order ?? i + 1))
        );
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
      }
    }
  }

  /** Resets the form to a blank state for creating a new recipe/dish. */
  private resetToNewForm_(): void {
    this.recipeId_.set(null);
    this.cachedPrepItems_ = [];
    this.cachedSteps_ = [];

    this.recipeForm_.patchValue(
      {
        name_hebrew: '',
        recipe_type: 'preparation',
        serving_portions: 1,
        total_weight_g: 0,
        total_cost: 0,
        labels: []
      },
      { emitEvent: false }
    );

    this.yieldConversionsArray.clear();
    this.yieldConversionsArray.push(this.fb.group({ amount: [0], unit: ['gram'] }));

    this.ingredientsArray.clear();
    this.addNewIngredientRow();
    this.workflowArray.clear();
    this.workflowArray.push(this.recipeFormService_.createStepGroup(1));

    this.logisticsBaselineArray.clear();

    this.recipeForm_.updateValueAndValidity({ emitEvent: false });
    this.recipeForm_.markAsPristine();
    this.resetTrigger_.update(v => v + 1);
  }

  private updateTotalWeightG(): void {
    const raw = this.recipeForm_.getRawValue() as {
      ingredients?: { amount_net?: number; unit?: string; referenceId?: string; item_type?: string; name_hebrew?: string }[];
    };
    const rows = raw?.ingredients || [];
    const weight = this.recipeCostService_.computeTotalWeightG(rows);
    this.recipeForm_.get('total_weight_g')?.setValue(Math.round(weight), { emitEvent: false });
    this.totalBrutoWeightG_.set(Math.round(this.recipeCostService_.computeTotalBrutoWeightG(rows)));
    const vol = this.recipeCostService_.computeTotalVolumeL(rows);
    this.totalVolumeL_.set(vol.totalL);
    this.totalVolumeMl_.set(vol.totalL * 1000);
    this.unconvertibleForWeight_.set(this.recipeCostService_.getUnconvertibleNamesForWeight(rows));
    this.unconvertibleForVolume_.set(vol.unconvertibleNames);
  }

  async ngOnInit(): Promise<void> {
    const lsIngredients = localStorage.getItem('rb_col_ingredients');
    if (lsIngredients !== null) this.tableLogicCollapsed_.set(JSON.parse(lsIngredients));
    const lsWorkflow = localStorage.getItem('rb_col_workflow');
    if (lsWorkflow !== null) this.workflowLogicCollapsed_.set(JSON.parse(lsWorkflow));
    const lsLogistics = localStorage.getItem('rb_col_logistics');
    if (lsLogistics !== null) this.logisticsLogicCollapsed_.set(JSON.parse(lsLogistics));

    const q = this.route_.snapshot.queryParams;
    const view = q['view'];
    const entityType = q['entityType'] as string | undefined;
    const entityId = q['entityId'];
    const versionAtStr = q['versionAt'];

    if (view === 'history' && entityType && entityId && versionAtStr) {
      const versionAt = Number(versionAtStr);
      if (!Number.isNaN(versionAt) && (entityType === 'recipe' || entityType === 'dish')) {
        const entry = await this.versionHistory_.getVersionEntry(
          entityType as VersionEntityType,
          entityId,
          versionAt
        );
        if (entry && (entry.entityType === 'recipe' || entry.entityType === 'dish')) {
          const snapshot = entry.snapshot as Recipe;
          this.patchFormFromRecipe(snapshot);
          this.historyViewMode_.set(true);
          this.recipeForm_.disable();
        } else {
          this.userMsg_.onSetErrorMsg('גרסה לא נמצאה');
        }
      }
    } else {
      const recipe = this.route_.snapshot.data['recipe'] as Recipe | null;
      if (recipe) {
        this.recipeId_.set(recipe._id);
        this.patchFormFromRecipe(recipe);
      } else {
        const type = this.route_.snapshot.queryParams['type'] as string | undefined;
        if (type === 'dish') {
          this.recipeForm_.patchValue({
            recipe_type: 'dish',
            serving_portions: 1,
          }, { emitEvent: false });
          this.yieldConversionsArray.clear();
          this.yieldConversionsArray.push(this.fb.group({ amount: [1], unit: ['dish'] }));
          this.workflowArray.clear();
          this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
        }
      }
    }

    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
      runInInjectionContext(this.injector_, () => {
        afterNextRender(() => this.focusIngredientSearchAtRow_.set(0));
      });
    }
    if (this.workflowArray.length === 0) {
      const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';
      if (isDish) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1));
      }
    }
    this.recipeForm_.get('name_hebrew')?.setAsyncValidators([(ctrl) => this.duplicateNameValidator_(ctrl)]);
    this.recipeForm_.get('recipe_type')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recipeForm_.get('name_hebrew')?.updateValueAndValidity({ emitEvent: false }));
    this.updateTotalWeightG();
    this.recipeForm_.markAsPristine();
  }

  /** Async validator: duplicate recipe/dish name by type (excludes current id when editing). */
  private duplicateNameValidator_(control: AbstractControl): Observable<ValidationErrors | null> {
    return timer(300).pipe(
      switchMap(() => {
        const name = (control.value ?? '').toString().trim();
        if (!name) return of(null);
        const type = this.recipeForm_.get('recipe_type')?.value === 'dish' ? 'dish' : 'preparation';
        const currentId = this.recipeId_();
        const list = type === 'dish' ? this.dishDataService_.allDishes_() : this.recipeDataService_.allRecipes_();
        const isDup = list.some(
          (r) => (r.name_hebrew?.trim() ?? '') === name && r._id !== currentId
        );
        return of(isDup ? { duplicateName: true } : null);
      })
    );
  }

  /** Normalize label keys: map Hebrew or orphan keys to current registry keys so dropdown filter works. */
  private normalizeLabelKeys(rawLabels: string[]): string[] {
    if (!rawLabels?.length) return [];
    const registryKeys = new Set(this.metadataRegistry_.allLabels_().map((def) => def.key));
    return rawLabels
      .map((label) => {
        const trimmed = (label ?? '').trim();
        if (!trimmed) return null;
        if (registryKeys.has(trimmed)) return trimmed;
        const labelDisplay = this.translation_.translate(trimmed);
        const match = this.metadataRegistry_.allLabels_().find(
          (def) => this.translation_.translate(def.key) === labelDisplay
        );
        return match ? match.key : null;
      })
      .filter((k): k is string => k != null);
  }

  private patchFormFromRecipe(recipe: Recipe): void {
    const isDish = recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.mise_categories_?.length);
    const normalizedLabels = this.normalizeLabelKeys(recipe.labels_ ?? []);
    this.recipeForm_.patchValue({
      name_hebrew: recipe.name_hebrew,
      recipe_type: isDish ? 'dish' : 'preparation',
      serving_portions: isDish ? recipe.yield_amount_ : 1,
      total_weight_g: 0,
      total_cost: 0,
      labels: normalizedLabels
    });

    const yieldConv = this.yieldConversionsArray.at(0);
    if (yieldConv) {
      if (isDish) {
        yieldConv.patchValue({ amount: recipe.yield_amount_, unit: 'dish' });
      } else {
        yieldConv.patchValue({ amount: recipe.yield_amount_, unit: recipe.yield_unit_ });
      }
    }

    this.ingredientsArray.clear();
    recipe.ingredients_.forEach(ing => {
      const item = this.state_.products_().find(p => p._id === ing.referenceId)
        ?? this.state_.recipes_().find(r => r._id === ing.referenceId);
      const itemForGroup = item ? {
        _id: ing.referenceId,
        name_hebrew: item.name_hebrew,
        item_type_: ing.type,
        base_unit_: (item as { base_unit_?: string }).base_unit_ ?? ing.unit_,
        yield_percentage: 1
      } : null;
      this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup(itemForGroup as { _id: string; name_hebrew: string; item_type_: string; base_unit_: string; yield_percentage?: number } | null));
      const lastGroup = this.ingredientsArray.at(this.ingredientsArray.length - 1);
      lastGroup.patchValue({
        referenceId: ing.referenceId,
        item_type: ing.type,
        amount_net: ing.amount_,
        unit: ing.unit_,
        total_cost: ing.calculatedCost_ ?? this.recipeCostService_.getCostForIngredient(ing)
      });
    });

    this.workflowArray.clear();
    if (isDish) {
      const prepRows = this.getPrepRowsFromRecipe(recipe);
      if (prepRows.length > 0) {
        prepRows.forEach(row => this.workflowArray.push(this.recipeFormService_.createPrepItemRow(row)));
      } else {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow());
      }
    } else {
      recipe.steps_.forEach((step, i) => {
        const group = this.recipeFormService_.createStepGroup(step.order_ ?? i + 1);
        group.patchValue({
          instruction: step.instruction_,
          labor_time: step.labor_time_minutes_ ?? 0
        });
        this.workflowArray.push(group);
      });
    }

    if (recipe.logistics_?.baseline_?.length) {
      this.logisticsBaselineArray.clear();
      recipe.logistics_.baseline_.forEach(entry =>
        this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow(entry))
      );
    }
  }



  //GETTERS
  get yieldConversionsArray() {
    return this.recipeForm_.get('yield_conversions') as FormArray;
  }

  get workflowArray() {
    return this.recipeForm_.get('workflow_items') as FormArray;
  }

  get ingredientsArray() {
    return this.recipeForm_.get('ingredients') as FormArray;
  }

  protected get logisticsBaselineArray(): FormArray {
    return (this.recipeForm_.get('logistics') as FormGroup)?.get('baseline_') as FormArray;
  }

  /** For route guard: true when there are unsaved edits (excludes history view and disabled form). */
  hasUnsavedEdits(): boolean {
    if (this.historyViewMode_() || this.recipeForm_.disabled) return false;
    return this.recipeForm_.dirty === true;
  }

  protected get allEquipment_() {
    return this.equipmentData_.allEquipment_();
  }

  protected equipmentOptions_ = computed(() =>
    this.equipmentData_.allEquipment_().map((eq) => ({ value: eq._id, label: eq.name_hebrew }))
  );

  protected phaseOptions_: { value: string; label: string }[] = [
    { value: 'prep', label: 'phase_prep' },
    { value: 'service', label: 'phase_service' },
    { value: 'both', label: 'phase_both' }
  ];

  protected logisticsToolSearchQuery_ = signal('');
  protected logisticsToolQuantity_ = signal(1);
  protected logisticsToolDropdownOpen_ = signal(false);
  protected logisticsHighlightedIndex_ = signal(-1);
  /** Selected equipment id (from dropdown); user sets quantity then presses Add. */
  protected logisticsSelectedToolId_ = signal<string | null>(null);
  /** When user selected a library item, we keep it so Add uses its phase/notes. */
  private logisticsSelectedLibraryItem_ = signal<LogisticsBaselineItem | null>(null);

  /** Equipment IDs already in the logistics baseline (excluded from equipment search options). */
  private logisticsBaselineIds_ = toSignal(
    (this.logisticsBaselineArray.valueChanges as Observable<unknown>).pipe(
      startWith(this.logisticsBaselineArray.value),
      map((arr: unknown) =>
        (arr as { equipment_id_?: string }[]).map((r) => r.equipment_id_).filter(Boolean) as string[]
      )
    ),
    { initialValue: [] as string[] }
  );

  /** Unified search options: library items (by equipment name) + all equipment (by name_hebrew). */
  protected logisticsSearchOptions_ = computed((): ({ type: 'library'; item: LogisticsBaselineItem } | { type: 'equipment'; item: Equipment })[] => {
    const q = this.logisticsToolSearchQuery_().trim().toLowerCase();
    if (!q) return [];
    const alreadyAdded = new Set(this.logisticsBaselineIds_() ?? []);
    const options: ({ type: 'library'; item: LogisticsBaselineItem } | { type: 'equipment'; item: Equipment })[] = [];
    const allLibrary = this.logisticsBaselineData_.allItems_();
    const allEquipment = this.equipmentData_.allEquipment_();
    for (const item of allLibrary) {
      const name = this.getEquipmentNameById(item.equipment_id_).toLowerCase();
      if (name.includes(q)) {
        options.push({ type: 'library', item });
      }
    }
    const equipmentMatches = allEquipment
      .filter((eq) => !alreadyAdded.has(eq._id) && eq.name_hebrew.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        const aName = a.name_hebrew.toLowerCase();
        const bName = b.name_hebrew.toLowerCase();
        const aStarts = aName.startsWith(q) ? 0 : 1;
        const bStarts = bName.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return aName.indexOf(q) - bName.indexOf(q);
      });
    equipmentMatches.forEach((eq) => options.push({ type: 'equipment', item: eq }));
    return options;
  });

  protected getEquipmentNameById(id: string): string {
    const eq = this.equipmentData_.allEquipment_().find(e => e._id === id);
    return eq?.name_hebrew ?? id;
  }

  protected incrementLogisticsQuantity(): void {
    this.logisticsToolQuantity_.update(q => quantityIncrement(q, 1, { integerOnly: true }));
  }

  protected decrementLogisticsQuantity(): void {
    this.logisticsToolQuantity_.update(q => quantityDecrement(q, 1, { integerOnly: true }));
  }

  /** Select an option from dropdown (does not add yet; user sets quantity and presses Add). */
  protected selectLogisticsOption(option: { type: 'library'; item: LogisticsBaselineItem } | { type: 'equipment'; item: Equipment }): void {
    if (option.type === 'library') {
      this.logisticsSelectedToolId_.set(option.item.equipment_id_);
      this.logisticsToolQuantity_.set(option.item.quantity_);
      this.logisticsSelectedLibraryItem_.set(option.item);
      this.logisticsToolSearchQuery_.set(this.getEquipmentNameById(option.item.equipment_id_));
    } else {
      this.logisticsSelectedToolId_.set(option.item._id);
      this.logisticsToolQuantity_.set(1);
      this.logisticsSelectedLibraryItem_.set(null);
      this.logisticsToolSearchQuery_.set(option.item.name_hebrew);
    }
    this.logisticsToolDropdownOpen_.set(false);
  }

  protected onLogisticsSearchInput(value: string): void {
    this.logisticsToolSearchQuery_.set(value);
    this.logisticsHighlightedIndex_.set(-1);
    this.logisticsToolDropdownOpen_.set(value.trim().length > 0);
    const selectedId = this.logisticsSelectedToolId_();
    if (selectedId && this.getEquipmentNameById(selectedId) !== value) {
      this.logisticsSelectedToolId_.set(null);
      this.logisticsSelectedLibraryItem_.set(null);
    }
  }

  protected onLogisticsSearchKeydown(event: KeyboardEvent): void {
    if (!this.logisticsToolDropdownOpen_()) return;
    const opts = this.logisticsSearchOptions_();
    const len = opts.length + 1; // +1 for 'add new tool'
    let idx = this.logisticsHighlightedIndex_();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      idx = Math.min(idx + 1, len - 1);
      this.logisticsHighlightedIndex_.set(idx);
      this.scrollLogisticsDropdownToItem(idx);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      idx = Math.max(idx - 1, 0);
      this.logisticsHighlightedIndex_.set(idx);
      this.scrollLogisticsDropdownToItem(idx);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (idx >= 0 && idx < opts.length) {
        this.selectLogisticsOption(opts[idx]);
        this.logisticsHighlightedIndex_.set(-1);
      } else if (idx === opts.length) {
        this.openAddNewToolModal();
        this.logisticsHighlightedIndex_.set(-1);
      }
    } else if (event.key === 'Escape') {
      this.logisticsToolDropdownOpen_.set(false);
      this.logisticsHighlightedIndex_.set(-1);
    }
  }

  private scrollLogisticsDropdownToItem(index: number) {
    setTimeout(() => {
      const dropdown = document.querySelector('.logistics-tool-dropdown');
      if (!dropdown) return;
      const items = dropdown.querySelectorAll('.logistics-tool-option');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }, 0);
  }

  /** Add the currently selected item (with current quantity) to baseline. Called by Add button. */
  protected addSelectedToolToBaseline(): void {
    const id = this.logisticsSelectedToolId_();
    if (!id) return;
    const lib = this.logisticsSelectedLibraryItem_();
    const qty = this.logisticsToolQuantity_();
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow({
      equipment_id_: id,
      quantity_: qty,
      phase_: lib ? lib.phase_ : 'both',
      is_critical_: lib ? lib.is_critical_ : true,
      notes_: lib?.notes_
    }));
    this.recipeForm_.markAsDirty();
    this.logisticsSelectedToolId_.set(null);
    this.logisticsSelectedLibraryItem_.set(null);
    this.logisticsToolSearchQuery_.set('');
    this.logisticsToolQuantity_.set(1);
    this.logisticsToolDropdownOpen_.set(false);
  }

  /** Add button click: if something selected → add to baseline; if only search text → open add-new-equipment modal. */
  protected onLogisticsAddClick(): void {
    if (this.logisticsSelectedToolId_()) {
      this.addSelectedToolToBaseline();
      return;
    }
    if (this.logisticsToolSearchQuery_().trim()) {
      this.openAddNewToolModal();
    }
  }

  protected async openAddNewToolModal(): Promise<void> {
    this.logisticsToolDropdownOpen_.set(false);
    const initialName = this.logisticsToolSearchQuery_().trim() || undefined;
    const result = await this.addEquipmentModal_.open(initialName);
    if (!result?.name?.trim()) return;
    try {
      const now = new Date().toISOString();
      const created = await this.equipmentData_.addEquipment({
        name_hebrew: result.name.trim(),
        category_: result.category,
        owned_quantity_: 0,
        is_consumable_: false,
        created_at_: now,
        updated_at_: now
      });
      this.logisticsSelectedToolId_.set(created._id);
      this.logisticsToolSearchQuery_.set(created.name_hebrew);
      this.logisticsToolQuantity_.set(1);
      this.logisticsSelectedLibraryItem_.set(null);
    } catch (err) {
      this.logging_.error({ event: 'recipe_builder.save_error', message: 'Recipe builder save error (add tool)', context: { err } });
      const msg = err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
        ? (this.translation_.translate('duplicate_equipment_name') ?? 'כלי עם שם זה כבר קיים')
        : 'שגיאה בהוספת הכלי';
      this.userMsg_.onSetErrorMsg(msg);
    }
  }

  //CREATE

  /** Requires at least one ingredient with product/recipe selected and quantity > 0. */
  private recipeFormValidator_(control: AbstractControl): ValidationErrors | null {
    const ingredients = (control.get('ingredients')?.value || []) as { referenceId?: string; amount_net?: number | string }[];
    const hasValid = ingredients.some(ing => {
      if (!ing?.referenceId) return false;
      const amt = ing.amount_net;
      const num = typeof amt === 'number' ? amt : Number(amt);
      return amt != null && amt !== '' && !isNaN(num) && num > 0;
    });
    return hasValid ? null : { atLeastOneIngredient: true };
  }

  private getPrepRowsFromRecipe(recipe: Recipe): { preparation_name: string; category_name: string; main_category_name: string; quantity: number; unit: string }[] {
    if (recipe.prep_items_?.length) {
      return recipe.prep_items_.map(p => ({
        preparation_name: p.preparation_name,
        category_name: p.category_name,
        main_category_name: p.category_name,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? 'unit'
      }));
    }
    if (recipe.mise_categories_?.length) {
      const rows: { preparation_name: string; category_name: string; main_category_name: string; quantity: number; unit: string }[] = [];
      recipe.mise_categories_.forEach(cat => {
        cat.items.forEach(it => {
          rows.push({
            preparation_name: it.item_name,
            category_name: cat.category_name,
            main_category_name: cat.category_name,
            quantity: it.quantity ?? 1,
            unit: it.unit ?? 'unit'
          });
        });
      });
      return rows;
    }
    return [];
  }

  protected addBaselineRow(): void {
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow());
    this.recipeForm_.markAsDirty();
  }

  protected removeBaselineRow(index: number): void {
    this.logisticsBaselineArray.removeAt(index);
    this.recipeForm_.markAsDirty();
  }

  protected addFromLibrary(item: LogisticsBaselineItem): void {
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow({
      equipment_id_: item.equipment_id_,
      quantity_: item.quantity_,
      phase_: item.phase_,
      is_critical_: item.is_critical_,
      notes_: item.notes_
    }));
    this.recipeForm_.markAsDirty();
    this.logisticsToolSearchQuery_.set('');
    this.logisticsToolDropdownOpen_.set(false);
  }

  addNewStep(category?: string | void): void {
    const nextOrder = this.workflowArray.length + 1;
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';

    const newGroup = isDish
      ? this.recipeFormService_.createPrepItemRow({ category_name: (category as string) || '', main_category_name: (category as string) || '' })
      : this.recipeFormService_.createStepGroup(nextOrder);

    this.workflowArray.push(newGroup);
    this.focusWorkflowRowAt_.set(this.workflowArray.length - 1);
  }

  //UPDATE

  addNewIngredientRow(): void {
    const newGroup = this.recipeFormService_.createIngredientGroup();
    this.ingredientsArray.push(newGroup);
    this.ingredientsArray.updateValueAndValidity();
    this.recipeForm_.get('ingredients')?.markAsDirty();
    this.focusIngredientSearchAtRow_.set(this.ingredientsArray.length - 1);
  }

  protected onIngredientSearchFocusDone(): void {
    this.focusIngredientSearchAtRow_.set(null);
  }

  saveRecipe(): void {
    if (this.recipeForm_.invalid) {
      this.recipeForm_.markAllAsTouched();
      const msg = this.getRecipeValidationError_();
      this.userMsg_.onSetErrorMsg(msg);
      return;
    }

    this.isSaving_.set(true);
    const recipe = this.buildRecipeFromForm();
    recipe.autoLabels_ = this.computeAutoLabels_(recipe);

    this.state_.saveRecipe(recipe).subscribe({
      next: () => {
        this.isSaving_.set(false);
        this.isSubmitted = true;
        this.resetToNewForm_();
        this.router_.navigate(['/recipe-builder']);
      },
      error: () => {
        this.isSaving_.set(false);
      }
    });
  }

  navigateBackFromHistory(): void {
    this.router_.navigate(['/recipe-book']);
  }

  onPrint(): void {
    window.print();
  }

  /** Returns a user-friendly validation error message listing exactly what is missing. */
  private getRecipeValidationError_(): string {
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish';
    const errors: string[] = [];

    const name = (this.recipeForm_.get('name_hebrew')?.value ?? '').toString().trim();
    if (this.recipeForm_.get('name_hebrew')?.errors?.['duplicateName']) {
      errors.push(isDish ? 'שם מנה זה כבר קיים' : 'שם מתכון זה כבר קיים');
    }
    if (!name) {
      errors.push(isDish ? 'שם המנה חסר' : 'שם המתכון חסר');
    }

    const raw = this.recipeForm_.getRawValue() as {
      ingredients?: { referenceId?: string; amount_net?: number | string; name_hebrew?: string }[];
      workflow_items?: { preparation_name?: string; quantity?: number | string; unit?: string }[];
    };
    const ingredients = raw?.ingredients || [];
    const hasAnyIngredient = ingredients.some((ing: { referenceId?: string }) => !!ing?.referenceId);
    if (!hasAnyIngredient) {
      errors.push('חסר מרכיב: יש לבחור לפחות מוצר או מתכון אחד');
    }
    ingredients.forEach((ing: { referenceId?: string; amount_net?: number | string; name_hebrew?: string }, i: number) => {
      if (!ing?.referenceId) return;
      const amt = ing.amount_net;
      const numAmt = typeof amt === 'number' ? amt : Number(amt);
      const label = ing.name_hebrew || `מרכיב ${i + 1}`;
      if (amt == null || amt === '' || isNaN(numAmt) || numAmt < 0) {
        errors.push(`כמות חסרה עבור "${label}"`);
      } else if (numAmt === 0) {
        errors.push(`כמות עבור "${label}" חייבת להיות גדולה מ-0`);
      }
    });

    const portions = this.recipeForm_.get('serving_portions')?.value;
    if (isDish && (portions == null || Number(portions) < 1)) {
      errors.push('מספר מנות חסר או לא תקין (נדרש לפחות 1)');
    }

    const workflowRows = raw?.workflow_items || [];
    if (isDish) {
      workflowRows.forEach((row: { preparation_name?: string; quantity?: number | string; unit?: string }, i: number) => {
        if (!row?.preparation_name?.trim()) return;
        const qty = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity);
        if (row.quantity == null || row.quantity === '' || isNaN(qty) || qty < 0) {
          errors.push(`כמות חסרה עבור ההכנה "${row.preparation_name}"`);
        }
        if (!row?.unit?.trim()) {
          errors.push(`יחידה חסרה עבור ההכנה "${row.preparation_name}"`);
        }
      });
    }

    if (errors.length === 0) {
      return 'יש למלא את כל השדות הנדרשים';
    }
    return errors.length === 1 ? errors[0] : `חסרים: ${errors.join('; ')}`;
  }

  private buildRecipeFromForm(): Recipe {
    const raw = this.recipeForm_.getRawValue() as Record<string, unknown>;
    const isDish = raw['recipe_type'] === 'dish';

    type IngRow = { referenceId?: string; item_type?: string; amount_net?: number; unit?: string; total_cost?: number };
    const rawIngredients = (raw['ingredients'] || []) as IngRow[];
    const ingredients: Ingredient[] = rawIngredients
      .filter(ing => !!ing?.referenceId)
      .map(ing => ({
        _id: 'ing_' + Math.random().toString(36).slice(2, 9),
        referenceId: ing.referenceId!,
        type: (ing.item_type === 'recipe' ? 'recipe' : 'product') as 'product' | 'recipe',
        amount_: ing.amount_net ?? 0,
        unit_: ing.unit ?? '',
        calculatedCost_: ing.total_cost ?? 0
      }));

    const steps: RecipeStep[] = [];
    let prepItems: FlatPrepItem[] | undefined;
    let prepCategories: PrepCategory[] | undefined;

    if (isDish) {
      type PrepRow = { preparation_name?: string; category_name?: string; quantity?: number | string; unit?: string };
      const rows = (raw['workflow_items'] || []) as PrepRow[];
      prepItems = rows
        .filter(r => !!r?.preparation_name?.trim())
        .map(r => {
          const qty = typeof r.quantity === 'number' ? r.quantity : (Number(r.quantity) || 1);
          return {
            preparation_name: r.preparation_name ?? '',
            category_name: r.category_name ?? '',
            quantity: qty,
            unit: r.unit ?? 'unit'
          };
        });

      const byCategory = new Map<string, { item_name: string; unit: string; quantity?: number }[]>();
      prepItems.forEach(p => {
        const list = byCategory.get(p.category_name) ?? [];
        list.push({ item_name: p.preparation_name, unit: p.unit, quantity: p.quantity });
        byCategory.set(p.category_name, list);
      });
      prepCategories = Array.from(byCategory.entries()).map(([category_name, items]) => ({
        category_name,
        items: items.map(it => ({ item_name: it.item_name, unit: it.unit }))
      }));
    } else {
      type StepRow = { order?: number; instruction?: string; labor_time?: number };
      const stepRows = (raw['workflow_items'] || []) as StepRow[];
      stepRows
        .filter(s => !!s?.instruction?.trim())
        .forEach((step, i) => {
          steps.push({
            order_: step?.order ?? i + 1,
            instruction_: step?.instruction ?? '',
            labor_time_minutes_: step?.labor_time ?? 0
          });
        });
    }

    const yieldConv = (raw['yield_conversions'] as { amount?: number; unit?: string }[])?.[0];
    const yieldAmount = isDish ? ((raw['serving_portions'] as number) ?? 1) : (yieldConv?.amount ?? 0);
    const yieldUnit = isDish ? 'מנה' : (yieldConv?.unit ?? 'gram');

    const rawLabels = (raw['labels'] as string[] | undefined) ?? [];
    const validKeys = new Set(this.metadataRegistry_.allLabels_().map((def) => def.key));
    const labels = rawLabels.filter((k) => validKeys.has((k ?? '').trim()));
    return {
      _id: (this.recipeId_() ?? '') as string,
      name_hebrew: (raw['name_hebrew'] as string)?.trim() ?? '',
      ingredients_: ingredients,
      steps_: steps,
      yield_amount_: yieldAmount,
      yield_unit_: yieldUnit,
      default_station_: '',
      is_approved_: true,
      recipe_type_: isDish ? 'dish' : 'preparation',
      labels_: labels,
      ...(prepItems && prepItems.length > 0 && { prep_items_: prepItems }),
      ...(prepCategories && prepCategories.length > 0 && { prep_categories_: prepCategories }),
      ...(prepCategories && prepCategories.length > 0 && { mise_categories_: prepCategories }),
      ...(() => {
        const baselineRaw = (raw['logistics'] as { baseline_?: { equipment_id_: string; quantity_: number; phase_: string; is_critical_: boolean; notes_?: string }[] })?.baseline_ ?? [];
        const baseline = baselineRaw
          .filter((r: { equipment_id_?: string }) => !!r?.equipment_id_)
          .map((r: { equipment_id_: string; quantity_: number; phase_: string; is_critical_: boolean; notes_?: string }) => ({
            equipment_id_: r.equipment_id_,
            quantity_: Number(r.quantity_),
            phase_: (r.phase_ || 'both') as EquipmentPhase,
            is_critical_: !!r.is_critical_,
            notes_: r.notes_ || undefined
          }));
        return baseline.length > 0 ? { logistics_: { baseline_: baseline } } : {};
      })()
    };
  }

  /** Compute auto-applied labels from recipe ingredients (product categories + allergens). */
  private computeAutoLabels_(recipe: Recipe): string[] {
    const productIds = recipe.ingredients_
      .filter(ing => ing.type === 'product')
      .map(ing => ing.referenceId);
    const products = this.state_.products_().filter(p => productIds.includes(p._id));
    const triggerSet = new Set<string>();
    products.forEach(p => {
      (p.categories_ ?? []).forEach(c => triggerSet.add(c));
      (p.allergens_ ?? []).forEach(a => triggerSet.add(a));
    });
    return this.metadataRegistry_.allLabels_()
      .filter(def => def.autoTriggers?.some(t => triggerSet.has(t)))
      .map(def => def.key);
  }

  //DELETE

  removeIngredient(index: number): void {
    this.ingredientsArray.removeAt(index);
    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow();
    }
  }

  protected onOpenUnitCreator(): void {
    this.unitRegistry_.openUnitCreator();
  }

  deleteStep(index: number): void {
    this.workflowArray.removeAt(index);

    if (this.recipeForm_.get('recipe_type')?.value === 'preparation') {
      this.workflowArray.controls.forEach((group, i) => {
        group.get('order')?.setValue(i + 1);
      });
    }
  }

}