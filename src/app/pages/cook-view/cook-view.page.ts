import { Component, DestroyRef, inject, signal, computed, OnInit, OnDestroy } from '@angular/core'
import { useSavingState } from 'src/app/core/utils/saving-state.util'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, NavigationStart, Router, RouterLink } from '@angular/router'
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'

import { Recipe, RecipeStep, FlatPrepItem, PrepCategory } from '@models/recipe.model'
import { ScalingService, ScaledIngredientRow, ScaledPrepRow } from '@services/scaling.service'
import { CookViewStateService } from '@services/cook-view-state.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TranslationService } from '@services/translation.service'
import { ExportService } from '@services/export.service'
import type { ExportPayload } from '../../core/utils/export.util'
import { ExportPreviewComponent } from '../../shared/export-preview/export-preview.component'
import { ApproveStampComponent } from 'src/app/shared/approve-stamp/approve-stamp.component'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { RecipeWorkflowComponent } from '@pages/recipe-builder/components/recipe-workflow/recipe-workflow.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { FormatQuantityPipe } from 'src/app/core/pipes/format-quantity.pipe'
import { quantityIncrement, quantityDecrement } from '../../core/utils/quantity-step.util'
import { filter } from 'rxjs'
import { HeroFabService } from '@services/hero-fab.service'
import { RecipeFormService } from '@pages/recipe-builder/services/recipe-form.service'

/** Multiplier chip definitions — factor is the multiplier applied to `convertedYieldAmount_()`. */
const MULTIPLIER_CHIPS = [
  { factor: 0.5, key: 'multiplier_half' },
  { factor: 1,   key: 'multiplier_1x' },
  { factor: 2,   key: 'multiplier_2x' },
  { factor: 3,   key: 'multiplier_3x' },
  { factor: 4,   key: 'multiplier_4x' },
] as const

