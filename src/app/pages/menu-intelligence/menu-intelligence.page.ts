import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, NavigationStart, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { filter, startWith } from 'rxjs'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TranslationService } from '@services/translation.service'
import { blankMenuItemIndex, missingMenuFieldsMessage, pruneBlankMenuItems } from './menu-form.util'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { MenuIntelligenceService } from '@services/menu-intelligence.service'
import { UserMsgService } from '@services/user-msg.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { MenuSectionCategoriesService } from '@services/menu-section-categories.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import {
  MenuEvent,
  MenuSection,
  ServingType,
  DEFAULT_DISH_FIELDS,
  ALL_DISH_FIELDS,
  type DishFieldKey
} from '@models/menu-event.model'
import { Recipe } from '@models/recipe.model'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { EventPlanService } from '../../core/engine/event-plan.service'
import { roundMoney } from '../../core/engine/rounding'
import { ExportService } from '@services/export.service'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util'
import { notifyItemAdded, resolveAddedKey } from 'src/app/core/utils/add-option.util'
import { SearchComboboxComponent } from 'src/app/shared/search-combobox/search-combobox.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import type { ExportPayload } from 'src/app/core/utils/export.util'
import { ExportPreviewComponent } from 'src/app/shared/export-preview/export-preview.component'
import { HeroFabService } from '@services/hero-fab.service'
import { useSavingState } from 'src/app/core/utils/saving-state.util'
import { useUnsavedChanges } from 'src/app/core/utils/unsaved-changes'
import { EventStageBarComponent } from './components/event-stage-bar/event-stage-bar.component'
import { EventNotesLogComponent } from './components/event-notes-log/event-notes-log.component'
import { MenuExportSheetComponent } from './components/menu-export-sheet/menu-export-sheet.component'
import { MenuDishRowComponent } from './components/menu-dish-row/menu-dish-row.component'
import { PrepSheetsComponent, type PrepSheetsMode } from './components/prep-sheets/prep-sheets.component'
import { SupplierOrdersComponent } from './components/supplier-orders/supplier-orders.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { AiMenuModalService } from '../../shared/ai-menu-modal/ai-menu-modal.service'
import { MenuAiFlowService } from './services/menu-ai-flow.service'
import { MenuPortionsService } from './services/menu-portions.service'
import { MenuEventSaveService } from './services/menu-event-save.service'
import { PricingMeterComponent } from './components/pricing-meter/pricing-meter.component'
import { createMoneyGroup, moneyFieldsFromForm, moneyFormFromEvent } from './menu-money-form.util'
import { MenuPickerSearchService } from './services/menu-picker-search.service'
import type { AiMenuDraft, MatchedMenu } from '@models/ai-menu-draft.model'
import { VenueLinkChipComponent } from 'src/app/shared/venue-link-chip/venue-link-chip.component'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { StepHoldDirective } from 'src/app/shared/counter/step-hold.directive'

type MenuItemForm = {
  recipeId: string
  recipeType: 'dish' | 'preparation'
  coefficient_override?: number | null
  sell_price?: number
  food_cost_money?: number
  food_cost_pct?: number
  serving_portions?: number
  serving_portions_pct?: number
}

/** Raw section shape from form getRawValue() before mapping to MenuSection. */
type MenuSectionFormRaw = { _id?: string; name?: string; items?: MenuItemForm[] }

