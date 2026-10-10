import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy
} from '@angular/core'
import { useSavingState } from 'src/app/core/utils/saving-state.util'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { RatingStarsComponent } from 'src/app/shared/rating-stars/rating-stars.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule, DOCUMENT, Location } from '@angular/common'
import { ActivatedRoute, NavigationStart, Router, RouterLink } from '@angular/router'
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'

import { Recipe, RecipeStep, FlatPrepItem, PrepCategory } from '@models/recipe.model'
import { Product } from '@models/product.model'
import { ScalingService, ScaledIngredientRow } from '@services/scaling.service'
import { CookViewStateService } from '@services/cook-view-state.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { AuthModalService } from '@services/auth-modal.service'
import { TranslationService } from '@services/translation.service'
import { MasterPushService, recipeScopeEntity } from '@services/master-push.service'
import { ExportPreviewComponent } from '../../shared/export-preview/export-preview.component'
import { ApproveStampComponent } from 'src/app/shared/approve-stamp/approve-stamp.component'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { RecipeWorkflowComponent } from '@pages/recipe-builder/components/recipe-workflow/recipe-workflow.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { FormatQuantityPipe } from 'src/app/core/pipes/format-quantity.pipe'
import { quantityIncrement, quantityDecrement, QuantityStepOptions } from '../../core/utils/quantity-step.util'
import { filter, take } from 'rxjs'
import { HeroFabService } from '@services/hero-fab.service'
import { RecipeFormService } from '@pages/recipe-builder/services/recipe-form.service'
import { CookTimerService } from './services/cook-timer.service'
import { CookViewExportService } from './services/cook-view-export.service'

