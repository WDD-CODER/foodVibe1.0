import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { MenuDishDataService } from '@services/menu-dish-data.service'
import { MenuDishCostService } from '@services/menu-dish-cost.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { TranslationService } from '@services/translation.service'
import { DISH_COST_SOURCES, type DishCostSource, type MenuDish } from '@models/menu-dish.model'
import type { Recipe } from '@models/recipe.model'
import type { Product } from '@models/product.model'
import { normalizeHebrew } from 'src/app/core/utils/recipe-match.util'
import { formatMoney } from 'src/app/core/engine/rounding'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { SearchComboboxComponent, type SearchPick } from 'src/app/shared/search-combobox/search-combobox.component'

const NAME_MAX = 120
const NOTE_MAX = 200
const NO_COURSE_VALUE = ''

/** Plan 725: add or edit one standing-menu dish — a centred popup, four cost sources, a live cost line. */
@Component({
  selector: 'app-menu-dish-dialog',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    NumberBoxDirective,
    TranslatePipe,
    ModalShellComponent,
    FormFieldComponent,
    CustomSelectComponent,
    SearchComboboxComponent
  ],
  templateUrl: './menu-dish-dialog.component.html',
  styleUrl: './menu-dish-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuDishDialogComponent {
  private readonly data = inject(MenuDishDataService)
  private readonly cost = inject(MenuDishCostService)
  private readonly kitchen = inject(KitchenStateService)
  private readonly metadata = inject(MetadataRegistryService)
  private readonly translation = inject(TranslationService)

  /** The dish being edited; null adds a new one. */
  readonly dish = input<MenuDish | null>(null)
  readonly closed = output<void>()

  protected readonly sources = DISH_COST_SOURCES
  protected readonly nameMax = NAME_MAX
  protected readonly noteMax = NOTE_MAX

  protected readonly name_ = signal('')
  protected readonly course_ = signal(NO_COURSE_VALUE)
  protected readonly price_ = signal<number | null>(null)
  protected readonly source_ = signal<DishCostSource>('recipe')
  protected readonly recipeId_ = signal<string | null>(null)
  protected readonly recipeQuery_ = signal('')
  protected readonly recipeOpen_ = signal(false)
  protected readonly productId_ = signal<string | null>(null)
  protected readonly productQuery_ = signal('')
  protected readonly productOpen_ = signal(false)
  protected readonly productAmount_ = signal<number | null>(null)
  protected readonly productUnit_ = signal('')
  protected readonly typedCost_ = signal<number | null>(null)
  protected readonly note_ = signal('')
  protected readonly touched_ = signal(false)
  protected readonly isBusy_ = signal(false)
  protected readonly serverError_ = signal<string | null>(null)

  private initial_ = ''

  protected readonly recipes_ = this.kitchen.recipes_
  protected readonly products_ = this.kitchen.products_
  protected readonly recipeLabel = (r: Recipe) => r.nameHebrew
  protected readonly recipeKey = (r: Recipe) => r._id
  protected readonly productLabel = (p: Product) => p.nameHebrew
  protected readonly productKey = (p: Product) => p._id

  protected readonly courseOptions_ = computed(() => [
    { value: NO_COURSE_VALUE, label: 'menu_dish_no_course' },
    ...this.metadata.courses_().map((c) => ({ value: c.key, label: c.key }))
  ])

  /** The product's own units: its base unit and its purchase units. */
  protected readonly unitOptions_ = computed(() => {
    const product = this.kitchen.productsById_().get(this.productId_() ?? '')
    if (!product) return []
    const symbols = [product.baseUnit, ...(product.purchaseOptions ?? []).map((o) => o.unitSymbol)]
    return [...new Set(symbols.filter(Boolean))].map((s) => ({ value: s, label: s }))
  })

  protected readonly nameError_ = computed<string | null>(() => {
    const name = this.name_().trim()
    if (!name) return this.touched_() ? 'field_required' : null
    const key = normalizeHebrew(name)
    const self = this.dish()?._id
    const taken = this.data
      .allDishes_()
      .some((d) => d.active !== false && !d.deletedAt && d._id !== self && normalizeHebrew(d.name) === key)
    return taken ? 'menu_dish_name_taken' : null
  })

  /** The fields of the chosen source are complete (the server checks them again). */
  protected readonly sourceComplete_ = computed(() => {
    switch (this.source_()) {
      case 'recipe':
        return !!this.recipeId_()
      case 'product':
        return !!this.productId_() && (this.productAmount_() ?? 0) > 0 && !!this.productUnit_()
      case 'typed':
        return this.typedCost_() != null && this.typedCost_()! >= 0
      default:
        return true
    }
  })

  protected readonly isValid_ = computed(
    () => this.name_().trim().length > 0 && !this.nameError_() && this.sourceComplete_() && this.priceValid_()
  )

  private priceValid_(): boolean {
    const price = this.price_()
    return price == null || price >= 0
  }

  protected readonly hasChanges_ = computed(() => this.snapshot_() !== this.initial_)

  /** What the row will show for the typed values. */
  protected readonly live_ = computed(() => {
    const draft = this.toDoc_()
    const cost = this.cost.costOf(draft)
    return {
      net: this.cost.netPrice(draft),
      cost,
      left: this.cost.leftPerDish(draft)
    }
  })

  constructor() {
    queueMicrotask(() => this.fill_())
  }

  private fill_(): void {
    const d = this.dish()
    if (d) {
      this.name_.set(d.name)
      this.course_.set(d.course ?? NO_COURSE_VALUE)
      this.price_.set(d.priceWithVat ?? null)
      this.source_.set(d.costSource)
      this.recipeId_.set(d.recipeId ?? null)
      this.recipeQuery_.set(this.kitchen.recipesById_().get(d.recipeId ?? '')?.nameHebrew ?? '')
      this.productId_.set(d.productId ?? null)
      this.productQuery_.set(this.kitchen.productsById_().get(d.productId ?? '')?.nameHebrew ?? '')
      this.productAmount_.set(d.productAmount ?? null)
      this.productUnit_.set(d.productUnit ?? '')
      this.typedCost_.set(d.typedCost ?? null)
      this.note_.set(d.note ?? '')
    }
    this.initial_ = this.snapshot_()
  }

  private snapshot_(): string {
    return JSON.stringify([
      this.name_(),
      this.course_(),
      this.price_(),
      this.source_(),
      this.recipeId_(),
      this.productId_(),
      this.productAmount_(),
      this.productUnit_(),
      this.typedCost_(),
      this.note_()
    ])
  }

  /** The form as a dish: only the chosen source's fields are set. */
  private toDoc_(): MenuDish {
    const base = this.dish()
    const {
      recipeId: _r,
      productId: _p,
      productAmount: _a,
      productUnit: _u,
      typedCost: _t,
      course: _c,
      priceWithVat: _v,
      note: _n,
      ...rest
    } = (base ?? {}) as MenuDish
    const source = this.source_()
    const doc = {
      ...rest,
      _id: base?._id ?? 'draft',
      name: this.name_().trim(),
      costSource: source,
      active: base?.active ?? true,
      ...(this.course_() ? { course: this.course_() } : {}),
      ...(this.price_() != null ? { priceWithVat: this.price_()! } : {}),
      ...(this.note_().trim() ? { note: this.note_().trim() } : {}),
      ...(source === 'recipe' && this.recipeId_() ? { recipeId: this.recipeId_()! } : {}),
      ...(source === 'product' && this.productId_()
        ? {
            productId: this.productId_()!,
            ...(this.productAmount_() != null ? { productAmount: this.productAmount_()! } : {}),
            ...(this.productUnit_() ? { productUnit: this.productUnit_() } : {})
          }
        : {}),
      ...(source === 'typed' && this.typedCost_() != null ? { typedCost: this.typedCost_()! } : {})
    }
    return doc as MenuDish
  }

  protected money(n: number | null): string {
    return n == null ? '—' : formatMoney(n)
  }

  protected sourceLabelKey(source: DishCostSource): string {
    return 'menu_dish_source_' + source
  }

  protected hintText(source: DishCostSource): string {
    return this.translation.translate('menu_dish_source_' + source + '_hint')
  }

  protected setSource(source: DishCostSource): void {
    this.source_.set(source)
    this.serverError_.set(null)
  }

  protected setNumber(target: 'price' | 'amount' | 'typed', value: number | string | null): void {
    const n = value === null || value === '' ? null : Number(value)
    const next = n != null && Number.isFinite(n) ? n : null
    if (target === 'price') this.price_.set(next)
    else if (target === 'amount') this.productAmount_.set(next)
    else this.typedCost_.set(next)
  }

  /** Picking a recipe fills an empty name and an empty course from it. */
  protected onRecipePicked(pick: SearchPick<Recipe>): void {
    const recipe = pick.option
    this.recipeId_.set(recipe._id)
    this.recipeQuery_.set(recipe.nameHebrew)
    this.recipeOpen_.set(false)
    if (!this.name_().trim()) this.name_.set(recipe.nameHebrew)
    if (!this.course_() && recipe.course) this.course_.set(recipe.course)
  }

  protected onProductPicked(pick: SearchPick<Product>): void {
    const product = pick.option
    this.productId_.set(product._id)
    this.productQuery_.set(product.nameHebrew)
    this.productOpen_.set(false)
    this.productUnit_.set(product.baseUnit ?? '')
  }

  protected async save(): Promise<void> {
    this.touched_.set(true)
    if (!this.isValid_() || this.isBusy_()) return
    this.isBusy_.set(true)
    this.serverError_.set(null)
    try {
      const doc = this.toDoc_()
      if (this.dish()) await this.data.updateDish(doc)
      else {
        const { _id: _drop, ...body } = doc
        await this.data.addDish(body)
      }
      this.closed.emit()
    } catch (err) {
      this.serverError_.set(this.errorText_(err))
    } finally {
      this.isBusy_.set(false)
    }
  }

  private errorText_(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: string; message?: string } | null
      if (err.status === 403 && body?.error === 'MODULE_OFF')
        return this.translation.translate('restaurant_menu_module_off')
      const message = body?.message ?? body?.error
      if (message) return message
    }
    return this.translation.translate('save_failed')
  }

  protected close(): void {
    if (!this.isBusy_()) this.closed.emit()
  }
}
