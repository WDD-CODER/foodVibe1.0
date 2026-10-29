import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  inject,
  signal,
  viewChildren,
  viewChild,
  effect,
  ChangeDetectorRef
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { BreakpointObserver } from '@angular/cdk/layout'
import { KitchenStateService } from '@services/kitchen-state.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import type { IngredientWeightRow } from '@services/recipe-cost.service'
import { IngredientSearchComponent, type SearchableItem } from '../ingredient-search/ingredient-search.component'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { FocusByRowDirective } from '@directives/focus-by-row.directive'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { QuickEditProductPanelComponent } from 'src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component'
import { QuickEditProductModalService } from '@services/quick-edit-product-modal.service'
import { ProductDataService } from '@services/product-data.service'
import type { Product } from '@models/product.model'
import { getProductValidationStatus } from 'src/app/core/utils/product-validation.util'
import { getEffectivePrice } from '@utils/product-source.util'
import { optionRateInBase } from '@utils/purchase-option-rate.util'
import { UnitRegistryService } from '@services/unit-registry.service'
import { quantityIncrement, quantityDecrement, QuantityStepOptions } from 'src/app/core/utils/quantity-step.util'
import { map } from 'rxjs'
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragHandle } from '@angular/cdk/drag-drop'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { NutritionBadgeComponent } from 'src/app/shared/nutrition-badge/nutrition-badge.component'
import { TranslationService } from '@services/translation.service'
import { RecipeFormService } from '../../services/recipe-form.service'
import { PasteIngredientsDialogComponent } from '../paste-ingredients-dialog/paste-ingredients-dialog.component'
import { UNIT_ALIASES } from '@utils/recipe-cost.constants'
import { createUnitWordResolver, parseIngredientLines } from '@utils/ingredient-line-parser.util'
import { findIngredientMatch } from '@utils/ingredient-match.util'
import { matchProductName } from '@utils/product-name-match.util'
import { ProductNameMatcherService, type NameMatchItem } from '@services/product-name-matcher.service'
import { UserMsgService } from '@services/user-msg.service'
import { findProductByName } from 'src/app/core/utils/product-name-error.util'
import { NumberBoxDirective } from '@directives/number-box.directive'

/**
 * Phones get the modal quick-edit instead of the inline accordion — portrait (≤767px) and,
 * since plan 348, landscape too (touch device with a short viewport).
 */
const MOBILE_QUICK_EDIT_QUERY = '(max-width: 767px), (hover: none) and (max-height: 500px)'

/** Plan 490: most inventory suggestions shown for one unlinked row (mirrors PRODUCT_MATCH_MAX_OPTIONS). */
const MAX_ROW_SUGGESTIONS = 5