/** Multiplier chip definitions — factor is the multiplier applied to `convertedYieldAmount_()`. */
const MULTIPLIER_CHIPS = [
  { factor: 0.5, key: 'multiplier_half' },
  { factor: 1, key: 'multiplier_1x' },
  { factor: 2, key: 'multiplier_2x' },
  { factor: 3, key: 'multiplier_3x' },
  { factor: 4, key: 'multiplier_4x' }
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
    CounterComponent,
    RatingStarsComponent
  ],
  providers: [CookTimerService, CookViewExportService],
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
  protected readonly isLoggedIn = inject(UserService).isLoggedIn
  private readonly userMsg = inject(UserMsgService)
  private readonly authModal = inject(AuthModalService)
  private readonly translation = inject(TranslationService)
  private readonly masterPush = inject(MasterPushService)
  private readonly heroFab = inject(HeroFabService)
  private readonly recipeFormService = inject(RecipeFormService)
  private readonly el = inject(ElementRef)
  private readonly document = inject(DOCUMENT)
  private readonly location = inject(Location)
  protected readonly cookTimer = inject(CookTimerService)
  protected readonly cookExport = inject(CookViewExportService)

  // ---- SIGNALS & CONSTANTS ----
  protected recipe_ = signal<Recipe | null>(null)
  protected targetQuantity_ = signal<number>(1)
  protected selectedUnit_ = signal<string>('')
  /** Per-row unit override (index -> unit key). */
  protected unitOverrides_ = signal<Record<number, string>>({})
  protected editMode_ = signal<boolean>(false)
  /** Kitchen dark-mode skin (design's default is dark). Session-only, not persisted. */
  protected isDarkTheme_ = signal<boolean>(true)
  /** Kitchen mode retints the whole viewport: mirror it as `theme-kitchen` on <html> (removed on destroy). */
  private readonly syncViewportTheme_ = effect(() => {
    this.document.documentElement.classList.toggle('theme-kitchen', this.isDarkTheme_())
  })
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
  /** Ingredient row whose expander (units + scale-to-ingredient) is open; one at a time. */
  protected openIngredientIndex_ = signal<number | null>(null)
  /** Long-press bookkeeping (<768px): the pending timer, its start point, and a click to swallow. */
  private longPressTimer_: ReturnType<typeof setTimeout> | null = null
  private longPressStart_: { x: number; y: number } | null = null
  private suppressClickUntil_ = 0

  /** Phone layout: which pane appears on top. Default: ingredients first. */
  protected phoneFirstPane_ = signal<'ingredients' | 'steps'>('ingredients')

  /**
   * Active multiplier chip factor (null = no chip selected, 1 = 1x selected by default).
   * Set to null when user manually adjusts quantity via stepper.
   */
  protected activeMultiplier_ = signal<number | null>(1)

  /** Ingredient check-off state (session-only, keyed by row index). */
  protected checkedIngredients_ = signal<Set<number>>(new Set())

  // ---- FOCUS MODE SIGNALS ----
  /** Index of the currently active (hero) step in the workflow. */
  protected activeStepIndex_ = signal<number>(0)
  /** Set of step indices that have been marked done. */
  protected stepDoneSet_ = signal<Set<number>>(new Set())
  /** Index of the step currently "peeked" (expanded preview without being active). */
  protected peekedStepIndex_ = signal<number | null>(null)
  /** Step card that just became active and plays the one-off "grow" animation (null = none). */
  protected growStepIndex_ = signal<number | null>(null)
  private growTimeoutId_: ReturnType<typeof setTimeout> | null = null
  /** Countdown time being edited in place (tap the time): the draft text. null = not editing. */
  protected timerDraft_ = signal<string | null>(null)
  private scrollTimeoutId: ReturnType<typeof setTimeout> | null = null

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

  /** Live preview for the scale-to-ingredient form: the factor and the resulting quantity. */
  protected scalePreview_ = computed(() => {
    const idx = this.settingByIngredientIndex_()
    if (idx === null) return null
    const row = this.scaledIngredients_()[idx]
    const base = this.recipe_()?.ingredients?.[idx]?.amount ?? 0
    if (!row || base <= 0) return null
    const inRowUnit = this.toRowUnitAmount(idx, row, this.settingByIngredientAmount_())
    const factor = inRowUnit / base
    return { factor, qty: this.convertedYieldAmount_() * factor }
  })

  protected yieldUnitOptions_ = computed(() => {
    const recipe = this.recipe_()
    if (!recipe) return []
    const convs = recipe.yieldConversions?.length ? recipe.yieldConversions : null
    let opts: { value: string; label: string }[]
    if (convs?.length) {
      const seen = new Set<string>()
      opts = convs
        .filter((c) => c?.unit && !seen.has(c.unit) && (seen.add(c.unit), true))
        .map((c) => ({ value: c.unit, label: c.unit }))
    } else {
      const u = recipe.yieldUnit || 'unit'
      opts = [{ value: u, label: u }]
    }
    return [...opts, { value: '__add_unit__', label: '+ יחידה חדשה' }]
  })

  protected convertedYieldAmount_ = computed(() => {
    const recipe = this.recipe_()
    if (!recipe) return 1
    const baseAmount = recipe.yieldAmount ?? 1
    const baseUnit = recipe.yieldUnit ?? 'unit'
    const selUnit = this.selectedUnit_() || baseUnit
    if (baseUnit === selUnit) return baseAmount
    const convs = recipe.yieldConversions
    if (convs?.length) {
      const entry = convs.find((c) => c?.unit === selUnit)
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
    if (!recipe?.ingredients?.length) return 0
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients: recipe.ingredients.map((ing) => ({
        ...ing,
        amount: (ing.amount ?? 0) * factor
      }))
    }
    return this.recipeCostService.computeRecipeCost(scaledRecipe)
  })

  protected isDish_ = computed(() => {
    const r = this.recipe_()
    if (!r) return false
    // recipeType is the authoritative signal (it's what actually determines
    // dishes vs recipes storage). Only fall back to inferring from
    // prepItems/prepCategories for documents old enough to predate that
    // field — otherwise stray leftover prep fields on a recipes document
    // would wrongly route it to the dish (mise-en-place) rendering branch.
    if (r.recipeType != null) return r.recipeType === 'dish'
    return (r.prepItems?.length ?? 0) > 0 || (r.prepCategories?.length ?? 0) > 0
  })

  protected cookViewStepOpts_ = computed((): QuantityStepOptions | undefined => {
    if (this.isDish_()) return { integerOnly: true }
    const unit = this.selectedUnit_()
    return unit ? { unit } : undefined
  })

  /** Number of steps marked as done (uses stepDoneSet_ for Focus Mode). */
  protected completedStepCount_ = computed(() => this.stepDoneSet_().size)

  /** Steps (recipe) or prep items (dish) shown in the steps pane. */
  protected stepTotal_ = computed(() =>
    this.isDish_() ? this.scaledPrep_().length : (this.recipe_()?.steps?.length ?? 0)
  )

  /** Total step count for the current recipe. */
  protected totalStepCount_ = computed(() => this.recipe_()?.steps?.length ?? 0)

  // ---- FOCUS MODE COMPUTED SIGNALS ----
  /** True when all ingredients have been checked off. */
  protected allIngredientsChecked_ = computed(
    () => this.checkedIngredients_().size >= (this.recipe_()?.ingredients?.length ?? 0)
  )

  /** Progress object for ingredient check-off (done/total). */
  protected ingredientCheckProgress_ = computed(() => ({
    done: this.checkedIngredients_().size,
    total: this.recipe_()?.ingredients?.length ?? 0
  }))

  /** True when all steps have been marked done. */
  protected cookingComplete_ = computed(() => {
    const recipe = this.recipe_()
    if (!recipe) return false
    if (this.isDish_()) {
      return this.stepDoneSet_().size >= this.scaledPrep_().length && this.scaledPrep_().length > 0
    }
    return this.stepDoneSet_().size >= (recipe.steps?.length ?? 0) && (recipe.steps?.length ?? 0) > 0
  })

  /** Step/prep-item completion percent, 0–100 — drives the hero progress bar. */
  protected heroProgressPct_ = computed(() => {
    const total = this.isDish_() ? this.scaledPrep_().length : (this.recipe_()?.steps?.length ?? 0)
    if (total === 0) return 0
    return Math.round((this.stepDoneSet_().size / total) * 100)
  })

  protected get workflowFormArray(): FormArray {
    return this.workflowParentForm_.get('workflow_items') as FormArray
  }

  protected get workflowResetTrigger(): number {
    return this.workflowResetTrigger_
  }

  ngOnInit(): void {
    // Cook View scrolls the page itself with the scrollbar hidden (plan 404); see :root.cv-page-scroll.
    this.document.documentElement.classList.add('cv-page-scroll')
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        if (!e.url.startsWith('/cook')) {
          this.cookExport.closeAllExportOverlays()
        }
      })
    // route.data, not snapshot: /cook/A → /cook/B reuses this component (e.g. after sign-in,
    // when UserService swaps the guest-loaded master copy for the user's own copy).
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.applyRouteRecipe_(data['recipe'] as Recipe | null)
    })
  }

  private applyRouteRecipe_(recipe: Recipe | null): void {
    if (recipe) {
      this.recipe_.set(recipe)
      this.originalRecipe_.set(null)
      this.editMode_.set(false)
      this.activeStepIndex_.set(0)
      this.stepDoneSet_.set(new Set())
      this.checkedIngredients_.set(new Set())
      this.peekedStepIndex_.set(null)
      this.cookTimer.cancelAll()
      this.selectedUnit_.set(recipe.yieldUnit || 'unit')
      this.cookViewState.setLastViewedRecipeId(recipe._id)
      const base = recipe.yieldAmount ?? 1
      this.targetQuantity_.set(base)
    } else {
      const lastId = this.cookViewState.lastRecipeId()
      if (lastId) {
        this.router.navigate(['/cook', lastId])
        return
      }
    }
  }

  ngOnDestroy(): void {
    this.cancelLongPress()
    if (this.growTimeoutId_ !== null) clearTimeout(this.growTimeoutId_)
    this.document.documentElement.classList.remove('theme-kitchen', 'cv-page-scroll')
    this.cookExport.closeAllExportOverlays()
    this.heroFab.clearPageActions()
    if (this.scrollTimeoutId !== null) {
      clearTimeout(this.scrollTimeoutId)
      this.scrollTimeoutId = null
    }
  }

  protected setQuantity(value: number): void {
    const num = value != null && !Number.isNaN(value) ? Number(value) : (this.recipe_()?.yieldAmount ?? 1)
    const recipe = this.recipe_()
    const min = recipe?.yieldUnit === 'dish' ? 1 : 0.01
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
    if (newUnit === '__add_unit__') {
      setTimeout(() => this.unitRegistry.openUnitCreator(), 0)
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((unit) => {
        this.onYieldUnitChange(unit)
      })
      return
    }
    const prevYield = this.convertedYieldAmount_()
    this.selectedUnit_.set(newUnit)
    if (prevYield > 0) {
      const batches = this.targetQuantity_() / prevYield
      const newYield = this.convertedYieldAmount_()
      const newQty = newYield > 0 ? batches * newYield : this.targetQuantity_()
      const recipe = this.recipe_()
      const min = recipe?.yieldUnit === 'dish' ? 1 : 0.01
      this.targetQuantity_.set(Math.max(min, newQty))
    }
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    this.activeMultiplier_.set(null)
  }

  protected incrementQuantity(): void {
    const min = this.isDish_() ? 1 : 0.01
    const options = this.cookViewStepOpts_()
    this.targetQuantity_.update((q) => quantityIncrement(q, min, options))
    this.scaleByIngredientIndex_.set(null)
    this.scaleByIngredientAmount_.set(null)
    this.activeMultiplier_.set(null)
  }

  protected decrementQuantity(): void {
    const min = this.isDish_() ? 1 : 0.01
    const options = this.cookViewStepOpts_()
    this.targetQuantity_.update((q) => quantityDecrement(q, min, options))
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

  protected onEditAmountKeydown(e: KeyboardEvent, index: number, currentAmount: number, rowUnit?: string): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const opts: QuantityStepOptions | undefined = this.isDish_()
      ? { integerOnly: true }
      : rowUnit
        ? { unit: rowUnit }
        : undefined
    const next =
      e.key === 'ArrowUp' ? quantityIncrement(currentAmount, 0, opts) : quantityDecrement(currentAmount, 0, opts)
    this.setIngredientAmount(index, next)
  }

  protected onSettingAmountKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const current = this.settingByIngredientAmount_()
    const options = this.isDish_() ? { integerOnly: true } : undefined
    const next =
      e.key === 'ArrowUp' ? quantityIncrement(current, 0.01, options) : quantityDecrement(current, 0.01, options)
    this.settingByIngredientAmount_.set(next)
  }

  /** Enter "setting by this ingredient" state for row at index; prefilled with current scaled amount. */
  protected startSetByIngredient(index: number): void {
    const rows = this.scaledIngredients_()
    const row = rows[index]
    if (!row) return
    this.settingByIngredientIndex_.set(index)
    this.settingByIngredientAmount_.set(this.inputAmount(this.getDisplayAmount(index, row)))
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

  /** Recalculate from the scale form (no confirm — the live preview shows the result first, and
   *  "back to full recipe" undoes it). The typed amount is in the row's display unit. */
  protected applyScaleFromForm(index: number): void {
    const row = this.scaledIngredients_()[index]
    if (!row) return
    const amount = this.toRowUnitAmount(index, row, this.settingByIngredientAmount_())
    this.applyScaleByIngredient(index, amount)
    this.settingByIngredientIndex_.set(null)
    this.openIngredientIndex_.set(null)
  }

  /** Scaled banner: edit the source amount (display unit) and recalculate live. */
  protected setScaledBannerAmount(displayAmount: number): void {
    const idx = this.scaleByIngredientIndex_()
    const row = this.scaledViewRow_()
    if (idx === null || !row) return
    this.applyScaleByIngredient(idx, this.toRowUnitAmount(idx, row, displayAmount))
  }

  protected stepScaledBannerAmount(delta: 1 | -1): void {
    const idx = this.scaleByIngredientIndex_()
    const row = this.scaledViewRow_()
    if (idx === null || !row) return
    const unit = this.getDisplayUnit(idx, row)
    const current = this.getDisplayAmount(idx, row)
    const opts = this.isDish_() ? { integerOnly: true } : { unit }
    const next = delta > 0 ? quantityIncrement(current, 0.01, opts) : quantityDecrement(current, 0.01, opts)
    this.setScaledBannerAmount(next)
  }

  /** Set targetQuantity_ so that ingredient at index has the given amount; enter special view. */
  protected applyScaleByIngredient(index: number, userAmount: number): void {
    const amount = Number(userAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const recipe = this.recipe_()
    if (!recipe?.ingredients?.[index]) return
    const baseAmount = recipe.ingredients[index].amount ?? 0
    if (baseAmount <= 0) return
    const factor = amount / baseAmount
    // targetQuantity_ is in the selected yield unit, so scale that unit's yield (not the base one).
    this.targetQuantity_.set(this.convertedYieldAmount_() * factor)
    this.scaleByIngredientIndex_.set(index)
    this.scaleByIngredientAmount_.set(amount)
  }

  /** Exit special scaled view: reset to recipe base yield. */
  protected resetToFullRecipe(): void {
    this.targetQuantity_.set(this.convertedYieldAmount_())
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

  protected async saveEdits(): Promise<void> {
    this.applyWorkflowFormToRecipe()
    const pending = this.recipe_()
    if (!pending) return

    // A recipe cloned from a shared master asks whether the edit applies to
    // everyone or stays on this user's own copy — same prompt the recipe
    // builder shows. Without it, saving here silently sets _userModified and
    // opts this recipe out of every future master update (sync-master Rule 3).
    let pushToMasterAfterSave = false
    if (pending._masterId) {
      const scope = await this.masterPush.askScope(pending, { entity: recipeScopeEntity(pending) })
      if (scope === 'cancel') return
      pushToMasterAfterSave = scope === 'everyone'
    } else {
      const confirmed = await this.confirmModal.open('save_changes', { saveLabel: 'save_changes' })
      if (!confirmed) return
    }

    {
      const recipe = this.recipe_()
      if (!recipe) return
      this.saving.setSaving(true)
      this.kitchenState.saveRecipe(recipe).subscribe({
        next: (saved) => {
          if (pushToMasterAfterSave) this.masterPush.pushToMaster(saved ?? recipe)
          this.originalRecipe_.set(null)
          this.editMode_.set(false)
          this.saving.setSaving(false)
        },
        error: () => {
          this.saving.setSaving(false)
        }
      })
    }
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
    if (!this.isLoggedIn()) {
      this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'))
      this.authModal.open('sign-in')
      return
    }
    const recipe = this.recipe_()
    if (!recipe) return
    if (this.hasRealChanges()) {
      this.applyWorkflowFormToRecipe()
      this.confirmModal.open('approve_stamp_unsaved_confirm', { saveLabel: 'save_changes' }).then((confirmed) => {
        if (!confirmed) return
        this.saveRecipeWithToggledApproval()
      })
      return
    }
    this.saveRecipeWithToggledApproval()
  }

  private async saveRecipeWithToggledApproval(): Promise<void> {
    const recipe = this.recipe_()
    if (!recipe) return
    // Approval is shared recipe content, not a personal flag — so it asks the
    // same question every other content save asks.
    const scope = await this.masterPush.askScope(recipe, { entity: recipeScopeEntity(recipe) })
    if (scope === 'cancel') return
    this.saving.setSaving(true)
    this.kitchenState.saveRecipe({ ...recipe, isApproved: !recipe.isApproved }).subscribe({
      next: (saved) => {
        if (scope === 'everyone') this.masterPush.pushToMaster(saved)
        this.recipe_.set(saved)
        this.originalRecipe_.set(null)
        this.editMode_.set(false)
        this.saving.setSaving(false)
        this.userMsg.onSetSuccessMsg(
          this.translation.translate(saved.isApproved ? 'approval_success' : 'unapproval_success')
        )
      },
      error: () => {
        this.saving.setSaving(false)
        this.userMsg.onSetErrorMsg(this.translation.translate('approval_error'))
      }
    })
  }

  protected async onRatingChange(value: number): Promise<void> {
    const recipe = this.recipe_()
    if (!recipe) return
    const scope = await this.masterPush.askScope(recipe, { entity: recipeScopeEntity(recipe) })
    if (scope === 'cancel') return
    const updated = { ...recipe, rating: value }
    this.recipe_.set(updated)
    this.kitchenState.saveRecipe(updated).subscribe({
      next: (saved) => {
        if (scope === 'everyone') this.masterPush.pushToMaster(saved)
      }
    })
  }

  protected async onExportInfo(): Promise<void> {
    await this.cookExport.onExportInfo(this.recipe_(), this.targetQuantity_())
  }

  protected async onExportShoppingList(): Promise<void> {
    await this.cookExport.onExportShoppingList(this.recipe_(), this.targetQuantity_())
  }

  protected onViewRecipeInfo(): void {
    this.cookExport.onViewRecipeInfo(this.recipe_(), this.targetQuantity_())
  }

  protected onViewShoppingList(): void {
    this.cookExport.onViewShoppingList(this.recipe_(), this.targetQuantity_())
  }

  protected onExportPreviewClose(): void {
    this.cookExport.onExportPreviewClose()
  }

  protected async onExportFromPreview(): Promise<void> {
    await this.cookExport.onExportFromPreview(this.recipe_(), this.targetQuantity_())
  }

  protected onPrintFromPreview(): void {
    this.cookExport.onPrintFromPreview()
  }

  protected onViewCookingSteps(): void {
    this.cookExport.onViewCookingSteps(this.recipe_(), this.targetQuantity_())
  }

  protected onViewDishChecklist(): void {
    this.cookExport.onViewDishChecklist(this.recipe_(), this.targetQuantity_())
  }

  protected async onExportCookingSteps(): Promise<void> {
    await this.cookExport.onExportCookingSteps(this.recipe_(), this.targetQuantity_())
  }

  protected async onExportDishChecklist(): Promise<void> {
    await this.cookExport.onExportDishChecklist(this.recipe_(), this.targetQuantity_())
  }

  /** History-aware back: return to wherever the user came from; a deep link (no in-app history
   *  entry) falls back to the recipe book. */
  protected goBack(): void {
    const navigationId =
      (this.document.defaultView?.history.state as { navigationId?: number } | null)?.navigationId ?? 1
    if (navigationId > 1) {
      this.location.back()
      return
    }
    this.router.navigate(['/recipe-book'])
  }

  protected toggleTheme(): void {
    this.isDarkTheme_.update((v: boolean) => !v)
  }

  /** For route guard (PendingChangesComponent interface): true when in edit mode with unsaved changes. */
  hasRealChanges(): boolean {
    const edit = this.editMode_()
    const orig = this.originalRecipe_()
    const current = this.recipe_()
    if (!edit || !orig || !current) return false
    return JSON.stringify(current) !== JSON.stringify(orig)
  }

  protected getEditAmountStep(currentAmount: number, delta: number, rowUnit?: string): number {
    const options: QuantityStepOptions | undefined = this.isDish_()
      ? { integerOnly: true }
      : rowUnit
        ? { unit: rowUnit }
        : undefined
    return delta > 0 ? quantityIncrement(currentAmount, 0, options) : quantityDecrement(currentAmount, 0, options)
  }

  protected setIngredientAmount(index: number, scaledAmount: number): void {
    const recipe = this.recipe_()
    const factor = this.scaleFactor_()
    if (!recipe?.ingredients?.length || factor <= 0) return
    const base = Math.max(0, scaledAmount) / factor
    this.recipe_.update((r) => {
      if (!r) return r
      return {
        ...r,
        ingredients: r.ingredients.map((ing, i) => (i === index ? { ...ing, amount: base } : ing))
      }
    })
  }

  protected setIngredientUnit(index: number, unit: string): void {
    if (unit === '__add_unit__') {
      setTimeout(() => this.unitRegistry.openUnitCreator(), 0)
      this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
        this.setIngredientUnit(index, newUnit)
      })
      return
    }
    this.recipe_.update((r) => {
      if (!r) return r
      return {
        ...r,
        ingredients: r.ingredients.map((ing, i) => (i === index ? { ...ing, unit: unit } : ing))
      }
    })
  }

  protected replaceIngredient(
    index: number,
    item: { _id: string; item_type_?: string; nameHebrew?: string; baseUnit?: string; yieldUnit?: string }
  ): void {
    const recipe = this.recipe_()
    if (!recipe?.ingredients?.[index]) return
    const type = item.item_type_ === 'recipe' ? ('recipe' as const) : ('product' as const)
    const unit = item.baseUnit ?? (item as { yieldUnit?: string }).yieldUnit ?? 'unit'
    const current = recipe.ingredients[index]
    this.recipe_.update((r) => {
      if (!r) return r
      return {
        ...r,
        ingredients: r.ingredients.map((ing, i) =>
          i === index ? { ...current, referenceId: item._id, type, unit: unit } : ing
        )
      }
    })
  }

  protected removeIngredient(index: number): void {
    this.recipe_.update((r) => {
      if (!r) return r
      return {
        ...r,
        ingredients: r.ingredients.filter((_, i) => i !== index)
      }
    })
  }

  protected ingredientChanged(index: number): boolean {
    const orig = this.originalRecipe_()
    const current = this.recipe_()
    if (!orig?.ingredients?.length || !current?.ingredients?.[index]) return false
    const o = orig.ingredients[index]
    const c = current.ingredients[index]
    return o.amount !== c.amount || o.unit !== c.unit || o.referenceId !== c.referenceId
  }

  /** Toggle check-off state for ingredient row at index (view mode only, session-only). */
  protected toggleIngredientCheck(index: number): void {
    this.checkedIngredients_.update((s) => {
      const next = new Set(s)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // ---- FOCUS MODE METHODS ----

  /** Mark a step as done and advance activeStepIndex_ to the next undone step. */
  protected markStepDone(index: number): void {
    this.stepDoneSet_.update((s) => {
      const next = new Set(s)
      next.add(index)
      return next
    })
    const recipe = this.recipe_()
    const steps = this.isDish_() ? this.scaledPrep_() : (recipe?.steps ?? [])
    const doneSet = this.stepDoneSet_()
    for (let i = index + 1; i < steps.length; i++) {
      if (!doneSet.has(i)) {
        this.activeStepIndex_.set(i)
        this.triggerGrow(i)
        this.scrollToActiveStep(i)
        return
      }
    }
    for (let i = 0; i < index; i++) {
      if (!doneSet.has(i)) {
        this.activeStepIndex_.set(i)
        this.triggerGrow(i)
        this.scrollToActiveStep(i)
        return
      }
    }
    // All steps done — scroll back to first
    this.scrollToActiveStep(0)
  }

  protected unmarkStepDone(index: number): void {
    this.stepDoneSet_.update((s) => {
      const next = new Set(s)
      next.delete(index)
      return next
    })
    this.activeStepIndex_.set(index)
    this.triggerGrow(index)
  }

  protected swapToPane(pane: 'ingredients' | 'steps'): void {
    this.phoneFirstPane_.set(pane)
  }

  /** Jump to any pending step and make it the active one. */
  protected setActiveStep(index: number): void {
    this.activeStepIndex_.set(index)
    this.triggerGrow(index)
    this.scrollToActiveStep(index)
  }

  /** Play the step-change animation on the card that just became active (only this click path). */
  private triggerGrow(index: number): void {
    if (this.growTimeoutId_ !== null) clearTimeout(this.growTimeoutId_)
    this.growStepIndex_.set(index)
    this.growTimeoutId_ = setTimeout(() => {
      this.growTimeoutId_ = null
      this.growStepIndex_.set(null)
    }, 600)
  }

  // ---- STEP CLOCKS (opt-in countdown + stopwatch per active step) ----

  /** Countdown starts at the step's cooking time, or 5:00 when it has none. */
  protected startStepCountdown(index: number, step: RecipeStep): void {
    const secs = (step.cookingTimeSecs ?? 0) > 0 ? step.cookingTimeSecs! : 300
    this.cookTimer.startTimer(index, secs)
  }

  protected stepMinutes(step: RecipeStep): number {
    return Math.round((step.cookingTimeSecs ?? 0) / 60)
  }

  protected beginTimerEdit(index: number): void {
    this.cookTimer.pauseTimer(index)
    this.timerDraft_.set(this.cookTimer.timerDisplay(index))
  }

  /** Commit the edited time (mm:ss, h:mm:ss, or plain minutes): it becomes the new start, paused. */
  protected commitTimerEdit(index: number): void {
    const draft = this.timerDraft_()
    if (draft === null) return
    this.timerDraft_.set(null)
    const secs = this.parseClockInput(draft)
    if (secs > 0) this.cookTimer.setTimerTime(index, secs)
  }

  protected cancelTimerEdit(): void {
    this.timerDraft_.set(null)
  }

  private parseClockInput(raw: string): number {
    const text = raw.trim()
    if (!text) return 0
    if (!text.includes(':')) {
      const minutes = Number(text)
      return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 0
    }
    const parts = text.split(':').map((p) => Number(p))
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0
    return parts.reduce((total, n) => total * 60 + n, 0)
  }

  /** Toggle peek (expanded preview) on a pending step. Cannot peek the active step. */
  protected toggleStepPeek(index: number): void {
    if (index === this.activeStepIndex_()) return
    this.peekedStepIndex_.set(this.peekedStepIndex_() === index ? null : index)
  }

  protected onEdit(): void {
    const recipe = this.recipe_()
    if (recipe) this.router.navigate(['/recipe-builder', recipe._id])
  }

  protected setUnitOverride(rowIndex: number, unit: string): void {
    this.unitOverrides_.update((m) => ({ ...m, [rowIndex]: unit }))
  }

  protected getDisplayUnit(rowIndex: number, row: ScaledIngredientRow): string {
    const overrides = this.unitOverrides_()
    return overrides[rowIndex] ?? row.unit
  }

  protected getUnitOptionsForRow(row: ScaledIngredientRow): { value: string; label: string }[] {
    const opts = (row.availableUnits || []).map((u) => ({ value: u, label: u }))
    return [...opts, { value: '__add_unit__', label: '+ יחידה חדשה' }]
  }

  protected getDisplayAmount(rowIndex: number, row: ScaledIngredientRow): number {
    return this.amountInUnit(row, this.unitOverrides_()[rowIndex] ?? row.unit)
  }

  /** The row's (scaled) amount expressed in `unit`. */
  private amountInUnit(row: ScaledIngredientRow, unit: string): number {
    if (!unit || unit === row.unit) return row.amount
    const baseFrom = this.recipeCostService.convertToBaseUnits(row.amount, row.unit)
    const basePerOne = this.recipeCostService.convertToBaseUnits(1, unit)
    if (!basePerOne) return row.amount
    return baseFrom / basePerOne
  }

  /** Convert an amount typed in the row's display unit back to the recipe's unit for that row. */
  private toRowUnitAmount(rowIndex: number, row: ScaledIngredientRow, displayAmount: number): number {
    const shown = this.getDisplayAmount(rowIndex, row)
    if (!row.amount || !shown) return displayAmount
    return displayAmount * (row.amount / shown)
  }

  // ---- INGREDIENT ROW EXPANDER (units + scale to ingredient) ----

  /** A number for an <input type="number">: no unicode fractions, at most 3 decimals. */
  protected inputAmount(value: number): number {
    return Math.round(value * 1000) / 1000
  }

  /** Units the row can switch to: every other known unit (the one shown now is left out), then add. */
  protected otherUnitOptions(index: number, row: ScaledIngredientRow): { value: string; label: string }[] {
    const shown = this.getDisplayUnit(index, row)
    const units = (row.availableUnits ?? []).filter((u) => u && u !== shown)
    return [...units.map((u) => ({ value: u, label: u })), { value: '__add_unit__', label: '+ יחידה חדשה' }]
  }

  protected onRowUnitPick(index: number, row: ScaledIngredientRow, unit: string | null): void {
    if (!unit) return
    if (unit === '__add_unit__') {
      this.addUnitFor(index, row)
      return
    }
    this.chooseUnit(index, unit)
  }

  protected toggleIngredientExpander(index: number): void {
    const next = this.openIngredientIndex_() === index ? null : index
    this.openIngredientIndex_.set(next)
    if (this.settingByIngredientIndex_() !== next) this.settingByIngredientIndex_.set(null)
  }

  protected chooseUnit(index: number, unit: string): void {
    this.setUnitOverride(index, unit)
    this.settingByIngredientIndex_.set(null)
    this.openIngredientIndex_.set(null)
  }

  /** "+ new unit": create it, save it on the linked product (as a purchase option, so every recipe
   *  can use it again — same rule as the recipe builder), then show the row in it. */
  protected addUnitFor(index: number, row: ScaledIngredientRow): void {
    const product =
      row.type === 'product' && row.referenceId
        ? this.kitchenState.products_().find((p: Product) => p._id === row.referenceId)
        : undefined
    const existingUnitSymbols = product?.purchaseOptions?.map((o) => o.unitSymbol) ?? []
    setTimeout(() => this.unitRegistry.openUnitCreator({ existingUnitSymbols }), 0)
    this.unitRegistry.unitAdded$.pipe(take(1)).subscribe((unit) => {
      if (!product?._id || product.purchaseOptions?.some((o) => o.unitSymbol === unit)) {
        this.chooseUnit(index, unit)
        return
      }
      const baseFactor = this.unitRegistry.getConversion(product.baseUnit) || 1
      const unitFactor = this.unitRegistry.getConversion(unit) || 1
      // conversionRate = base units per 1 of the new unit (e.g. 0.33 kg per jar when 1 jar = 330 g)
      const conversionRate = baseFactor > 0 && unitFactor > 0 ? unitFactor / baseFactor : 1
      const updated: Product = {
        ...product,
        purchaseOptions: [
          ...(product.purchaseOptions ?? []),
          { unitSymbol: unit, conversionRate, uom: product.baseUnit, priceOverride: 0 }
        ]
      }
      this.kitchenState.saveProduct(updated).subscribe({
        next: () => this.chooseUnit(index, unit),
        error: () => this.chooseUnit(index, unit)
      })
    })
  }

  /** Row tap toggles the check — unless it is the click that ends a long press. */
  protected onIngredientRowClick(index: number): void {
    if (Date.now() < this.suppressClickUntil_) return
    this.toggleIngredientCheck(index)
  }

  protected onIngredientRowKeydown(event: KeyboardEvent, index: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    this.toggleIngredientCheck(index)
  }

  /** Long press (500ms, <768px) opens the row's expander instead of ticking it. */
  protected onIngredientPointerDown(event: PointerEvent, index: number): void {
    if (!this.isStackedLayout()) return
    this.cancelLongPress()
    this.longPressStart_ = { x: event.clientX, y: event.clientY }
    this.longPressTimer_ = setTimeout(() => {
      this.longPressTimer_ = null
      this.suppressClickUntil_ = Date.now() + 700
      this.document.defaultView?.navigator.vibrate?.(12)
      if (this.openIngredientIndex_() !== index) this.toggleIngredientExpander(index)
    }, 500)
  }

  protected onIngredientPointerMove(event: PointerEvent): void {
    const start = this.longPressStart_
    if (!start || this.longPressTimer_ === null) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) this.cancelLongPress()
  }

  protected cancelLongPress(): void {
    if (this.longPressTimer_ !== null) clearTimeout(this.longPressTimer_)
    this.longPressTimer_ = null
    this.longPressStart_ = null
  }

  private isStackedLayout(): boolean {
    return this.document.defaultView?.matchMedia('(max-width: 767px)').matches ?? false
  }

  /** Click outside the open row closes its expander. */
  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerDown(event: PointerEvent): void {
    const open = this.openIngredientIndex_()
    if (open === null) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(`[data-ing-index="${open}"]`)) return
    // Overlays opened from the expander (unit creator) live outside the row.
    if (target?.closest('.c-modal-overlay, .c-modal-card')) return
    this.openIngredientIndex_.set(null)
    this.settingByIngredientIndex_.set(null)
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
      const catA = (a.get('categoryName')?.value ?? '') as string
      const catB = (b.get('categoryName')?.value ?? '') as string
      return catA.localeCompare(catB)
    })
    arr.clear()
    sorted.forEach((c) => arr.push(c))
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
        prepRows.forEach((row) => arr.push(this.recipeFormService.createPrepItemRow(row)))
      } else {
        arr.push(this.recipeFormService.createPrepItemRow())
      }
    } else {
      const steps = recipe.steps ?? []
      if (steps.length > 0) {
        steps.forEach((step, i) => {
          const group = this.recipeFormService.createStepGroup(step.order ?? i + 1)
          group.get('instruction')?.addValidators(Validators.required)
          group.patchValue({
            instruction: step.instruction ?? '',
            labor_time: step.laborTimeMinutes ?? 0,
            cooking_time: step.cookingTimeSecs ?? 0
          })
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
        .filter((r: { preparationName?: string }) => !!r?.preparationName?.trim())
        .map(
          (r: {
            preparationName?: string
            categoryName?: string
            mainCategoryName?: string
            quantity?: number | string
            unit?: string
          }) => {
            const qty = typeof r.quantity === 'number' ? r.quantity : Number(r.quantity) || 1
            const item: FlatPrepItem = {
              preparationName: r.preparationName ?? '',
              categoryName: r.categoryName ?? '',
              quantity: qty,
              unit: r.unit ?? 'unit'
            }
            if (r.mainCategoryName !== undefined && r.mainCategoryName !== '') {
              item.mainCategoryName = r.mainCategoryName
            }
            return item
          }
        )
      const byCategory = new Map<string, { itemName: string; unit: string; quantity?: number }[]>()
      prepItems.forEach((p) => {
        const list = byCategory.get(p.categoryName) ?? []
        list.push({ itemName: p.preparationName, unit: p.unit, quantity: p.quantity })
        byCategory.set(p.categoryName, list)
      })
      const prepCategories: PrepCategory[] = Array.from(byCategory.entries()).map(([categoryName, items]) => ({
        categoryName,
        items: items.map((it) => ({ itemName: it.itemName, unit: it.unit }))
      }))
      this.recipe_.update(
        (r) =>
          ({
            ...r,
            prepItems: prepItems,
            prepCategories: prepCategories
          }) as Recipe
      )
    } else {
      const steps: RecipeStep[] = (raw || [])
        .filter((s: { instruction?: string }) => !!s?.instruction?.trim())
        .map(
          (step: { order?: number; instruction?: string; labor_time?: number; cooking_time?: number }, i: number) => ({
            order: step?.order ?? i + 1,
            instruction: step?.instruction ?? '',
            laborTimeMinutes: step?.labor_time ?? 0,
            cookingTimeSecs: step?.cooking_time ?? 0
          })
        )
      this.recipe_.update((r) => ({ ...r, steps: steps.length ? steps : [] }) as Recipe)
    }
  }

  private scrollToActiveStep(index: number): void {
    if (this.scrollTimeoutId !== null) {
      clearTimeout(this.scrollTimeoutId)
    }
    this.scrollTimeoutId = setTimeout(() => {
      this.scrollTimeoutId = null
      const card = this.el.nativeElement.querySelector(`[data-step-index="${index}"]`) as HTMLElement | null
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }
}
