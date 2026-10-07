import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { take } from 'rxjs/operators'
import { duplicateEntityNameValidator } from 'src/app/core/validators/item.validators'
import { useSavingState } from 'src/app/core/utils/saving-state.util'
import { VenueDataService } from '@services/venue-data.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { CloudinaryService } from '@services/cloudinary.service'
import { VenueProfile, VenueInfraItem, VenueOperatingHours, EnvironmentType } from '@models/venue.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import type { PendingChangesComponent } from 'src/app/core/guards/pending-changes.guard'

const ENV_TYPES: EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    CustomSelectComponent
  ],
  templateUrl: './venue-form.component.html',
  styleUrl: './venue-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VenueFormComponent implements OnInit, PendingChangesComponent {
  embeddedInDashboard = input<boolean>(false)
  saved = output<void>()
  cancel = output<void>()

  private readonly fb = inject(FormBuilder)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly venueData = inject(VenueDataService)
  private readonly equipmentData = inject(EquipmentDataService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly requireAuth = inject(RequireAuthService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly cloudinary = inject(CloudinaryService)

  protected venueForm_!: FormGroup
  protected isEditMode_ = signal(false)
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  protected envTypes = ENV_TYPES
  protected validationErrors_ = signal<Record<string, string>>({})
  /** design-port session 6 — Cloudinary-hosted venue photo, same pattern as recipe-header's imageUrl. */
  protected readonly photoUrl_ = signal<string | null>(null)
  protected readonly uploadingPhoto_ = signal(false)

  /** pendingChangesGuard contract (plan 371): true once a save succeeded, so leaving doesn't prompt. */
  isSubmitted = false
  /** Form + photo as loaded (add: empty form; edit: after hydrateForm) — compared by hasRealChanges(). */
  private initialSnapshot_ = ''

  protected get infraArray(): FormArray {
    return this.venueForm_?.get('availableInfrastructure') as FormArray
  }

  protected get hoursArray(): FormArray {
    return this.venueForm_?.get('operatingHours') as FormArray
  }

  protected get allEquipment_() {
    return this.equipmentData.allEquipment_()
  }

  protected envOptions: { value: string; label: string }[] = ENV_TYPES.map((env) => ({ value: env, label: env }))
  protected equipmentOptions_ = computed(() =>
    this.equipmentData.allEquipment_().map((eq) => ({ value: eq._id, label: eq.nameHebrew }))
  )

  ngOnInit(): void {
    void this.venueData.ensureLoaded()
    void this.equipmentData.ensureLoaded()
    this.buildForm()
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const venue = data['venue'] as VenueProfile | null | undefined
      if (venue) {
        this.isEditMode_.set(true)
        this.hydrateForm(venue)
      }
      this.initialSnapshot_ = this.currentSnapshot_()
    })
  }

  /** pendingChangesGuard: anything changed since the form was loaded (fields or photo)? */
  hasRealChanges(): boolean {
    return !!this.venueForm_ && this.currentSnapshot_() !== this.initialSnapshot_
  }

  /** pendingChangesGuard "save and leave": saves without navigating; the guard then lets the navigation through. */
  saveAndWait(): Promise<boolean> {
    return this.persist_()
  }

  private currentSnapshot_(): string {
    return JSON.stringify({ form: this.venueForm_.getRawValue(), photoUrl: this.photoUrl_() })
  }

  private buildForm(): void {
    this.venueForm_ = this.fb.group({
      nameHebrew: [
        '',
        [
          Validators.required,
          duplicateEntityNameValidator(
            () => this.venueData.allVenues_(),
            () => (this.route.snapshot.data['venue'] as VenueProfile)?._id ?? null
          )
        ]
      ],
      environmentType: ['outdoor_field', [Validators.required]],
      notes: [''],
      availableInfrastructure: this.fb.array([]),
      address: [''],
      capacity: [null],
      contactName: [''],
      contactPhone: [''],
      operatingHours: this.fb.array([]),
      active: [true]
    })
  }

  private hydrateForm(v: VenueProfile): void {
    this.venueForm_.patchValue({
      nameHebrew: v.nameHebrew ?? '',
      environmentType: v.environmentType ?? 'outdoor_field',
      notes: v.notes ?? '',
      address: v.address ?? '',
      capacity: v.capacity ?? null,
      contactName: v.contactName ?? '',
      contactPhone: v.contactPhone ?? '',
      active: v.active ?? true
    })
    this.photoUrl_.set(v.photoUrl ?? null)
    const arr = this.infraArray
    arr.clear()
    ;(v.availableInfrastructure ?? []).forEach((item) => {
      arr.push(
        this.fb.group({
          equipmentId: [item.equipmentId, Validators.required],
          availableQuantity: [item.availableQuantity, [Validators.required, Validators.min(0)]]
        })
      )
    })
    const hours = this.hoursArray
    hours.clear()
    ;(v.operatingHours ?? []).forEach((item) => {
      hours.push(
        this.fb.group({
          days: [item.days, Validators.required],
          time: [item.time, Validators.required]
        })
      )
    })
  }

  protected onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.uploadingPhoto_.set(true)
    this.cloudinary
      .upload(file)
      .pipe(take(1))
      .subscribe({
        next: (url) => {
          this.photoUrl_.set(url)
          this.uploadingPhoto_.set(false)
        },
        error: () => {
          this.uploadingPhoto_.set(false)
          this.userMsg.onSetErrorMsg(this.translation.translate('image_upload_failed'))
        }
      })
  }

  protected addInfraRow(): void {
    this.infraArray.push(
      this.fb.group({
        equipmentId: ['', Validators.required],
        availableQuantity: [1, [Validators.required, Validators.min(0)]]
      })
    )
  }

  protected removeInfraRow(index: number): void {
    this.infraArray.removeAt(index)
  }

  protected addHoursRow(): void {
    this.hoursArray.push(
      this.fb.group({
        days: ['', Validators.required],
        time: ['', Validators.required]
      })
    )
  }

  protected removeHoursRow(index: number): void {
    this.hoursArray.removeAt(index)
  }

  private validateForm_(): boolean {
    const errors: Record<string, string> = {}
    const val = this.venueForm_.getRawValue()
    if (!val.nameHebrew?.trim()) errors['nameHebrew'] = 'field_name_required'
    this.validationErrors_.set(errors)
    return Object.keys(errors).length === 0
  }

  async onSubmit(): Promise<void> {
    const saved = await this.persist_()
    if (!saved) return
    if (this.embeddedInDashboard()) {
      this.saved.emit()
    } else {
      this.router.navigate(['/venues/list'])
    }
  }

  /** Validates and saves (add or update). Resolves true on success; never navigates. */
  private async persist_(): Promise<boolean> {
    if (!this.requireAuth.requireAuth()) return false
    if (!this.validateForm_()) {
      this.venueForm_.markAllAsTouched()
      this.userMsg.onSetErrorMsg(this.translation.translate('form_has_errors'))
      return false
    }
    if (this.venueForm_.invalid) return false
    try {
      await this.saving.withSaving(() => this.saveVenue_())
    } catch {
      return false
    }
    this.isSubmitted = true
    return true
  }

  /** Builds the payload from the form and adds or updates the venue. */
  private async saveVenue_(): Promise<void> {
    const v = this.venueForm_.getRawValue()
    const infra: VenueInfraItem[] = (v.availableInfrastructure ?? [])
      .filter((row: { equipmentId: string }) => row.equipmentId)
      .map((row: { equipmentId: string; availableQuantity: number }) => ({
        equipmentId: row.equipmentId,
        availableQuantity: Number(row.availableQuantity)
      }))
    const hours: VenueOperatingHours[] = (v.operatingHours ?? [])
      .filter((row: { days: string; time: string }) => row.days && row.time)
      .map((row: { days: string; time: string }) => ({ days: row.days, time: row.time }))

    const now = Date.now()

    if (this.isEditMode_()) {
      const venue = this.route.snapshot.data['venue'] as VenueProfile
      await this.venueData.updateVenue({
        ...venue,
        nameHebrew: v.nameHebrew,
        environmentType: v.environmentType,
        notes: v.notes || undefined,
        availableInfrastructure: infra,
        address: v.address || undefined,
        capacity: v.capacity != null && v.capacity !== '' ? Number(v.capacity) : undefined,
        contactName: v.contactName || undefined,
        contactPhone: v.contactPhone || undefined,
        operatingHours: hours,
        active: v.active,
        photoUrl: this.photoUrl_() ?? undefined
      })
    } else {
      await this.venueData.addVenue({
        nameHebrew: v.nameHebrew,
        environmentType: v.environmentType,
        notes: v.notes || undefined,
        availableInfrastructure: infra,
        address: v.address || undefined,
        capacity: v.capacity != null && v.capacity !== '' ? Number(v.capacity) : undefined,
        contactName: v.contactName || undefined,
        contactPhone: v.contactPhone || undefined,
        operatingHours: hours,
        createdAt: now,
        active: v.active,
        photoUrl: this.photoUrl_() ?? undefined
      })
    }
  }

  onCancel(): void {
    if (this.embeddedInDashboard()) {
      this.cancel.emit()
    } else {
      this.router.navigate(['/venues/list'])
    }
  }

  protected equipmentName(id: string): string {
    return this.allEquipment_.find((e) => e._id === id)?.nameHebrew ?? id
  }
}
