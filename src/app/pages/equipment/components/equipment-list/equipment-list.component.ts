import { ChangeDetectionStrategy, Component, computed, inject, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service';
import { Equipment, EquipmentCategory, ScalingRule } from '@models/equipment.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { UserService } from '@services/user.service';
import { UserMsgService } from '@services/user-msg.service';
import { TranslationService } from '@services/translation.service';
import { RequireAuthService } from 'src/app/core/utils/require-auth.util';
import { LoggingService } from '@services/logging.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component';
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component';
import { CarouselHeaderComponent, CarouselHeaderColumnDirective } from 'src/app/shared/carousel-header/carousel-header.component';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';
import { useListState, StringParam, NullableBooleanParam, StringSetParam } from 'src/app/core/utils/list-state.util';
import { getPanelOpen, setPanelOpen } from 'src/app/core/utils/panel-preference.util';

type SortField = 'name' | 'category' | 'owned';

@Component({
  selector: 'app-equipment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, CustomSelectComponent],
  templateUrl: './equipment-list.component.html',
  styleUrl: './equipment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentListComponent {
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;
  private readonly requireAuthService = inject(RequireAuthService);
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly router = inject(Router);
  private readonly userMsg = inject(UserMsgService);
  private readonly translation = inject(TranslationService);
  private readonly logging = inject(LoggingService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly fb = inject(FormBuilder);

  /** True when this list is shown under /inventory/equipment (logistics from inventory). */
  protected get isUnderInventory(): boolean {
    return this.router.url.startsWith('/inventory/equipment');
  }

  protected get equipmentBasePath(): string[] {
    return this.isUnderInventory ? ['/inventory/equipment'] : ['/equipment'];
  }

  protected searchQuery_ = signal('');
  protected isPanelOpen_ = signal(true);
  protected carouselHeaderIndex_ = signal(0);

  private get panelContext(): 'inventory' | 'equipment' {
    return this.router.url.startsWith('/inventory/equipment') ? 'inventory' : 'equipment';
  }

  constructor() {
    this.isPanelOpen_.set(getPanelOpen(this.panelContext));
    this.buildEditForm();
    useListState('equipment', [
      { urlParam: 'q',          signal: this.searchQuery_,        serializer: StringParam },
      { urlParam: 'sort',       signal: this.sortBy_,             serializer: StringParam as any },
      { urlParam: 'order',      signal: this.sortOrder_,          serializer: StringParam as any },
      { urlParam: 'categories', signal: this.selectedCategories_, serializer: StringSetParam as any },
      { urlParam: 'consumable', signal: this.consumableFilter_,   serializer: NullableBooleanParam },
    ]);

    afterNextRender(() => {
      if (typeof window === 'undefined') return;
      const q = window.matchMedia('(max-width: 768px)');
      if (q.matches) this.isPanelOpen_.set(false);
      q.addEventListener('change', (e) => { if (e.matches) this.isPanelOpen_.set(false); });
    });
  }
  /** Selected categories; empty set = show all. */
  protected selectedCategories_ = signal<Set<EquipmentCategory>>(new Set());
  /** null = no filter, true = consumable only, false = non-consumable only. */
  protected consumableFilter_ = signal<boolean | null>(null);
  protected sortBy_ = signal<SortField>('name');
  protected deletingId_ = signal<string | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');
  protected editingId_ = signal<string | null>(null);
  protected isSavingEdit_ = signal(false);
  protected editForm_!: FormGroup;

  protected hasActiveFilters_ = computed(() => {
    const cats = this.selectedCategories_();
    const cons = this.consumableFilter_();
    return cats.size > 0 || cons !== null;
  });

  protected filteredEquipment_ = computed(() => {
    let list = this.equipmentData.allEquipment_();
    const search = this.searchQuery_().trim().toLowerCase();
    const cats = this.selectedCategories_();
    const consumableOnly = this.consumableFilter_();
    const sortBy = this.sortBy_();
    const order = this.sortOrder_();

    if (search) {
      list = list.filter(e => (e.name_hebrew ?? '').toLowerCase().includes(search));
    }
    if (cats.size > 0) {
      list = list.filter(e => cats.has(e.category_));
    }
    if (consumableOnly !== null) {
      list = list.filter(e => e.is_consumable_ === consumableOnly);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he');
      } else if (sortBy === 'category') {
        cmp = (a.category_ ?? '').localeCompare(b.category_ ?? '');
      } else {
        cmp = (a.owned_quantity_ ?? 0) - (b.owned_quantity_ ?? 0);
      }
      return order === 'asc' ? cmp : -cmp;
    });
    return list;
  });

  protected categories: EquipmentCategory[] = [
    'heat_source',
    'tool',
    'container',
    'packaging',
    'infrastructure',
    'consumable',
  ];
  protected categoryOptions = this.categories.map((c) => ({ value: c, label: c }));

  private buildEditForm(): void {
    this.editForm_ = this.fb.group({
      name_hebrew: ['', [Validators.required]],
      category_: ['tool', [Validators.required]],
      owned_quantity_: [1, [Validators.required, Validators.min(0)]],
      is_consumable_: [false],
      notes_: [''],
      scaling_enabled_: [false],
      per_guests_: [25, [Validators.min(1)]],
      min_quantity_: [1, [Validators.min(0)]],
      max_quantity_: [null as number | null],
    });
  }

  private hydrateEditForm(e: Equipment): void {
    this.editForm_.patchValue({
      name_hebrew: e.name_hebrew ?? '',
      category_: e.category_ ?? 'tool',
      owned_quantity_: e.owned_quantity_ ?? 0,
      is_consumable_: e.is_consumable_ ?? false,
      notes_: e.notes_ ?? '',
      scaling_enabled_: !!e.scaling_rule_,
      per_guests_: e.scaling_rule_?.per_guests_ ?? 25,
      min_quantity_: e.scaling_rule_?.min_quantity_ ?? 1,
      max_quantity_: e.scaling_rule_?.max_quantity_ ?? null,
    });
  }

  protected togglePanel(): void {
    this.isPanelOpen_.update(v => !v);
    setPanelOpen(this.panelContext, this.isPanelOpen_());
  }

  protected onCarouselHeaderChange(index: number): void {
    this.carouselHeaderIndex_.set(index);
  }

  protected toggleCategory(cat: EquipmentCategory): void {
    this.selectedCategories_.update(set => {
      const next = new Set(set);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  protected clearAllFilters(): void {
    this.selectedCategories_.set(new Set());
    this.consumableFilter_.set(null);
  }

  protected setSort(field: SortField): void {
    if (this.sortBy_() === field) {
      this.sortOrder_.update(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set('asc');
    }
  }

  protected onAdd(): void {
    this.router.navigate([...this.equipmentBasePath, 'add']);
  }

  async onEdit(item: Equipment): Promise<void> {
    if (!this.requireAuthService.requireAuth()) return;
    const currentId = this.editingId_();
    if (currentId !== null && currentId !== item._id && this.editForm_.dirty) {
      const saveFirst = await this.confirmModal.open(
        this.translation.translate('unsaved_changes_confirm') ?? 'יש שינויים שלא נשמרו. שמור לפני מעבר?',
        { variant: 'warning', saveLabel: 'save' }
      );
      if (saveFirst) {
        await this.saveCurrentInlineEdit();
      }
    }
    this.editingId_.set(item._id);
    this.hydrateEditForm(item);
  }

  private async saveCurrentInlineEdit(): Promise<boolean> {
    const id = this.editingId_();
    if (!id || this.editForm_.invalid) return false;
    const equipment = this.equipmentData.allEquipment_().find((e) => e._id === id);
    if (!equipment) return false;
    this.isSavingEdit_.set(true);
    try {
      const v = this.editForm_.getRawValue();
      const now = new Date().toISOString();
      const scalingRule: ScalingRule | undefined = v.scaling_enabled_
        ? {
            per_guests_: Number(v.per_guests_),
            min_quantity_: Number(v.min_quantity_),
            max_quantity_: v.max_quantity_ != null && v.max_quantity_ !== '' ? Number(v.max_quantity_) : undefined,
          }
        : undefined;
      const updated: Equipment = {
        ...equipment,
        name_hebrew: v.name_hebrew,
        category_: v.category_,
        owned_quantity_: Number(v.owned_quantity_),
        is_consumable_: !!v.is_consumable_,
        notes_: v.notes_ ?? undefined,
        scaling_rule_: scalingRule,
        updated_at_: now,
      };
      await this.equipmentData.updateEquipment(updated);
      return true;
    } catch (err) {
      this.logging.error({ event: 'equipment.save_error', message: 'Equipment save error', context: { err } });
      const msg =
        err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
          ? (this.translation.translate('duplicate_equipment_name') ?? 'כלי עם שם זה כבר קיים')
          : (this.translation.translate('save_failed') ?? 'שגיאה בשמירה');
      this.userMsg.onSetErrorMsg(msg);
      return false;
    } finally {
      this.isSavingEdit_.set(false);
    }
  }

  protected async onInlineSave(): Promise<void> {
    const ok = await this.saveCurrentInlineEdit();
    if (ok) this.editingId_.set(null);
  }

  protected onInlineCancel(): void {
    this.editingId_.set(null);
  }

  async onDelete(item: Equipment): Promise<void> {
    if (!this.requireAuthService.requireAuth()) return;
    if (!confirm('האם למחוק את פריט הציוד "' + (item.name_hebrew ?? '') + '"?')) return;
    this.deletingId_.set(item._id);
    try {
      await this.equipmentData.deleteEquipment(item._id);
    } catch (e) {
      this.logging.error({ event: 'equipment.list_error', message: 'Equipment list error', context: { err: e } });
    } finally {
      this.deletingId_.set(null);
    }
  }
}
