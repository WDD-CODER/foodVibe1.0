import { Component, inject, signal, computed, OnInit, OnDestroy, DestroyRef, afterNextRender, Injector, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, startWith, map, timer, switchMap, of, type Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { UserMsgService } from '@services/user-msg.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { VersionHistoryService } from '@services/version-history.service';
import type { VersionEntityType } from '@services/version-history.service';
import { Recipe } from '@models/recipe.model';
import type { Equipment } from '@models/equipment.model';
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service';
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
import { filterOptionsByStartsWith } from 'src/app/core/utils/filter-starts-with.util';
import { ExportService } from '@services/export.service';
import { HeroFabService, type HeroFabAction } from '@services/hero-fab.service';
import type { ExportPayload } from '../../core/utils/export.util';
import { ExportPreviewComponent } from '../../shared/export-preview/export-preview.component';
import { ExportToolbarOverlayComponent } from '../../shared/export-toolbar-overlay/export-toolbar-overlay.component';
import { ApproveStampComponent } from 'src/app/shared/approve-stamp/approve-stamp.component';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service';
import { RecipeTextImportModalService } from '@services/recipe-text-import-modal.service';
import type { ParsedResult, ParsedRecipe, ParsedDish } from '@models/parsed-result.model';
import { useSavingState } from 'src/app/core/utils/saving-state.util';
import { CounterComponent } from 'src/app/shared/counter/counter.component';

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
    ClickOutSideDirective,
    ExportPreviewComponent,
    ExportToolbarOverlayComponent,
    ApproveStampComponent,
    CounterComponent
  ],
  templateUrl: './recipe-builder.page.html',
  styleUrl: './recipe-builder.page.scss'
})
export class RecipeBuilderPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private readonly state_ = inject(KitchenStateService);
  private readonly userMsg_ = inject(UserMsgService);
  private readonly route_ = inject(ActivatedRoute);
  private readonly router_ = inject(Router);
  private readonly unitRegistry_ = inject(UnitRegistryService);
  private readonly versionHistory_ = inject(VersionHistoryService);
  private readonly injector_ = inject(Injector);
  private readonly equipmentData_ = inject(EquipmentDataService);
  private readonly addEquipmentModal_ = inject(AddEquipmentModalService);
  private readonly metadataRegistry_ = inject(MetadataRegistryService);
  private readonly recipeDataService_ = inject(RecipeDataService);
  private readonly dishDataService_ = inject(DishDataService);
  private readonly recipeFormService_ = inject(RecipeFormService);
  private readonly translation_ = inject(TranslationService);
  private readonly logging_ = inject(LoggingService);
  private readonly exportService_ = inject(ExportService);
  private readonly confirmModal_ = inject(ConfirmModalService);
  private readonly heroFab_ = inject(HeroFabService);
  private readonly aiRecipeDraft_ = inject(AiRecipeDraftService);
  private readonly textImportModal_ = inject(RecipeTextImportModalService);

  //SIGNALS
  private readonly saving = useSavingState();
  protected readonly isSaving_ = this.saving.isSaving_;
  private recipeId_ = signal<string | null>(null);
  protected resetTrigger_ = signal(0);
  isSubmitted = false;

  /** Bumped when ingredients change so cost/weight computeds re-run (form is not a signal). */
  private ingredientsFormVersion_ = signal(0);

  /** Snapshot of form value when user entered the page (for hasRealChanges). */
  private initialRecipeSnapshot_: string | null = null;

  /** When set, the ingredients table will focus the search input at this row index; cleared after focus. */
  protected focusIngredientSearchAtRow_ = signal<number | null>(null);

  /** When set, the workflow will focus the textarea (prep) or prep search (dish) at this row index; cleared after focus. */
  protected focusWorkflowRowAt_ = signal<number | null>(null);

  /** True when viewing an old version from history (read-only, no save). */
  protected historyViewMode_ = signal(false);

  /** Whether the current recipe is marked approved (stamp sets this; used in buildRecipeFromForm and for stamp UI). */
  protected isApproved_ = signal(false);

  /** User-uploaded recipe image as base64 data-URL; lives outside the form. */
  protected recipeImageUrl_ = signal<string | null>(null)

  /** Section cards collapsed by default (true = collapsed). */
  protected tableLogicCollapsed_ = signal(true);
  protected workflowLogicCollapsed_ = signal(true);
  protected logisticsLogicCollapsed_ = signal(true);

  /** Export toolbar overlay (blur header, same pattern as menu-intelligence). */
  protected exportToolbarOpen_ = signal(false);
  /** Which View/Export dropdown is open in the toolbar. */
  protected viewExportModal_ = signal<'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'all' | null>(null);
  protected exportPreviewPayload_ = signal<ExportPayload | null>(null);
  private exportPreviewType_: 'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'recipe-all' | null = null;

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
    { validators: (c) => this.recipeFormService_.recipeFormValidator(c) }
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
    this.recipeImageUrl_.set(null)
    this.recipeId_.set(null);
    this.isApproved_.set(false);
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
    const result = this.recipeFormService_.computeWeightsAndVolumes(this.recipeForm_);
    this.recipeForm_.get('total_weight_g')?.setValue(result.totalWeightG, { emitEvent: false });
    this.totalBrutoWeightG_.set(result.totalBrutoWeightG);
    this.totalVolumeL_.set(result.totalVolumeL);
    this.totalVolumeMl_.set(result.totalVolumeMl);
    this.unconvertibleForWeight_.set(result.unconvertibleForWeight);
    this.unconvertibleForVolume_.set(result.unconvertibleForVolume);
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
        const aiDraft = this.aiRecipeDraft_.consume()
        if (aiDraft) {
          this.prefillFromAiDraft(aiDraft)
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
    if (!this.historyViewMode_() && !this.recipeForm_.disabled) {
      this.initialRecipeSnapshot_ = this.getRecipeSnapshotForComparison();
    }

    const actions: HeroFabAction[] = [
      { labelKey: 'export', icon: 'printer', run: () => this.openExportFromHeroFab() }
    ];
    const id = this.recipeId_();
    if (id) {
      actions.push({
        labelKey: 'cook_view',
        icon: 'cooking-pot',
        run: () => this.router_.navigate(['/cook', id])
      });
    }
    this.heroFab_.setPageActions(actions, 'replace');
    this.router_.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        if (!e.url.startsWith('/recipe-builder')) {
          this.closeAllExportOverlays();
        }
      });
  }

  /** Close export toolbar and preview so state is clean when user navigates away. */
  private closeAllExportOverlays(): void {
    this.exportToolbarOpen_.set(false);
    this.viewExportModal_.set(null);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }

  ngOnDestroy(): void {
    this.closeAllExportOverlays();
    this.heroFab_.clearPageActions();
  }

  private prefillFromAiDraft(draft: AiRecipeDraft): void {
    const isDish = draft.recipe_type === 'dish'

    // Emit recipe_type so recipeType_ signal updates before workflowArray is rebuilt
    this.recipeForm_.patchValue({ recipe_type: draft.recipe_type })
    this.recipeForm_.patchValue({ name_hebrew: draft.name_hebrew }, { emitEvent: false })

    this.yieldConversionsArray.clear()
    if (isDish) {
      this.recipeForm_.patchValue({ serving_portions: draft.yield_amount }, { emitEvent: false })
      this.yieldConversionsArray.push(this.fb.group({ amount: [draft.yield_amount], unit: ['dish'] }))
    } else {
      this.yieldConversionsArray.push(this.fb.group({ amount: [draft.yield_amount], unit: [draft.yield_unit] }))
    }

    this.ingredientsArray.clear()
    for (const ing of draft.ingredients) {
      this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup())
      const last = this.ingredientsArray.at(this.ingredientsArray.length - 1)
      const knownUnits = new Set(this.unitRegistry_.allUnitKeys_())
      const safeUnit = knownUnits.has(ing.unit) ? ing.unit : 'unit'
      const matchedProduct = this.state_.products_().find(p => p.name_hebrew === ing.name)
      const matchedRecipe = !matchedProduct ? this.state_.recipes_().find(r => r.name_hebrew === ing.name) : null
      const matched = matchedProduct ?? matchedRecipe
      last.patchValue({
        name_hebrew: ing.name,
        amount_net: ing.amount,
        unit: safeUnit,
        ...(matched && {
          referenceId: matched._id,
          item_type: matchedProduct ? 'product' : 'recipe',
        }),
      })
    }

    this.workflowArray.clear()
    if (isDish) {
      for (const step of draft.steps) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow({ preparation_name: step }))
      }
      if (this.workflowArray.length === 0) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow())
      }
    } else {
      draft.steps.forEach((step, i) => {
        const group = this.recipeFormService_.createStepGroup(i + 1)
        group.patchValue({ instruction: step })
        this.workflowArray.push(group)
      })
      if (this.workflowArray.length === 0) {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1))
      }
    }
  }

  // ─── Text Import ─────────────────────────────────────────────────

  protected onImportTextClick(): void {
    this.textImportModal_.open((result) => this.prefillFromParsedResult(result))
  }

  private prefillFromParsedResult(result: ParsedResult): void {
    const currentType = this.recipeForm_.get('recipe_type')?.value as string

    if (result.type === 'recipe' && currentType === 'dish') {
      this.userMsg_.onSetWarningMsg(this.translation_.translate('import_text_type_mismatch_dish_in_recipe'))
      return
    }
    if (result.type === 'dish' && currentType !== 'dish') {
      this.userMsg_.onSetWarningMsg(this.translation_.translate('import_text_type_mismatch_recipe_in_dish'))
      return
    }

    if (result.type === 'recipe') {
      const data = result.data as ParsedRecipe

      this.recipeForm_.patchValue(
        {
          name_hebrew: data.name_hebrew ?? '',
          serving_portions: data.serving_portions ?? 1,
          labels: data.labels ?? []
        },
        { emitEvent: false }
      )

      this.ingredientsArray.clear()
      for (const ing of data.ingredients ?? []) {
        this.ingredientsArray.push(this.recipeFormService_.createIngredientGroup())
        const last = this.ingredientsArray.at(this.ingredientsArray.length - 1)
        last.patchValue({ name_hebrew: ing.name_hebrew, amount_net: ing.amount_net, unit: ing.unit })
      }
      if (this.ingredientsArray.length === 0) this.addNewIngredientRow()

      this.workflowArray.clear()
      const steps = data.steps ?? []
      if (steps.length > 0) {
        steps.forEach((step, i) => {
          const group = this.recipeFormService_.createStepGroup(step.order ?? i + 1)
          group.patchValue({ instruction: step.instruction })
          this.workflowArray.push(group)
        })
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1))
      }
    } else {
      const data = result.data as ParsedDish

      this.recipeForm_.patchValue(
        {
          name_hebrew: data.name_hebrew ?? '',
          serving_portions: data.serving_portions ?? 1,
          labels: data.labels ?? []
        },
        { emitEvent: false }
      )
    }

    this.applyJustFilledHighlight_()
    this.ingredientsFormVersion_.update(v => v + 1)
  }

  private applyJustFilledHighlight_(): void {
    const el = document.querySelector('.recipe-builder-container') as HTMLElement | null
    el?.classList.add('just-filled')
    setTimeout(() => el?.classList.remove('just-filled'), 1500)
  }

  // ─── Export ───────────────────────────────────────────────────────

  protected openExportFromHeroFab(): void {
    // Defer to next tick so the opening click is not interpreted as click-outside
    setTimeout(() => this.exportToolbarOpen_.set(true), 0);
  }

  protected closeExportToolbar(): void {
    this.exportToolbarOpen_.set(false);
    this.viewExportModal_.set(null);
  }

  protected openViewExportModal(key: 'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'all'): void {
    this.viewExportModal_.update(current => (current === key ? null : key));
  }

  protected closeViewExportModal(): void {
    this.viewExportModal_.set(null);
  }

  protected goToCookFromHeroFab(): void {
    const id = this.recipeId_();
    void this.router_.navigate(id ? ['/cook', id] : ['/cook']);
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

  private patchFormFromRecipe(recipe: Recipe): void {
    this.isApproved_.set(recipe.is_approved_);
    this.recipeFormService_.patchFormFromRecipe(this.recipeForm_, recipe);
    this.recipeImageUrl_.set(recipe.imageUrl_ ?? null)
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

  /** For pendingChangesGuard: true when current form value differs from initial state when user entered the page. */
  hasRealChanges(): boolean {
    if (this.historyViewMode_() || this.recipeForm_.disabled) return false;

    if (!this.recipeId_()) {
      // New recipe: failsafe checks for any real content
      if (this.ingredientsArray.controls.some(
        g => !!(g as FormGroup).get('referenceId')?.value
      )) return true
      if ((this.recipeForm_.get('name_hebrew')?.value ?? '').trim()) return true
      return false // blank new recipe — nothing to guard
    }

    if (this.initialRecipeSnapshot_ === null) return this.recipeForm_.dirty === true;
    return this.getRecipeSnapshotForComparison() !== this.initialRecipeSnapshot_;
  }

  /** For pendingChangesGuard: save the recipe and resolve once done. */
  saveAndWait(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (this.recipeForm_.invalid) {
        this.recipeForm_.markAllAsTouched()
        const msg = this.getRecipeValidationError_()
        this.userMsg_.onSetErrorMsg(msg)
        resolve(false)
        return
      }

      this.saving.setSaving(true)
      const recipe = this.buildRecipeFromForm()
      recipe.autoLabels_ = this.recipeFormService_.computeAutoLabels(recipe)

      this.state_.saveRecipe(recipe).subscribe({
        next: () => {
          this.saving.setSaving(false)
          this.isSubmitted = true
          resolve(true)
        },
        error: () => {
          this.saving.setSaving(false)
          this.userMsg_.onSetErrorMsg(
            this.translation_.translate('error_saving_recipe')
          )
          resolve(false)
        }
      })
    })
  }

  /** Normalized form value for comparison (numbers coerced, labels sorted). */
  private getRecipeSnapshotForComparison(): string {
    const raw = this.recipeForm_.getRawValue() as Record<string, unknown>;
    const labels = (raw?.['labels'] ?? []) as string[];
    const normalizedLabels = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    const yieldConv = (raw?.['yield_conversions'] ?? []) as { amount?: number | string; unit?: string }[];
    const yieldNorm = yieldConv.map((c) => ({
      amount: Number(c?.amount ?? 0),
      unit: (c?.unit ?? '').toString()
    }));
    const ingredients = (raw?.['ingredients'] ?? []) as { referenceId?: string; item_type?: string; amount_net?: number | string; unit?: string; total_cost?: number }[];
    const ingNorm = ingredients.map((ing) => ({
      referenceId: (ing?.referenceId ?? '').toString(),
      item_type: (ing?.item_type ?? '').toString(),
      amount_net: Number(ing?.amount_net ?? 0),
      unit: (ing?.unit ?? '').toString(),
      total_cost: Number(ing?.total_cost ?? 0)
    }));
    const workflow = (raw?.['workflow_items'] ?? []) as Record<string, unknown>[];
    const workflowNorm = workflow.map((row) => {
      if (row?.['order'] != null || row?.['instruction'] != null || row?.['labor_time'] != null) {
        return {
          order: Number(row?.['order'] ?? 0),
          instruction: (row?.['instruction'] ?? '').toString(),
          labor_time: Number(row?.['labor_time'] ?? 0)
        };
      }
      return {
        preparation_name: (row?.['preparation_name'] ?? '').toString(),
        category_name: (row?.['category_name'] ?? '').toString(),
        main_category_name: (row?.['main_category_name'] ?? '').toString(),
        quantity: Number(row?.['quantity'] ?? 0),
        unit: (row?.['unit'] ?? '').toString()
      };
    });
    const logistics = raw?.['logistics'] as { baseline_?: unknown[] } | undefined;
    const baselineRaw = (logistics?.['baseline_'] ?? []) as { equipment_id_?: string; quantity_?: number; phase_?: string; is_critical_?: boolean; notes_?: string }[];
    const baselineNorm = baselineRaw.map((r) => ({
      equipment_id_: (r?.equipment_id_ ?? '').toString(),
      quantity_: Number(r?.quantity_ ?? 0),
      phase_: (r?.phase_ ?? 'both').toString(),
      is_critical_: !!r?.is_critical_,
      notes_: (r?.notes_ ?? '').toString()
    }));
    const normalized = {
      name_hebrew: (raw?.['name_hebrew'] ?? '').toString(),
      recipe_type: (raw?.['recipe_type'] ?? 'preparation').toString(),
      serving_portions: Number(raw?.['serving_portions'] ?? 1),
      total_weight_g: Number(raw?.['total_weight_g'] ?? 0),
      total_cost: Number(raw?.['total_cost'] ?? 0),
      labels: normalizedLabels,
      yield_conversions: yieldNorm,
      ingredients: ingNorm,
      workflow_items: workflowNorm,
      logistics_baseline: baselineNorm
    };
    return JSON.stringify(normalized);
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

  /** Search options: equipment only (by name_hebrew), "starts with" + Hebrew/Latin script. */
  protected logisticsSearchOptions_ = computed((): Equipment[] => {
    const raw = this.logisticsToolSearchQuery_().trim();
    if (!raw) return [];
    const alreadyAdded = new Set(this.logisticsBaselineIds_() ?? []);
    const allEquipment = this.equipmentData_.allEquipment_().filter((eq) => !alreadyAdded.has(eq._id));
    const filtered = filterOptionsByStartsWith(allEquipment, raw, (eq) => eq.name_hebrew);
    const qLower = raw.toLowerCase();
    return filtered.slice().sort((a, b) => {
      const aName = a.name_hebrew.toLowerCase();
      const bName = b.name_hebrew.toLowerCase();
      const aStarts = aName.startsWith(qLower) ? 0 : 1;
      const bStarts = bName.startsWith(qLower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aName.indexOf(qLower) - bName.indexOf(qLower);
    });
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

  protected onLogisticsQuantityKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const current = this.logisticsToolQuantity_();
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(current, 1, { integerOnly: true })
      : quantityDecrement(current, 1, { integerOnly: true });
    this.logisticsToolQuantity_.set(next);
  }

  /** Select an option from dropdown (does not add yet; user sets quantity and presses Add). */
  protected selectLogisticsOption(option: Equipment): void {
    this.logisticsSelectedToolId_.set(option._id);
    this.logisticsToolQuantity_.set(1);
    this.logisticsToolSearchQuery_.set(option.name_hebrew);
    this.logisticsToolDropdownOpen_.set(false);
  }

  protected onLogisticsSearchInput(value: string): void {
    this.logisticsToolSearchQuery_.set(value);
    this.logisticsHighlightedIndex_.set(-1);
    this.logisticsToolDropdownOpen_.set(value.trim().length > 0);
    const selectedId = this.logisticsSelectedToolId_();
    if (selectedId && this.getEquipmentNameById(selectedId) !== value) {
      this.logisticsSelectedToolId_.set(null);
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
    const qty = this.logisticsToolQuantity_();
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow({
      equipment_id_: id,
      quantity_: qty,
      phase_: 'both',
      is_critical_: true,
      notes_: undefined
    }));
    this.logisticsSelectedToolId_.set(null);
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
    } catch (err) {
      this.logging_.error({ event: 'recipe_builder.save_error', message: 'Recipe builder save error (add tool)', context: { err } });
      const msg = err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
        ? (this.translation_.translate('duplicate_equipment_name') ?? 'כלי עם שם זה כבר קיים')
        : 'שגיאה בהוספת הכלי';
      this.userMsg_.onSetErrorMsg(msg);
    }
  }

  //CREATE

  protected addBaselineRow(): void {
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow());
  }

  protected removeBaselineRow(index: number): void {
    this.logisticsBaselineArray.removeAt(index);
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

  protected onImageChange(url: string): void {
    this.recipeImageUrl_.set(url)
  }

  addNewIngredientRow(): void {
    const newGroup = this.recipeFormService_.createIngredientGroup();
    this.ingredientsArray.push(newGroup);
    this.ingredientsArray.updateValueAndValidity();
    this.focusIngredientSearchAtRow_.set(this.ingredientsArray.length - 1);
  }

  protected onIngredientSearchFocusDone(): void {
    this.focusIngredientSearchAtRow_.set(null);
  }

  saveRecipe(options?: { navigateOnSuccess?: boolean }): void {
    if (this.recipeForm_.invalid) {
      this.recipeForm_.markAllAsTouched();
      const msg = this.getRecipeValidationError_();
      this.userMsg_.onSetErrorMsg(msg);
      return;
    }

    const navigateOnSuccess = options?.navigateOnSuccess !== false;
    this.saving.setSaving(true);
    const recipe = this.buildRecipeFromForm();
    recipe.autoLabels_ = this.recipeFormService_.computeAutoLabels(recipe);

    this.state_.saveRecipe(recipe).subscribe({
      next: () => {
        this.saving.setSaving(false);
        if (navigateOnSuccess) {
          this.isSubmitted = true;
          this.resetToNewForm_();
          this.router_.navigate(['/recipe-book']);
        } else {
          this.userMsg_.onSetSuccessMsg(
            this.translation_.translate(this.isApproved_() ? 'approval_success' : 'unapproval_success')
          );
        }
      },
      error: () => {
        this.saving.setSaving(false);
        if (!navigateOnSuccess) {
          this.userMsg_.onSetErrorMsg(this.translation_.translate('approval_error'));
        }
      }
    });
  }

  protected onApproveStamp(): void {
    if (this.recipeId_() && this.hasRealChanges()) {
      this.confirmModal_.open('approve_stamp_unsaved_confirm', { saveLabel: 'save_changes' }).then(confirmed => {
        if (!confirmed) return;
        this.isApproved_.set(!this.isApproved_());
        this.saveRecipe({ navigateOnSuccess: false });
      });
      return;
    }
    this.isApproved_.set(!this.isApproved_());
    if (this.recipeId_()) {
      this.saveRecipe({ navigateOnSuccess: false });
    }
  }

  navigateBackFromHistory(): void {
    this.router_.navigate(['/recipe-book']);
  }

  onPrint(): void {
    window.print();
  }

  /** Quantity for export (form snapshot): dish = serving_portions, recipe = yield amount; min 1. */
  private exportQuantity_(): number {
    const raw = this.recipeForm_.getRawValue() as { recipe_type?: string; serving_portions?: number; yield_conversions?: { amount?: number }[] };
    if (raw?.recipe_type === 'dish') {
      const n = Number(raw?.serving_portions);
      return isNaN(n) || n < 1 ? 1 : n;
    }
    const conv = raw?.yield_conversions?.[0];
    const n = conv?.amount != null ? Number(conv.amount) : 1;
    return isNaN(n) || n < 1 ? 1 : n;
  }

  protected onViewRecipeInfo(): void {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty));
    this.exportPreviewType_ = 'recipe-info';
  }

  protected onViewShoppingList(): void {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getShoppingListPreviewPayload(recipe, qty));
    this.exportPreviewType_ = 'shopping-list';
  }

  protected onViewCookingSteps(): void {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getCookingStepsPreviewPayload(recipe, qty));
    this.exportPreviewType_ = 'cooking-steps';
  }

  protected onViewDishChecklist(): void {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getDishChecklistPreviewPayload(recipe, qty));
    this.exportPreviewType_ = 'dish-checklist';
  }

  protected onViewAll(): void {
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    this.exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty));
    this.exportPreviewType_ = 'recipe-all';
    this.closeViewExportModal();
  }

  protected onExportFromPreview(): void {
    const payload = this.exportPreviewPayload_();
    const type = this.exportPreviewType_;
    if (!payload || !type) return;
    const recipe = this.buildRecipeFromForm();
    const qty = this.exportQuantity_();
    if (type === 'recipe-info') this.exportService_.exportRecipeInfo(recipe, qty);
    else if (type === 'shopping-list') this.exportService_.exportShoppingList(recipe, qty);
    else if (type === 'cooking-steps') this.exportService_.exportCookingSteps(recipe, qty);
    else if (type === 'dish-checklist') this.exportService_.exportDishChecklist(recipe, qty);
    else if (type === 'recipe-all') this.exportService_.exportAllTogetherRecipe(recipe, qty);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
  }

  protected onExportRecipeInfo(): void {
    this.exportService_.exportRecipeInfo(this.buildRecipeFromForm(), this.exportQuantity_());
  }

  protected onExportShoppingList(): void {
    this.exportService_.exportShoppingList(this.buildRecipeFromForm(), this.exportQuantity_());
  }

  protected onExportCookingSteps(): void {
    this.exportService_.exportCookingSteps(this.buildRecipeFromForm(), this.exportQuantity_());
  }

  protected onExportDishChecklist(): void {
    this.exportService_.exportDishChecklist(this.buildRecipeFromForm(), this.exportQuantity_());
  }

  protected onExportAllTogether(): void {
    this.exportService_.exportAllTogetherRecipe(this.buildRecipeFromForm(), this.exportQuantity_());
  }

  protected onPrintFromPreview(): void {
    window.print();
  }

  protected onCloseExportPreview(): void {
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
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
    const recipe = this.recipeFormService_.buildRecipeFromForm(this.recipeForm_, this.recipeId_(), this.isApproved_())
    const url = this.recipeImageUrl_()
    return url ? { ...recipe, imageUrl_: url } : recipe
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