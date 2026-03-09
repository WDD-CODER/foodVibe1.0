import { ChangeDetectionStrategy, Component, computed, inject, output, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SupplierDataService } from '@services/supplier-data.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { SupplierModalService } from '@services/supplier-modal.service';
import { TranslationService } from '@services/translation.service';
import { Supplier } from '@models/supplier.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { UserService } from '@services/user.service';
import { UserMsgService } from '@services/user-msg.service';
import { AuthModalService } from '@services/auth-modal.service';
import { LoggingService } from '@services/logging.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { CellCarouselComponent, CellCarouselSlideDirective } from 'src/app/shared/cell-carousel/cell-carousel.component';
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component';
import { CarouselHeaderComponent, CarouselHeaderColumnDirective } from 'src/app/shared/carousel-header/carousel-header.component';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { useListState, StringParam, BooleanParam, NumberSetParam } from 'src/app/core/utils/list-state.util';

const DAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, ClickOutSideDirective],
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['embeddedInDashboard'],
})
export class SupplierListComponent {
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;
  private readonly supplierData = inject(SupplierDataService);
  private readonly kitchenState = inject(KitchenStateService);
  private readonly supplierModal = inject(SupplierModalService);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly userMsg = inject(UserMsgService);
  private readonly authModal = inject(AuthModalService);
  private readonly logging = inject(LoggingService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly fb = inject(FormBuilder);

  /** When true, add button emits addSupplierClick instead of opening modal and navigating. */
  embeddedInDashboard = false;
  readonly addSupplierClick = output<void>();

  protected searchQuery_ = signal('');
  protected deletingId_ = signal<string | null>(null);
  protected editingId_ = signal<string | null>(null);
  protected isSavingEdit_ = signal(false);
  protected isPanelOpen_ = signal(true);
  protected carouselHeaderIndex_ = signal(0);
  protected dayLabels = DAY_LABELS;
  protected editForm_!: FormGroup;

  constructor() {
    this.buildEditForm();
    if (!this.embeddedInDashboard) {
      useListState('suppliers', [
        { urlParam: 'q',          signal: this.searchQuery_,   serializer: StringParam },
        { urlParam: 'days',       signal: this.selectedDays_,  serializer: NumberSetParam },
        { urlParam: 'linkedOnly', signal: this.hasLinkedOnly_, serializer: BooleanParam },
      ]);
    }

    afterNextRender(() => {
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
        this.isPanelOpen_.set(false);
      }
    });
  }
  /** Delivery days to filter (0=Sun .. 6=Sat). Empty set = show all. */
  protected selectedDays_ = signal<Set<number>>(new Set());
  protected hasLinkedOnly_ = signal(false);

  protected isEmptyList_ = computed(() => this.supplierData.allSuppliers_().length === 0);

  protected hasActiveFilters_ = computed(() => {
    const days = this.selectedDays_();
    const linked = this.hasLinkedOnly_();
    return (days.size > 0) || linked;
  });

  protected filteredSuppliers_ = computed(() => {
    let list = this.supplierData.allSuppliers_();
    const search = this.searchQuery_().trim().toLowerCase();
    const days = this.selectedDays_();
    const linkedOnly = this.hasLinkedOnly_();

    if (search) {
      list = list.filter(
        s =>
          (s.name_hebrew ?? '').toLowerCase().includes(search) ||
          (s.contact_person_ ?? '').toLowerCase().includes(search)
      );
    }
    if (days.size > 0) {
      list = list.filter(s => (s.delivery_days_ ?? []).some(d => days.has(d)));
    }
    if (linkedOnly) {
      list = list.filter(s => this.linkedProductCount_(s._id) > 0);
    }
    return [...list].sort((a, b) =>
      (a.name_hebrew ?? '').localeCompare(b.name_hebrew ?? '', 'he')
    );
  });

  protected togglePanel(): void {
    this.isPanelOpen_.update(v => !v);
  }

  protected onCarouselHeaderChange(index: number): void {
    this.carouselHeaderIndex_.set(index);
  }

