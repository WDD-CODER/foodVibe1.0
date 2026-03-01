import { AfterViewInit, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MenuEventDataService } from '@services/menu-event-data.service';
import { MenuIntelligenceService } from '@services/menu-intelligence.service';
import { UserMsgService } from '@services/user-msg.service';
import { AddItemModalService } from '@services/add-item-modal.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { MenuEvent, MenuSection, ServingType, DEFAULT_DISH_FIELDS, ALL_DISH_FIELDS, type DishFieldKey } from '@models/menu-event.model';
import { Recipe } from '@models/recipe.model';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { RecipeCostService } from '@services/recipe-cost.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';

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

const DEFAULT_SECTION_CATEGORIES = [
  'Amuse-Bouche', 'Appetizers', 'Soups', 'Salads',
  'Main Course', 'Sides', 'Desserts', 'Beverages',
];

@Component({
  selector: 'app-menu-intelligence-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, ClickOutSideDirective, ScrollableDropdownComponent, CustomSelectComponent],
  templateUrl: './menu-intelligence.page.html',
  styleUrl: './menu-intelligence.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuIntelligencePage implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly menuEventData = inject(MenuEventDataService);
  private readonly menuIntelligence = inject(MenuIntelligenceService);
  private readonly userMsg = inject(UserMsgService);
  private readonly addItemModal = inject(AddItemModalService);
  private readonly metadataRegistry = inject(MetadataRegistryService);
  private readonly recipeCostService = inject(RecipeCostService);

  protected readonly editingId_ = signal<string | null>(null);
  protected readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS;
  protected readonly recipes_ = this.kitchenState.recipes_;
  protected readonly isSaving_ = signal(false);
  protected readonly showExport_ = signal(false);

  /** Per-section dish search query signals keyed by section index */
  protected readonly dishSearchQueries_ = signal<Record<number, string>>({});
  /** Per-section header search query signals */
  protected readonly sectionSearchQueries_ = signal<Record<number, string>>({});
  protected readonly sectionSearchOpen_ = signal<number | null>(null);

  protected readonly sectionCategories_ = signal<string[]>([...DEFAULT_SECTION_CATEGORIES]);

  /** Track saved snapshot for dirty detection */
  private savedSnapshot_ = '';

  protected readonly form_ = this.fb.group({
    name_: ['', Validators.required],
    event_type_: ['', Validators.required],
    event_date_: [''],
    serving_type_: ['plated_course' as ServingType, Validators.required],
    guest_count_: [50, [Validators.required, Validators.min(1)]],
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
    const event = this.buildEventFromForm();
    return this.menuIntelligence.computeEventIngredientCost(event);
  });

  protected readonly foodCostPct_ = computed(() => {
    const event = this.buildEventFromForm();
    return this.menuIntelligence.computeFoodCostPct(event);
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
    return fields.length > 0 ? fields : [...DEFAULT_DISH_FIELDS];
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId_.set(id);
      void this.loadEvent(id);
    } else {
      this.addSection();
      this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusField('name_'), 0);
  }

  /** Focus a field by name; 'name_' = menu name, then event_type_, serving_type_, guest_count_, event_date_, then 'section_0' */
  protected focusField(field: string): void {
    const el = document.getElementById(`menu-focus-${field}`);
    if (el && typeof (el as HTMLInputElement).focus === 'function') (el as HTMLInputElement).focus();
    else if (el) el.focus();
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
    this.startEditField('event_type');
    setTimeout(() => document.getElementById('menu-focus-event_type_search')?.focus(), 50);
  }

  protected closeEventTypeDropdown(): void {
    this.eventTypeDropdownOpen_.set(false);
    this.eventTypeSearch_.set('');
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
        serving_portions: [0],
        serving_portions_pct: [0],
      })
    );
    this.setDishSearchQuery(sectionIndex, items.length - 1, '');
  }

  protected getDishFieldLabelKey(fieldKey: DishFieldKey): string {
    return ALL_DISH_FIELDS.find(f => f.key === fieldKey)?.labelKey ?? fieldKey;
  }

  protected getAutoFoodCost(sectionIndex: number, itemIndex: number): number {
    const item = this.getItemsArray(sectionIndex).at(itemIndex);
    const recipeId = item?.get('recipe_id_')?.value;
    if (!recipeId) return 0;
    const recipe = this.recipes_().find(r => r._id === recipeId);
    if (!recipe) return 0;
    const derivedPortions = this.getDerivedPortions(item.value as MenuItemForm);
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
      0
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
      0
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
      serving_portions: recipe.yield_amount_ ?? 1,
    });
    this.setDishSearchQuery(sectionIndex, itemIndex, '');
    this.expandedMetaKeys_.update(set => new Set(set).add(this.getDishMetaKey(sectionIndex, itemIndex)));
  }

  protected openSectionSearch(index: number): void {
    this.sectionSearchOpen_.set(index);
    this.sectionSearchQueries_.update(q => ({ ...q, [index]: '' }));
  }

  protected closeSectionSearch(): void {
    this.sectionSearchOpen_.set(null);
  }

  protected getSectionSearchQuery(index: number): string {
    return this.sectionSearchQueries_()[index] || '';
  }

  protected setSectionSearchQuery(index: number, value: string): void {
    this.sectionSearchQueries_.update(q => ({ ...q, [index]: value }));
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

  protected addNewSectionCategory(index: number): void {
    const name = this.getSectionSearchQuery(index).trim();
    if (!name) return;
    if (!this.sectionCategories_().includes(name)) {
      this.sectionCategories_.update(cats => [...cats, name]);
    }
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
      if (!this.sectionCategories_().includes(name)) {
        this.sectionCategories_.update(cats => [...cats, name]);
      }
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

    this.isSaving_.set(true);
    try {
      const event = this.menuIntelligence.hydrateDerivedPortions(this.buildEventFromForm());
      const id = this.editingId_();
      if (id) {
        await this.menuEventData.updateMenuEvent({ ...event, _id: id });
      } else {
        const created = await this.menuEventData.addMenuEvent(event);
        this.editingId_.set(created._id);
      }
      this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
      this.userMsg.onSetSuccessMsg('Menu saved successfully');
      this.router.navigate(['/menu-library']);
    } finally {
      this.isSaving_.set(false);
    }
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

    const firstExpanded = new Set<string>();
    this.sectionsArray.controls.forEach((section, si) => {
      const items = (section.get('items_') as FormArray<FormGroup>).controls;
      items.forEach((item, ii) => {
        if (item.get('recipe_id_')?.value && firstExpanded.size === 0) {
          firstExpanded.add(this.getDishMetaKey(si, ii));
        }
      });
    });
    if (firstExpanded.size > 0) this.expandedMetaKeys_.set(firstExpanded);

    this.savedSnapshot_ = JSON.stringify(this.form_.getRawValue());
  }

  private buildEventFromForm(): Omit<MenuEvent, '_id'> {
    const raw = this.form_.getRawValue();
    const servingType = raw.serving_type_ as ServingType;
    const guestCount = Number(raw.guest_count_ || 0);

    const sections: MenuSection[] = (raw.sections_ || []).map((section: any, index: number) => ({
      _id: section._id,
      name_: section.name_,
      sort_order_: index + 1,
      items_: (section.items_ || []).map((item: MenuItemForm) => ({
        recipe_id_: item.recipe_id_,
        recipe_type_: item.recipe_type_,
        predicted_take_rate_: Number(item.predicted_take_rate_ || 0),
        derived_portions_: this.menuIntelligence.derivePortions(
          servingType, guestCount, Number(item.predicted_take_rate_ || 0), 0
        ),
        sell_price_: item.sell_price ?? undefined,
        food_cost_override_: item.food_cost_money ?? undefined,
        serving_portions_: item.serving_portions ?? undefined,
      })),
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
}