@Component({
  selector: 'app-cook-view-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe,
    RecipeWorkflowComponent,
    LoaderComponent,
    CustomSelectComponent,
    FormatQuantityPipe,
    ExportPreviewComponent,
    ApproveStampComponent,
    CounterComponent
  ],
  templateUrl: './cook-view.page.html',
  styleUrl: './cook-view.page.scss'
})
export class CookViewPage implements OnInit, OnDestroy {
  // ---- INJECTED SERVICES ----
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly fb = inject(FormBuilder)
  private readonly scalingService = inject(ScalingService)
  protected readonly cookViewState = inject(CookViewStateService)
  private readonly recipeCostService = inject(RecipeCostService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly unitRegistry = inject(UnitRegistryService)
  private readonly exportService = inject(ExportService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly userMsg = inject(UserMsgService)
  private readonly authModal = inject(AuthModalService)
  private readonly translation = inject(TranslationService)
  private readonly heroFab = inject(HeroFabService)
  private readonly recipeFormService = inject(RecipeFormService)

  // ---- SIGNALS & CONSTANTS ----
  protected recipe_ = signal<Recipe | null>(null)
  protected targetQuantity_ = signal<number>(1)
  protected selectedUnit_ = signal<string>('')
  /** Per-row unit override (index -> unit key). */
  protected unitOverrides_ = signal<Record<number, string>>({})
  protected editMode_ = signal<boolean>(false)
  /** Snapshot when entering edit mode; restored on Undo. */
  private originalRecipe_ = signal<Recipe | null>(null)
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  /** Parent form for workflow_items FormArray; used in edit mode only. */
  private readonly workflowParentForm_ = this.fb.group({ workflow_items: this.fb.array([]) })
  /** Focus workflow row at index (for add step/prep); cleared after focus. */
  protected focusWorkflowRowAt_ = signal<number | null>(null)
  private workflowResetTrigger_ = 0

  /** Scale-by-ingredient: index and amount we scaled by (null = normal view). */
  protected scaleByIngredientIndex_ = signal<number | null>(null)
  protected scaleByIngredientAmount_ = signal<number | null>(null)
  /** Row currently in "setting" state (amount input + Convert visible). */
  protected settingByIngredientIndex_ = signal<number | null>(null)
  /** Current value in the inline amount input for the row in setting state. */
  protected settingByIngredientAmount_ = signal<number>(0)

  /** Payload for export preview popup (null = closed). */
  protected exportPreviewPayload_ = signal<ExportPayload | null>(null)
  /** Which export type is shown in preview (so we know what to run on Export click). */
  private exportPreviewType_: 'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | null = null
  /** Floating export bar expanded. */
  protected exportBarExpanded_ = signal<boolean>(false)

  /**
   * Active multiplier chip factor (null = no chip selected, 1 = 1x selected by default).
   * Set to null when user manually adjusts quantity via stepper.
   */
  protected activeMultiplier_ = signal<number | null>(1)

  /** Ingredient check-off state (session-only, keyed by row index). */
  protected checkedIngredients_ = signal<Set<number>>(new Set())

  /** Step check-off state (session-only, keyed by step index). */
  protected checkedSteps_ = signal<Set<number>>(new Set())

  /** Multiplier chip definitions exposed to template. */
  protected readonly multiplierChips = MULTIPLIER_CHIPS

  // ---- COMPUTED SIGNALS ----
  /** True when we are in special scaled view (show banner + Back to full recipe). */
  protected isScaledView_ = computed(() => this.scaleByIngredientIndex_() !== null)

  /** Scaled ingredient row for the banner when in special view (null otherwise). */
  protected scaledViewRow_ = computed(() => {
    const idx = this.scaleByIngredientIndex_()
    if (idx === null) return null
    return this.getScaledIngredientAt(idx) ?? null
  })

  protected yieldUnitOptions_ = computed(() => {
    const recipe = this.recipe_()
    if (!recipe) return []
    const convs = recipe.yield_conversions_?.length ? recipe.yield_conversions_ : null
    if (convs?.length) {
      const seen = new Set<string>()
      return convs
        .filter(c => c?.unit && !seen.has(c.unit) && (seen.add(c.unit), true))
        .map(c => ({ value: c.unit, label: c.unit }))
    }
    const u = recipe.yield_unit_ || 'unit'
    return [{ value: u, label: u }]
  })

  protected convertedYieldAmount_ = computed(() => {
    const recipe = this.recipe_()
    if (!recipe) return 1
    const baseAmount = recipe.yield_amount_ ?? 1
    const baseUnit = recipe.yield_unit_ ?? 'unit'
    const selUnit = this.selectedUnit_() || baseUnit
    if (baseUnit === selUnit) return baseAmount
    const convs = recipe.yield_conversions_
    if (convs?.length) {
      const entry = convs.find(c => c?.unit === selUnit)
      if (entry != null) return entry.amount
    }
    const baseConv = this.unitRegistry.getConversion(baseUnit)
    const selConv = this.unitRegistry.getConversion(selUnit)
    if (!baseConv || !selConv) return baseAmount
    return baseAmount * (baseConv / selConv)
  })

  protected scaleFactor_ = computed(() => {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (!recipe) return 1
    return qty / this.convertedYieldAmount_()
  })

  protected scaledIngredients_ = computed(() => {
    const recipe = this.recipe_()
    const factor = this.scaleFactor_()
    if (!recipe) return []
    return this.scalingService.getScaledIngredients(recipe, factor)
  })

  protected scaledPrep_ = computed(() => {
    const recipe = this.recipe_()
    const factor = this.scaleFactor_()
    if (!recipe) return []
    return this.scalingService.getScaledPrepItems(recipe, factor)
  })

  protected scaledCost_ = computed(() => {
    const recipe = this.recipe_()
    const factor = this.scaleFactor_()
    if (!recipe?.ingredients_?.length) return 0
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients_: recipe.ingredients_.map(ing => ({
        ...ing,
        amount_: (ing.amount_ ?? 0) * factor
      }))
    }
    return this.recipeCostService.computeRecipeCost(scaledRecipe)
  })

  protected isDish_ = computed(() => {
    const r = this.recipe_()
    return !!(r?.recipe_type_ === 'dish' || (r?.prep_items_?.length ?? 0) > 0 || (r?.prep_categories_?.length ?? 0) > 0)
  })

  /** Number of steps marked as done. */
  protected completedStepCount_ = computed(() => this.checkedSteps_().size)

  /** Total step count for the current recipe. */
  protected totalStepCount_ = computed(() => this.recipe_()?.steps_?.length ?? 0)

  protected get workflowFormArray(): FormArray {
    return this.workflowParentForm_.get('workflow_items') as FormArray
  }

  protected get workflowResetTrigger(): number {
    return this.workflowResetTrigger_
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        if (!e.url.startsWith('/cook')) {
          this.closeAllExportOverlays()
        }
      })
    const recipe = this.route.snapshot.data['recipe'] as Recipe | null
    if (recipe) {
      this.recipe_.set(recipe)
      this.selectedUnit_.set(recipe.yield_unit_ || 'unit')
      this.cookViewState.setLastViewedRecipeId(recipe._id)
      const base = recipe.yield_amount_ ?? 1
      this.targetQuantity_.set(base)
    } else {
      const lastId = this.cookViewState.lastRecipeId()
      if (lastId) {
        this.router.navigate(['/cook', lastId])
        return
      }
    }
  }

  /** Close export bar and preview so state is clean when user navigates away. */
  private closeAllExportOverlays(): void {
    this.exportBarExpanded_.set(false)
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  ngOnDestroy(): void {
    this.closeAllExportOverlays()
    this.heroFab.clearPageActions()
  }

  protected setQuantity(value: number): void {
    const num = value != null && !Number.isNaN(value) ? Number(value) : (this.recipe_()?.yield_amount_ ?? 1)
    const recipe = this.recipe_()
    const min = recipe?.yield_unit_ === 'dish' ? 1 : 0.01
    this.targetQuantity_.set(Math.max(min, num))
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    // Deselect chip on manual quantity change
    this.activeMultiplier_.set(null)
  }

  /**
   * Apply a multiplier chip. Calculates the target quantity from the chip factor,
   * calls setQuantity (which clears activeMultiplier_), then re-sets activeMultiplier_
   * after so the chip stays highlighted.
   * NOTE: setQuantity clears activeMultiplier_ via signal update — re-set after calling it.
   * 0.5x chip on dish recipes: intentional — produces fractional yield (e.g. 1.5 dishes).
   * This is a conscious design choice per QA review; integerOnly is a stepper constraint only.
   */
  protected selectMultiplier(factor: number): void {
    const newQty = this.convertedYieldAmount_() * factor
    this.setQuantity(newQty)
    // Re-set after setQuantity clears it
    this.activeMultiplier_.set(factor)
  }

  /** When user changes the yield unit, convert quantity to equivalent in the new unit (e.g. 1 kg → 4 when switching to "unit"). */
  protected onYieldUnitChange(newUnit: string): void {
    const prevYield = this.convertedYieldAmount_()
    this.selectedUnit_.set(newUnit)
    if (prevYield > 0) {
      const batches = this.targetQuantity_() / prevYield
      const newYield = this.convertedYieldAmount_()
      const newQty = newYield > 0 ? batches * newYield : this.targetQuantity_()
      const recipe = this.recipe_()
      const min = recipe?.yield_unit_ === 'dish' ? 1 : 0.01
      this.targetQuantity_.set(Math.max(min, newQty))
    }
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    this.activeMultiplier_.set(null)
  }

  protected incrementQuantity(): void {
    const recipe = this.recipe_()
    const min = recipe?.yield_unit_ === 'dish' ? 1 : 0.01
    const options = recipe?.yield_unit_ === 'dish' ? { integerOnly: true } : undefined
    this.targetQuantity_.update(q => quantityIncrement(q, min, options))
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    this.activeMultiplier_.set(null)
  }

  protected decrementQuantity(): void {
    const recipe = this.recipe_()
    const min = recipe?.yield_unit_ === 'dish' ? 1 : 0.01
    const options = recipe?.yield_unit_ === 'dish' ? { integerOnly: true } : undefined
    this.targetQuantity_.update(q => quantityDecrement(q, min, options))
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    this.activeMultiplier_.set(null)
  }

  protected onQuantityKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    if (e.key === 'ArrowUp') this.incrementQuantity()
    else this.decrementQuantity()
  }

  protected onEditAmountKeydown(e: KeyboardEvent, index: number, currentAmount: number): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(currentAmount, 0, this.isDish_() ? { integerOnly: true } : undefined)
      : quantityDecrement(currentAmount, 0, this.isDish_() ? { integerOnly: true } : undefined)
    this.setIngredientAmount(index, next)
  }

  protected onSettingAmountKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const current = this.settingByIngredientAmount_()
    const options = this.isDish_() ? { integerOnly: true } : undefined
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(current, 0.01, options)
      : quantityDecrement(current, 0.01, options)
    this.settingByIngredientAmount_.set(next)
  }

  /** Enter "setting by this ingredient" state for row at index; prefilled with current scaled amount. */
  protected startSetByIngredient(index: number): void {
    const rows = this.scaledIngredients_()
    const row = rows[index]
    if (!row) return
    this.settingByIngredientIndex_.set(index)
    this.settingByIngredientAmount_.set(row.amount)
  }

  /** Cancel setting state (clear inline amount row). */
  protected cancelSetByIngredient(): void {
    this.settingByIngredientIndex_.set(null)
  }

  /** Parse and set the inline "setting by ingredient" amount from input. */
  protected onSettingAmountChange(value: unknown): void {
    const num = value != null && value !== '' ? Number(value) : 0
    this.settingByIngredientAmount_.set(Number.isFinite(num) ? num : 0)
  }

  /** Open confirm dialog, then apply scale by ingredient or cancel. */
  protected confirmScaleByIngredient(index: number, userAmount: number): void {
    const amount = Number(userAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const recipe = this.recipe_()
    if (!recipe?.ingredients_?.[index]) return
    const baseAmount = recipe.ingredients_[index].amount_ ?? 0
    if (baseAmount <= 0) return
    this.confirmModal.open('scale_recipe_confirm', { saveLabel: 'convert' }).then(confirmed => {
      if (!confirmed) return
      this.applyScaleByIngredient(index, amount)
      this.settingByIngredientIndex_.set(null)
    })
  }

  /** Set targetQuantity_ so that ingredient at index has the given amount; enter special view. */
  protected applyScaleByIngredient(index: number, userAmount: number): void {
    const amount = Number(userAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const recipe = this.recipe_()
    if (!recipe?.ingredients_?.[index]) return
    const baseAmount = recipe.ingredients_[index].amount_ ?? 0
    if (baseAmount <= 0) return
    const factor = amount / baseAmount
    const yieldAmount = recipe.yield_amount_ ?? 1
    this.targetQuantity_.set(yieldAmount * factor)
    this.scaleByIngredientIndex_.set(index)
    this.scaleByIngredientAmount_.set(amount)
  }

  /** Exit special scaled view: reset to recipe base yield. */
  protected resetToFullRecipe(): void {
    const recipe = this.recipe_()
    const base = recipe?.yield_amount_ ?? 1
    this.targetQuantity_.set(base)
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    this.activeMultiplier_.set(null)
  }

  /** Scaled ingredient row at index (for banner name/unit in special view). */
  protected getScaledIngredientAt(index: number): ScaledIngredientRow | undefined {
    return this.scaledIngredients_()[index]
  }

  protected enterEditMode(): void {
    if (!this.isLoggedIn()) {
      this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
      this.authModal.open('sign-in')
      return
    }
    const recipe = this.recipe_()
    if (!recipe) return
    this.originalRecipe_.set(JSON.parse(JSON.stringify(recipe)))
    this.editMode_.set(true)
    this.unitOverrides_.set({})
    this.buildWorkflowFormFromRecipe(recipe)
  }

  protected saveEdits(): void {
    this.applyWorkflowFormToRecipe()
    this.confirmModal.open('save_changes', { saveLabel: 'save_changes' }).then(confirmed => {
      if (!confirmed) return
      const recipe = this.recipe_()
      if (!recipe) return
      this.saving.setSaving(true)
      this.kitchenState.saveRecipe(recipe).subscribe({
        next: () => {
          this.originalRecipe_.set(null)
          this.editMode_.set(false)
          this.saving.setSaving(false)
        },
        error: () => { this.saving.setSaving(false) }
      })
    })
  }

  protected undoEdits(): void {
    const orig = this.originalRecipe_()
    if (orig) {
      this.recipe_.set(orig)
      this.originalRecipe_.set(null)
      this.editMode_.set(false)
      this.unitOverrides_.set({})
    }
  }

  protected onApproveStamp(): void {
    const recipe = this.recipe_()
    if (!recipe) return
    if (this.hasUnsavedEdits()) {
      this.applyWorkflowFormToRecipe()
      this.confirmModal.open('approve_stamp_unsaved_confirm', { saveLabel: 'save_changes' }).then(confirmed => {
        if (!confirmed) return
        this.saveRecipeWithToggledApproval()
      })
      return
    }
    this.saveRecipeWithToggledApproval()
  }

  private saveRecipeWithToggledApproval(): void {
    const recipe = this.recipe_()
    if (!recipe) return
    this.saving.setSaving(true)
    this.kitchenState.saveRecipe({ ...recipe, is_approved_: !recipe.is_approved_ }).subscribe({
      next: (saved) => {
        this.recipe_.set(saved)
        this.originalRecipe_.set(null)
        this.editMode_.set(false)
        this.saving.setSaving(false)
        this.userMsg.onSetSuccessMsg(
          this.translation.translate(saved.is_approved_ ? 'approval_success' : 'unapproval_success')
        )
      },
      error: () => {
        this.saving.setSaving(false)
        this.userMsg.onSetErrorMsg(this.translation.translate('approval_error'))
      }
    })
  }

  protected async onExportInfo(): Promise<void> {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (recipe) await this.exportService.exportRecipeInfo(recipe, qty)
  }

  protected async onExportShoppingList(): Promise<void> {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (recipe) await this.exportService.exportShoppingList(recipe, qty)
  }

  protected onViewRecipeInfo(): void {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (!recipe) return
    const payload = this.exportService.getRecipeInfoPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'recipe-info'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  protected onViewShoppingList(): void {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (!recipe) return
    const payload = this.exportService.getShoppingListPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'shopping-list'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  protected onExportPreviewClose(): void {
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  protected async onExportFromPreview(): Promise<void> {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (!recipe || !this.exportPreviewType_) return
    if (this.exportPreviewType_ === 'recipe-info') {
      await this.exportService.exportRecipeInfo(recipe, qty)
    } else if (this.exportPreviewType_ === 'shopping-list') {
      await this.exportService.exportShoppingList(recipe, qty)
    } else if (this.exportPreviewType_ === 'cooking-steps') {
      await this.exportService.exportCookingSteps(recipe, qty)
    } else if (this.exportPreviewType_ === 'dish-checklist') {
      await this.exportService.exportDishChecklist(recipe, qty)
    }
    this.onExportPreviewClose()
  }

  protected onPrintFromPreview(): void {
    window.print()
  }

  protected onViewCookingSteps(): void {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (!recipe) return
    const payload = this.exportService.getCookingStepsPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'cooking-steps'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  protected onViewDishChecklist(): void {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (!recipe) return
    const payload = this.exportService.getDishChecklistPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'dish-checklist'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  protected async onExportCookingSteps(): Promise<void> {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (recipe) await this.exportService.exportCookingSteps(recipe, qty)
  }

  protected async onExportDishChecklist(): Promise<void> {
    const recipe = this.recipe_()
    const qty = this.targetQuantity_()
    if (recipe) await this.exportService.exportDishChecklist(recipe, qty)
  }

  protected toggleExportBar(): void {
    this.exportBarExpanded_.update((v: boolean) => !v)
  }

  /** For route guard: true when in edit mode with unsaved changes. */
  hasUnsavedEdits(): boolean {
    const edit = this.editMode_()
    const orig = this.originalRecipe_()
    const current = this.recipe_()
    if (!edit || !orig || !current) return false
    return JSON.stringify(current) !== JSON.stringify(orig)
  }

  protected getEditAmountStep(currentAmount: number, delta: number): number {
    const options = this.isDish_() ? { integerOnly: true } : undefined
    return delta > 0
      ? quantityIncrement(currentAmount, 0, options)
      : quantityDecrement(currentAmount, 0, options)
  }

  protected setIngredientAmount(index: number, scaledAmount: number): void {
    const recipe = this.recipe_()
    const factor = this.scaleFactor_()
    if (!recipe?.ingredients_?.length || factor <= 0) return
    const base = Math.max(0, scaledAmount) / factor
    this.recipe_.update(r => {
      if (!r) return r
      return {
        ...r,
        ingredients_: r.ingredients_.map((ing, i) =>
          i === index ? { ...ing, amount_: base } : ing
        )
      }
    })
  }

  protected setIngredientUnit(index: number, unit: string): void {
    this.recipe_.update(r => {
      if (!r) return r
      return {
        ...r,
        ingredients_: r.ingredients_.map((ing, i) =>
          i === index ? { ...ing, unit_: unit } : ing
        )
      }
    })
  }

  protected replaceIngredient(index: number, item: { _id: string; item_type_?: string; name_hebrew?: string; base_unit_?: string; yield_unit_?: string }): void {
    const recipe = this.recipe_()
    if (!recipe?.ingredients_?.[index]) return
    const type = item.item_type_ === 'recipe' ? 'recipe' as const : 'product' as const
    const unit = item.base_unit_ ?? (item as { yield_unit_?: string }).yield_unit_ ?? 'unit'
    const current = recipe.ingredients_[index]
    this.recipe_.update(r => {
      if (!r) return r
      return {
        ...r,
        ingredients_: r.ingredients_.map((ing, i) =>
          i === index
            ? { ...current, referenceId: item._id, type, unit_: unit }
            : ing
        )
      }
    })
  }

  protected removeIngredient(index: number): void {
    this.recipe_.update(r => {
      if (!r) return r
      return {
        ...r,
        ingredients_: r.ingredients_.filter((_, i) => i !== index)
      }
    })
  }

  protected ingredientChanged(index: number): boolean {
    const orig = this.originalRecipe_()
    const current = this.recipe_()
    if (!orig?.ingredients_?.length || !current?.ingredients_?.[index]) return false
    const o = orig.ingredients_[index]
    const c = current.ingredients_[index]
    return o.amount_ !== c.amount_ || o.unit_ !== c.unit_ || o.referenceId !== c.referenceId
  }

  /** Toggle check-off state for ingredient row at index (view mode only, session-only). */
  protected toggleIngredientCheck(index: number): void {
    this.checkedIngredients_.update(s => {
      const next = new Set(s)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  /** Toggle check-off state for cooking step at index (session-only). */
  protected toggleStepCheck(index: number): void {
    this.checkedSteps_.update(s => {
      const next = new Set(s)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  /** Show voice timer hint snackbar for the given step duration. */
  protected onTimerHintTap(minutes: number): void {
    const hint = this.translation.translate('voice_timer_hint').replace('{0}', String(minutes))
    this.userMsg.onSetSuccessMsg(hint)
  }

  protected onEdit(): void {
    const recipe = this.recipe_()
    if (recipe) this.router.navigate(['/recipe-builder', recipe._id])
  }

  protected setUnitOverride(rowIndex: number, unit: string): void {
    this.unitOverrides_.update(m => ({ ...m, [rowIndex]: unit }))
  }

  protected getDisplayUnit(rowIndex: number, row: ScaledIngredientRow): string {
    const overrides = this.unitOverrides_()
    return overrides[rowIndex] ?? row.unit
  }

  protected getUnitOptionsForRow(row: ScaledIngredientRow): { value: string; label: string }[] {
    return (row.availableUnits || []).map((u) => ({ value: u, label: u }))
  }

  protected getDisplayAmount(rowIndex: number, row: ScaledIngredientRow): number {
    const overrides = this.unitOverrides_()
    const targetUnit = overrides[rowIndex]
    if (!targetUnit || targetUnit === row.unit) return row.amount
    const baseFrom = this.recipeCostService.convertToBaseUnits(row.amount, row.unit)
    const basePerOne = this.recipeCostService.convertToBaseUnits(1, targetUnit)
    if (!basePerOne) return row.amount
    return baseFrom / basePerOne
  }

  protected addWorkflowItem(): void {
    const arr = this.workflowFormArray
    const isDish = this.isDish_()
    if (isDish) {
      arr.push(this.recipeFormService.createPrepItemRow())
    } else {
      arr.push(this.recipeFormService.createStepGroup(arr.length + 1))
    }
    this.focusWorkflowRowAt_.set(arr.length - 1)
  }

  protected removeWorkflowItem(index: number): void {
    const arr = this.workflowFormArray
    arr.removeAt(index)
    if (!this.isDish_()) {
      arr.controls.forEach((group, i) => group.get('order')?.setValue(i + 1))
    }
  }

  protected sortPrepByCategory(): void {
    if (!this.isDish_()) return
    const arr = this.workflowFormArray
    const controls = arr.controls as FormGroup[]
    const sorted = [...controls].sort((a, b) => {
      const catA = (a.get('category_name')?.value ?? '') as string
      const catB = (b.get('category_name')?.value ?? '') as string
      return catA.localeCompare(catB)
    })
    arr.clear()
    sorted.forEach(c => arr.push(c))
  }

  protected onWorkflowFocusRowDone(): void {
    this.focusWorkflowRowAt_.set(null)
  }

  private buildWorkflowFormFromRecipe(recipe: Recipe): void {
    const arr = this.workflowFormArray
    arr.clear()
    const isDish = this.isDish_()
    if (isDish) {
      const prepRows = this.recipeFormService.getPrepRowsFromRecipe(recipe)
      if (prepRows.length > 0) {
        prepRows.forEach(row => arr.push(this.recipeFormService.createPrepItemRow(row)))
      } else {
        arr.push(this.recipeFormService.createPrepItemRow())
      }
    } else {
      const steps = recipe.steps_ ?? []
      if (steps.length > 0) {
        steps.forEach((step, i) => {
          const group = this.recipeFormService.createStepGroup(step.order_ ?? i + 1)
          group.get('instruction')?.addValidators(Validators.required)
          group.patchValue({ instruction: step.instruction_ ?? '', labor_time: step.labor_time_minutes_ ?? 0 })
          arr.push(group)
        })
      } else {
        arr.push(this.recipeFormService.createStepGroup(1))
      }
    }
    this.workflowResetTrigger_ += 1
  }

  private applyWorkflowFormToRecipe(): void {
    const recipe = this.recipe_()
    if (!recipe || !this.editMode_()) return
    const raw = this.workflowFormArray.getRawValue() as Record<string, unknown>[]
    const isDish = this.isDish_()
    if (isDish) {
      const prepItems: FlatPrepItem[] = (raw || [])
        .filter((r: { preparation_name?: string }) => !!r?.preparation_name?.trim())
        .map((r: { preparation_name?: string; category_name?: string; main_category_name?: string; quantity?: number | string; unit?: string }) => {
          const qty = typeof r.quantity === 'number' ? r.quantity : (Number(r.quantity) || 1)
          const item: FlatPrepItem = {
            preparation_name: r.preparation_name ?? '',
            category_name: r.category_name ?? '',
            quantity: qty,
            unit: r.unit ?? 'unit'
          }
          if (r.main_category_name !== undefined && r.main_category_name !== '') {
            item.main_category_name = r.main_category_name
          }
          return item
        })
      const byCategory = new Map<string, { item_name: string; unit: string; quantity?: number }[]>()
      prepItems.forEach(p => {
        const list = byCategory.get(p.category_name) ?? []
        list.push({ item_name: p.preparation_name, unit: p.unit, quantity: p.quantity })
        byCategory.set(p.category_name, list)
      })
      const prepCategories: PrepCategory[] = Array.from(byCategory.entries()).map(([category_name, items]) => ({
        category_name,
        items: items.map(it => ({ item_name: it.item_name, unit: it.unit }))
      }))
      this.recipe_.update(r => ({
        ...r,
        prep_items_: prepItems,
        prep_categories_: prepCategories
      } as Recipe))
    } else {
      const steps: RecipeStep[] = (raw || [])
        .filter((s: { instruction?: string }) => !!s?.instruction?.trim())
        .map((step: { order?: number; instruction?: string; labor_time?: number }, i: number) => ({
          order_: step?.order ?? i + 1,
          instruction_: step?.instruction ?? '',
          labor_time_minutes_: step?.labor_time ?? 0
        }))
      this.recipe_.update(r => ({ ...r, steps_: steps.length ? steps : [] } as Recipe))
    }
  }
}