@Component({
  selector: 'app-recipe-ingredients-table',
  standalone: true,
  imports: [
    NumberBoxDirective,
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    IngredientSearchComponent,
    TranslatePipe,
    SelectOnFocusDirective,
    FocusByRowDirective,
    CustomSelectComponent,
    QuickEditProductPanelComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle,
    ClickOutSideDirective,
    NutritionBadgeComponent,
    PasteIngredientsDialogComponent
  ],
  templateUrl: './recipe-ingredients-table.component.html',
  styleUrl: './recipe-ingredients-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeIngredientsTableComponent {
  //INJECTIONS
  private readonly kitchenStateService = inject(KitchenStateService)
  private readonly recipeCostService = inject(RecipeCostService)
  private readonly unitRegistry = inject(UnitRegistryService)
  /** Typed name from the unit dropdown's add row, read once by onUnitChange (rule W). */
  protected readonly pendingAddName_ = signal('')
  private readonly quickEditModalService = inject(QuickEditProductModalService)
  private readonly productDataService = inject(ProductDataService)
  private readonly bp = inject(BreakpointObserver)
  private fb = inject(FormBuilder)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly router_ = inject(Router)
  private readonly translation_ = inject(TranslationService)
  private readonly recipeFormService_ = inject(RecipeFormService)
  private readonly nameMatcher_ = inject(ProductNameMatcherService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly pastedUnitResolver_ = createUnitWordResolver({
    aliases: UNIT_ALIASES,
    translate: (token) => this.translation_.resolveUnit(token),
    knownKeys: () => this.unitRegistry.allUnitKeys_()
  })

  protected readonly isMobile_ = toSignal(this.bp.observe(MOBILE_QUICK_EDIT_QUERY).pipe(map((r) => r.matches)), {
    initialValue: false
  })

  private readonly focusByRowRefs = viewChildren(FocusByRowDirective)
  private readonly quickEditPanelRef_ = viewChild(QuickEditProductPanelComponent)

  constructor() {
    // OnPush: rows changed from outside (AI patch, history restore) must redraw the table.
    effect((onCleanup) => {
      const sub = this.ingredientsFormArray().valueChanges.subscribe(() => this.cdr.markForCheck())
      onCleanup(() => sub.unsubscribe())
    })
    effect(() => {
      this.kitchenStateService.products_()
      this.kitchenStateService.recipes_()
      this.refreshAllLineCalculations()
    })
  }

  //INPUT OUTPUT
  ingredientsFormArray = input.required<FormArray>()
  portions = input<number>(1)
  focusSearchAtRow = input<number | null>(null)
  removeIngredient = output<number>()
  addIngredient = output<void>()
  focusSearchDone = output<void>()

  // GETTERS

  onDropIngredient(event: CdkDragDrop<FormGroup[]>): void {
    if (event.previousIndex === event.currentIndex) return
    const formArray = this.ingredientsFormArray()
    const item = formArray.at(event.previousIndex)
    formArray.removeAt(event.previousIndex)
    formArray.insert(event.currentIndex, item)
  }

  get ingredientGroups() {
    return [...this.ingredientsFormArray().controls] as FormGroup[]
  }

  /** Names of ingredients already selected in the recipe (for excluding from search dropdown). */
  get existingIngredientNames(): string[] {
    return this.ingredientGroups
      .filter((g) => g.get('referenceId')?.value)
      .map((g) => (g.get('nameHebrew')?.value ?? '').toString().trim())
      .filter(Boolean)
  }

  /** When set, this row index shows ingredient-search instead of selected-item-display (click name to change item). */
  protected editingNameAtRow_ = signal<number | null>(null)

  /** Index of the row currently showing the inline quick-edit accordion (desktop only). */
  protected quickEditRowIndex_ = signal<number | null>(null)

  /** Index of the row currently animating closed (kept in DOM during 200ms collapse). */
  protected quickEditRowClosingIndex_ = signal<number | null>(null)

  /** Validation tier of the currently-open quick-edit row — drives field focus inside the panel. */
  protected quickEditRowTier_ = signal<'invalid' | 'incomplete' | null>(null)

  /** True while the "paste ingredients" window is open. */
  protected isPasteOpen_ = signal(false)

  /** Plan 490: per unlinked pasted row, the products it could mean (from the AI step); replaced, never mutated. */
  private readonly rowOptions_ = signal<ReadonlyMap<FormGroup, readonly Product[]>>(new Map())

  /** Resolve the product for a form group by referenceId. Returns null for unlinked rows. */
  protected getProductForGroup(group: FormGroup): Product | null {
    const refId = group.get('referenceId')?.value as string | null
    if (!refId) return null
    return this.kitchenStateService.products_().find((p) => p._id === refId) ?? null
  }

  /** Route the badge click: desktop → inline accordion; mobile → service-driven modal. */
  protected onQuickEditBadgeClick(group: FormGroup, index: number, tier: 'invalid' | 'incomplete'): void {
    const product = this.getProductForGroup(group)
    if (!product) return
    if (this.isMobile_()) {
      void this.quickEditModalService.open({ product, tier })
    } else {
      const alreadyOpen = this.quickEditRowIndex_() === index
      if (alreadyOpen) {
        this.closeQuickEditWithAnimation()
      } else {
        this.quickEditRowIndex_.set(index)
        this.quickEditRowTier_.set(tier)
      }
    }
  }

  /**
   * «לא מוכן»: a product with exactly this name is linked (plan 485); otherwise the row opens the search with its
   * name and the inventory's options first (plan 490). Nothing is saved — a new product comes only from quick-add's «שמור».
   */
  protected onUnlinkedBadgeClick(group: FormGroup, index: number): void {
    const name = ((group.get('nameHebrew')?.value as string) ?? '').trim()
    if (!name) return
    // Plan 485: a product with this name already exists - link it instead of creating a second one.
    const existing = findProductByName(this.productDataService.allProducts_(), name)
    if (existing) {
      group.patchValue({ referenceId: existing._id, item_type: 'product', nameSnapshot: existing.nameHebrew })
      this.dropRowOptions_(group)
      this.onQuickEditBadgeClick(group, index, 'incomplete')
      return
    }
    this.editingNameAtRow_.set(index)
  }

  /**
   * Plan 490 — what the search lists first for an unlinked row: its stored options (AI step), then the local
   * exact / variant / ambiguous products for its name, no duplicates, max 5.
   */
  protected suggestionsFor(group: FormGroup): readonly Product[] {
    if (group.get('referenceId')?.value) return []
    const name = ((group.get('nameHebrew')?.value as string) ?? '').trim()
    const stored = this.rowOptions_().get(group) ?? []
    const hit = name ? matchProductName(name, this.kitchenStateService.products_()) : null
    const local = !hit ? [] : hit.kind === 'ambiguous' ? hit.candidates : [hit.product]
    const list: Product[] = []
    for (const p of [...stored, ...local]) {
      if (list.length < MAX_ROW_SUGGESTIONS && !list.some((x) => x._id === p._id)) list.push(p)
    }
    return list
  }

  private dropRowOptions_(group: FormGroup): void {
    if (!this.rowOptions_().has(group)) return
    const next = new Map(this.rowOptions_())
    next.delete(group)
    this.rowOptions_.set(next)
  }

  /**
   * Adds one row per non-empty pasted line (plan 439). A readable line becomes a row linked to the product or
   * recipe of the same name when there is one; a line that cannot be read is kept as an unlinked row holding
   * its original text — nothing pasted is dropped. Trailing empty rows are replaced.
   */
  onPasteIngredients(text: string): void {
    const lines = parseIngredientLines(text, this.pastedUnitResolver_)
    this.isPasteOpen_.set(false)
    if (lines.length === 0) return
    const array = this.ingredientsFormArray()
    while (array.length > 0 && this.isEmptyRow_(array.at(array.length - 1) as FormGroup)) {
      array.removeAt(array.length - 1)
    }
    const firstNewIndex = array.length
    const awaitingAi: { group: FormGroup; name: string; item: NameMatchItem }[] = []
    for (const line of lines) {
      const row = this.recipeFormService_.createIngredientGroup()
      if (line.kind === 'parsed') {
        const match = findIngredientMatch(
          line.name,
          this.kitchenStateService.products_(),
          this.kitchenStateService.recipes_()
        )
        const linkedName = match?.entity.nameHebrew ?? line.name
        row.patchValue({
          nameHebrew: linkedName,
          nameSnapshot: linkedName,
          amount_net: line.amount,
          unit: line.unit,
          ...(match && { referenceId: match.entity._id, item_type: match.type })
        })
        if (!match) {
          awaitingAi.push({
            group: row,
            name: line.name,
            item: { key: String(awaitingAi.length), name: line.name, unit: line.unit }
          })
        }
      } else {
        row.patchValue({ nameHebrew: line.text, nameSnapshot: line.text, amount_net: null, unit: 'unit' })
        // Plan 490: a line without an amount is never linked by itself — it goes to the matcher for options only.
        awaitingAi.push({
          group: row,
          name: line.text,
          item: { key: String(awaitingAi.length), name: line.text, linkable: false }
        })
      }
      array.push(row)
    }
    for (let i = firstNewIndex; i < array.length; i++) {
      if (array.at(i).get('referenceId')?.value) this.updateLineCalculations(i)
    }
    array.markAsDirty()
    array.updateValueAndValidity()
    this.cdr.markForCheck()
    if (awaitingAi.length > 0) void this.linkPastedByAi_(awaitingAi)
  }

  /**
   * Plan 463: the pasted lines no exact/variant match could link get ONE shared-matcher call (the AI step). A row is
   * patched only if it is still in the table, still unlinked and still has the pasted name; otherwise it is left alone.
   * Plan 490: the same rule decides which rows keep the products they could mean (`rowOptions_`) for «לא מוכן».
   */
  private async linkPastedByAi_(pending: { group: FormGroup; name: string; item: NameMatchItem }[]): Promise<void> {
    let failure: unknown = null
    const { linked: matches, options } = await this.nameMatcher_.matchNamesWithOptions(
      pending.map((p) => p.item),
      { onAiFailure: (err) => (failure = err) }
    )
    // A batch of only amount-less lines was never going to link anything — its rows stay red, no toast.
    const anyLinkable = pending.some((p) => p.item.linkable !== false)
    if (failure !== null && anyLinkable) {
      const status = (failure as { status?: number }).status
      const text = (failure as { error?: { error?: string } }).error?.error ?? ''
      const key =
        status === 429 || text.includes('daily_limit_reached')
          ? 'ai_daily_limit_reached_all'
          : 'paste_ingredients_match_failed'
      this.userMsg_.onSetWarningMsg(this.translation_.translate(key))
    }
    const array = this.ingredientsFormArray()
    const rowOptions = new Map(this.rowOptions_())
    for (const p of pending) {
      const hit = matches.get(p.item.key)
      const index = array.controls.indexOf(p.group)
      if (index < 0) continue
      if (p.group.get('referenceId')?.value || p.group.get('nameHebrew')?.value !== p.name) continue
      const rowList = options.get(p.item.key)
      if (!hit) {
        if (rowList?.length) rowOptions.set(p.group, rowList)
        continue
      }
      rowOptions.delete(p.group)
      p.group.patchValue({
        referenceId: hit.product._id,
        item_type: 'product',
        nameHebrew: hit.product.nameHebrew,
        nameSnapshot: hit.product.nameHebrew
      })
      this.updateLineCalculations(index)
    }
    this.rowOptions_.set(rowOptions)
    array.updateValueAndValidity()
    this.cdr.markForCheck()
  }

  private isEmptyRow_(group: FormGroup): boolean {
    return !group.get('referenceId')?.value && !(group.get('nameHebrew')?.value ?? '').toString().trim()
  }

  /** Called by clickOutside on the accordion div — defers to panel if it has unsaved changes. */
  protected onAccordionClickOutside(): void {
    const quickEditPanel = this.quickEditPanelRef_()
    if (quickEditPanel) {
      quickEditPanel.requestClose()
    } else {
      this.closeQuickEditWithAnimation()
    }
  }

  /** Close the accordion with the collapse animation (200ms). */
  protected closeQuickEditWithAnimation(): void {
    const idx = this.quickEditRowIndex_()
    if (idx === null || this.quickEditRowClosingIndex_() !== null) return
    this.quickEditRowClosingIndex_.set(idx)
    setTimeout(() => {
      this.quickEditRowClosingIndex_.set(null)
      this.quickEditRowIndex_.set(null)
      this.quickEditRowTier_.set(null)
    }, 200)
  }

  /** Called when the accordion panel emits saved. Closes with animation. */
  protected onQuickEditSaved(_index: number): void {
    this.closeQuickEditWithAnimation()
    // KitchenStateService.products_() is already updated by ProductDataService.updateProduct().
    // The existing effect() in the constructor fires and calls refreshAllLineCalculations().
  }

  /** Only cancel editing on the row that is actually being edited — prevents empty-row searches from wiping another row's edit mode. */
  protected onCancelSearch(rowIndex: number): void {
    if (this.editingNameAtRow_() === rowIndex) {
      this.editingNameAtRow_.set(null)
    }
  }

  /** Exclude names from search for a given row (other rows only), so user can re-select the same item when editing. */
  getExcludeNamesForRow(rowIndex: number): string[] {
    return this.ingredientGroups
      .filter((g, i) => i !== rowIndex && g.get('referenceId')?.value)
      .map((g) => (g.get('nameHebrew')?.value ?? '').toString().trim())
      .filter(Boolean)
  }

  /** True when the row's unit is a product purchase unit (use step 1 for +/-). */
  private isPurchaseUnitRow(group: FormGroup): boolean {
    const item = this.getItemMetadata(group)
    if (!item || (item as { item_type_?: string }).item_type_ !== 'product') return false
    const prod = item as Product
    const unit = group.get('unit')?.value
    return prod.purchaseOptions?.some((o) => o.unitSymbol === unit) ?? false
  }

  incrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net')
    const current = ctrl?.value ?? 0
    const unit = group.get('unit')?.value as string | undefined
    const stepOpts: QuantityStepOptions = this.isPurchaseUnitRow(group) ? { integerOnly: true } : unit ? { unit } : {}
    ctrl?.setValue(quantityIncrement(current, 0, stepOpts))
    this.updateLineCalculations(index)
  }

  decrementAmount(group: FormGroup, index: number): void {
    const ctrl = group.get('amount_net')
    const current = ctrl?.value ?? 0
    const unit = group.get('unit')?.value as string | undefined
    const stepOpts: QuantityStepOptions = this.isPurchaseUnitRow(group) ? { integerOnly: true } : unit ? { unit } : {}
    ctrl?.setValue(quantityDecrement(current, 0, stepOpts))
    this.updateLineCalculations(index)
  }

  getTotalWeightG(): number {
    const rows = this.ingredientGroups.map((g) => ({
      amount_net: g.get('amount_net')?.value,
      unit: g.get('unit')?.value,
      referenceId: g.get('referenceId')?.value,
      item_type: g.get('item_type')?.value
    })) as IngredientWeightRow[]
    return this.recipeCostService.computeTotalWeightG(rows)
  }

  getPercentageDisplay(group: FormGroup): string {
    const row: IngredientWeightRow = {
      amount_net: group.get('amount_net')?.value,
      unit: group.get('unit')?.value,
      referenceId: group.get('referenceId')?.value,
      item_type: group.get('item_type')?.value
    }
    const rowG = this.recipeCostService.getRowWeightG(row)
    if (rowG === null) return 'n/a'
    const total = this.getTotalWeightG()
    if (total === 0) return '0%'
    return `${((rowG / total) * 100).toFixed(1)}%`
  }

  onItemSelected(item: SearchableItem, group: FormGroup) {
    const index = this.ingredientGroups.indexOf(group)
    const isEditingName = this.editingNameAtRow_() === index
    const product = item.item_type_ === 'product' ? (item as Product) : null
    const hasPurchaseOptions = product?.purchaseOptions?.length
    // Plan 490: an unlinked row that already has an amount (a pasted «200 גרם salt») keeps its amount and unit.
    const keptAmount = Number(group.get('amount_net')?.value) || 0
    const keptUnit = (group.get('unit')?.value as string | null) ?? ''
    const keepsPasted = isEditingName && !group.get('referenceId')?.value && keptAmount > 0 && !!keptUnit
    const unit = keepsPasted
      ? keptUnit
      : hasPurchaseOptions
        ? (product!.purchaseOptions![0].unitSymbol ?? product!.baseUnit ?? '')
        : 'baseUnit' in item
          ? (item.baseUnit ?? '')
          : 'yieldUnit' in item
            ? (item.yieldUnit ?? '')
            : ''
    const amount_net = isEditingName
      ? (group.get('amount_net')?.value ?? (hasPurchaseOptions ? 1 : 0))
      : hasPurchaseOptions
        ? 1
        : 0
    this.dropRowOptions_(group)
    group.patchValue({
      nameHebrew: item.nameHebrew,
      nameSnapshot: item.nameHebrew,
      referenceId: item._id,
      item_type: item.item_type_,
      unit,
      amount_net
    })

    if (index !== -1) {
      this.updateLineCalculations(index)
    }

    this.editingNameAtRow_.set(null)

    // Focus quantity so user can type immediately (no new row yet; Enter in qty/unit adds row).
    setTimeout(() => this.focusQuantityAtRow(index), 0)
  }

  focusQuantityAtRow(rowIndex: number): void {
    const refs = this.focusByRowRefs()
    const ref = refs.find((r) => r.rowIndex() === rowIndex && r.kind() === 'qty')
    ref?.focus()
  }

  focusUnitAtRow(rowIndex: number): void {
    const refs = this.focusByRowRefs()
    const ref = refs.find((r) => r.rowIndex() === rowIndex && r.kind() === 'unit')
    ref?.focus()
  }

  onQuantityKeydown(e: KeyboardEvent, rowIndex: number): void {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const group = this.ingredientsFormArray().at(rowIndex) as FormGroup
      const ctrl = group?.get('amount_net')
      if (!ctrl) return
      e.preventDefault()
      const current = ctrl.value ?? 0
      const unit = group.get('unit')?.value as string | undefined
      const stepOpts: QuantityStepOptions = this.isPurchaseUnitRow(group) ? { integerOnly: true } : unit ? { unit } : {}
      const next =
        e.key === 'ArrowUp' ? quantityIncrement(current, 0, stepOpts) : quantityDecrement(current, 0, stepOpts)
      ctrl.setValue(next)
      this.updateLineCalculations(rowIndex)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      this.addIngredient.emit()
    }
  }

  onUnitKeydown(e: KeyboardEvent, _rowIndex: number): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.addIngredient.emit()
    }
  }

  clearIngredient(group: FormGroup): void {
    this.dropRowOptions_(group)
    group.patchValue({
      referenceId: null,
      nameHebrew: '',
      item_type: null,
      amount_net: null,
      unit: 'gram'
    })
    group.updateValueAndValidity()
    this.ingredientsFormArray().updateValueAndValidity()
  }

  protected getDisplayName(group: FormGroup): string {
    const refId = group.get('referenceId')?.value as string | null
    const type = group.get('item_type')?.value as 'product' | 'recipe' | null
    if (refId) {
      const pool = type === 'recipe' ? this.kitchenStateService.recipes_() : this.kitchenStateService.products_()
      const found = pool.find((x) => x._id === refId)
      if (found?.nameHebrew) return found.nameHebrew
    }
    return (group.get('nameHebrew')?.value || group.get('nameSnapshot')?.value || '') as string
  }

  getItemMetadata(group: FormGroup) {
    const id = group.get('referenceId')?.value
    const type = group.get('item_type')?.value
    return type === 'product'
      ? this.kitchenStateService.products_().find((p) => p._id === id)
      : this.kitchenStateService.recipes_().find((r) => r._id === id)
  }

  /** True when the row is blocking — must be resolved before the recipe can be saved. */
  isBlockingRow(group: FormGroup): boolean {
    const refId = group.get('referenceId')?.value as string | null
    if (!refId) return false
    const type = group.get('item_type')?.value as 'product' | 'recipe' | null
    const pool = type === 'recipe' ? this.kitchenStateService.recipes_() : this.kitchenStateService.products_()
    const found = pool.find((x) => x._id === refId)
    // Unlinked: referenceId not found in pool
    if (!found) return true
    // Product is in the invalid tier (missing name or base unit)
    if (type === 'product') {
      return getProductValidationStatus(found as Product) === 'invalid'
    }
    return false
  }

  /** True when the row has a name but no referenceId (draft/unlinked ingredient). */
  isUnlinkedRow(group: FormGroup): boolean {
    return !!group.get('nameHebrew')?.value?.trim() && !group.get('referenceId')?.value
  }

  /** True when any ingredient row is unlinked (has name but no referenceId). */
  hasUnlinkedRows(): boolean {
    return this.ingredientGroups.some((g) => this.isUnlinkedRow(g))
  }

  /** True when the row is linked to a product that is in the incomplete (warning) tier. */
  isWarningRow(group: FormGroup): boolean {
    if (this.isBlockingRow(group)) return false
    const refId = group.get('referenceId')?.value as string | null
    if (!refId) return false
    if (group.get('item_type')?.value !== 'product') return false
    const product = this.kitchenStateService.products_().find((p) => p._id === refId)
    if (!product) return false
    return getProductValidationStatus(product) === 'incomplete'
  }

  /** True when any ingredient row is blocking. Used by recipe-builder to gate save. */
  hasBlockingRows(): boolean {
    return this.ingredientGroups.some((g) => this.isBlockingRow(g))
  }

  /** Navigate to the full product edit form so the user can complete the product. */
  navigateToEditProduct(group: FormGroup): void {
    const id = group.get('referenceId')?.value
    if (!id) return
    void this.router_.navigate(['/inventory/edit', id])
  }

  updateLineCalculations(index: number): void {
    const group = this.ingredientGroups[index]
    const item = this.getItemMetadata(group)
    if (!item) return

    const netAmount = group.get('amount_net')?.value || 0
    const selectedUnit = group.get('unit')?.value || ''
    const itemType = group.get('item_type')?.value

    let lineCost = 0

    if (itemType === 'recipe') {
      const recipe = item as import('@models/recipe.model').Recipe
      const costPerUnit = this.recipeCostService.getRecipeCostPerUnit(recipe)
      const amountInYieldUnit = this.recipeCostService.amountInRecipeYieldUnit(netAmount, selectedUnit, recipe)
      lineCost = amountInYieldUnit * costPerUnit
    } else {
      const prod = item as Product & { calculated_cost_per_unit?: number }
      const unitOption = prod.purchaseOptions?.find((o) => o.unitSymbol === selectedUnit)
      const effectivePrice = getEffectivePrice(prod)

      if (unitOption) {
        if (unitOption.priceOverride != null && unitOption.priceOverride > 0) {
          lineCost = netAmount * unitOption.priceOverride
        } else {
          const normalizedAmount = netAmount * (optionRateInBase(prod, unitOption, this.unitRegistry) || 1)
          const yieldFactor = prod.yieldFactor || 1
          lineCost = (normalizedAmount / yieldFactor) * effectivePrice
        }
      } else {
        // Selected unit not in purchaseOptions (e.g. base unit or custom like כפית): convert to product base unit.
        const price = effectivePrice || prod.calculated_cost_per_unit || 0
        const yieldFactor = prod.yieldFactor || 1
        const baseUnit = prod.baseUnit || 'gram'
        const amountG = this.recipeCostService.convertToBaseUnits(netAmount, selectedUnit)
        const baseGPerUnit = this.recipeCostService.convertToBaseUnits(1, baseUnit) || 1
        const amountInBaseUnit = amountG / baseGPerUnit
        lineCost = (amountInBaseUnit / yieldFactor) * price
      }
    }

    group.get('total_cost')?.setValue(lineCost)
    this.ingredientsFormArray().parent?.updateValueAndValidity()
    this.cdr.markForCheck()
  }

  /** Re-run line cost for every row with referenceId (e.g. when products/recipes load). */
  private refreshAllLineCalculations(): void {
    const groups = this.ingredientGroups
    if (!groups.length) return
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].get('referenceId')?.value) this.updateLineCalculations(i)
    }
    this.cdr.markForCheck()
  }

  getAvailableUnits(group: FormGroup): string[] {
    const item = this.getItemMetadata(group)
    if (!item) {
      const current = group.get('unit')?.value as string | null
      const defaults = new Set(['gram', 'kg', 'unit'])
      if (current) defaults.add(current)
      return Array.from(defaults)
    }

    const units = new Set<string>()
    const meta = item as {
      baseUnit?: string
      purchaseOptions?: { unitSymbol?: string }[]
      unit_options_?: { unitSymbol?: string }[]
      yieldUnit?: string
      yieldConversions?: { amount: number; unit: string }[]
    }

    if (meta.baseUnit) units.add(meta.baseUnit)
    if (meta.purchaseOptions?.length) {
      meta.purchaseOptions.forEach((o) => {
        if (o.unitSymbol) units.add(o.unitSymbol)
      })
    }
    if (meta.unit_options_?.length) {
      meta.unit_options_.forEach((o) => {
        if (o.unitSymbol) units.add(o.unitSymbol)
      })
    }
    if (meta.yieldUnit) units.add(meta.yieldUnit)
    if (meta.yieldConversions?.length) {
      meta.yieldConversions.forEach((c) => {
        if (c?.unit) units.add(c.unit)
      })
    }

    return Array.from(units)
  }

  getUnitOptions(group: FormGroup): { value: string; label: string }[] {
    const available = this.getAvailableUnits(group)
    const currentUnit = group.get('unit')?.value
    const unitsSet = new Set(available)
    if (currentUnit && typeof currentUnit === 'string' && currentUnit.trim() && !unitsSet.has(currentUnit.trim())) {
      unitsSet.add(currentUnit.trim())
    }
    const opts = Array.from(unitsSet).map((u) => ({ value: u, label: u }))
    return [...opts, { value: '__add_unit__', label: 'add_new_unit' }]
  }

  onUnitChange(group: FormGroup, index: number, val: string): void {
    if (val === '__add_unit__') {
      group.get('unit')?.setValue('')
      const product =
        group.get('item_type')?.value === 'product' ? (this.getItemMetadata(group) as Product | undefined) : undefined
      const existingSymbols = product?.purchaseOptions?.map((o) => o.unitSymbol) ?? []
      const prefillName = this.pendingAddName_()
      this.pendingAddName_.set('')
      const setUnitAndUpdate = (newUnit: string): void => {
        group.get('unit')?.setValue(newUnit)
        this.updateLineCalculations(index)
      }
      if (!product?._id) {
        setTimeout(() => this.unitRegistry.openUnitCreator({ existingUnitSymbols: existingSymbols, prefillName }), 0)
        void this.unitRegistry.awaitUnitCreated().then((newUnit) => newUnit && setUnitAndUpdate(newUnit))
        return
      }
      // Plan 423: the window asks how much one unit of THIS product weighs; that typed amount is what is saved.
      const forProduct = { name: product.nameHebrew, baseUnit: product.baseUnit }
      setTimeout(
        () => this.unitRegistry.openUnitCreator({ existingUnitSymbols: existingSymbols, prefillName, forProduct }),
        0
      )
      void this.unitRegistry.awaitProductUnitAdded().then(async (added) => {
        if (!added) return
        const { key, amount, basis } = added
        const current = (this.getItemMetadata(group) as Product | undefined) ?? product
        if (current.purchaseOptions?.some((o) => o.unitSymbol === key)) {
          setUnitAndUpdate(key)
          return
        }
        const updated: Product = {
          ...current,
          purchaseOptions: [
            ...(current.purchaseOptions ?? []),
            { unitSymbol: key, conversionRate: amount, uom: basis, priceOverride: 0 }
          ]
        }
        await this.kitchenStateService.saveProduct(updated).catch(() => {})
        setUnitAndUpdate(key)
      })
    } else {
      group.get('unit')?.setValue(val)
      this.updateLineCalculations(index)
    }
  }

  getGrossWeight(index: number): number {
    const group = this.ingredientGroups[index]
    const net = group.get('amount_net')?.value || 0

    if (group.get('item_type')?.value !== 'product') {
      return net // For preps, Net is effectively Gross
    }

    const item = this.getItemMetadata(group)
    const yieldValue = (item as Product)?.yieldFactor ?? 1
    return net / yieldValue
  }
}
