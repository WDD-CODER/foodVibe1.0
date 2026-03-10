import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { startWith } from 'rxjs';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MenuEventDataService } from '@services/menu-event-data.service';
import { MenuIntelligenceService } from '@services/menu-intelligence.service';
import { UserMsgService } from '@services/user-msg.service';
import { AddItemModalService } from '@services/add-item-modal.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { MenuSectionCategoriesService } from '@services/menu-section-categories.service';
import { MenuEvent, MenuSection, ServingType, DEFAULT_DISH_FIELDS, ALL_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model';
import { Recipe } from '@models/recipe.model';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { RecipeCostService } from '@services/recipe-cost.service';
import { ExportService } from '@services/export.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { quantityIncrement, quantityDecrement } from 'src/app/core/utils/quantity-step.util';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';
import type { ExportPayload } from 'src/app/core/utils/export.util';
import { ExportPreviewComponent } from 'src/app/shared/export-preview/export-preview.component';
import { ExportToolbarOverlayComponent } from 'src/app/shared/export-toolbar-overlay/export-toolbar-overlay.component';
import { HeroFabService } from '@services/hero-fab.service';

type MenuItemForm = {
  recipe_id_: string;
  recipe_type_: 'dish' | 'preparation';
  predicted_take_rate_: number;
  sell_price?: number;
  food_cost_money?: number;
  food_cost_pct?: number;
  serving_portions?: number;
  serving_portions_pct?: number;
};

/** Raw section shape from form getRawValue() before mapping to MenuSection. */
type MenuSectionFormRaw = { _id?: string; name_?: string; items_?: MenuItemForm[] };

@Component({
  selector: 'app-menu-intelligence-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, ClickOutSideDirective, SelectOnFocusDirective, ScrollableDropdownComponent, CustomSelectComponent, ExportPreviewComponent, ExportToolbarOverlayComponent],
  templateUrl: './menu-intelligence.page.html',
  styleUrl: './menu-intelligence.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuIntelligencePage implements AfterViewInit, OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly menuEventData = inject(MenuEventDataService);
  private readonly menuIntelligence = inject(MenuIntelligenceService);
  private readonly userMsg = inject(UserMsgService);
  private readonly addItemModal = inject(AddItemModalService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  private readonly menuSectionCategories = inject(MenuSectionCategoriesService);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly exportService = inject(ExportService);
  private readonly heroFab = inject(HeroFabService);
  private readonly destroyRef = inject(DestroyRef);

  /** Bumped when form value changes so footer computeds re-run (form is not a signal). */
  private readonly formValueVersion_ = signal(0);

  protected readonly editingId_ = signal<string | null>(null);
  protected readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS;
  protected readonly recipes_ = this.kitchenState.recipes_;
  protected readonly products_ = this.kitchenState.products_;
  protected readonly isSaving_ = signal(false);
  protected readonly showExport_ = signal(false);
  protected readonly toolbarOpen_ = signal(false);
  protected readonly menuFabExpanded_ = signal(false);
  /** Export preview (View before export). */
  protected readonly exportPreviewPayload_ = signal<ExportPayload | null>(null);
  private exportPreviewType_: 'menu-info' | 'menu-shopping-list' | 'menu-checklist' | null = null;
  private exportChecklistMode_: 'by_dish' | 'by_category' | 'by_station' | null = null;

  /** Per-section dish search query signals keyed by section index */
  protected readonly dishSearchQueries_ = signal<Record<number, string>>({});
  /** Per-section header search query signals */
  protected readonly sectionSearchQueries_ = signal<Record<number, string>>({});
  protected readonly sectionSearchOpen_ = signal<number | null>(null);
  /** Currently active dish search (for keyboard nav); null when none focused/has query. */
  protected readonly activeDishSearch_ = signal<{ sectionIndex: number; itemIndex: number } | null>(null);
  /** Dish row being edited (for restoring recipe_id_ on cancel). */
  protected readonly editingDishAt_ = signal<{ sectionIndex: number; itemIndex: number; previousRecipeId: string } | null>(null);

  /** Highlighted index for keyboard nav in dropdowns (-1 = none). */
  protected readonly eventTypeHighlightedIndex_ = signal(0);
  protected readonly sectionCategoryHighlightedIndex_ = signal<Record<number, number>>({});
  protected readonly dishSearchHighlightedIndex_ = signal<Record<string, number>>({});

  protected readonly sectionCategories_ = this.menuSectionCategories.sectionCategories_;

  /** Track saved snapshot for dirty detection */
  private savedSnapshot_ = '';

  protected readonly form_ = this.fb.group({
    name_: [''],
    event_type_: ['', Validators.required],
    event_date_: [new Date().toISOString().slice(0, 10)],
    serving_type_: ['plated_course' as ServingType, Validators.required],
    guest_count_: [50, [Validators.required, Validators.min(0)]],
    sections_: this.fb.array<FormGroup>([]),
  });

  /** Inline-edit state for metadata fields */
  protected readonly editingField_ = signal<string | null>(null);

  /** Which dish rows have metadata expanded (key: "sectionIndex-itemIndex") */
  protected readonly expandedMetaKeys_ = signal<Set<string>>(new Set());

  /** Which dish field is in edit mode (key: "sectionIndex-itemIndex-fieldKey") */
  protected readonly editingDishField_ = signal<string | null>(null);

  /** Event type dropdown open + search query for filtering */
  protected readonly eventTypeDropdownOpen_ = signal(false);
  protected readonly eventTypeSearch_ = signal('');

  /** Focus order for keyboard navigation */
  protected readonly FOCUS_ORDER = ['name_', 'event_type_', 'serving_type_', 'guest_count_', 'event_date_'] as const;

  protected readonly eventCost_ = computed(() => {
    this.formValueVersion_(); // depend on form changes
    const event = this.buildEventFromForm();
    return this.menuIntelligence.computeEventIngredientCost(event);
  });

  protected readonly foodCostPct_ = computed(() => {
    this.formValueVersion_(); // depend on form changes
    const revenue = this.totalRevenue_();
    const cost = this.eventCost_();
    if (revenue <= 0) return 0;
    return (cost / revenue) * 100;
  });

  protected readonly totalRevenue_ = computed(() => {
    this.formValueVersion_(); // depend on form changes
    const guestCount = Number(this.form_.get('guest_count_')?.value ?? 0);
    let total = 0;
    const sections = this.sectionsArray;
    for (let si = 0; si < sections.length; si++) {
      const items = this.getItemsArray(si);
      for (let ii = 0; ii < items.length; ii++) {
        const item = items.at(ii);
        const price = Number(item.get('sell_price')?.value ?? 0);
        const sp = Number(item.get('serving_portions')?.value ?? 1);
        total += price * sp * guestCount;
      }
    }
    return total;
  });

  protected readonly costPerGuest_ = computed(() => {
    this.formValueVersion_(); // depend on form changes
    const guestCount = this.getGuestCount();
    if (guestCount <= 0) return 0;
    return this.eventCost_() / guestCount;
  });

  protected readonly menuTypeOptions_ = computed(() =>
    this.metadataRegistry.allMenuTypes_().map(t => t.key)
  );

  protected readonly servingTypeOptions_ = computed(() =>
    this.menuTypeOptions_().map(key => ({ value: key, label: key }))
  );

  protected readonly activeMenuTypeFields_ = computed((): DishFieldKey[] => {
    const key = this.form_.value.serving_type_;
    if (!key) return [...DEFAULT_DISH_FIELDS];
    const fields = this.metadataRegistry.getMenuTypeFields(key);
    const all = fields.length > 0 ? fields : [...DEFAULT_DISH_FIELDS];
    return all.filter(f => f !== 'sell_price');
  });

  constructor() {
    this.form_.valueChanges
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formValueVersion_.update(v => v + 1));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId_.set(id);
      void this.loadEvent(id);
    } else {
      this.addSection();
      this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
    }
  }

  ngOnInit(): void {
    this.heroFab.setPageActions(
      [{ labelKey: 'menu_toolbar_open', icon: 'file-down', run: () => this.openToolbar() }],
      'append'
    );
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusField('name_'), 0);
  }

  /** Focus a field by name; 'name_' = menu name, then event_type_, serving_type_, guest_count_, event_date_, then 'section_0' */
  protected focusField(field: string): void {
    const el = document.getElementById(`menu-focus-${field}`);
    if (el && typeof (el as HTMLInputElement).focus === 'function') {
      (el as HTMLInputElement).focus();
      if (field === 'event_date_' && typeof (el as HTMLInputElement).showPicker === 'function') {
        (el as HTMLInputElement).showPicker();
      }
    } else if (el) el.focus();
  }

  /** Open date picker and focus the date input (called from clickable date label). */
  protected openDatePicker(): void {
    this.dateDigitBuffer_.set('');
    this.focusField('event_date_');
  }

  /** Format event_date_ for display (DD/MM/YYYY or placeholder). */
  protected getEventDateDisplay(): string {
    const raw = this.form_.get('event_date_')?.value as string | undefined;
    if (!raw) return '';
    const d = new Date(raw + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return raw;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private dateDigitBuffer_ = signal('');

  /** Handle digit-only input for date: first 2 = day, next 2 = month, then 4 = year. */
  protected onDateKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      this.onMetaKeydown('event_date_', e);
      return;
    }
    if (e.key.length === 1 && /\d/.test(e.key)) {
      const buf = this.dateDigitBuffer_().slice(0, 8) + e.key;
      if (buf.length <= 8) {
        e.preventDefault();
        this.dateDigitBuffer_.set(buf);
        if (buf.length === 8) {
          const dStr = buf.slice(0, 2);
          const mStr = buf.slice(2, 4);
          const yStr = buf.slice(4, 8);
          const dNum = Math.min(31, Math.max(1, parseInt(dStr, 10) || 1));
          const mNum = Math.min(12, Math.max(1, parseInt(mStr, 10) || 1));
          const yNum = Math.max(1900, Math.min(2100, parseInt(yStr, 10) || new Date().getFullYear()));
          const iso = `${yNum}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
          this.form_.patchValue({ event_date_: iso });
          this.dateDigitBuffer_.set('');
        }
      }
    } else if (e.key === 'Backspace') {
      const current = this.dateDigitBuffer_();
      if (current.length > 0) {
        e.preventDefault();
        this.dateDigitBuffer_.set(current.slice(0, -1));
      }
    }
  }

  protected incrementGuests(): void {
    const ctrl = this.form_.get('guest_count_');
    const v = Number(ctrl?.value ?? 0);
    ctrl?.setValue(quantityIncrement(v, 0, { integerOnly: true }));
  }

  protected decrementGuests(): void {
    const ctrl = this.form_.get('guest_count_');
    const v = Number(ctrl?.value ?? 0);
    ctrl?.setValue(quantityDecrement(v, 0, { integerOnly: true }));
  }

  protected getGuestCount(): number {
    return Number(this.form_.get('guest_count_')?.value ?? 0);
  }

  protected onMetaKeydown(field: string, e: KeyboardEvent): void {
    if (field === 'event_type_') {
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.openEventTypeDropdown();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveFocus(field, -1);
        return;
      }
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      this.moveFocus(field, 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.moveFocus(field, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.moveFocus(field, -1);
    }
  }

  private moveFocus(currentField: string, direction: number): void {
    const order: string[] = [...this.FOCUS_ORDER];
    if (this.sectionsArray.length > 0) order.push('section_0');
    const idx = order.indexOf(currentField);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= order.length) return;
    const next = order[nextIdx];
    if (next === 'section_0') {
      this.stopEditField();
      this.closeEventTypeDropdown();
      this.openSectionSearch(0);
      setTimeout(() => {
        const input = document.querySelector('.section-search-input') as HTMLInputElement;
        input?.focus();
      }, 50);
      return;
    }
    this.stopEditField();
    this.closeEventTypeDropdown();
    this.focusField(next);
  }

  protected goBack(): void {
    this.router.navigate(['/menu-library']);
  }

  /** Event types: from existing menus + allow add new via AddItemModal */
  protected readonly eventTypeOptions_ = computed(() => {
    const set = new Set<string>();
    this.menuEventData.allMenuEvents_().forEach(ev => { if (ev.event_type_) set.add(ev.event_type_); });
    return Array.from(set);
  });

  protected getFilteredEventTypes(): string[] {
    const q = this.eventTypeSearch_().trim().toLowerCase();
    const list = this.eventTypeOptions_();
    if (!q) return list;
    return list.filter(t => t.toLowerCase().includes(q));
  }

  protected openEventTypeDropdown(): void {
    this.eventTypeDropdownOpen_.set(true);
    this.eventTypeSearch_.set('');
    this.eventTypeHighlightedIndex_.set(0);
    this.startEditField('event_type');
    setTimeout(() => document.getElementById('menu-focus-event_type_search')?.focus(), 50);
  }

  protected closeEventTypeDropdown(): void {
    this.eventTypeDropdownOpen_.set(false);
    this.eventTypeSearch_.set('');
    this.eventTypeHighlightedIndex_.set(-1);
  }

  protected onEventTypeSearchKeydown(e: KeyboardEvent): void {
    const list = this.getFilteredEventTypes();
    const addNewIndex = list.length;
    const maxIndex = addNewIndex; // last option is "add new"
    let idx = this.eventTypeHighlightedIndex_();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.min(idx + 1, maxIndex);
      this.eventTypeHighlightedIndex_.set(idx);
      this.scrollDropdownHighlightIntoView('.event-type-dropdown');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.max(0, idx - 1);
      this.eventTypeHighlightedIndex_.set(idx);
      this.scrollDropdownHighlightIntoView('.event-type-dropdown');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (idx >= 0 && idx < list.length) {
        this.selectEventType(list[idx]);
      } else if (idx === addNewIndex) {
        void this.addNewEventType();
      } else {
        this.focusField('serving_type_');
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeEventTypeDropdown();
      this.focusField('event_type_');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.closeEventTypeDropdown();
      this.focusField('serving_type_');
    }
  }

  private scrollDropdownHighlightIntoView(containerClass: string): void {
    setTimeout(() => {
      const el = document.querySelector(`${containerClass} .dropdown-item.highlighted`);
      el?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(e: KeyboardEvent): void {
    const key = e.key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter') return;
    const el = e.target as Element;

    if (el.closest('.event-type-dropdown') && this.eventTypeDropdownOpen_()) {
      e.preventDefault();
      e.stopPropagation();
      this.onEventTypeSearchKeydown(e);
      return;
    }
    const sectionOpen = this.sectionSearchOpen_();
    if (el.closest('.section-search-wrap') && sectionOpen !== null) {
      e.preventDefault();
      e.stopPropagation();
      this.onSectionSearchKeydown(sectionOpen, e);
      return;
    }
    const activeDish = this.activeDishSearch_();
    if (el.closest('.dish-search-wrap') && activeDish !== null) {
      e.preventDefault();
      e.stopPropagation();
      this.onDishSearchKeydown(activeDish.sectionIndex, activeDish.itemIndex, e);
    }
  }

  protected selectEventType(value: string): void {
    this.form_.patchValue({ event_type_: value });
    this.closeEventTypeDropdown();
    this.stopEditField();
    this.focusField('serving_type_');
  }

  protected async addNewEventType(): Promise<void> {
    const result = await this.addItemModal.open({
      title: 'add_new_category',
      label: 'menu_event_type',
      placeholder: 'menu_event_type',
      saveLabel: 'save',
    });
    if (result?.trim()) {
      this.form_.patchValue({ event_type_: result.trim() });
      this.closeEventTypeDropdown();
      this.stopEditField();
      this.focusField('serving_type_');
    }
  }

  /** For pendingChangesGuard */
  hasUnsavedEdits(): boolean {
    return JSON.stringify(this.form_.getRawValue()) !== this.savedSnapshot_;
  }

  protected get sectionsArray(): FormArray<FormGroup> {
    return this.form_.get('sections_') as FormArray<FormGroup>;
  }

  protected addSection(): void {
    this.sectionsArray.push(
      this.fb.group({
        _id: [crypto.randomUUID()],
        name_: [''],
        sort_order_: [this.sectionsArray.length + 1],
        items_: this.fb.array<FormGroup>([]),
      })
    );
  }

  protected removeSection(index: number): void {
    this.sectionsArray.removeAt(index);
  }

  protected getItemsArray(sectionIndex: number): FormArray<FormGroup> {
    return this.sectionsArray.at(sectionIndex).get('items_') as FormArray<FormGroup>;
  }

  protected addItem(sectionIndex: number): void {
    const items = this.getItemsArray(sectionIndex);
    items.push(
      this.fb.group({
        recipe_id_: ['', Validators.required],
        recipe_type_: ['dish'],
        predicted_take_rate_: [0.4, [Validators.required, Validators.min(0), Validators.max(1)]],
        sell_price: [0],
        food_cost_money: [0],
        food_cost_pct: [0],
        serving_portions: [1],
        serving_portions_pct: [0],
      })
    );
    const newItemIndex = items.length - 1;
    this.setDishSearchQuery(sectionIndex, newItemIndex, '');
    this.focusDishSearchInput(sectionIndex, newItemIndex);
  }

  protected getDishFieldLabelKey(fieldKey: DishFieldKey): string {
    return ALL_DISH_FIELDS.find(f => f.key === fieldKey)?.labelKey ?? fieldKey;
  }

  /** Food cost is calculated from serving portions; not user-editable. */
  protected isDishFieldReadOnly(fieldKey: DishFieldKey): boolean {
    return fieldKey === 'food_cost_money';
  }

  protected getAutoFoodCost(sectionIndex: number, itemIndex: number): number {
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const recipeId = item?.get('recipe_id_')?.value;
    if (!recipeId) return 0;
    const recipe = this.recipes_().find(r => r._id === recipeId);
    if (!recipe) return 0;
    const derivedPortions = this.menuIntelligence.derivePortions(
      this.form_.value.serving_type_ as ServingType,
      this.getGuestCount(),
      Number(item.get('predicted_take_rate_')?.value ?? 0),
      Number((this.form_.value as { pieces_per_person_?: number }).pieces_per_person_ ?? 1),
      Number(item.get('serving_portions')?.value ?? 1)
    );
    const baseYield = Math.max(1, recipe.yield_amount_ || 1);
    const multiplier = derivedPortions / baseYield;
    const scaledCost = this.recipeCostService.computeRecipeCost({
      ...recipe,
      ingredients_: recipe.ingredients_.map(ing => ({
        ...ing,
        amount_: (ing.amount_ || 0) * multiplier,
      })),
    });
    return Math.round(scaledCost * 100) / 100;
  }

  /** Food cost per portion (total auto food cost ÷ serving portions). Read-only in dish-data. */
  protected getFoodCostPerPortion(sectionIndex: number, itemIndex: number): number {
    const total = this.getAutoFoodCost(sectionIndex, itemIndex);
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const portions = Math.max(1, Number(item?.get('serving_portions')?.value ?? 1));
    return Math.round((total / portions) * 100) / 100;
  }

  protected removeItem(sectionIndex: number, itemIndex: number): void {
    this.getItemsArray(sectionIndex).removeAt(itemIndex);
  }

  protected getRecipeName(recipeId: string): string {
    return this.recipes_().find(r => r._id === recipeId)?.name_hebrew || '';
  }

  protected isRecipeDish(recipe: Recipe): boolean {
    return recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.mise_categories_?.length);
  }

  protected getDerivedPortions(item: MenuItemForm): number {
    return this.menuIntelligence.derivePortions(
      this.form_.value.serving_type_ as ServingType,
      Number(this.form_.value.guest_count_ || 0),
      Number(item.predicted_take_rate_ || 0),
      Number((this.form_.value as { pieces_per_person_?: number }).pieces_per_person_ ?? 1),
      Number(item.serving_portions ?? 1)
    );
  }

  protected getDishSearchKey(sectionIndex: number, itemIndex: number): string {
    return `${sectionIndex}-${itemIndex}`;
  }

  protected getDishMetaKey(sectionIndex: number, itemIndex: number): string {
    return `${sectionIndex}-${itemIndex}`;
  }

  protected isDishMetaExpanded(sectionIndex: number, itemIndex: number): boolean {
    return this.expandedMetaKeys_().has(this.getDishMetaKey(sectionIndex, itemIndex));
  }

  protected toggleDishMeta(sectionIndex: number, itemIndex: number): void {
    const key = this.getDishMetaKey(sectionIndex, itemIndex);
    this.expandedMetaKeys_.update(set => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected getDishFieldEditKey(sectionIndex: number, itemIndex: number, fieldKey: string): string {
    return `${sectionIndex}-${itemIndex}-${fieldKey}`;
  }

  protected isEditingDishField(sectionIndex: number, itemIndex: number, fieldKey: string): boolean {
    return this.editingDishField_() === this.getDishFieldEditKey(sectionIndex, itemIndex, fieldKey);
  }

  protected startEditDishField(sectionIndex: number, itemIndex: number, fieldKey: string): void {
    this.editingDishField_.set(this.getDishFieldEditKey(sectionIndex, itemIndex, fieldKey));
  }

  protected commitEditDishField(): void {
    this.editingDishField_.set(null);
  }

  protected onSellPriceKeydown(sectionIndex: number, itemIndex: number, e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const ctrl = item.get('sell_price');
    const v = Number(ctrl?.value ?? 0);
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(v, 0, { integerOnly: true })
      : quantityDecrement(v, 0, { integerOnly: true });
    ctrl?.setValue(next);
  }

  protected onDishFieldKeydown(sectionIndex: number, itemIndex: number, fieldKey: string, e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const ctrl = item.get(fieldKey);
    if (!ctrl) return;
    const v = Number(ctrl.value ?? 0);
    const isPortionField = fieldKey === 'serving_portions' || fieldKey === 'serving_portions_pct';
    const options = isPortionField ? { explicitStep: 0.25 } : { explicitStep: 0.01 };
    const next = e.key === 'ArrowUp'
      ? quantityIncrement(v, 0, options)
      : quantityDecrement(v, 0, options);
    ctrl.setValue(next);
  }

  /** Width for inline dish-field input (ch units, min 4ch). */
  protected getInputWidth(value: unknown): string {
    const len = String(value ?? '').length;
    return `${Math.max(4, len + 2)}ch`;
  }

  protected getDishSearchQuery(sectionIndex: number, itemIndex: number): string {
    const key = this.getDishSearchKey(sectionIndex, itemIndex);
    const queries: Record<string, string> = this.dishSearchQueries_();
    return queries[key] ?? '';
  }

  protected setDishSearchQuery(sectionIndex: number, itemIndex: number, value: string): void {
    this.dishSearchQueries_.update(q => ({
      ...q,
      [this.getDishSearchKey(sectionIndex, itemIndex)]: value,
    }));
  }

  protected onDishSearchQueryChange(sectionIndex: number, itemIndex: number, value: string): void {
    this.setDishSearchQuery(sectionIndex, itemIndex, value);
    const key = this.getDishSearchHighlightKey(sectionIndex, itemIndex);
    this.dishSearchHighlightedIndex_.update(m => ({ ...m, [key]: 0 }));
    if (value.trim().length > 0) {
      this.activeDishSearch_.set({ sectionIndex, itemIndex });
    } else {
      this.activeDishSearch_.set(null);
      const edit = this.editingDishAt_();
      if (edit && edit.sectionIndex === sectionIndex && edit.itemIndex === itemIndex && edit.previousRecipeId) {
        this.getItemsArray(sectionIndex).at(itemIndex).patchValue({ recipe_id_: edit.previousRecipeId });
        this.editingDishAt_.set(null);
      }
    }
  }

  protected getFilteredRecipes(sectionIndex: number, itemIndex: number): Recipe[] {
    const query = this.getDishSearchQuery(sectionIndex, itemIndex).trim().toLowerCase();
    if (!query) return [];
    return this.recipes_().filter(r =>
      (r.name_hebrew ?? '').toLowerCase().includes(query)
    ).slice(0, 12);
  }

  protected selectRecipe(sectionIndex: number, itemIndex: number, recipe: Recipe): void {
    const items = this.getItemsArray(sectionIndex);
    const group = items.at(itemIndex);
    const derivedPortions = this.menuIntelligence.derivePortions(
      this.form_.value.serving_type_ as ServingType,
      Number(this.form_.value.guest_count_ || 0),
      Number(group.get('predicted_take_rate_')?.value ?? 0.4),
      Number((this.form_.value as { pieces_per_person_?: number }).pieces_per_person_ ?? 1),
      Number(group.get('serving_portions')?.value ?? 1)
    );
    const baseYield = Math.max(1, recipe.yield_amount_ || 1);
    const multiplier = derivedPortions / baseYield;
    const autoCost = this.recipeCostService.computeRecipeCost({
      ...recipe,
      ingredients_: recipe.ingredients_.map(ing => ({
        ...ing,
        amount_: (ing.amount_ || 0) * multiplier,
      })),
    });
    group.patchValue({
      recipe_id_: recipe._id,
      recipe_type_: this.isRecipeDish(recipe) ? 'dish' : 'preparation',
      food_cost_money: Math.round(autoCost * 100) / 100,
      serving_portions: 1,
    });
    this.setDishSearchQuery(sectionIndex, itemIndex, '');
    this.activeDishSearch_.set(null);
    const editing = this.editingDishAt_();
    if (editing && editing.sectionIndex === sectionIndex && editing.itemIndex === itemIndex) {
      this.editingDishAt_.set(null);
      return;
    }
    this.addItem(sectionIndex);
  }

  /** Click on dish name: switch row to search and replace (select will replace, not add). */
  protected startEditDishName(sectionIndex: number, itemIndex: number): void {
    const group = this.getItemsArray(sectionIndex).at(itemIndex);
    const recipeId = group.get('recipe_id_')?.value as string | undefined;
    if (!recipeId) return;
    const currentName = this.getRecipeName(recipeId);
    this.editingDishAt_.set({ sectionIndex, itemIndex, previousRecipeId: recipeId });
    group.patchValue({ recipe_id_: '' });
    this.setDishSearchQuery(sectionIndex, itemIndex, currentName);
    this.activeDishSearch_.set({ sectionIndex, itemIndex });
    this.dishSearchHighlightedIndex_.update(m => ({
      ...m,
      [this.getDishSearchHighlightKey(sectionIndex, itemIndex)]: 0,
    }));
    this.focusDishSearchInput(sectionIndex, itemIndex);
  }

  /** Focus the dish search input for a given section/item (e.g. after add or select). */
  protected focusDishSearchInput(sectionIndex: number, itemIndex: number): void {
    setTimeout(() => {
      const el = document.getElementById(`dish-search-${sectionIndex}-${itemIndex}`) as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }

  /** Clear dish search query (closes dropdown); used by clickOutside and Escape. */
  protected clearDishSearch(sectionIndex: number, itemIndex: number): void {
    this.setDishSearchQuery(sectionIndex, itemIndex, '');
    this.activeDishSearch_.set(null);
    const edit = this.editingDishAt_();
    if (edit && edit.sectionIndex === sectionIndex && edit.itemIndex === itemIndex && edit.previousRecipeId) {
      const group = this.getItemsArray(sectionIndex).at(itemIndex);
      group.patchValue({ recipe_id_: edit.previousRecipeId });
      this.editingDishAt_.set(null);
    }
  }

  /** Enter in dish search: select first recipe if any, else keep focus. */
  protected getDishSearchHighlightKey(sectionIndex: number, itemIndex: number): string {
    return `${sectionIndex}-${itemIndex}`;
  }

  protected getDishSearchHighlightedIndex(sectionIndex: number, itemIndex: number): number {
    return this.dishSearchHighlightedIndex_()[this.getDishSearchHighlightKey(sectionIndex, itemIndex)] ?? 0;
  }

  protected onDishSearchKeydown(sectionIndex: number, itemIndex: number, e: Event): void {
    const ke = e as KeyboardEvent;
    const recipes = this.getFilteredRecipes(sectionIndex, itemIndex);
    const key = this.getDishSearchHighlightKey(sectionIndex, itemIndex);
    let idx = this.getDishSearchHighlightedIndex(sectionIndex, itemIndex);
    const maxIndex = Math.max(0, recipes.length - 1);

    if (ke.key === 'ArrowDown') {
      ke.preventDefault();
      ke.stopPropagation();
      idx = recipes.length ? Math.min(idx + 1, maxIndex) : 0;
      this.dishSearchHighlightedIndex_.update(m => ({ ...m, [key]: idx }));
      this.scrollDropdownHighlightIntoView('.dish-search-wrap');
      return;
    }
    if (ke.key === 'ArrowUp') {
      ke.preventDefault();
      ke.stopPropagation();
      idx = Math.max(0, idx - 1);
      this.dishSearchHighlightedIndex_.update(m => ({ ...m, [key]: idx }));
      this.scrollDropdownHighlightIntoView('.dish-search-wrap');
      return;
    }
    if (ke.key === 'Enter') {
      if (recipes.length > 0) {
        ke.preventDefault();
        ke.stopPropagation();
        const i = Math.min(idx, recipes.length - 1);
        this.selectRecipe(sectionIndex, itemIndex, recipes[i]);
      }
      return;
    }
    if (ke.key === 'Escape') {
      ke.preventDefault();
      ke.stopPropagation();
      this.clearDishSearch(sectionIndex, itemIndex);
    }
  }

  protected openSectionSearch(index: number): void {
    this.sectionSearchOpen_.set(index);
    this.sectionSearchQueries_.update(q => ({ ...q, [index]: '' }));
    this.sectionCategoryHighlightedIndex_.update(m => ({ ...m, [index]: 0 }));
  }

  protected closeSectionSearch(): void {
    this.sectionSearchOpen_.set(null);
  }

  protected getSectionCategoryHighlightedIndex(sectionIndex: number): number {
    return this.sectionCategoryHighlightedIndex_()[sectionIndex] ?? 0;
  }

  protected getSectionCategoryOptionCount(sectionIndex: number): number {
    const cats = this.getFilteredSectionCategories(sectionIndex);
    const hasQuery = this.getSectionSearchQuery(sectionIndex).trim().length > 0;
    return cats.length + (hasQuery ? 2 : 1); // cats + [add with query?] + add new modal
  }

  protected onSectionSearchKeydown(sectionIndex: number, e: KeyboardEvent): void {
    const maxIndex = this.getSectionCategoryOptionCount(sectionIndex) - 1;
    let idx = this.getSectionCategoryHighlightedIndex(sectionIndex);
    const cats = this.getFilteredSectionCategories(sectionIndex);
    const hasQuery = this.getSectionSearchQuery(sectionIndex).trim().length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.min(idx + 1, maxIndex);
      this.sectionCategoryHighlightedIndex_.update(m => ({ ...m, [sectionIndex]: idx }));
      this.scrollDropdownHighlightIntoView('.section-search-wrap');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      idx = Math.max(0, idx - 1);
      this.sectionCategoryHighlightedIndex_.update(m => ({ ...m, [sectionIndex]: idx }));
      this.scrollDropdownHighlightIntoView('.section-search-wrap');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (idx >= 0 && idx < cats.length) {
        this.selectSectionCategory(sectionIndex, cats[idx]);
        this.closeSectionSearch();
      } else if (hasQuery && idx === cats.length) {
        void this.addNewSectionCategory(sectionIndex);
        this.closeSectionSearch();
      } else if (idx === (cats.length + (hasQuery ? 1 : 0))) {
        void this.openAddCategoryModal(sectionIndex);
        this.closeSectionSearch();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeSectionSearch();
    }
  }

  protected getSectionSearchQuery(index: number): string {
    return this.sectionSearchQueries_()[index] || '';
  }

  protected setSectionSearchQuery(index: number, value: string): void {
    this.sectionSearchQueries_.update(q => ({ ...q, [index]: value }));
  }

  protected onSectionSearchQueryChange(sectionIndex: number, value: string): void {
    this.setSectionSearchQuery(sectionIndex, value);
    this.sectionCategoryHighlightedIndex_.update(m => ({ ...m, [sectionIndex]: 0 }));
  }

  protected getFilteredSectionCategories(index: number): string[] {
    const query = this.getSectionSearchQuery(index).trim().toLowerCase();
    if (!query) return this.sectionCategories_();
    return this.sectionCategories_().filter(c => c.toLowerCase().includes(query));
  }

  protected selectSectionCategory(index: number, category: string): void {
    this.sectionsArray.at(index).get('name_')?.setValue(category);
    this.closeSectionSearch();
  }

  protected async addNewSectionCategory(index: number): Promise<void> {
    const name = this.getSectionSearchQuery(index).trim();
    if (!name) return;
    await this.menuSectionCategories.addCategory(name);
    this.selectSectionCategory(index, name);
  }

  protected async openAddCategoryModal(sectionIndex: number): Promise<void> {
    const result = await this.addItemModal.open({
      title: 'add_new_category',
      label: 'menu_search_category',
      placeholder: 'menu_search_category',
      saveLabel: 'save',
    });
    if (result?.trim()) {
      const name = result.trim();
      await this.menuSectionCategories.addCategory(name);
      this.selectSectionCategory(sectionIndex, name);
    }
  }

  protected startEditField(field: string): void {
    this.editingField_.set(field);
  }

  protected stopEditField(): void {
    this.editingField_.set(null);
  }

  protected getServingTypeLabel(): string {
    const map: Record<string, string> = {
      buffet_family: 'Buffet / Family Style',
      plated_course: 'Plated / Course Based',
      cocktail_passed: 'Cocktail / Passed',
    };
    return map[this.form_.value.serving_type_ || 'plated_course'] || '';
  }

  protected async save(): Promise<void> {
    if (this.form_.invalid) {
      this.form_.markAllAsTouched();
      this.userMsg.onSetErrorMsg('Please fill all required fields');
      return;
    }

    if (!this.form_.value.name_?.trim()) {
      this.form_.patchValue({ name_: this.generateDateName() });
    }

    this.isSaving_.set(true);
    try {
      const event = this.menuIntelligence.hydrateDerivedPortions(this.buildEventFromForm());
      const now = Date.now();
      const id = this.editingId_();
      if (id) {
        await this.menuEventData.updateMenuEvent({ ...event, _id: id, updated_at_: now });
      } else {
        const created = await this.menuEventData.addMenuEvent({ ...event, created_at_: now, updated_at_: now });
        this.editingId_.set(created._id);
      }
      this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
      this.userMsg.onSetSuccessMsg('Menu saved successfully');
      this.router.navigate(['/menu-library']);
    } finally {
      this.isSaving_.set(false);
    }
  }

  private generateDateName(): string {
    const today = new Date();
    const base = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const existing = this.menuEventData.allMenuEvents_()
      .map(e => e.name_)
      .filter(n => n === base || n.startsWith(`${base} (`));
    if (!existing.includes(base)) return base;
    let i = 1;
    while (existing.includes(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  }

  protected openToolbar(): void {
    this.toolbarOpen_.set(true);
    this.menuFabExpanded_.set(false);
  }

  protected closeToolbar(): void {
    this.toolbarOpen_.set(false);
  }

  protected expandMenuFab(): void {
    this.menuFabExpanded_.set(true);
  }

  protected collapseMenuFab(): void {
    this.menuFabExpanded_.set(false);
  }

  protected toggleExport(): void {
    this.showExport_.update(v => !v);
  }

  protected printMenu(): void {
    window.print();
  }

  private async loadEvent(id: string): Promise<void> {
    const event = await this.menuEventData.getMenuEventById(id);
    this.form_.patchValue({
      name_: event.name_,
      event_type_: event.event_type_,
      event_date_: event.event_date_ || '',
      serving_type_: event.serving_type_,
      guest_count_: event.guest_count_,
    });

    this.sectionsArray.clear();
    event.sections_.forEach(section => {
      const sectionGroup = this.fb.group({
        _id: [section._id],
        name_: [section.name_, Validators.required],
        sort_order_: [section.sort_order_],
        items_: this.fb.array<FormGroup>([]),
      });
      const items = sectionGroup.get('items_') as FormArray<FormGroup>;
      section.items_.forEach(item => {
        items.push(
          this.fb.group({
            recipe_id_: [item.recipe_id_, Validators.required],
            recipe_type_: [item.recipe_type_],
            predicted_take_rate_: [item.predicted_take_rate_, [Validators.required, Validators.min(0), Validators.max(1)]],
            sell_price: [item.sell_price_ ?? 0],
            food_cost_money: [item.food_cost_override_ ?? 0],
            food_cost_pct: [0],
            serving_portions: [item.serving_portions_ ?? 0],
            serving_portions_pct: [0],
          })
        );
      });
      this.sectionsArray.push(sectionGroup);
    });

    this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
  }

  private buildEventFromForm(): Omit<MenuEvent, '_id'> {
    const raw = this.form_.getRawValue();
    const servingType = raw.serving_type_ as ServingType;
    const guestCount = Number(raw.guest_count_ || 0);

    const sections: MenuSection[] = (raw.sections_ || []).map((section: MenuSectionFormRaw, sectionIndex: number) => ({
      _id: section._id ?? '',
      name_: section.name_ ?? '',
      sort_order_: sectionIndex + 1,
      items_: (section.items_ || []).map((item: MenuItemForm, itemIndex: number) => {
        const sp = Number(item.serving_portions || 1);
        return {
          recipe_id_: item.recipe_id_,
          recipe_type_: item.recipe_type_,
          predicted_take_rate_: Number(item.predicted_take_rate_ || 0),
          derived_portions_: sp * guestCount,
          sell_price_: item.sell_price ?? undefined,
          food_cost_override_: this.getAutoFoodCost(sectionIndex, itemIndex) || undefined,
          serving_portions_: sp,
        };
      }),
    }));

    const hydrated = this.menuIntelligence.hydrateDerivedPortions({
      _id: '',
      name_: raw.name_ || 'Untitled Event',
      event_type_: raw.event_type_ || 'General Event',
      event_date_: raw.event_date_ || '',
      serving_type_: servingType,
      guest_count_: guestCount,
      sections_: sections,
      financial_targets_: {
        target_food_cost_pct_: 30,
        target_revenue_per_guest_: 0,
      },
      performance_tags_: {
        food_cost_pct_: 0,
        primary_serving_style_: servingType,
      },
    });

    return {
      ...hydrated,
      performance_tags_: {
        food_cost_pct_: this.menuIntelligence.computeFoodCostPct(hydrated),
        primary_serving_style_: servingType,
      },
    };
  }

  /** Build current menu event for export (includes _id). */
  private getCurrentMenuForExport(): MenuEvent {
    const built = this.buildEventFromForm();
    return { ...built, _id: this.editingId_() ?? '' };
  }

  protected onViewMenuInfo(): void {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuInfoPreviewPayload(menu, this.recipes_()));
    this.exportPreviewType_ = 'menu-info';
  }

  protected async onExportMenuInfo(): Promise<void> {
    const menu = this.getCurrentMenuForExport();
    await this.exportService.exportMenuInfo(menu, this.recipes_());
  }

  protected onViewMenuShoppingList(): void {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuShoppingListPreviewPayload(menu, this.recipes_(), this.products_()));
    this.exportPreviewType_ = 'menu-shopping-list';
  }

  protected async onExportMenuShoppingList(): Promise<void> {
    const menu = this.getCurrentMenuForExport();
    await this.exportService.exportMenuShoppingList(menu, this.recipes_(), this.products_());
  }

  protected onExportFromPreview(): void {
    const type = this.exportPreviewType_;
    const mode = this.exportChecklistMode_;
    if (!type) return;
    const menu = this.getCurrentMenuForExport();
    if (type === 'menu-info') this.exportService.exportMenuInfo(menu, this.recipes_());
    else if (type === 'menu-shopping-list') this.exportService.exportMenuShoppingList(menu, this.recipes_(), this.products_());
    else if (type === 'menu-checklist' && mode) this.exportService.exportChecklist(menu, this.recipes_(), mode);
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
    this.exportChecklistMode_ = null;
  }

  protected onPrintFromPreview(): void {
    window.print();
  }

  protected onCloseExportPreview(): void {
    this.exportPreviewPayload_.set(null);
    this.exportPreviewType_ = null;
    this.exportChecklistMode_ = null;
  }

  protected onViewChecklist(mode: 'by_dish' | 'by_category' | 'by_station'): void {
    const menu = this.getCurrentMenuForExport();
    this.exportPreviewPayload_.set(this.exportService.getMenuChecklistPreviewPayload(menu, this.recipes_(), mode));
    this.exportPreviewType_ = 'menu-checklist';
    this.exportChecklistMode_ = mode;
    this.closeExportChecklistDropdown();
  }

  protected readonly exportChecklistDropdownOpen_ = signal(false);

  /** Which view/export modal is open: menu-info (תפריט) or shopping-list (קניות). */
  protected readonly viewExportModal_ = signal<'menu-info' | 'shopping-list' | null>(null);

  protected toggleExportChecklistDropdown(): void {
    this.exportChecklistDropdownOpen_.update(v => !v);
    this.viewExportModal_.set(null);
  }

  protected closeExportChecklistDropdown(): void {
    this.exportChecklistDropdownOpen_.set(false);
  }

  protected openViewExportModal(type: 'menu-info' | 'shopping-list'): void {
    this.viewExportModal_.update(current => (current === type ? null : type));
    this.exportChecklistDropdownOpen_.set(false);
  }

  protected closeViewExportModal(): void {
    this.viewExportModal_.set(null);
  }

  protected async onExportChecklist(mode: 'by_dish' | 'by_category' | 'by_station'): Promise<void> {
    const menu = this.getCurrentMenuForExport();
    await this.exportService.exportChecklist(menu, this.recipes_(), mode);
    this.closeExportChecklistDropdown();
  }

  protected async onExportAllTogether(): Promise<void> {
    const menu = this.getCurrentMenuForExport();
    await this.exportService.exportAllTogetherMenu(menu, this.recipes_(), this.products_(), 'by_category');
  }
}
