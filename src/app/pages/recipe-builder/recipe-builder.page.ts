import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  DestroyRef,
  afterNextRender,
  Injector,
  runInInjectionContext,
  viewChild
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import {
  filter,
  firstValueFrom,
  startWith,
  map,
  timer,
  switchMap,
  of,
  take,
  type Observable,
  type Subscription
} from 'rxjs'
import { CommonModule } from '@angular/common'
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms'
import { ActivatedRoute, NavigationStart, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { UserMsgService } from '@services/user-msg.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { VersionHistoryService } from '@services/version-history.service'
import type { VersionEntityType } from '@services/version-history.service'
import { Recipe } from '@models/recipe.model'
import type { Equipment } from '@models/equipment.model'
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { MasterPushService } from '@services/master-push.service'
import { RecipeDataService } from '@services/recipe-data.service'
import { RecipeFormService } from './services/recipe-form.service'
import { DishDataService } from '@services/dish-data.service'
import { TranslationService } from '@services/translation.service'
import { LoggingService } from '@services/logging.service'
import { RecipeHeaderComponent } from './components/recipe-header/recipe-header.component'
import { RecipeIngredientsTableComponent } from './components/recipe-ingredients-table/recipe-ingredients-table.component'
import { RecipeWorkflowComponent } from './components/recipe-workflow/recipe-workflow.component'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util'
import { filterOptionsByStartsWith } from 'src/app/core/utils/filter-starts-with.util'
import { ExportService } from '@services/export.service'
import { HeroFabService, type HeroFabAction } from '@services/hero-fab.service'
import type { ExportPayload } from '../../core/utils/export.util'
import { ExportPreviewComponent } from '../../shared/export-preview/export-preview.component'
import { ExportToolbarOverlayComponent } from '../../shared/export-toolbar-overlay/export-toolbar-overlay.component'
import { ApproveStampComponent } from 'src/app/shared/approve-stamp/approve-stamp.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserService } from '@services/user.service'
import { RecipeAiFlowService } from './services/recipe-ai-flow.service'
import { findDuplicateName } from './utils/find-duplicate-name.util'
import { useSavingState } from 'src/app/core/utils/saving-state.util'
import { CounterComponent } from 'src/app/shared/counter/counter.component'

@Component({
  selector: 'app-recipe-builder-page',
  standalone: true,
  providers: [RecipeAiFlowService],
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
  private fb = inject(FormBuilder)
  private readonly state_ = inject(KitchenStateService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly route_ = inject(ActivatedRoute)
  private readonly router_ = inject(Router)
  private readonly unitRegistry_ = inject(UnitRegistryService)
  private readonly versionHistory_ = inject(VersionHistoryService)
  private readonly injector_ = inject(Injector)
  private readonly equipmentData_ = inject(EquipmentDataService)
  private readonly addEquipmentModal_ = inject(AddEquipmentModalService)
  private readonly metadataRegistry_ = inject(MetadataRegistryService)
  private readonly masterPush_ = inject(MasterPushService)
  private readonly recipeDataService_ = inject(RecipeDataService)
  private readonly dishDataService_ = inject(DishDataService)
  private readonly recipeFormService_ = inject(RecipeFormService)
  private readonly translation_ = inject(TranslationService)
  private readonly logging_ = inject(LoggingService)
  private readonly exportService_ = inject(ExportService)
  private readonly confirmModal_ = inject(ConfirmModalService)
  private readonly heroFab_ = inject(HeroFabService)
  private readonly aiFlow_ = inject(RecipeAiFlowService)
  private readonly userService_ = inject(UserService)
  private readonly isAdmin_ = computed(() => this.userService_.user_()?.role === 'admin')

  // CHILD REFS
  private readonly recipeHeaderRef_ = viewChild(RecipeHeaderComponent)
  private readonly ingredientsTableRef_ = viewChild(RecipeIngredientsTableComponent)

  //SIGNALS
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  private recipeId_ = signal<string | null>(null)
  protected isExistingRecord_ = computed(() => this.recipeId_() !== null)
  protected resetTrigger_ = signal(0)
  isSubmitted = false

  /** Bumped when ingredients change so cost/weight computeds re-run (form is not a signal). */
  private ingredientsFormVersion_ = signal(0)

  /** Snapshot of form value when user entered the page (for hasRealChanges). */
  private initialRecipeSnapshot_: string | null = null
  /** Original recipe_type when the record was loaded — used to detect type-change saves. */
  private initialRecipeType_: 'dish' | 'preparation' | null = null
  /** TEMPORARY (dev-process-only, see chat 2026-09-26): source master doc's _id, if any. */
  private masterId_: string | null = null
  /** Tracks the recipe_type → name re-validation subscription so it doesn't stack on component reuse. */
  private recipeTypeRevalidationSub_?: Subscription

  /** When set, the ingredients table will focus the search input at this row index; cleared after focus. */
  protected focusIngredientSearchAtRow_ = signal<number | null>(null)

  /** When set, the workflow will focus the textarea (prep) or prep search (dish) at this row index; cleared after focus. */
  protected focusWorkflowRowAt_ = signal<number | null>(null)

  /** True when viewing an old version from history (read-only, no save). */
  protected historyViewMode_ = signal(false)

  /** Set when save is blocked due to invalid ingredient rows — cleared once user resolves them. */
  protected blockingIngredientsError_ = signal(false)

  /** Whether the current recipe is marked approved (stamp sets this; used in buildRecipeFromForm and for stamp UI). */
  protected isApproved_ = signal(false)

  /** True once user has explicitly confirmed the manual yield amount as neto. */
  protected netoConfirmed_ = signal(false)

  /** Last-saved serving_portions for existing dish recipes. Null for new dishes (hides the reset button). */
  protected savedPortions_ = signal<number | null>(null)

  /** User-uploaded recipe image as base64 data-URL; lives outside the form. */
  protected recipeImageUrl_ = signal<string | null>(null)

  /** User-assigned rating (0 = unrated, 1–5 = rated); lives outside the form. */
  protected recipeRating_ = signal<number>(0)

  /** Section cards expanded by default (matches the design) — collapsed only once the
   *  user closes one, which persists via localStorage below (true = collapsed). */
  protected tableLogicCollapsed_ = signal(false)
  protected workflowLogicCollapsed_ = signal(false)
  protected logisticsLogicCollapsed_ = signal(false)

  /** Export toolbar overlay (blur header, same pattern as menu-intelligence). */
  protected exportToolbarOpen_ = signal(false)
  /** Which View/Export dropdown is open in the toolbar. */
  protected viewExportModal_ = signal<
    'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'all' | null
  >(null)
  protected exportPreviewPayload_ = signal<ExportPayload | null>(null)
  private exportPreviewType_:
    'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'recipe-all' | null = null

  protected toggleTableLogic(): void {
    const next = !this.tableLogicCollapsed_()
    this.tableLogicCollapsed_.set(next)
    localStorage.setItem('rb_col_ingredients', JSON.stringify(next))
  }
  protected toggleWorkflowLogic(): void {
    const next = !this.workflowLogicCollapsed_()
    this.workflowLogicCollapsed_.set(next)
    localStorage.setItem('rb_col_workflow', JSON.stringify(next))
  }
  protected toggleLogisticsLogic(): void {
    const next = !this.logisticsLogicCollapsed_()
    this.logisticsLogicCollapsed_.set(next)
    localStorage.setItem('rb_col_logistics', JSON.stringify(next))
  }

  //COMPUTED
  protected totalCost_ = computed(() => {
    this.ingredientsFormVersion_()
    const raw = this.recipeForm_.getRawValue() as { ingredients?: { total_cost?: number }[] }
    const ingredients = raw?.ingredients || []
    return ingredients.reduce((acc: number, ing: { total_cost?: number }) => acc + (ing.total_cost || 0), 0)
  })

  protected totalWeightG_ = computed(() => {
    this.ingredientsFormVersion_()
    const raw = this.recipeForm_.getRawValue() as { total_weight_g?: number }
    return raw?.total_weight_g ?? 0
  })

  protected totalBrutoWeightG_ = signal(0)
  protected totalVolumeL_ = signal(0)
  protected totalVolumeMl_ = signal(0)
  protected unconvertibleForWeight_ = signal<string[]>([])
  protected unconvertibleForVolume_ = signal<string[]>([])

  protected recipeForm_ = this.fb.group(
    {
      nameHebrew: ['', Validators.required],
      recipe_type: ['preparation'],
      serving_portions: [1, [Validators.required, Validators.min(1)]],
      yield_conversions: this.fb.array([this.fb.group({ amount: [0], unit: ['gram'] })]),
      ingredients: this.fb.array([]),
      workflow_items: this.fb.array([]),
      total_weight_g: [0],
      total_cost: [0],
      labels: [[] as string[]],
      course: [''],
      logistics: this.fb.group({
        baseline: this.fb.array([])
      })
    },
    { validators: (c) => this.recipeFormService_.recipeFormValidator(c) }
  )

  protected portions_ = toSignal(
    this.recipeForm_
      .get('serving_portions')!
      .valueChanges.pipe(startWith(this.recipeForm_.get('serving_portions')?.value ?? 1)),
    { initialValue: 1 }
  )

  /** Writable signal so patchFormFromRecipe can update it even when emitEvent:false suppresses valueChanges. */
  protected recipeType_ = signal<'dish' | 'preparation'>('preparation')

  /** Auto-labels from current form ingredients (for header preview). */
  protected liveAutoLabels_ = computed(() => {
    this.ingredientsFormVersion_()
    const raw = this.recipeForm_.getRawValue() as { ingredients?: { referenceId?: string; item_type?: string }[] }
    const rows = raw?.ingredients ?? []
    const productIds = rows
      .filter((r: { referenceId?: string; item_type?: string }) => r?.referenceId && r?.item_type !== 'recipe')
      .map((r: { referenceId?: string }) => r.referenceId!)
    const products = this.state_.products_().filter((p) => productIds.includes(p._id))
    const triggerSet = new Set<string>()
    products.forEach((p) => {
      ;(p.categories ?? []).forEach((c) => triggerSet.add(c))
      ;(p.allergens ?? []).forEach((a) => triggerSet.add(a))
    })
    return this.metadataRegistry_
      .allLabels_()
      .filter((def) => def.autoTriggers?.some((t) => triggerSet.has(t)))
      .map((def) => def.key)
  })

  private destroyRef = inject(DestroyRef)

  private cachedPrepItems_: {
    preparationName?: string
    categoryName?: string
    mainCategoryName?: string
    quantity?: number
    unit?: string
  }[] = []
  private cachedSteps_: { order?: number; instruction?: string; labor_time?: number; cooking_time?: number }[] = []

  constructor() {
    this.ingredientsArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateTotalWeightG()
      this.ingredientsFormVersion_.update((v) => v + 1)
    })

    this.recipeForm_
      .get('recipe_type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        this.recipeType_.set(type === 'dish' ? 'dish' : 'preparation')
        this.onRecipeTypeChange(type)
      })
  }

  private onRecipeTypeChange(type: string | null): void {
    if (type == null) return
    const isDish = type === 'dish'

    // Always save current form data to its own type's cache before switching
    if (!isDish) {
      // Was dish, now switching to steps — save dish data
      this.cachedPrepItems_ = this.workflowArray.controls.map(
        (c) =>
          c.getRawValue() as {
            preparationName?: string
            categoryName?: string
            mainCategoryName?: string
            quantity?: number
            unit?: string
          }
      )
    } else {
      // Was steps, now switching to dish — save steps data
      this.cachedSteps_ = this.workflowArray.controls.map(
        (c) => c.getRawValue() as { order?: number; instruction?: string; labor_time?: number; cooking_time?: number }
      )
    }

    this.workflowArray.clear()

    if (isDish) {
      if (this.cachedPrepItems_.length > 0) {
        // Restore original prep items (with full quantity/unit/category)
        this.cachedPrepItems_.forEach((row) => this.workflowArray.push(this.recipeFormService_.createPrepItemRow(row)))
      } else if (this.cachedSteps_.length > 0) {
        // First-time switch: convert step instructions → prep item names
        this.cachedSteps_.forEach((step) =>
          this.workflowArray.push(
            this.recipeFormService_.createPrepItemRow({ preparationName: step.instruction ?? '' })
          )
        )
      } else {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow())
      }
    } else {
      if (this.cachedSteps_.length > 0) {
        // Restore cached steps with full content (fixes bug: previously only order was restored)
        this.cachedSteps_.forEach((step, i) => {
          const group = this.recipeFormService_.createStepGroup(step.order ?? i + 1)
          group.patchValue({
            instruction: step.instruction ?? '',
            labor_time: step.labor_time ?? 0,
            cooking_time: step.cooking_time ?? 0
          })
          this.workflowArray.push(group)
        })
      } else if (this.cachedPrepItems_.length > 0) {
        // First-time switch: convert prep item names → step instructions
        this.cachedPrepItems_.forEach((item, i) => {
          const group = this.recipeFormService_.createStepGroup(i + 1)
          group.patchValue({ instruction: item.preparationName ?? '' })
          this.workflowArray.push(group)
        })
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1))
      }
    }
  }

  /** Resets the form to a blank state for creating a new recipe/dish. */
  private resetToNewForm_(): void {
    this.recipeImageUrl_.set(null)
    this.recipeRating_.set(0)
    this.recipeId_.set(null)
    this.isApproved_.set(false)
    this.netoConfirmed_.set(false)
    this.savedPortions_.set(null)
    this.cachedPrepItems_ = []
    this.cachedSteps_ = []

    this.recipeForm_.patchValue(
      {
        nameHebrew: '',
        recipe_type: 'preparation',
        serving_portions: 1,
        total_weight_g: 0,
        total_cost: 0,
        labels: []
      },
      { emitEvent: false }
    )
    // emitEvent:false skips the recipe_type subscription, so sync the signal by hand — otherwise the
    // template stays in dish mode and binds prep-item controls to the step row pushed below.
    this.recipeType_.set('preparation')

    this.yieldConversionsArray.clear()
    this.yieldConversionsArray.push(this.fb.group({ amount: [0], unit: ['gram'] }))

    this.ingredientsArray.clear()
    this.addNewIngredientRow()
    this.workflowArray.clear()
    this.workflowArray.push(this.recipeFormService_.createStepGroup(1))

    this.logisticsBaselineArray.clear()

    this.recipeForm_.updateValueAndValidity({ emitEvent: false })
    this.recipeForm_.markAsPristine()
    this.resetTrigger_.update((v) => v + 1)
  }

  private updateTotalWeightG(): void {
    const result = this.recipeFormService_.computeWeightsAndVolumes(this.recipeForm_)
    this.recipeForm_.get('total_weight_g')?.setValue(result.totalWeightG, { emitEvent: false })
    this.totalBrutoWeightG_.set(result.totalBrutoWeightG)
    this.totalVolumeL_.set(result.totalVolumeL)
    this.totalVolumeMl_.set(result.totalVolumeMl)
    this.unconvertibleForWeight_.set(result.unconvertibleForWeight)
    this.unconvertibleForVolume_.set(result.unconvertibleForVolume)
  }

  async ngOnInit(): Promise<void> {
    // Reset guard flag so canDeactivate works correctly if the component is reused
    // (Angular may reuse the same instance when navigating between recipe-builder/:id routes).
    this.isSubmitted = false
    const lsIngredients = localStorage.getItem('rb_col_ingredients')
    if (lsIngredients !== null) this.tableLogicCollapsed_.set(JSON.parse(lsIngredients))
    const lsWorkflow = localStorage.getItem('rb_col_workflow')
    if (lsWorkflow !== null) this.workflowLogicCollapsed_.set(JSON.parse(lsWorkflow))
    const lsLogistics = localStorage.getItem('rb_col_logistics')
    if (lsLogistics !== null) this.logisticsLogicCollapsed_.set(JSON.parse(lsLogistics))

    const q = this.route_.snapshot.queryParams
    const view = q['view']
    const entityType = q['entityType'] as string | undefined
    const entityId = q['entityId']
    const versionAtStr = q['versionAt']

    if (view === 'history' && entityType && entityId && versionAtStr) {
      const versionAt = Number(versionAtStr)
      if (!Number.isNaN(versionAt) && (entityType === 'recipe' || entityType === 'dish')) {
        const entry = await this.versionHistory_.getVersionEntry(entityType as VersionEntityType, entityId, versionAt)
        if (entry && (entry.entityType === 'recipe' || entry.entityType === 'dish')) {
          const snapshot = entry.snapshot as Recipe
          this.patchFormFromRecipe(snapshot)
          this.historyViewMode_.set(true)
          this.recipeForm_.disable()
        } else {
          this.userMsg_.onSetErrorMsg('גרסה לא נמצאה')
        }
      }
    } else {
      this.aiFlow_.init({
        recipeForm: this.recipeForm_,
        ingredientsFormVersion_: this.ingredientsFormVersion_,
        netoConfirmed_: this.netoConfirmed_,
        addNewIngredientRow: () => this.addNewIngredientRow()
      })

      const recipe = this.route_.snapshot.data['recipe'] as Recipe | null
      if (recipe) {
        this.recipeId_.set(recipe._id)
        this.patchFormFromRecipe(recipe)
      } else {
        this.recipeId_.set(null)
        const gotDraft = this.aiFlow_.applyPendingDraft()
        if (!gotDraft) {
          const type = this.route_.snapshot.queryParams['type'] as string | undefined
          if (type === 'dish') {
            this.recipeForm_.patchValue(
              {
                recipe_type: 'dish',
                serving_portions: 1
              },
              { emitEvent: false }
            )
            this.yieldConversionsArray.clear()
            this.yieldConversionsArray.push(this.fb.group({ amount: [1], unit: ['dish'] }))
            this.workflowArray.clear()
            this.workflowArray.push(this.recipeFormService_.createPrepItemRow())
          }
        }
      }
    }

    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow()
      runInInjectionContext(this.injector_, () => {
        afterNextRender(() => this.focusIngredientSearchAtRow_.set(0))
      })
    }
    if (this.workflowArray.length === 0) {
      const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish'
      if (isDish) {
        this.workflowArray.push(this.recipeFormService_.createPrepItemRow())
      } else {
        this.workflowArray.push(this.recipeFormService_.createStepGroup(1))
      }
    }
    this.recipeForm_.get('nameHebrew')?.setAsyncValidators([(ctrl) => this.duplicateNameValidator_(ctrl)])
    // Prevent stacking on component reuse (Angular reuses the same instance across
    // recipe-builder/:id navigations — destroyRef never fires).
    this.recipeTypeRevalidationSub_?.unsubscribe()
    this.recipeTypeRevalidationSub_ = this.recipeForm_
      .get('recipe_type')
      ?.valueChanges.subscribe(() => this.recipeForm_.get('nameHebrew')?.updateValueAndValidity())
    this.updateTotalWeightG()
    this.recipeForm_.markAsPristine()
    // Clear any stale async-validation errors left over from a previous recipe on
    // this reused component instance, and run a fresh check with the correct ID.
    this.recipeForm_.get('nameHebrew')?.updateValueAndValidity()
    if (!this.historyViewMode_() && !this.recipeForm_.disabled) {
      // Defer snapshot capture to after the first render so that child component effects
      // (e.g. RecipeHeaderComponent auto-syncs yield from ingredient metrics) have already
      // run. Capturing the snapshot before effects fire causes false-positive dirty guards
      // whenever the computed yield differs from the stored yieldAmount.
      runInInjectionContext(this.injector_, () => {
        afterNextRender(() => {
          this.initialRecipeSnapshot_ = this.getRecipeSnapshotForComparison()
          this.recipeForm_.markAsPristine()
        })
      })
    }

    const actions: HeroFabAction[] = [
      { labelKey: 'ai_recipe_edit', icon: 'sparkles', run: () => this.onAiEditClick() },
      { labelKey: 'export', icon: 'printer', run: () => this.openExportFromHeroFab() }
    ]
    if (this.recipeId_()) {
      actions.push({
        labelKey: 'cook_view',
        icon: 'cooking-pot',
        run: () => this.goToCookFromHeroFab()
      })
    }
    this.heroFab_.setPageActions(actions, 'replace')
    this.router_.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        if (!e.url.startsWith('/recipe-builder')) {
          this.closeAllExportOverlays()
        }
      })
  }

  /** Close export toolbar and preview so state is clean when user navigates away. */
  private closeAllExportOverlays(): void {
    this.exportToolbarOpen_.set(false)
    this.viewExportModal_.set(null)
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  ngOnDestroy(): void {
    this.closeAllExportOverlays()
    this.heroFab_.clearPageActions()
    this.recipeTypeRevalidationSub_?.unsubscribe()
  }

  // ─── AI Edit ─────────────────────────────────────────────────────

  protected onAiEditClick(): void {
    this.aiFlow_.openEditModal()
  }

  // ─── Export ───────────────────────────────────────────────────────

  protected openExportFromHeroFab(): void {
    // Defer to next tick so the opening click is not interpreted as click-outside
    setTimeout(() => this.exportToolbarOpen_.set(true), 0)
  }

  protected closeExportToolbar(): void {
    this.exportToolbarOpen_.set(false)
    this.viewExportModal_.set(null)
  }

  protected openViewExportModal(
    key: 'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'all'
  ): void {
    this.viewExportModal_.update((current) => (current === key ? null : key))
  }

  protected closeViewExportModal(): void {
    this.viewExportModal_.set(null)
  }

  protected goToCookFromHeroFab(): void {
    const id = this.recipeId_()
    void this.router_.navigate(id ? ['/cook', id] : ['/cook'])
  }

  /** Async validator: duplicate name across all recipe types (excludes current id when editing).
   * Dishes and preparations share a global name namespace — same name in either
   * collection is a conflict. Excludes the record being edited (by _id) from both
   * collections so type-change saves (preparation → dish) are not falsely blocked
   * mid-edit: the preparation being converted is the same logical item. */
  private duplicateNameValidator_(control: AbstractControl): Observable<ValidationErrors | null> {
    return timer(300).pipe(
      switchMap(() => {
        const name = (control.value ?? '').toString().trim()
        if (!name) return of(null)
        const currentId = this.recipeId_()
        const combined = [...this.recipeDataService_.allRecipes_(), ...this.dishDataService_.allDishes_()]
        const twin = findDuplicateName(combined, name, currentId)
        if (!twin) return of(null)
        console.warn('[duplicateName]', twin)
        return of({
          duplicateName: {
            _id: twin._id,
            isDish: twin.recipeType === 'dish',
            fromMaster: !!twin._masterId && twin._masterId !== twin._id
          }
        })
      })
    )
  }

  private patchFormFromRecipe(recipe: Recipe): void {
    this.isApproved_.set(recipe.isApproved)
    this.recipeFormService_.patchFormFromRecipe(this.recipeForm_, recipe)
    this.recipeImageUrl_.set(recipe.imageUrl ?? null)
    this.recipeRating_.set(recipe.rating ?? 0)
    this.netoConfirmed_.set(recipe.netoConfirmed ?? false)
    // Capture saved portions for the dish reset button (only for existing dishes).
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish'
    this.savedPortions_.set(isDish ? (recipe.yieldAmount ?? null) : null)
    // patchFormFromRecipe uses emitEvent:false, so recipe_type.valueChanges never fires.
    // Manually sync recipeType_ so the template renders the correct workflow format.
    this.recipeType_.set(isDish ? 'dish' : 'preparation')
    // Record the original type so save gates can detect type-change and prompt the user.
    this.initialRecipeType_ = isDish ? 'dish' : 'preparation'
    this.masterId_ = recipe._masterId ?? null
  }

  //GETTERS
  get yieldConversionsArray() {
    return this.recipeForm_.get('yield_conversions') as FormArray
  }

  get workflowArray() {
    return this.recipeForm_.get('workflow_items') as FormArray
  }

  get ingredientsArray() {
    return this.recipeForm_.get('ingredients') as FormArray
  }

  protected get logisticsBaselineArray(): FormArray {
    return (this.recipeForm_.get('logistics') as FormGroup)?.get('baseline') as FormArray
  }

  /** For pendingChangesGuard: true when current form value differs from initial state when user entered the page. */
  hasRealChanges(): boolean {
    if (this.historyViewMode_() || this.recipeForm_.disabled) return false

    if (!this.recipeId_()) {
      // New recipe: failsafe checks for any real content
      if (this.ingredientsArray.controls.some((g) => !!(g as FormGroup).get('referenceId')?.value)) return true
      if ((this.recipeForm_.get('nameHebrew')?.value ?? '').trim()) return true
      return false // blank new recipe — nothing to guard
    }

    if (this.initialRecipeSnapshot_ === null) return this.recipeForm_.dirty === true
    const current = this.getRecipeSnapshotForComparison()
    return current !== this.initialRecipeSnapshot_
  }

  /** For pendingChangesGuard: save the recipe and resolve once done. */
  async saveAndWait(): Promise<boolean> {
    const headerValid = this.recipeHeaderRef_()?.validate() ?? true

    // Neto/portions confirmation gate.
    const headerRef = this.recipeHeaderRef_()
    if (headerRef?.isYieldManualOverride() && !this.netoConfirmed_()) {
      const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish'
      const confirmed = await this.confirmModal_.open(
        isDish ? 'dish_portions_confirm_message' : 'neto_confirm_message',
        {
          saveLabel: 'confirm',
          headerKey: isDish ? 'dish_portions_confirm_header' : 'neto_confirm_header'
        }
      )
      if (!confirmed) return false
      this.netoConfirmed_.set(true)
    }

    // Type-change confirmation gate — same check as in saveRecipe().
    if (this.recipeId_() && this.initialRecipeType_) {
      const formType = this.recipeForm_.get('recipe_type')?.value === 'dish' ? 'dish' : 'preparation'
      if (formType !== this.initialRecipeType_) {
        const toDish = formType === 'dish'
        const confirmed = await this.confirmModal_.open(
          toDish ? 'type_change_to_dish_message' : 'type_change_to_preparation_message',
          {
            saveLabel: 'confirm',
            headerKey: toDish ? 'type_change_to_dish_header' : 'type_change_to_preparation_header',
            variant: 'warning'
          }
        )
        if (!confirmed) return false
      }
    }

    // Safety net: if a stale duplicateName error survived to this point, re-validate.
    const nameCtrl = this.recipeForm_.get('nameHebrew')
    if (nameCtrl?.errors?.['duplicateName'] && !this.recipeForm_.pending) {
      nameCtrl.updateValueAndValidity()
    }

    // Wait for async validators to settle before checking validity.
    if (this.recipeForm_.pending) {
      await firstValueFrom(
        this.recipeForm_.statusChanges.pipe(
          filter((s) => s !== 'PENDING'),
          take(1)
        )
      )
    }

    if (this.recipeForm_.invalid || !headerValid) {
      this.recipeForm_.markAllAsTouched()
      const msg = this.getRecipeValidationError_()
      this.userMsg_.onSetErrorMsg(msg)
      return false
    }

    // Same scope question saveRecipe() asks. This is the leave-the-page guard's
    // save path, and without it an edit made on the way out silently lands on
    // the user's own copy only — and sets _userModified, excluding that recipe
    // from every future master update. forcePrompt mirrors saveRecipe()'s own
    // isNewRecipe-by-admin case (2026-09-30).
    const isNewRecipeOnLeave = !this.recipeId_()
    const scope = await this.masterPush_.askScope(
      { _masterId: this.masterId_ ?? undefined },
      isNewRecipeOnLeave && this.isAdmin_()
    )
    if (scope === 'cancel') return false

    this.saving.setSaving(true)
    const recipe = this.buildRecipeFromForm()
    recipe.autoLabels = this.recipeFormService_.computeAutoLabels(recipe)

    return new Promise<boolean>((resolve) => {
      this.state_.saveRecipe(recipe).subscribe({
        next: (saved) => {
          if (scope === 'everyone' && saved) this.masterPush_.pushToMaster(saved)
          this.saving.setSaving(false)
          this.isSubmitted = true
          resolve(true)
        },
        error: () => {
          this.saving.setSaving(false)
          this.userMsg_.onSetErrorMsg(this.translation_.translate('error_saving_recipe'))
          resolve(false)
        }
      })
    })
  }

  /** Normalized form value for comparison (numbers coerced, labels sorted). */
  private getRecipeSnapshotForComparison(): string {
    const raw = this.recipeForm_.getRawValue() as Record<string, unknown>
    const labels = (raw?.['labels'] ?? []) as string[]
    const normalizedLabels = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''))
    const yieldConv = (raw?.['yield_conversions'] ?? []) as { amount?: number | string; unit?: string }[]
    const yieldNorm = yieldConv.map((c) => ({
      amount: Math.round(Number(c?.amount ?? 0) * 100) / 100,
      unit: (c?.unit ?? '').toString()
    }))
    const ingredients = (raw?.['ingredients'] ?? []) as {
      referenceId?: string
      item_type?: string
      amount_net?: number | string
      unit?: string
      total_cost?: number
    }[]
    const ingNorm = ingredients.map((ing) => ({
      referenceId: (ing?.referenceId ?? '').toString(),
      item_type: (ing?.item_type ?? '').toString(),
      amount_net: Number(ing?.amount_net ?? 0),
      unit: (ing?.unit ?? '').toString()
    }))
    const workflow = (raw?.['workflow_items'] ?? []) as Record<string, unknown>[]
    const workflowNorm = workflow.map((row) => {
      if (
        row?.['order'] != null ||
        row?.['instruction'] != null ||
        row?.['labor_time'] != null ||
        row?.['cooking_time'] != null
      ) {
        return {
          order: Number(row?.['order'] ?? 0),
          instruction: (row?.['instruction'] ?? '').toString(),
          labor_time: Number(row?.['labor_time'] ?? 0),
          cooking_time: Number(row?.['cooking_time'] ?? 0)
        }
      }
      return {
        preparationName: (row?.['preparationName'] ?? '').toString(),
        categoryName: (row?.['categoryName'] ?? '').toString(),
        mainCategoryName: (row?.['mainCategoryName'] ?? '').toString(),
        quantity: Number(row?.['quantity'] ?? 0),
        unit: (row?.['unit'] ?? '').toString()
      }
    })
    const logistics = raw?.['logistics'] as { baseline?: unknown[] } | undefined
    const baselineRaw = (logistics?.['baseline'] ?? []) as {
      equipmentId?: string
      quantity?: number
      phase?: string
      isCritical?: boolean
      notes?: string
    }[]
    const baselineNorm = baselineRaw.map((r) => ({
      equipmentId: (r?.equipmentId ?? '').toString(),
      quantity: Number(r?.quantity ?? 0),
      phase: (r?.phase ?? 'both').toString(),
      isCritical: !!r?.isCritical,
      notes: (r?.notes ?? '').toString()
    }))
    const normalized = {
      nameHebrew: (raw?.['nameHebrew'] ?? '').toString(),
      recipe_type: (raw?.['recipe_type'] ?? 'preparation').toString(),
      serving_portions: Number(raw?.['serving_portions'] ?? 1),
      labels: normalizedLabels,
      course: (raw?.['course'] ?? '').toString(),
      yield_conversions: yieldNorm,
      ingredients: ingNorm,
      workflow_items: workflowNorm,
      logistics_baseline: baselineNorm,
      // Signal-backed state that buildRecipeFromForm() persists but the form
      // group never holds. Anything saved from a signal has to be mirrored
      // here or the dirty check cannot see it: changing only the rating left
      // the snapshot identical, so leaving the page never prompted to save.
      imageUrl: this.recipeImageUrl_() ?? null,
      rating: this.recipeRating_(),
      isApproved: this.isApproved_(),
      netoConfirmed: this.netoConfirmed_()
    }
    return JSON.stringify(normalized)
  }

  protected get allEquipment_() {
    return this.equipmentData_.allEquipment_()
  }

  protected equipmentOptions_ = computed(() =>
    this.equipmentData_.allEquipment_().map((eq) => ({ value: eq._id, label: eq.nameHebrew }))
  )

  protected phaseOptions_: { value: string; label: string }[] = [
    { value: 'prep', label: 'phase_prep' },
    { value: 'service', label: 'phase_service' },
    { value: 'both', label: 'phase_both' }
  ]

  protected logisticsToolSearchQuery_ = signal('')
  protected logisticsToolQuantity_ = signal(1)
  protected logisticsToolDropdownOpen_ = signal(false)
  protected logisticsHighlightedIndex_ = signal(-1)
  /** Selected equipment id (from dropdown); user sets quantity then presses Add. */
  protected logisticsSelectedToolId_ = signal<string | null>(null)

  /** Equipment IDs already in the logistics baseline (excluded from equipment search options). */
  private logisticsBaselineIds_ = toSignal(
    (this.logisticsBaselineArray.valueChanges as Observable<unknown>).pipe(
      startWith(this.logisticsBaselineArray.value),
      map((arr: unknown) => (arr as { equipmentId?: string }[]).map((r) => r.equipmentId).filter(Boolean) as string[])
    ),
    { initialValue: [] as string[] }
  )

  /** Search options: equipment only (by nameHebrew), "starts with" + Hebrew/Latin script. */
  protected logisticsSearchOptions_ = computed((): Equipment[] => {
    const raw = this.logisticsToolSearchQuery_().trim()
    if (!raw) return []
    const alreadyAdded = new Set(this.logisticsBaselineIds_() ?? [])
    const allEquipment = this.equipmentData_.allEquipment_().filter((eq) => !alreadyAdded.has(eq._id))
    const filtered = filterOptionsByStartsWith(allEquipment, raw, (eq) => eq.nameHebrew)
    const qLower = raw.toLowerCase()
    return filtered.slice().sort((a, b) => {
      const aName = a.nameHebrew.toLowerCase()
      const bName = b.nameHebrew.toLowerCase()
      const aStarts = aName.startsWith(qLower) ? 0 : 1
      const bStarts = bName.startsWith(qLower) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return aName.indexOf(qLower) - bName.indexOf(qLower)
    })
  })

  protected getEquipmentNameById(id: string): string {
    const eq = this.equipmentData_
      .allEquipment_()
      .find((e) => e._id === id || (e as { _masterId?: string })._masterId === id)
    return eq?.nameHebrew ?? id
  }

  protected incrementLogisticsQuantity(): void {
    this.logisticsToolQuantity_.update((q) => quantityIncrement(q, 1, { integerOnly: true }))
  }

  protected decrementLogisticsQuantity(): void {
    this.logisticsToolQuantity_.update((q) => quantityDecrement(q, 1, { integerOnly: true }))
  }

  protected onLogisticsQuantityKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const current = this.logisticsToolQuantity_()
    const next =
      e.key === 'ArrowUp'
        ? quantityIncrement(current, 1, { integerOnly: true })
        : quantityDecrement(current, 1, { integerOnly: true })
    this.logisticsToolQuantity_.set(next)
  }

  /** Select an option from dropdown (does not add yet; user sets quantity and presses Add). */
  protected selectLogisticsOption(option: Equipment): void {
    this.logisticsSelectedToolId_.set(option._id)
    this.logisticsToolQuantity_.set(1)
    this.logisticsToolSearchQuery_.set(option.nameHebrew)
    this.logisticsToolDropdownOpen_.set(false)
  }

  protected onLogisticsSearchInput(value: string): void {
    this.logisticsToolSearchQuery_.set(value)
    this.logisticsHighlightedIndex_.set(-1)
    this.logisticsToolDropdownOpen_.set(value.trim().length > 0)
    const selectedId = this.logisticsSelectedToolId_()
    if (selectedId && this.getEquipmentNameById(selectedId) !== value) {
      this.logisticsSelectedToolId_.set(null)
    }
  }

  protected onLogisticsSearchKeydown(event: KeyboardEvent): void {
    if (!this.logisticsToolDropdownOpen_()) return
    const opts = this.logisticsSearchOptions_()
    const len = opts.length + 1 // +1 for 'add new tool'
    let idx = this.logisticsHighlightedIndex_()

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      idx = Math.min(idx + 1, len - 1)
      this.logisticsHighlightedIndex_.set(idx)
      this.scrollLogisticsDropdownToItem(idx)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      idx = Math.max(idx - 1, 0)
      this.logisticsHighlightedIndex_.set(idx)
      this.scrollLogisticsDropdownToItem(idx)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (idx >= 0 && idx < opts.length) {
        this.selectLogisticsOption(opts[idx])
        this.logisticsHighlightedIndex_.set(-1)
      } else if (idx === opts.length) {
        this.openAddNewToolModal()
        this.logisticsHighlightedIndex_.set(-1)
      }
    } else if (event.key === 'Escape') {
      this.logisticsToolDropdownOpen_.set(false)
      this.logisticsHighlightedIndex_.set(-1)
    }
  }

  private scrollLogisticsDropdownToItem(index: number) {
    setTimeout(() => {
      const dropdown = document.querySelector('.logistics-tool-dropdown')
      if (!dropdown) return
      const items = dropdown.querySelectorAll('.logistics-tool-option')
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' })
      }
    }, 0)
  }

  /** Add the currently selected item (with current quantity) to baseline. Called by Add button. */
  protected addSelectedToolToBaseline(): void {
    const id = this.logisticsSelectedToolId_()
    if (!id) return
    const qty = this.logisticsToolQuantity_()
    this.logisticsBaselineArray.push(
      this.recipeFormService_.createBaselineRow({
        equipmentId: id,
        quantity: qty,
        phase: 'both',
        isCritical: true,
        notes: undefined
      })
    )
    this.logisticsSelectedToolId_.set(null)
    this.logisticsToolSearchQuery_.set('')
    this.logisticsToolQuantity_.set(1)
    this.logisticsToolDropdownOpen_.set(false)
  }

  /** Add button click: if something selected → add to baseline; if only search text → open add-new-equipment modal. */
  protected onLogisticsAddClick(): void {
    if (this.logisticsSelectedToolId_()) {
      this.addSelectedToolToBaseline()
      return
    }
    if (this.logisticsToolSearchQuery_().trim()) {
      this.openAddNewToolModal()
    }
  }

  protected async openAddNewToolModal(): Promise<void> {
    this.logisticsToolDropdownOpen_.set(false)
    const initialName = this.logisticsToolSearchQuery_().trim() || undefined
    const result = await this.addEquipmentModal_.open(initialName)
    if (!result?.name?.trim()) return
    try {
      const now = Date.now()
      const created = await this.equipmentData_.addEquipment({
        nameHebrew: result.name.trim(),
        category: result.category,
        ownedQuantity: 0,
        isConsumable: false,
        createdAt: now,
        updatedAt: now
      })
      this.logisticsSelectedToolId_.set(created._id)
      this.logisticsToolSearchQuery_.set(created.nameHebrew)
      this.logisticsToolQuantity_.set(1)
    } catch (err) {
      this.logging_.error({
        event: 'recipe_builder.save_error',
        message: 'Recipe builder save error (add tool)',
        context: { err }
      })
      const msg =
        err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
          ? (this.translation_.translate('duplicate_equipment_name') ?? 'כלי עם שם זה כבר קיים')
          : 'שגיאה בהוספת הכלי'
      this.userMsg_.onSetErrorMsg(msg)
    }
  }

  //CREATE

  protected addBaselineRow(): void {
    this.logisticsBaselineArray.push(this.recipeFormService_.createBaselineRow())
  }

  protected removeBaselineRow(index: number): void {
    this.logisticsBaselineArray.removeAt(index)
  }

  addNewStep(category?: string | void): void {
    const nextOrder = this.workflowArray.length + 1
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish'

    const newGroup = isDish
      ? this.recipeFormService_.createPrepItemRow({
          categoryName: (category as string) || '',
          mainCategoryName: (category as string) || ''
        })
      : this.recipeFormService_.createStepGroup(nextOrder)

    this.workflowArray.push(newGroup)
    this.focusWorkflowRowAt_.set(this.workflowArray.length - 1)
  }

  //UPDATE

  protected onImageChange(url: string): void {
    this.recipeImageUrl_.set(url)
  }

  addNewIngredientRow(): void {
    const newGroup = this.recipeFormService_.createIngredientGroup()
    this.ingredientsArray.push(newGroup)
    this.ingredientsArray.updateValueAndValidity()
    this.focusIngredientSearchAtRow_.set(this.ingredientsArray.length - 1)
  }

  protected onIngredientSearchFocusDone(): void {
    this.focusIngredientSearchAtRow_.set(null)
  }

  async saveRecipe(options?: { navigateOnSuccess?: boolean }): Promise<void> {
    const headerValid = this.recipeHeaderRef_()?.validate() ?? true
    if (this.recipeForm_.pending) {
      // Async validators (duplicate-name check) still running — block save to avoid racing
      this.userMsg_.onSetErrorMsg(this.translation_.translate('validating_please_wait') ?? 'אנא המתן לסיום האימות')
      return
    }
    if (this.recipeForm_.invalid || !headerValid) {
      this.recipeForm_.markAllAsTouched()
      const msg = this.getRecipeValidationError_()
      this.userMsg_.onSetErrorMsg(msg)
      return
    }

    if (this.ingredientsTableRef_()?.hasBlockingRows()) {
      this.blockingIngredientsError_.set(true)
      this.userMsg_.onSetErrorMsg(this.translation_.translate('blocking_ingredients_error'))
      setTimeout(() => {
        document.querySelector('.incomplete-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }
    this.blockingIngredientsError_.set(false)

    // Unlinked ingredients confirmation gate
    if (this.ingredientsTableRef_()?.hasUnlinkedRows()) {
      const confirmed = await this.confirmModal_.open('save_with_unlinked_ingredients', { saveLabel: 'save_anyway' })
      if (!confirmed) return
    }

    // Neto/portions confirmation gate
    const headerRef = this.recipeHeaderRef_()
    if (headerRef?.isYieldManualOverride() && !this.netoConfirmed_()) {
      const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish'
      const confirmed = await this.confirmModal_.open(
        isDish ? 'dish_portions_confirm_message' : 'neto_confirm_message',
        {
          saveLabel: 'confirm',
          headerKey: isDish ? 'dish_portions_confirm_header' : 'neto_confirm_header'
        }
      )
      if (!confirmed) return
      this.netoConfirmed_.set(true)
    }

    // Type-change confirmation gate — only fires when editing an existing record
    // and the user has switched recipe_type from what was originally loaded.
    if (this.recipeId_() && this.initialRecipeType_) {
      const formType = this.recipeForm_.get('recipe_type')?.value === 'dish' ? 'dish' : 'preparation'
      if (formType !== this.initialRecipeType_) {
        const toDish = formType === 'dish'
        const confirmed = await this.confirmModal_.open(
          toDish ? 'type_change_to_dish_message' : 'type_change_to_preparation_message',
          {
            saveLabel: 'confirm',
            headerKey: toDish ? 'type_change_to_dish_header' : 'type_change_to_preparation_header',
            variant: 'warning'
          }
        )
        if (!confirmed) return
      }
    }

    // TEMPORARY (dev-process-only, see chat 2026-09-26): editing a recipe cloned
    // from a shared master asks whether the change should also apply to that
    // master (everyone) or stay on this user's own copy. Open to any signed-in
    // user right now — see server/routes/generic.js push-to-master route header.
    let pushToMasterAfterSave = false
    const isNewRecipe = !this.recipeId_()
    if ((this.recipeId_() && this.masterId_) || (isNewRecipe && this.isAdmin_())) {
      const scope = await this.masterPush_.askScope({ _masterId: this.masterId_ ?? undefined }, isNewRecipe)
      if (scope === 'cancel') return
      pushToMasterAfterSave = scope === 'everyone'
    }

    const navigateOnSuccess = options?.navigateOnSuccess !== false
    this.saving.setSaving(true)
    const recipe = this.buildRecipeFromForm()
    recipe.autoLabels = this.recipeFormService_.computeAutoLabels(recipe)

    this.state_.saveRecipe(recipe).subscribe({
      next: (saved) => {
        this.saving.setSaving(false)
        if (pushToMasterAfterSave) this.masterPush_.pushToMaster(saved)
        if (navigateOnSuccess) {
          this.isSubmitted = true
          this.resetToNewForm_()
          this.router_.navigate(['/recipe-book'])
        } else {
          // If a type-change caused a new _id to be assigned, update recipeId_ so the
          // duplicate-name validator does not flag the same recipe as a conflict.
          if (saved._id && saved._id !== this.recipeId_()) {
            this.recipeId_.set(saved._id)
          }
          // Refresh the entry-time snapshot so the pending-changes guard does not
          // fire when the user navigates away after a successful in-place save.
          this.initialRecipeSnapshot_ = this.getRecipeSnapshotForComparison()
          this.initialRecipeType_ = saved.recipeType === 'dish' ? 'dish' : 'preparation'
          this.recipeForm_.markAsPristine()
          // Update savedPortions_ so the reset button reflects the newly saved value.
          if (saved.recipeType === 'dish') {
            this.savedPortions_.set(saved.yieldAmount ?? null)
          }
          this.userMsg_.onSetSuccessMsg(
            this.translation_.translate(this.isApproved_() ? 'approval_success' : 'unapproval_success')
          )
        }
      },
      error: () => {
        this.saving.setSaving(false)
        if (!navigateOnSuccess) {
          this.userMsg_.onSetErrorMsg(this.translation_.translate('approval_error'))
        }
      }
    })
  }

  protected onApproveStamp(): void {
    if (this.recipeId_() && this.hasRealChanges()) {
      this.confirmModal_.open('approve_stamp_unsaved_confirm', { saveLabel: 'save_changes' }).then((confirmed) => {
        if (!confirmed) return
        this.isApproved_.set(!this.isApproved_())
        this.saveRecipe({ navigateOnSuccess: false })
      })
      return
    }
    this.isApproved_.set(!this.isApproved_())
    if (this.recipeId_()) {
      this.saveRecipe({ navigateOnSuccess: false })
    }
  }

  navigateBackFromHistory(): void {
    this.router_.navigate(['/recipe-book'])
  }

  onPrint(): void {
    window.print()
  }

  /** Quantity for export (form snapshot): dish = serving_portions, recipe = yield amount; min 1. */
  private exportQuantity_(): number {
    const raw = this.recipeForm_.getRawValue() as {
      recipe_type?: string
      serving_portions?: number
      yield_conversions?: { amount?: number }[]
    }
    if (raw?.recipe_type === 'dish') {
      const n = Number(raw?.serving_portions)
      return isNaN(n) || n < 1 ? 1 : n
    }
    const conv = raw?.yield_conversions?.[0]
    const n = conv?.amount != null ? Number(conv.amount) : 1
    return isNaN(n) || n < 1 ? 1 : n
  }

  protected onViewRecipeInfo(): void {
    const recipe = this.buildRecipeFromForm()
    const qty = this.exportQuantity_()
    this.exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty))
    this.exportPreviewType_ = 'recipe-info'
  }

  protected onViewShoppingList(): void {
    const recipe = this.buildRecipeFromForm()
    const qty = this.exportQuantity_()
    this.exportPreviewPayload_.set(this.exportService_.getShoppingListPreviewPayload(recipe, qty))
    this.exportPreviewType_ = 'shopping-list'
  }

  protected onViewCookingSteps(): void {
    const recipe = this.buildRecipeFromForm()
    const qty = this.exportQuantity_()
    this.exportPreviewPayload_.set(this.exportService_.getCookingStepsPreviewPayload(recipe, qty))
    this.exportPreviewType_ = 'cooking-steps'
  }

  protected onViewDishChecklist(): void {
    const recipe = this.buildRecipeFromForm()
    const qty = this.exportQuantity_()
    this.exportPreviewPayload_.set(this.exportService_.getDishChecklistPreviewPayload(recipe, qty))
    this.exportPreviewType_ = 'dish-checklist'
  }

  protected onViewAll(): void {
    const recipe = this.buildRecipeFromForm()
    const qty = this.exportQuantity_()
    this.exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty))
    this.exportPreviewType_ = 'recipe-all'
    this.closeViewExportModal()
  }

  protected onExportFromPreview(): void {
    const payload = this.exportPreviewPayload_()
    const type = this.exportPreviewType_
    if (!payload || !type) return
    const recipe = this.buildRecipeFromForm()
    const qty = this.exportQuantity_()
    if (type === 'recipe-info') this.exportService_.exportRecipeInfo(recipe, qty)
    else if (type === 'shopping-list') this.exportService_.exportShoppingList(recipe, qty)
    else if (type === 'cooking-steps') this.exportService_.exportCookingSteps(recipe, qty)
    else if (type === 'dish-checklist') this.exportService_.exportDishChecklist(recipe, qty)
    else if (type === 'recipe-all') this.exportService_.exportAllTogetherRecipe(recipe, qty)
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  protected onExportRecipeInfo(): void {
    this.exportService_.exportRecipeInfo(this.buildRecipeFromForm(), this.exportQuantity_())
  }

  protected onExportShoppingList(): void {
    this.exportService_.exportShoppingList(this.buildRecipeFromForm(), this.exportQuantity_())
  }

  protected onExportCookingSteps(): void {
    this.exportService_.exportCookingSteps(this.buildRecipeFromForm(), this.exportQuantity_())
  }

  protected onExportDishChecklist(): void {
    this.exportService_.exportDishChecklist(this.buildRecipeFromForm(), this.exportQuantity_())
  }

  protected onExportAllTogether(): void {
    this.exportService_.exportAllTogetherRecipe(this.buildRecipeFromForm(), this.exportQuantity_())
  }

  protected onPrintFromPreview(): void {
    window.print()
  }

  protected onCloseExportPreview(): void {
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  /** Returns a user-friendly validation error message listing exactly what is missing. */
  private getRecipeValidationError_(): string {
    const isDish = this.recipeForm_.get('recipe_type')?.value === 'dish'
    const errors: string[] = []

    const name = (this.recipeForm_.get('nameHebrew')?.value ?? '').toString().trim()
    if (this.recipeForm_.get('nameHebrew')?.errors?.['duplicateName']) {
      errors.push(isDish ? 'שם מנה זה כבר קיים' : 'שם מתכון זה כבר קיים')
    }
    if (!name) {
      errors.push(isDish ? 'שם המנה חסר' : 'שם המתכון חסר')
    }

    const raw = this.recipeForm_.getRawValue() as {
      ingredients?: { referenceId?: string; amount_net?: number | string; nameHebrew?: string }[]
      workflow_items?: { preparationName?: string; quantity?: number | string; unit?: string }[]
    }
    const ingredients = raw?.ingredients || []
    const hasAnyIngredient = ingredients.some((ing: { referenceId?: string }) => !!ing?.referenceId)
    if (!hasAnyIngredient) {
      errors.push('חסר מרכיב: יש לבחור לפחות מוצר או מתכון אחד')
    }
    ingredients.forEach(
      (ing: { referenceId?: string; amount_net?: number | string; nameHebrew?: string }, i: number) => {
        if (!ing?.referenceId) return
        const amt = ing.amount_net
        const numAmt = typeof amt === 'number' ? amt : Number(amt)
        const label = ing.nameHebrew || `מרכיב ${i + 1}`
        if (amt == null || amt === '' || isNaN(numAmt) || numAmt < 0) {
          errors.push(`כמות חסרה עבור "${label}"`)
        } else if (numAmt === 0) {
          errors.push(`כמות עבור "${label}" חייבת להיות גדולה מ-0`)
        }
      }
    )

    const portions = this.recipeForm_.get('serving_portions')?.value
    if (isDish && (portions == null || Number(portions) < 1)) {
      errors.push('מספר מנות חסר או לא תקין (נדרש לפחות 1)')
    }

    const workflowRows = raw?.workflow_items || []
    if (isDish) {
      workflowRows.forEach(
        (row: { preparationName?: string; quantity?: number | string; unit?: string }, _i: number) => {
          if (!row?.preparationName?.trim()) return
          const qty = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity)
          if (row.quantity == null || row.quantity === '' || isNaN(qty) || qty < 0) {
            errors.push(`כמות חסרה עבור ההכנה "${row.preparationName}"`)
          }
          if (!row?.unit?.trim()) {
            errors.push(`יחידה חסרה עבור ההכנה "${row.preparationName}"`)
          }
        }
      )
    }

    if (errors.length === 0) {
      return 'יש למלא את כל השדות הנדרשים'
    }
    return errors.length === 1 ? errors[0] : `חסרים: ${errors.join('; ')}`
  }

  private buildRecipeFromForm(): Recipe {
    const recipe = this.recipeFormService_.buildRecipeFromForm(this.recipeForm_, this.recipeId_(), this.isApproved_())
    const url = this.recipeImageUrl_()
    const rating = this.recipeRating_()
    return {
      ...recipe,
      ...(url ? { imageUrl: url } : {}),
      ...(rating > 0 ? { rating: rating } : {}),
      netoConfirmed: this.netoConfirmed_()
    }
  }

  //DELETE

  removeIngredient(index: number): void {
    this.ingredientsArray.removeAt(index)
    if (this.ingredientsArray.length === 0) {
      this.addNewIngredientRow()
    }
  }

  protected onOpenUnitCreator(): void {
    this.unitRegistry_.openUnitCreator()
  }

  deleteStep(index: number): void {
    this.workflowArray.removeAt(index)

    if (this.recipeForm_.get('recipe_type')?.value === 'preparation') {
      this.workflowArray.controls.forEach((group, i) => {
        group.get('order')?.setValue(i + 1)
      })
    }
  }
}
