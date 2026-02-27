import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MenuEventDataService } from '@services/menu-event-data.service';
import { MenuIntelligenceService } from '@services/menu-intelligence.service';
import { MenuEvent, MenuSection, ServingType } from '@models/menu-event.model';

type MenuItemForm = {
  recipe_id_: string;
  recipe_type_: 'dish' | 'preparation';
  predicted_take_rate_: number;
};

@Component({
  selector: 'app-menu-intelligence-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './menu-intelligence.page.html',
  styleUrl: './menu-intelligence.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuIntelligencePage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly menuEventData = inject(MenuEventDataService);
  private readonly menuIntelligence = inject(MenuIntelligenceService);

  protected readonly editingId_ = signal<string | null>(null);
  protected readonly recipes_ = this.kitchenState.recipes_;

  protected readonly form_ = this.fb.group({
    name_: ['', Validators.required],
    event_type_: ['', Validators.required],
    event_date_: [''],
    serving_type_: ['plated_course' as ServingType, Validators.required],
    guest_count_: [50, [Validators.required, Validators.min(1)]],
    pieces_per_person_: [0],
    target_revenue_per_guest_: [0],
    target_food_cost_pct_: [30],
    sections_: this.fb.array<FormGroup>([]),
  });

  protected readonly eventCost_ = computed(() => {
    const event = this.buildEventFromForm();
    return this.menuIntelligence.computeEventIngredientCost(event);
  });

  protected readonly foodCostPct_ = computed(() => {
    const event = this.buildEventFromForm();
    return this.menuIntelligence.computeFoodCostPct(event);
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId_.set(id);
      void this.loadEvent(id);
    } else {
      this.addSection();
    }
  }

  protected get sectionsArray(): FormArray<FormGroup> {
    return this.form_.get('sections_') as FormArray<FormGroup>;
  }

  protected addSection(): void {
    this.sectionsArray.push(
      this.fb.group({
        _id: [crypto.randomUUID()],
        name_: ['Section', Validators.required],
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
      })
    );
  }

  protected removeItem(sectionIndex: number, itemIndex: number): void {
    this.getItemsArray(sectionIndex).removeAt(itemIndex);
  }

  protected getRecipeName(recipeId: string): string {
    return this.recipes_().find(r => r._id === recipeId)?.name_hebrew || 'Unknown';
  }

  protected getDerivedPortions(item: MenuItemForm): number {
    return this.menuIntelligence.derivePortions(
      this.form_.value.serving_type_ as ServingType,
      Number(this.form_.value.guest_count_ || 0),
      Number(item.predicted_take_rate_ || 0),
      Number(this.form_.value.pieces_per_person_ || 0)
    );
  }

  protected async save(): Promise<void> {
    if (this.form_.invalid) {
      this.form_.markAllAsTouched();
      return;
    }

    const event = this.menuIntelligence.hydrateDerivedPortions(this.buildEventFromForm());
    const id = this.editingId_();
    if (id) {
      await this.menuEventData.updateMenuEvent({ ...event, _id: id });
    } else {
      const created = await this.menuEventData.addMenuEvent(event);
      this.editingId_.set(created._id);
    }
    this.router.navigate(['/menu-library']);
  }

  private async loadEvent(id: string): Promise<void> {
    const event = await this.menuEventData.getMenuEventById(id);
    this.form_.patchValue({
      name_: event.name_,
      event_type_: event.event_type_,
      event_date_: event.event_date_ || '',
      serving_type_: event.serving_type_,
      guest_count_: event.guest_count_,
      pieces_per_person_: event.pieces_per_person_ || 0,
      target_revenue_per_guest_: event.financial_targets_?.target_revenue_per_guest_ || 0,
      target_food_cost_pct_: event.financial_targets_?.target_food_cost_pct_ || 30,
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
          })
        );
      });
      this.sectionsArray.push(sectionGroup);
    });
  }

  private buildEventFromForm(): Omit<MenuEvent, '_id'> {
    const raw = this.form_.getRawValue();
    const servingType = raw.serving_type_ as ServingType;
    const guestCount = Number(raw.guest_count_ || 0);
    const piecesPerPerson = Number(raw.pieces_per_person_ || 0);

    const sections: MenuSection[] = (raw.sections_ || []).map((section: any, index: number) => ({
      _id: section._id,
      name_: section.name_,
      sort_order_: index + 1,
      items_: (section.items_ || []).map((item: MenuItemForm) => ({
        recipe_id_: item.recipe_id_,
        recipe_type_: item.recipe_type_,
        predicted_take_rate_: Number(item.predicted_take_rate_ || 0),
        derived_portions_: this.menuIntelligence.derivePortions(
          servingType,
          guestCount,
          Number(item.predicted_take_rate_ || 0),
          piecesPerPerson
        ),
      })),
    }));

    const hydrated = this.menuIntelligence.hydrateDerivedPortions({
      _id: '',
      name_: raw.name_ || 'Untitled Event',
      event_type_: raw.event_type_ || 'General Event',
      event_date_: raw.event_date_ || '',
      serving_type_: servingType,
      guest_count_: guestCount,
      pieces_per_person_: piecesPerPerson > 0 ? piecesPerPerson : undefined,
      sections_: sections,
      financial_targets_: {
        target_food_cost_pct_: Number(raw.target_food_cost_pct_ || 30),
        target_revenue_per_guest_: Number(raw.target_revenue_per_guest_ || 0),
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
