import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { duplicateEntityNameValidator } from 'src/app/core/validators/item.validators'
import { SupplierDataService } from '@services/supplier-data.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { Supplier } from '@models/supplier.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { useSavingState } from 'src/app/core/utils/saving-state.util'

const DAY_KEYS = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat']

/**
 * Supplier add/edit — a routed page (`/suppliers/add`, `/suppliers/edit/:id`) laid out like the
 * venue form. Plan 341 removed the old add-supplier modal mode and the list's inline row edit.
 */
@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly supplierData = inject(SupplierDataService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly logging = inject(LoggingService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly requireAuth = inject(RequireAuthService)

  protected supplierForm_!: FormGroup
  protected isEditMode_ = signal(false)
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  protected dayKeys = DAY_KEYS
  protected validationErrors_ = signal<Record<string, string>>({})

  protected get deliveryDaysArray(): FormArray {
    return this.supplierForm_?.get('deliveryDays') as FormArray
  }

  ngOnInit(): void {
    this.buildForm()
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const supplier = data['supplier'] as Supplier | null | undefined
      if (supplier) {
        this.isEditMode_.set(true)
        this.hydrateForm(supplier)
      }
    })
  }

  private buildForm(): void {
    const daysArray = this.fb.array(Array.from({ length: 7 }, () => this.fb.control(false)))
    this.supplierForm_ = this.fb.group({
      nameHebrew: [
        '',
        [
          Validators.required,
          duplicateEntityNameValidator(
            () => this.supplierData.allSuppliers_(),
            () => (this.isEditMode_() ? ((this.route.snapshot.data['supplier'] as Supplier)?._id ?? null) : null)
          )
        ]
      ],
      contactPerson: [''],
      phone: [''],
      deliveryDays: daysArray,
      minOrderMov: [0, [Validators.required, Validators.min(0)]],
      leadTimeDays: [0, [Validators.required, Validators.min(0)]]
    })
  }

  private hydrateForm(s: Supplier): void {
    const days = s.deliveryDays ?? []
    const dayControls = this.deliveryDaysArray
    for (let i = 0; i < 7; i++) {
      dayControls.at(i).setValue(days.includes(i))
    }
    this.supplierForm_.patchValue({
      nameHebrew: s.nameHebrew ?? '',
      contactPerson: s.contactPerson ?? '',
      phone: s.phone ?? '',
      minOrderMov: s.minOrderMov ?? 0,
      leadTimeDays: s.leadTimeDays ?? 0
    })
  }

  private validateForm_(): boolean {
    const errors: Record<string, string> = {}
    const val = this.supplierForm_.getRawValue()
    if (!val.nameHebrew?.trim()) errors['nameHebrew'] = 'field_name_required'
    this.validationErrors_.set(errors)
    return Object.keys(errors).length === 0
  }

  protected onSubmit(): void {
    if (!this.requireAuth.requireAuth()) return
    if (!this.validateForm_()) {
      this.supplierForm_.markAllAsTouched()
      this.userMsg.onSetErrorMsg(this.translation.translate('form_has_errors'))
      return
    }
    if (this.supplierForm_.invalid || this.isSaving_()) return
    const raw = this.supplierForm_.getRawValue()
    const deliveryDays: number[] = []
    this.deliveryDaysArray.controls.forEach((c, i) => {
      if (c.value) deliveryDays.push(i)
    })
    const payload = {
      nameHebrew: raw.nameHebrew,
      contactPerson: raw.contactPerson || undefined,
      phone: raw.phone || undefined,
      deliveryDays,
      minOrderMov: Number(raw.minOrderMov) || 0,
      leadTimeDays: Number(raw.leadTimeDays) || 0
    }
    this.saving.setSaving(true)
    if (this.isEditMode_()) {
      const supplier = this.route.snapshot.data['supplier'] as Supplier | undefined
      if (!supplier) {
        this.saving.setSaving(false)
        return
      }
      this.supplierData
        .updateSupplier({ ...supplier, ...payload })
        .then(() => this.router.navigate(['/suppliers/list']))
        .catch((e) => {
          this.logging.error({ event: 'supplier.save_error', message: 'Supplier save failed', context: { err: e } })
        })
        .finally(() => this.saving.setSaving(false))
    } else {
      this.supplierData
        .addSupplier(payload)
        .then(() => this.router.navigate(['/suppliers/list']))
        .catch((e) => {
          this.logging.error({ event: 'supplier.save_error', message: 'Supplier save failed', context: { err: e } })
        })
        .finally(() => this.saving.setSaving(false))
    }
  }

  protected onCancel(): void {
    void this.router.navigate(['/suppliers/list'])
  }
}
