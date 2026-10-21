import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component'
import { EventPlanService } from '../../../../core/engine/event-plan.service'
import { formatCoefficient, isValidCoefficient, type ItemPortions } from '../../../../core/engine/portions'
import { roundMoney } from '../../../../core/engine/rounding'
import { TranslationService } from '@services/translation.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { PartialCostBadgeComponent } from 'src/app/shared/partial-cost-badge/partial-cost-badge.component'
import { ALL_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model'
import { Recipe } from '@models/recipe.model'
import { filterOptionsByLabel } from 'src/app/core/utils/option-filter.util'
import { ScrollRailComponent } from 'src/app/shared/scroll-rail/scroll-rail.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'

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
    ScrollRailComponent,
    InputClearComponent,
    PartialCostBadgeComponent
  ],
  templateUrl: './menu-dish-row.component.html',
  styleUrl: './menu-dish-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDishRowComponent {
  // ── Injected ──────────────────────────────────────────────────────────────
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly translation_ = inject(TranslationService)
  private readonly recipeCost_ = inject(RecipeCostService)

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly itemGroup = input.required<FormGroup>()
  readonly sectionIndex = input.required<number>()
  readonly itemIndex = input.required<number>()
  readonly recipes = input<Recipe[]>([])
  readonly activeFields = input<DishFieldKey[]>([])
  readonly dishSearchQuery = input<string>('')
  readonly highlightedIndex = input<number>(0)
  readonly isMetaExpanded = input<boolean>(false)
  readonly editingDishField = input<string | null>(null)
  /** Portions, coefficient and override flag of this row, from `MenuPortionsService` (null = unknown row). */
  readonly portionInfo = input<ItemPortions | null>(null)

  // ── State ─────────────────────────────────────────────────────────────────
  /** Text being typed in the coefficient box (null = show the stored value). */
  protected readonly coefficientDraft_ = signal<string | null>(null)
  protected readonly coefficientInvalid_ = signal(false)
  protected readonly coefficientText_ = computed(
    () => this.coefficientDraft_() ?? formatCoefficient(this.portionInfo()?.coefficient ?? 1)
  )

  /** Id of the dish in this row, kept in step with the form control (the form is not a signal). */
  private readonly recipeId_ = signal('')

  /** What keeps this dish's cost from being final: unpriced, unlinked and deleted ingredients, through preps. */
  protected readonly missing_ = computed(() => {
    const recipe = this.recipes().find((r) => r._id === this.recipeId_())
    return recipe ? this.recipeCost_.computeRecipeCostStatus(recipe).missing : []
  })

  constructor() {
    effect((onCleanup) => {
      const ctrl = this.itemGroup().get('recipeId')
      this.recipeId_.set((ctrl?.value as string | undefined) ?? '')
      const sub = ctrl?.valueChanges.subscribe((v: string | null) => this.recipeId_.set(v ?? ''))
      onCleanup(() => sub?.unsubscribe())
    })
  }

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly remove = output<void>()
  readonly selectRecipe = output<{ recipe: Recipe }>()
  readonly startEditName = output<void>()
  readonly searchQueryChange = output<string>()
  readonly metaToggle = output<void>()
  readonly editDishFieldStart = output<string>()
  readonly editDishFieldCommit = output<void>()
  readonly sellPriceKeydown = output<KeyboardEvent>()
  readonly dishFieldKeydown = output<{ fieldKey: string; event: KeyboardEvent }>()
  readonly dishSearchKeydown = output<KeyboardEvent>()
  readonly clearSearch = output<void>()

  // ── Read ──────────────────────────────────────────────────────────────────
  getRecipeName(recipeId: string): string {
    return this.recipes().find((r) => r._id === recipeId)?.nameHebrew || ''
  }

  getInputWidth(value: unknown): string {
    const len = String(value ?? '').length
    return `${Math.max(4, len + 2)}ch`
  }

  isDishFieldReadOnly(fieldKey: DishFieldKey): boolean {
    return fieldKey === 'food_cost_money'
  }

  getDishFieldLabelKey(fieldKey: DishFieldKey): string {
    return ALL_DISH_FIELDS.find((f) => f.key === fieldKey)?.labelKey ?? fieldKey
  }

  isEditingField(fieldKey: string): boolean {
    return this.editingDishField() === `${this.sectionIndex()}-${this.itemIndex()}-${fieldKey}`
  }

  getAutoFoodCost(): number {
    const recipeId = this.itemGroup()?.get('recipeId')?.value as string | undefined
    if (!recipeId) return 0
    return roundMoney(this.eventPlan_.costFor(recipeId, this.getDerivedPortions()).cost)
  }

  getFoodCostPerPortion(): number {
    const total = this.getAutoFoodCost()
    const derivedPortions = this.getDerivedPortions()
    return Math.round((total / Math.max(1, derivedPortions)) * 100) / 100
  }

  getDerivedPortions(): number {
    return this.portionInfo()?.portions ?? 0
  }

  /** Label of a detail field: a preparation counts per diner in its own yield unit, a dish in portions. */
  getFieldLabel(fieldKey: DishFieldKey): string {
    const unit = this.prepYieldUnit()
    if (fieldKey === 'serving_portions' && unit) {
      return this.translation_.translate('per_diner_in_unit').replace('{{unit}}', this.translation_.translate(unit))
    }
    return this.translation_.translate(this.getDishFieldLabelKey(fieldKey))
  }

  isPerDinerZero(): boolean {
    return Number(this.itemGroup().get('serving_portions')?.value ?? 1) === 0
  }

  /** Typing a coefficient: valid → stored as this dish's override; invalid → message, old value kept. */
  onCoefficientInput(text: string): void {
    this.coefficientDraft_.set(text)
    const trimmed = text.trim()
    if (!trimmed) {
      this.coefficientInvalid_.set(false)
      return
    }
    const value = Number(trimmed.replace(',', '.'))
    if (!isValidCoefficient(value)) {
      this.coefficientInvalid_.set(true)
      return
    }
    this.coefficientInvalid_.set(false)
    this.itemGroup().patchValue({ coefficient_override: value })
  }

  /** Leaving the box shows the stored value again. */
  onCoefficientBlur(): void {
    this.coefficientDraft_.set(null)
    this.coefficientInvalid_.set(false)
  }

  resetCoefficient(): void {
    this.itemGroup().patchValue({ coefficient_override: null })
    this.coefficientDraft_.set(null)
    this.coefficientInvalid_.set(false)
  }

  private prepYieldUnit(): string {
    if (this.itemGroup().get('recipeType')?.value !== 'preparation') return ''
    const id = this.itemGroup().get('recipeId')?.value as string | undefined
    return this.recipes().find((r) => r._id === id)?.yieldUnit ?? ''
  }

  getFilteredRecipes(): Recipe[] {
    const raw = this.dishSearchQuery().trim()
    if (!raw) return []
    const filtered = filterOptionsByLabel(this.recipes(), raw, (r) => r.nameHebrew ?? '')
    return filtered.slice(0, 12)
  }
}
