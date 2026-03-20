import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SupplierDataService } from '@services/supplier-data.service';
import { LoggingService } from '@services/logging.service';
import { Supplier } from '@models/supplier.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { useSavingState } from 'src/app/core/utils/saving-state.util';

const DAY_KEYS = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'];

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormComponent implements OnInit {
  embeddedInDashboard = input<boolean>(false);
  /** When set (e.g. from SupplierModalService), form is hydrated in modal mode without route resolver. */
  supplierToEdit = input<Supplier | null>(null);
  saved = output<void>();
  cancel = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supplierData = inject(SupplierDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly logging = inject(LoggingService);

  protected supplierForm_!: FormGroup;
  protected isEditMode_ = signal(false);
  private readonly saving = useSavingState();
  protected readonly isSaving_ = this.saving.isSaving_;
  protected dayKeys = DAY_KEYS;

  protected get deliveryDaysArray(): FormArray {
    return this.supplierForm_?.get('delivery_days_') as FormArray;
  }

  constructor() {
    effect(() => {
      const supplier = this.supplierToEdit();
      if (!this.supplierForm_) return;
      if (supplier) {
        this.isEditMode_.set(true);
        this.hydrateForm(supplier);
      } else if (supplier === null) {
        this.isEditMode_.set(false);
        this.supplierForm_.patchValue({
          name_hebrew: '',
          contact_person_: '',
          min_order_mov_: 0,
          lead_time_days_: 0,
        });
        const daysArray = this.supplierForm_.get('delivery_days_') as FormArray;
        if (daysArray?.controls?.length === 7) {
          for (let i = 0; i < 7; i++) {
            daysArray.at(i).setValue(false);
          }
        }
      }
    });
  }

  ngOnInit(): void {
    this.buildForm();
    if (!this.embeddedInDashboard()) {
      this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
        const supplier = data['supplier'] as Supplier | null | undefined;
        if (supplier) {
          this.isEditMode_.set(true);
          this.hydrateForm(supplier);
        }
      });
    }
  }

  private buildForm(): void {
    const daysArray = this.fb.array(
      Array.from({ length: 7 }, () => this.fb.control(false))
    );
    this.supplierForm_ = this.fb.group({
      name_hebrew: ['', [Validators.required]],
      contact_person_: [''],
      delivery_days_: daysArray,
      min_order_mov_: [0, [Validators.required, Validators.min(0)]],
      lead_time_days_: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private hydrateForm(s: Supplier): void {
    const days = s.delivery_days_ ?? [];
    const dayControls = this.deliveryDaysArray;
    for (let i = 0; i < 7; i++) {
      dayControls.at(i).setValue(days.includes(i));
    }
    this.supplierForm_.patchValue({
      name_hebrew: s.name_hebrew ?? '',
      contact_person_: s.contact_person_ ?? '',
      min_order_mov_: s.min_order_mov_ ?? 0,
      lead_time_days_: s.lead_time_days_ ?? 0,
    });
  }

  protected onSubmit(): void {
    if (this.supplierForm_.invalid || this.isSaving_()) return;
    const raw = this.supplierForm_.getRawValue();
    const delivery_days_: number[] = [];
    this.deliveryDaysArray.controls.forEach((c, i) => {
      if (c.value) delivery_days_.push(i);
    });
    const payload = {
      name_hebrew: raw.name_hebrew,
      contact_person_: raw.contact_person_ || undefined,
      delivery_days_,
      min_order_mov_: Number(raw.min_order_mov_) || 0,
      lead_time_days_: Number(raw.lead_time_days_) || 0,
    };
    this.saving.setSaving(true);
    if (this.isEditMode_()) {
      const supplier = this.embeddedInDashboard() ? (this.supplierToEdit() ?? undefined) : (this.route.snapshot.data['supplier'] as Supplier);
      if (!supplier) {
        this.saving.setSaving(false);
        return;
      }
      this.supplierData
        .updateSupplier({ ...supplier, ...payload })
        .then(() => {
          if (this.embeddedInDashboard()) this.saved.emit();
          else this.router.navigate(['/suppliers/list']);
        })
        .catch((e) => {
          this.logging.error({ event: 'supplier.save_error', message: 'Supplier save failed', context: { err: e } });
        })
        .finally(() => this.saving.setSaving(false));
    } else {
      this.supplierData
        .addSupplier(payload)
        .then(() => {
          if (this.embeddedInDashboard()) this.saved.emit();
          else this.router.navigate(['/suppliers/list']);
        })
        .catch((e) => {
          this.logging.error({ event: 'supplier.save_error', message: 'Supplier save failed', context: { err: e } });
        })
        .finally(() => this.saving.setSaving(false));
    }
  }

  protected onCancel(): void {
    if (this.embeddedInDashboard()) {
      this.cancel.emit();
    } else {
      this.router.navigate(['/suppliers/list']);
    }
  }
}