@Component({
  selector: 'app-menu-intelligence-page',
  standalone: true,
  imports: [
    NumberBoxDirective,
    StepHoldDirective,
    SelectOnFocusDirective,
    CommonModule,
    DateFieldComponent,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    PricingMeterComponent,
    ClickOutSideDirective,
    SearchComboboxComponent,
    CustomSelectComponent,
    ExportPreviewComponent,
    MenuDishRowComponent,
    MenuExportSheetComponent,
    PrepSheetsComponent,
    SupplierOrdersComponent,
    VenueLinkChipComponent,
    EventStageBarComponent,
    EventNotesLogComponent
  ],
  templateUrl: './menu-intelligence.page.html',
  styleUrl: './menu-intelligence.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MenuAiFlowService, MenuPickerSearchService, MenuPortionsService]
})
export class MenuIntelligencePage implements AfterViewInit, OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly menuIntelligence = inject(MenuIntelligenceService)
  private readonly userMsg = inject(UserMsgService)
  private readonly addItemModal = inject(AddItemModalService)
  private readonly metadataRegistry = inject(MetadataRegistryService)
  private readonly menuSectionCategories = inject(MenuSectionCategoriesService)
  private readonly menuEventTypeService = inject(MenuEventTypeService)
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly exportService = inject(ExportService)
  private readonly heroFab = inject(HeroFabService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly confirmModal_ = inject(ConfirmModalService)
  private readonly aiMenuModal_ = inject(AiMenuModalService)
  private readonly menuAiFlow_ = inject(MenuAiFlowService)
  protected readonly pickerSearch_ = inject(MenuPickerSearchService)
  protected readonly menuPortions_ = inject(MenuPortionsService)
  private readonly menuEventSave_ = inject(MenuEventSaveService)

  /** Bumped when form value changes so footer computeds re-run (form is not a signal). */
  private readonly formValueVersion_ = signal(0)

  protected readonly editingId_ = signal<string | null>(null)
  protected readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS
  protected readonly recipes_ = this.kitchenState.recipes_
  protected readonly products_ = this.kitchenState.products_
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  /** "צ'קליסט והדפסות" top sheet, toggled from the hero FAB (plan 344). */
  protected readonly isExportSheetOpen_ = signal(false)
  protected readonly supplierOrdersEvent_ = signal<MenuEvent | null>(null)
  protected readonly prepSheets_ = signal<{ event: MenuEvent; mode: PrepSheetsMode } | null>(null)
  /** Export preview (View before export). */
  protected readonly exportPreviewPayload_ = signal<ExportPayload | null>(null)
  private exportPreviewType_: 'menu-info' | 'menu-shopping-list' | 'menu-all' | null = null

  protected readonly sectionSearchOpen_ = signal<number | null>(null)
  /** Currently active dish search (for keyboard nav); null when none focused/has query. */
  protected readonly activeDishSearch_ = signal<{ sectionIndex: number; itemIndex: number } | null>(null)
  /** Dish row being edited (for restoring recipeId on cancel). */
  protected readonly editingDishAt_ = signal<{
    sectionIndex: number
    itemIndex: number
    previousRecipeId: string
  } | null>(null)

  protected readonly sectionCategories_ = this.menuSectionCategories.sectionCategories_

  /** Guest −/+ press-and-hold repeat (same timing as the shared counter). */

  private readonly unsaved_ = useUnsavedChanges({ form: () => this.form_, isSubmitted: () => this.isSubmitted })
  /** For pendingChangesGuard: prevents re-triggering after a successful save */
  isSubmitted = false

  private readonly translation = inject(TranslationService)
  protected readonly form_ = this.fb.group({
    name: [''],
    eventType: [''],
    eventDate: [new Date().toISOString().slice(0, 10)],
    servingType: ['plated_course' as ServingType, Validators.required],
    guestCount: [50, [Validators.required, Validators.min(0)]],
    money: createMoneyGroup(this.fb),
    sections: this.fb.array<FormGroup>([])
  })

  /** Inline-edit state for metadata fields */
  protected readonly editingField_ = signal<string | null>(null)

  /** Which dish rows have metadata expanded (key: "sectionIndex-itemIndex") */
  protected readonly expandedMetaKeys_ = signal<Set<string>>(new Set())

  /** Which dish field is in edit mode (key: "sectionIndex-itemIndex-fieldKey") */
  protected readonly editingDishField_ = signal<string | null>(null)
  /** Event type dropdown open; its query + highlight live in the shared search box. */
  protected readonly isEventTypeDropdownOpen_ = signal(false)
  /** Focus order for keyboard navigation */
  protected readonly FOCUS_ORDER = ['name', 'eventType', 'servingType', 'guestCount', 'eventDate'] as const

  /** Section controls for the @for: a fresh array on every form change so the OnPush view re-renders. */
  protected readonly sectionControls_ = computed(() => {
    this.formValueVersion_() // depend on form changes
    return [...this.sectionsArray.controls]
  })

  /** The event the live form describes (money fields included): what the engine and the pricing meter read. */
  protected readonly liveEvent_ = computed(() => {
    this.formValueVersion_() // depend on form changes
    return this.buildEventFromForm()
  })
  /** The whole `EventPlan` of the live form: cost, partial and missing items (plan 444). */
  protected readonly menuPlan_ = computed(() => this.eventPlan_.planFor(this.liveEvent_()))

  protected readonly menuTypeOptions_ = computed(() => this.metadataRegistry.allMenuTypes_().map((t) => t.key))

  protected readonly servingTypeOptions_ = computed(() =>
    this.menuTypeOptions_().map((key) => ({ value: key, label: key }))
  )

  protected readonly activeMenuTypeFields_ = computed((): DishFieldKey[] => {
    const key = this.form_.value.servingType
    if (!key) return [...DEFAULT_DISH_FIELDS]
    const fields = this.metadataRegistry.getMenuTypeFields(key)
    const all = fields.length > 0 ? fields : [...DEFAULT_DISH_FIELDS]
    return all.filter((f) => f !== 'sell_price')
  })

  constructor() {
    this.menuPortions_.bind(this.form_, this.formValueVersion_)
    this.form_.valueChanges
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formValueVersion_.update((v) => v + 1))

    const id = this.route.snapshot.paramMap.get('id')
    if (id) {
      this.editingId_.set(id)
      void this.loadEvent(id)
    } else {
      this.addSection()
      this.unsaved_.markSaved()
    }
  }

  ngOnInit(): void {
    this.menuAiFlow_.init({ menuForm: this.form_ })
    this.heroFab.setPageActions(
      [
        { labelKey: 'ai_menu_open', icon: 'sparkles', run: () => this.openAiMenuModal() },
        { labelKey: 'menu_toolbar_open', icon: 'printer', run: () => this.toggleExportSheet() },
        { labelKey: 'supplier_orders', icon: 'truck', run: () => this.openSupplierOrders() }
      ],
      'replace'
    )
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        if (!e.url.startsWith('/menu-intelligence')) {
          this.closeAllExportOverlays()
        }
      })
  }

  /** Close export toolbar and all sub-modals so state is clean when user navigates away. */
  private closeAllExportOverlays(): void {
    this.isExportSheetOpen_.set(false)
    this.supplierOrdersEvent_.set(null)
    this.prepSheets_.set(null)
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  ngOnDestroy(): void {
    this.closeAllExportOverlays()
    this.heroFab.clearPageActions()
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusField('name'), 0)
  }

  /** Focus a field by name; 'name' = menu name, then eventType, servingType, guestCount, eventDate, then 'section_0' */
  protected focusField(field: string): void {
    const el = document.getElementById(`menu-focus-${field}`)
    if (el && typeof (el as HTMLInputElement).focus === 'function') {
      ;(el as HTMLInputElement).focus()
    } else if (el) el.focus()
  }

  /** Tap steps by 1; holding repeats with the app's tiered hold steps (1…9, then 10s, 100s). */
  protected stepGuests(direction: 1 | -1, holdRepeat: number): void {
    const ctrl = this.form_.get('guestCount')
    const v = Number(ctrl?.value ?? 0)
    const opts = holdRepeat > 0 ? { continuousPress: true, holdRepeat } : { integerOnly: true }
    const next = direction === 1 ? quantityIncrement(v, 0, opts) : quantityDecrement(v, 0, opts)
    ctrl?.setValue(next)
  }

  protected getGuestCount(): number {
    return Number(this.form_.get('guestCount')?.value ?? 0)
  }

  protected onMetaKeydown(field: string, e: KeyboardEvent): void {
    if (field === 'eventType') {
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        this.openEventTypeDropdown()
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveFocus(field, -1)
        return
      }
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      this.moveFocus(field, 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveFocus(field, 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveFocus(field, -1)
    }
  }

  private moveFocus(currentField: string, direction: number): void {
    const order: string[] = [...this.FOCUS_ORDER]
    if (this.sectionsArray.length > 0) order.push('section_0')
    const idx = order.indexOf(currentField)
    if (idx < 0) return
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= order.length) return
    const next = order[nextIdx]
    if (next === 'section_0') {
      this.stopEditField()
      this.closeEventTypeDropdown()
      this.openSectionSearch(0)
      setTimeout(() => {
        document.getElementById('section-search-input')?.focus()
      }, 50)
      return
    }
    this.stopEditField()
    this.closeEventTypeDropdown()
    this.focusField(next)
  }

  /** Event types: from persisted registry + existing menus */
  protected readonly eventTypeOptions_ = computed(() => {
    const set = new Set<string>()
    this.menuEventTypeService.allEventTypes_().forEach((t) => set.add(t))
    this.menuEventData.allMenuEvents_().forEach((ev) => {
      if (ev.eventType) set.add(ev.eventType)
    })
    return Array.from(set)
  })

  /** On-screen text of an option key — the shared search boxes filter and match by it (rule 3). */
  protected readonly translateLabel_ = (key: string): string => this.translation.translate(key)

  protected openEventTypeDropdown(): void {
    this.isEventTypeDropdownOpen_.set(true)
    this.startEditField('event_type')
    setTimeout(() => document.getElementById('menu-focus-event_type_search')?.focus(), 50)
  }

  protected closeEventTypeDropdown(): void {
    this.isEventTypeDropdownOpen_.set(false)
  }

  /** Escape: close the list and give focus back to the chip. */
  protected onEventTypeEscape(): void {
    this.closeEventTypeDropdown()
    this.focusField('eventType')
  }

  /** Tab / Shift+Tab move to serving type / the event-type chip. */
  protected onEventTypeTab(e: KeyboardEvent): void {
    this.closeEventTypeDropdown()
    this.focusField(e.shiftKey ? 'eventType' : 'servingType')
  }

  protected selectEventType(value: string): void {
    this.form_.patchValue({ eventType: value })
    this.closeEventTypeDropdown()
    this.stopEditField()
    this.focusField('servingType')
  }

  /** Always opens the add window, prefilled with a typed new name (rule W). Selects the stored key, nothing on cancel. */
  protected async addNewEventType(typed: string): Promise<void> {
    const name = (
      (await this.addItemModal.open({
        title: 'add_new_event_type',
        label: 'menu_event_type',
        placeholder: 'menu_event_type',
        saveLabel: 'save',
        initialValue: typed
      })) ?? ''
    ).trim()
    if (!name) return
    const before = this.eventTypeOptions_()
    await this.menuEventTypeService.addEventType(name)
    const existing = before.find((t) => t === name || this.translation.translate(t) === name)
    const key =
      existing ?? resolveAddedKey(before, this.eventTypeOptions_(), name, (t) => this.translation.translate(t))
    if (!key) return
    if (!existing) notifyItemAdded(this.userMsg, (k) => this.translation.translate(k), name)
    this.form_.patchValue({ eventType: key })
    this.closeEventTypeDropdown()
    this.stopEditField()
    this.focusField('servingType')
  }

  /** For pendingChangesGuard — method name must match PendingChangesComponent interface */
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  /** For pendingChangesGuard — enables ternary modal with "Save & Leave" option */
  async saveAndWait(): Promise<boolean> {
    try {
      await this.persist_()
      this.isSubmitted = true
      return true
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('error_saving_menu'))
      return false
    }
  }

  protected get sectionsArray(): FormArray<FormGroup> {
    return this.form_.get('sections') as FormArray<FormGroup>
  }

  protected addSection(): void {
    this.sectionsArray.push(
      this.fb.group({
        _id: [crypto.randomUUID()],
        name: [''],
        sortOrder: [this.sectionsArray.length + 1],
        items: this.fb.array<FormGroup>([])
      })
    )
  }

  protected removeSection(index: number): void {
    const removed = this.sectionsArray.at(index)
    this.sectionsArray.removeAt(index)
    this.userMsg.onLineRemoved(
      this.translation.translate('line_removed'),
      () => this.sectionsArray.insert(Math.min(index, this.sectionsArray.length), removed),
      this.destroyRef
    )
  }

  protected getItemsArray(sectionIndex: number): FormArray<FormGroup> {
    return this.sectionsArray.at(sectionIndex).get('items') as FormArray<FormGroup>
  }

  protected addItem(sectionIndex: number): void {
    const items = this.getItemsArray(sectionIndex)
    const edit = this.editingDishAt_()
    let i = blankMenuItemIndex(items, edit?.sectionIndex === sectionIndex ? edit.itemIndex : -1)
    if (i < 0) {
      items.push(
        this.fb.group({
          recipeId: ['', Validators.required],
          recipeType: ['dish'],
          coefficient_override: [null as number | null],
          sell_price: [0],
          food_cost_money: [0],
          food_cost_pct: [0],
          serving_portions: [1],
          serving_portions_pct: [0]
        })
      )
      i = items.length - 1
      this.pickerSearch_.dish.setQuery(this.getDishMetaKey(sectionIndex, i), '')
    }
    this.focusDishSearchInput(sectionIndex, i)
  }

  protected removeItem(sectionIndex: number, itemIndex: number): void {
    const items = this.getItemsArray(sectionIndex)
    const removed = items.at(itemIndex)
    const section = this.sectionsArray.at(sectionIndex)
    items.removeAt(itemIndex)
    this.userMsg.onLineRemoved(
      this.translation.translate('line_removed'),
      () => {
        // The section may have been removed since; restore only into the same section.
        if (!this.sectionsArray.controls.includes(section)) return
        items.insert(Math.min(itemIndex, items.length), removed)
      },
      this.destroyRef
    )
  }

  protected isRecipeDish(recipe: Recipe): boolean {
    return recipe.recipeType === 'dish' || !!(recipe.prepItems?.length || recipe.prepCategories?.length)
  }

  private getAutoFoodCost(sectionIndex: number, itemIndex: number): number {
    const item = this.getItemsArray(sectionIndex).at(itemIndex)
    const recipeId = item?.get('recipeId')?.value as string | undefined
    if (!recipeId) return 0
    return roundMoney(
      this.eventPlan_.costFor(recipeId, this.menuPortions_.at(sectionIndex, itemIndex)?.portions ?? 0).cost
    )
  }

  protected getDishMetaKey(sectionIndex: number, itemIndex: number): string {
    return `${sectionIndex}-${itemIndex}`
  }

  protected isDishMetaExpanded(sectionIndex: number, itemIndex: number): boolean {
    return this.expandedMetaKeys_().has(this.getDishMetaKey(sectionIndex, itemIndex))
  }

  protected toggleDishMeta(sectionIndex: number, itemIndex: number): void {
    const key = this.getDishMetaKey(sectionIndex, itemIndex)
    this.expandedMetaKeys_.update((set) => {
      const next = new Set(set)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  protected getDishFieldEditKey(sectionIndex: number, itemIndex: number, fieldKey: string): string {
    return `${sectionIndex}-${itemIndex}-${fieldKey}`
  }

  protected isEditingDishField(sectionIndex: number, itemIndex: number, fieldKey: string): boolean {
    return this.editingDishField_() === this.getDishFieldEditKey(sectionIndex, itemIndex, fieldKey)
  }

  protected startEditDishField(sectionIndex: number, itemIndex: number, fieldKey: string): void {
    this.editingDishField_.set(this.getDishFieldEditKey(sectionIndex, itemIndex, fieldKey))
  }

  protected commitEditDishField(): void {
    this.editingDishField_.set(null)
  }

  protected onSellPriceKeydown(sectionIndex: number, itemIndex: number, e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault()
      const s = sectionIndex
      const i = itemIndex
      setTimeout(() => {
        if (e.shiftKey) {
          document.getElementById('dish-name-' + s + '-' + i)?.focus()
        } else {
          const nextSearch = document.getElementById('dish-search-' + s + '-' + (i + 1))
          const nextSell = document.getElementById('dish-sell-' + s + '-' + (i + 1))
          const addDish = document.getElementById('add-dish-' + s)
          ;(nextSearch ?? nextSell ?? addDish)?.focus()
        }
      }, 0)
      return
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const item = this.getItemsArray(sectionIndex).at(itemIndex)
    const ctrl = item.get('sell_price')
    const v = Number(ctrl?.value ?? 0)
    const next =
      e.key === 'ArrowUp'
        ? quantityIncrement(v, 0, { integerOnly: true })
        : quantityDecrement(v, 0, { integerOnly: true })
    ctrl?.setValue(next)
  }

  protected onDishFieldKeydown(sectionIndex: number, itemIndex: number, fieldKey: string, e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const item = this.getItemsArray(sectionIndex).at(itemIndex)
    const ctrl = item.get(fieldKey)
    if (!ctrl) return
    const v = Number(ctrl.value ?? 0)
    const isPortionField = fieldKey === 'serving_portions' || fieldKey === 'serving_portions_pct'
    const options = isPortionField ? { explicitStep: 0.25 } : { explicitStep: 0.01 }
    const next = e.key === 'ArrowUp' ? quantityIncrement(v, 0, options) : quantityDecrement(v, 0, options)
    ctrl.setValue(next)
  }

  protected getDishSearchQuery(sectionIndex: number, itemIndex: number): string {
    return this.pickerSearch_.dish.query(this.getDishMetaKey(sectionIndex, itemIndex))
  }

  protected onDishSearchQueryChange(sectionIndex: number, itemIndex: number, value: string): void {
    this.pickerSearch_.dish.onQueryChange(this.getDishMetaKey(sectionIndex, itemIndex), value)
    // Emptying the text while renaming keeps the row open for a fresh name; Escape / click-outside restore.
    this.activeDishSearch_.set(value.trim().length > 0 ? { sectionIndex, itemIndex } : null)
  }

  protected selectRecipe(sectionIndex: number, itemIndex: number, recipe: Recipe): void {
    const items = this.getItemsArray(sectionIndex)
    const group = items.at(itemIndex)
    const derivedPortions = this.menuPortions_.at(sectionIndex, itemIndex)?.portions ?? 0
    group.patchValue({
      recipeId: recipe._id,
      recipeType: this.isRecipeDish(recipe) ? 'dish' : 'preparation',
      food_cost_money: roundMoney(this.eventPlan_.costFor(recipe._id, derivedPortions).cost),
      serving_portions: 1
    })
    this.pickerSearch_.dish.setQuery(this.getDishMetaKey(sectionIndex, itemIndex), '')
    this.activeDishSearch_.set(null)
    const editing = this.editingDishAt_()
    if (editing && editing.sectionIndex === sectionIndex && editing.itemIndex === itemIndex) {
      this.editingDishAt_.set(null)
      return
    }
    this.addItem(sectionIndex)
  }

  /** Click on dish name: switch row to search and replace (select will replace, not add). */
  protected startEditDishName(sectionIndex: number, itemIndex: number): void {
    const group = this.getItemsArray(sectionIndex).at(itemIndex)
    const recipeId = group.get('recipeId')?.value as string | undefined
    if (!recipeId) return
    const currentName = this.recipes_().find((r) => r._id === recipeId)?.nameHebrew || ''
    this.editingDishAt_.set({ sectionIndex, itemIndex, previousRecipeId: recipeId })
    group.patchValue({ recipeId: '' })
    this.pickerSearch_.dish.onQueryChange(this.getDishMetaKey(sectionIndex, itemIndex), currentName)
    this.activeDishSearch_.set({ sectionIndex, itemIndex })
    this.focusDishSearchInput(sectionIndex, itemIndex)
  }

  /** Focus the dish search input for a given section/item (e.g. after add or select). */
  protected focusDishSearchInput(sectionIndex: number, itemIndex: number): void {
    setTimeout(() => {
      const el = document.getElementById(`dish-search-${sectionIndex}-${itemIndex}`) as HTMLInputElement | null
      el?.focus()
    }, 50)
  }

  /** Clear dish search query (closes dropdown); used by clickOutside and Escape. */
  protected clearDishSearch(sectionIndex: number, itemIndex: number): void {
    this.pickerSearch_.dish.setQuery(this.getDishMetaKey(sectionIndex, itemIndex), '')
    this.activeDishSearch_.set(null)
    const edit = this.editingDishAt_()
    if (edit && edit.sectionIndex === sectionIndex && edit.itemIndex === itemIndex && edit.previousRecipeId) {
      const group = this.getItemsArray(sectionIndex).at(itemIndex)
      group.patchValue({ recipeId: edit.previousRecipeId })
      this.editingDishAt_.set(null)
    }
  }

  /** Tab / Shift+Tab out of the dish search: restore a renamed dish, then move focus on. */
  protected focusAfterDishSearchTab(s: number, i: number, backwards: boolean): void {
    // Tabbing out of a rename without picking restores the old dish, same as click-outside.
    const edit = this.editingDishAt_()
    if (edit && edit.sectionIndex === s && edit.itemIndex === i) this.clearDishSearch(s, i)
    const hasRecipe = (this.getItemsArray(s).at(i)?.get('recipeId')?.value ?? '') !== ''
    setTimeout(() => {
      if (backwards) {
        const prev = document.getElementById('dish-search-' + s + '-' + (i - 1))
        const sectionTitle = document.getElementById('section-title-' + s)
        ;(prev ?? sectionTitle)?.focus()
      } else if (hasRecipe) {
        document.getElementById('dish-sell-' + s + '-' + i)?.focus()
      } else {
        const next = document.getElementById('dish-search-' + s + '-' + (i + 1))
        const addDish = document.getElementById('add-dish-' + s)
        ;(next ?? addDish)?.focus()
      }
    }, 0)
  }

  protected openSectionSearch(index: number): void {
    this.sectionSearchOpen_.set(index)
    setTimeout(() => document.getElementById('section-search-input')?.focus(), 0)
  }

  protected closeSectionSearch(): void {
    this.sectionSearchOpen_.set(null)
  }

  private findSectionCategoryKey(name: string): string | undefined {
    const n = name.trim().toLowerCase()
    return this.sectionCategories_().find(
      (key) => key.toLowerCase() === n || this.translation.translate(key).trim().toLowerCase() === n
    )
  }

  /** Tab / Shift+Tab out of the category search: back to the title, or on to the first dish. */
  protected onSectionSearchTab(sectionIndex: number, e: KeyboardEvent): void {
    this.closeSectionSearch()
    setTimeout(() => {
      if (e.shiftKey) {
        document.getElementById('section-title-' + sectionIndex)?.focus()
      } else {
        const firstDish = document.getElementById('dish-search-' + sectionIndex + '-0')
        const addDish = document.getElementById('add-dish-' + sectionIndex)
        ;(firstDish ?? addDish)?.focus()
      }
    }, 0)
  }

  protected selectSectionCategory(index: number, category: string): void {
    this.sectionsArray.at(index).get('name')?.setValue(category)
    this.closeSectionSearch()
  }

  /** Adding may resolve the name to an English key (or be cancelled) — select what was actually stored. */
  private async addAndSelectSectionCategory(index: number, name: string): Promise<void> {
    const before = new Set(this.sectionCategories_())
    const existed = this.findSectionCategoryKey(name)
    await this.menuSectionCategories.addCategory(name)
    const key = this.findSectionCategoryKey(name) ?? this.sectionCategories_().find((k) => !before.has(k))
    if (!key) return
    if (!existed) notifyItemAdded(this.userMsg, (k) => this.translation.translate(k), name)
    this.selectSectionCategory(index, key)
  }

  /** Always the add window, prefilled with a typed new name (rule W). */
  protected async openAddCategoryModal(sectionIndex: number, typed: string): Promise<void> {
    this.closeSectionSearch()
    const result = await this.addItemModal.open({
      title: 'add_new_category',
      label: 'menu_search_category',
      placeholder: 'menu_search_category',
      saveLabel: 'save',
      initialValue: typed
    })
    if (result?.trim()) await this.addAndSelectSectionCategory(sectionIndex, result.trim())
  }

  protected startEditField(field: string): void {
    this.editingField_.set(field)
  }

  protected stopEditField(): void {
    this.editingField_.set(null)
  }

  protected async save(): Promise<void> {
    pruneBlankMenuItems(this.sectionsArray)
    if (this.form_.invalid) {
      this.form_.markAllAsTouched()
      this.userMsg.onSetErrorMsg(missingMenuFieldsMessage(this.form_, this.translation))
      return
    }
    await this.saving.withSaving(async () => {
      await this.persist_()
      this.userMsg.onSetSuccessMsg(this.translation.translate('menu_saved'))
      this.router.navigate(['/menu-library'])
    })
  }

  /** Names an unnamed menu, creates or updates it, and marks the form saved (shared by save and saveAndWait). */
  private async persist_(): Promise<void> {
    if (!this.form_.value.name?.trim()) this.form_.patchValue({ name: this.generateDateName() })
    const id = this.editingId_()
    // Adds the pricing cache and keeps the stored logistics (the form has no logistics control).
    const event = this.menuEventSave_.prepareForSave(this.buildEventFromForm(), this.menuPlan_(), id)
    const now = Date.now()
    if (id) {
      await this.menuEventData.updateMenuEvent({ ...event, _id: id, updatedAt: now })
    } else {
      const created = await this.menuEventData.addMenuEvent({ ...event, createdAt: now, updatedAt: now })
      this.editingId_.set(created._id)
    }
    this.unsaved_.markSaved()
  }

  private generateDateName(): string {
    const today = new Date()
    const base = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
    const existing = this.menuEventData
      .allMenuEvents_()
      .map((e) => e.name)
      .filter((n) => n === base || n.startsWith(`${base} (`))
    if (!existing.includes(base)) return base
    let i = 1
    while (existing.includes(`${base} (${i})`)) i++
    return `${base} (${i})`
  }

  protected toggleExportSheet(): void {
    this.isExportSheetOpen_.update((v) => !v)
  }

  protected printMenu(): void {
    window.print()
  }

  private async loadEvent(id: string): Promise<void> {
    // Plan 477: an event the server does not show this user (hidden stage, removed, other business) is a 404.
    const event = await this.menuEventData.getMenuEventById(id).catch((err: unknown) => {
      if (!(err instanceof HttpErrorResponse && err.status === 404)) throw err
      this.userMsg.onSetErrorMsg(this.translation.translate('event_not_available'))
      void this.router.navigate(['/menu-library'])
      return null
    })
    if (!event) return
    this.menuPortions_.remember(event)
    this.form_.patchValue({
      name: event.name,
      eventType: event.eventType,
      eventDate: event.eventDate || '',
      servingType: event.servingType,
      guestCount: event.guestCount,
      money: moneyFormFromEvent(event)
    })

    this.sectionsArray.clear()
    event.sections.forEach((section) => {
      const sectionGroup = this.fb.group({
        _id: [section._id],
        name: [section.name, Validators.required],
        sortOrder: [section.sortOrder],
        items: this.fb.array<FormGroup>([])
      })
      const items = sectionGroup.get('items') as FormArray<FormGroup>
      section.items.forEach((item) => {
        items.push(
          this.fb.group({
            recipeId: [item.recipeId, Validators.required],
            recipeType: [item.recipeType],
            coefficient_override: [item.coefficientOverride ?? null],
            sell_price: [item.sellPrice ?? 0],
            food_cost_money: [item.foodCostOverride ?? 0],
            food_cost_pct: [0],
            serving_portions: [item.portionsPerDiner ?? item.servingPortions ?? 1],
            serving_portions_pct: [0]
          })
        )
      })
      this.sectionsArray.push(sectionGroup)
    })

    this.unsaved_.markSaved()
  }

  protected openAiMenuModal(): void {
    const hasContent = this.sectionsArray.length > 0
    if (hasContent) {
      this.aiMenuModal_.open('edit', this.buildAiMenuSnapshot_(), undefined, (patch) =>
        this.menuAiFlow_.applyPatch(patch)
      )
    } else {
      this.aiMenuModal_.open('create', undefined, (matched: MatchedMenu, resolutions) =>
        this.menuAiFlow_.applyMatchedMenu(matched, resolutions)
      )
    }
  }

  private buildAiMenuSnapshot_(): AiMenuDraft {
    const raw = this.form_.getRawValue()
    return {
      name: raw.name ?? '',
      eventType: raw.eventType ?? '',
      eventDate: raw.eventDate ?? null,
      servingType: raw.servingType ?? 'plated_course',
      guestCount: Number(raw.guestCount ?? 0),
      sections: (raw.sections ?? []).map(
        (sec: {
          name?: string
          items?: {
            recipeId?: string
            serving_portions?: number
            sell_price?: number
          }[]
        }) => ({
          category: sec.name ?? '',
          items: (sec.items ?? []).map((item) => ({
            nameHebrew: '',
            serving_portions: item.serving_portions ?? 1,
            sell_price: item.sell_price ?? 0
          }))
        })
      )
    }
  }

  private buildEventFromForm(): Omit<MenuEvent, '_id'> {
    const raw = this.form_.getRawValue()
    const servingType = raw.servingType as ServingType
    const guestCount = Number(raw.guestCount || 0)

    const sections: MenuSection[] = (raw.sections || []).map((section: MenuSectionFormRaw, sectionIndex: number) => ({
      _id: section._id ?? '',
      name: section.name ?? '',
      sortOrder: sectionIndex + 1,
      items: (section.items || []).flatMap((item: MenuItemForm, itemIndex: number) => {
        if (!item.recipeId) return []
        return {
          recipeId: item.recipeId,
          recipeType: item.recipeType,
          derivedPortions: 0,
          sellPrice: item.sell_price ?? undefined,
          foodCostOverride: this.getAutoFoodCost(sectionIndex, itemIndex) || undefined,
          portionsPerDiner: Number(item.serving_portions ?? 0),
          coefficientOverride: Number(item.coefficient_override) > 0 ? Number(item.coefficient_override) : undefined
        }
      })
    }))

    return this.menuIntelligence.hydrateDerivedPortions({
      _id: '',
      name: raw.name || 'Untitled Event',
      eventType: raw.eventType || '',
      eventDate: raw.eventDate || '',
      servingType: servingType,
      guestCount: guestCount,
      ...this.menuPortions_.snapshots(raw.eventType || '', servingType),
      sections: sections,
      ...moneyFieldsFromForm(raw.money),
      performanceTags: {
        foodCostPct: 0,
        primaryServingStyle: servingType
      }
    })
  }

  /** Build current menu event for export (includes _id). */
  private getCurrentMenuForExport(): MenuEvent {
    const built = this.buildEventFromForm()
    return { ...built, _id: this.editingId_() ?? '' }
  }

  protected openSupplierOrders(): void {
    this.supplierOrdersEvent_.set(this.getCurrentMenuForExport())
  }

  protected onViewAll(): void {
    const menu = this.getCurrentMenuForExport()
    this.exportPreviewPayload_.set(this.exportService.getMenuAllViewPreviewPayload(menu, this.recipes_()))
    this.exportPreviewType_ = 'menu-all'
  }

  protected onViewMenuInfo(): void {
    const menu = this.getCurrentMenuForExport()
    this.exportPreviewPayload_.set(this.exportService.getMenuInfoPreviewPayload(menu, this.recipes_()))
    this.exportPreviewType_ = 'menu-info'
  }

  protected async onExportMenuInfo(): Promise<void> {
    const menu = this.getCurrentMenuForExport()
    await this.exportService.exportMenuInfo(menu, this.recipes_())
  }

  protected onViewMenuShoppingList(): void {
    const menu = this.getCurrentMenuForExport()
    this.exportPreviewPayload_.set(
      this.exportService.getMenuShoppingListPreviewPayload(menu, this.recipes_(), this.products_())
    )
    this.exportPreviewType_ = 'menu-shopping-list'
  }

  protected async onExportMenuShoppingList(): Promise<void> {
    const menu = this.getCurrentMenuForExport()
    await this.exportService.exportMenuShoppingList(menu, this.recipes_(), this.products_())
  }

  protected onExportFromPreview(): void {
    const type = this.exportPreviewType_
    if (!type) return
    const menu = this.getCurrentMenuForExport()
    if (type === 'menu-info') this.exportService.exportMenuInfo(menu, this.recipes_())
    else if (type === 'menu-shopping-list')
      this.exportService.exportMenuShoppingList(menu, this.recipes_(), this.products_())
    else if (type === 'menu-all')
      this.exportService.exportAllTogetherMenu(menu, this.recipes_(), this.products_(), 'by_category')
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  protected onPrintFromPreview(): void {
    window.print()
  }

  protected onCloseExportPreview(): void {
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  protected onViewChecklist(mode: PrepSheetsMode): void {
    this.prepSheets_.set({ event: this.getCurrentMenuForExport(), mode })
  }

  protected async onExportChecklist(mode: 'by_dish' | 'by_category' | 'by_station'): Promise<void> {
    const menu = this.getCurrentMenuForExport()
    await this.exportService.exportChecklist(menu, this.recipes_(), mode)
  }

  protected async onExportAllTogether(): Promise<void> {
    const menu = this.getCurrentMenuForExport()
    await this.exportService.exportAllTogetherMenu(menu, this.recipes_(), this.products_(), 'by_category')
  }
}