  protected toggleDay(day: number): void {
    this.selectedDays_.update(set => {
      const next = new Set(set);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  protected clearAllFilters(): void {
    this.selectedDays_.set(new Set());
    this.hasLinkedOnly_.set(false);
  }

  private buildEditForm(): void {
    const daysArray = this.fb.array(Array.from({ length: 7 }, () => this.fb.control(false)));
    this.editForm_ = this.fb.group({
      name_hebrew: ['', [Validators.required]],
      contact_person_: [''],
      delivery_days_: daysArray,
      min_order_mov_: [0, [Validators.required, Validators.min(0)]],
      lead_time_days_: [0, [Validators.required, Validators.min(0)]],
    });
  }

  protected get deliveryDaysArray(): FormArray {
    return this.editForm_?.get('delivery_days_') as FormArray;
  }

  private hydrateEditForm(s: Supplier): void {
    const days = s.delivery_days_ ?? [];
    const dayControls = this.deliveryDaysArray;
    for (let i = 0; i < 7; i++) {
      dayControls.at(i).setValue(days.includes(i));
    }
    this.editForm_.patchValue({
      name_hebrew: s.name_hebrew ?? '',
      contact_person_: s.contact_person_ ?? '',
      min_order_mov_: s.min_order_mov_ ?? 0,
      lead_time_days_: s.lead_time_days_ ?? 0,
    });
  }

  protected linkedProductCount_(supplierId: string): number {
    return this.kitchenState.products_().filter(p =>
      (p.supplierIds_ ?? []).includes(supplierId)
    ).length;
  }

  protected onAdd(): void {
    if (!this.isLoggedIn()) {
      this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'));
      this.authModal.open('sign-in');
      return;
    }
    if (this.embeddedInDashboard) {
      this.addSupplierClick.emit();
      return;
    }
    this.supplierModal.openAdd();
  }

  async onEdit(item: Supplier): Promise<void> {
    if (!this.isLoggedIn()) {
      this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'));
      this.authModal.open('sign-in');
      return;
    }
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
    const supplier = this.supplierData.allSuppliers_().find((s) => s._id === id);
    if (!supplier) return false;
    this.isSavingEdit_.set(true);
    try {
      const raw = this.editForm_.getRawValue();
      const delivery_days_: number[] = [];
      this.deliveryDaysArray.controls.forEach((c, i) => {
        if (c.value) delivery_days_.push(i);
      });
      const payload: Partial<Supplier> = {
        name_hebrew: raw.name_hebrew,
        contact_person_: raw.contact_person_ || undefined,
        delivery_days_,
        min_order_mov_: Number(raw.min_order_mov_) || 0,
        lead_time_days_: Number(raw.lead_time_days_) || 0,
      };
      await this.supplierData.updateSupplier({ ...supplier, ...payload });
      return true;
    } catch (err) {
      this.logging.error({ event: 'supplier.save_error', message: 'Supplier save failed', context: { err } });
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed') ?? 'שגיאה בשמירה');
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

  /** Close inline panel on click outside; confirm if form has unsaved changes. */
  protected async onInlinePanelClickOutside(): Promise<void> {
    if (this.editForm_.dirty) {
      const discard = await this.confirmModal.open(
        this.translation.translate('unsaved_changes_confirm') ?? 'יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?',
        { variant: 'warning', saveLabel: 'leave_without_saving' }
      );
      if (!discard) return;
    }
    this.editingId_.set(null);
  }

  async onDelete(item: Supplier): Promise<void> {
    if (!this.isLoggedIn()) {
      this.userMsg.onSetWarningMsg(this.translation.translate('sign_in_to_use'));
      this.authModal.open('sign-in');
      return;
    }
    const count = this.linkedProductCount_(item._id);
    if (count > 0) {
      const msg = this.translation.translate('supplier_in_use_cannot_delete');
      if (!confirm(msg)) return;
    } else if (!confirm('למחוק את הספק "' + (item.name_hebrew ?? '') + '"?')) return;
    this.deletingId_.set(item._id);
    try {
      await this.supplierData.removeSupplier(item._id);
    } catch (e) {
      this.logging.error({ event: 'supplier.list_error', message: 'Supplier list error', context: { err: e } });
    } finally {
      this.deletingId_.set(null);
    }
  }

  protected deliveryDaysDisplay(days: number[] | undefined): string {
    if (!days?.length) return '—';
    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    return days.map(d => dayNames[d] ?? String(d)).join(', ');
  }
}
