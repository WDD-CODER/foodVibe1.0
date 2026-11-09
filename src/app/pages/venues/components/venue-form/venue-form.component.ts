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
import { useUnsavedChanges } from 'src/app/core/utils/unsaved-changes'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
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
import { refusalShownToUser, serverFieldErrors } from '@utils/server-refusal.util'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TimeFieldComponent } from 'src/app/shared/time-field/time-field.component'
import {
  checkHoursRow,
  formatTimeRange,
  parseTimeRange,
  type HoursRowResult
} from 'src/app/core/utils/venue-hours.util'

const ENV_TYPES: EnvironmentType[] = ['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue']

type HoursRaw = { days: string; open: string; close: string; openInvalid: boolean; closeInvalid: boolean }

/** A row result that blocks save and gets a mark (plan 537). */
function isBrokenHours(result: HoursRowResult): boolean {
  return result !== 'ok' && result !== 'overnight' && result !== 'empty'
}

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [
    SelectOnFocusDirective,
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    CustomSelectComponent,
    FormFieldComponent,
    TimeFieldComponent
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
  /** Plan 537: marks on hours rows appear only after the first blocked save. */
  protected readonly hoursSubmitAttempted_ = signal(false)
  /** Plan 537: row index -> check result, refreshed by validateForm_() and (after the first attempt) on every change. */
  protected readonly hoursErrors_ = signal<Record<number, HoursRowResult>>({})
  /** design-port session 6 — Cloudinary-hosted venue photo, same pattern as recipe-header's imageUrl. */
  protected readonly photoUrl_ = signal<string | null>(null)
  protected readonly isUploadingPhoto_ = signal(false)

  /** pendingChangesGuard contract (plan 371): true once a save succeeded, so leaving doesn't prompt. */
  isSubmitted = false
  /** Form + photo as loaded (add: empty form; edit: after hydrateForm) — compared by hasRealChanges(). */
  private readonly unsaved_ = useUnsavedChanges({
    form: () => this.venueForm_,
    snapshot: () => JSON.stringify({ form: this.venueForm_.getRawValue(), photoUrl: this.photoUrl_() }),
    isSubmitted: () => this.isSubmitted
  })

  protected get infraArray(): FormArray {
    return this.venueForm_?.get('availableInfrastructure') as FormArray
  }

  protected get hoursArray(): FormArray {
    return this.venueForm_?.get('operatingHours') as FormArray
  }

  protected envOptions: { value: string; label: string }[] = ENV_TYPES.map((env) => ({ value: env, label: env }))
  /** Fixed venue infrastructure (ovens, fridges, sinks…) — equipment with category 'infrastructure'. */
  protected infraOptions_ = computed(() => this.optionsFor_(true))
  /** Every other (portable) equipment category. */
  protected otherEquipmentOptions_ = computed(() => this.optionsFor_(false))

  private optionsFor_(infra: boolean): { value: string; label: string }[] {
    return this.equipmentData
      .allEquipment_()
      .filter((eq) => (eq.category === 'infrastructure') === infra)
      .map((eq) => ({ value: eq._id, label: eq.nameHebrew }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'))
  }

  private groupFor_(equipmentId: string): 'infra' | 'other' {
    const eq = this.equipmentData.allEquipment_().find((e) => e._id === equipmentId)
    return eq?.category === 'infrastructure' ? 'infra' : 'other'
  }

  private infraRow_(equipmentId: string, quantity: number, group: 'infra' | 'other'): FormGroup {
    return this.fb.group({
      equipmentId: [equipmentId, Validators.required],
      availableQuantity: [quantity, [Validators.required, Validators.min(0)]],
      /** UI only — never sent to the server. */
      group: [group]
    })
  }

  ngOnInit(): void {
    void this.venueData.ensureLoaded()
    void this.equipmentData.ensureLoaded().then(() => this.regroupRows_())
    this.buildForm()
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const venue = data['venue'] as VenueProfile | null | undefined
      if (venue) {
        this.isEditMode_.set(true)
        this.hydrateForm(venue)
      }
      this.unsaved_.markSaved()
    })
  }

  /** pendingChangesGuard: anything changed since the form was loaded (fields or photo)? */
  hasRealChanges(): boolean {
    return this.unsaved_.hasChanges()
  }

  /** pendingChangesGuard "save and leave": saves without navigating; the guard then lets the navigation through. */
  saveAndWait(): Promise<boolean> {
    return this.persist_()
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
    this.venueForm_.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.hoursSubmitAttempted_()) this.refreshHoursErrors_()
    })
  }

  /** Plan 537: one hours row; no validators (the row check runs on save). `openInvalid` / `closeInvalid` are UI only. */
  private hoursRow_(days: string, open: string, close: string): FormGroup {
    return this.fb.group({ days: [days], open: [open], close: [close], openInvalid: [false], closeInvalid: [false] })
  }

  private refreshHoursErrors_(): Record<number, HoursRowResult> {
    const errors: Record<number, HoursRowResult> = {}
    ;(this.hoursArray.getRawValue() as HoursRaw[]).forEach((row, i) => {
      errors[i] = checkHoursRow(row)
    })
    this.hoursErrors_.set(errors)
    return errors
  }

  /** The mark of a row, only after the first blocked save: broken results only. */
  protected hoursMark_(index: number): HoursRowResult | null {
    if (!this.hoursSubmitAttempted_()) return null
    const result = this.hoursErrors_()[index]
    return result && isBrokenHours(result) ? result : null
  }

  protected hoursMessageKey_(index: number): string | null {
    switch (this.hoursMark_(index)) {
      case 'missing_days':
        return 'venue_hours_missing_days'
      case 'missing_time':
        return 'venue_hours_missing_time'
      case 'same_time':
        return 'venue_hours_same_time'
      default:
        return null
    }
  }

  protected timeFlagged_(index: number, which: 'open' | 'close'): boolean {
    const mark = this.hoursMark_(index)
    if (mark === 'same_time') return true
    if (mark !== 'missing_time') return false
    return !this.hoursArray.at(index).get(which)?.value
  }

  protected setHoursControl_(index: number, name: string, value: string | boolean): void {
    const ctrl = this.hoursArray.at(index)?.get(name)
    if (!ctrl || ctrl.value === value) return
    ctrl.setValue(value)
    ctrl.markAsDirty()
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
      arr.push(this.infraRow_(item.equipmentId, item.availableQuantity, this.groupFor_(item.equipmentId)))
    })
    const hours = this.hoursArray
    hours.clear()
    ;(v.operatingHours ?? []).forEach((item) => {
      const range = parseTimeRange(item.time)
      hours.push(this.hoursRow_(item.days ?? '', range?.open ?? '', range?.close ?? ''))
    })
  }

  /** Equipment may finish loading after the venue was hydrated: re-place rows, only while the user has not edited. */
  private regroupRows_(): void {
    if (!this.venueForm_ || this.venueForm_.dirty) return
    this.infraArray.controls.forEach((row) => {
      const id = row.get('equipmentId')?.value as string
      if (id) row.get('group')?.setValue(this.groupFor_(id), { emitEvent: false })
    })
    this.unsaved_.markSaved()
  }

  protected onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.isUploadingPhoto_.set(true)
    this.cloudinary
      .upload(file)
      .pipe(take(1))
      .subscribe({
        next: (url) => {
          this.photoUrl_.set(url)
          this.isUploadingPhoto_.set(false)
        },
        error: () => {
          this.isUploadingPhoto_.set(false)
          this.userMsg.onSetErrorMsg(this.translation.translate('image_upload_failed'))
        }
      })
  }

  protected addInfraRow(group: 'infra' | 'other' = 'other'): void {
    this.infraArray.push(this.infraRow_('', 1, group))
  }

  protected hasRowsIn(group: 'infra' | 'other'): boolean {
    return this.infraArray.controls.some((c) => c.get('group')?.value === group)
  }

  protected removeInfraRow(index: number): void {
    this.removeRowWithUndo_(this.infraArray, index)
  }

  protected addHoursRow(): void {
    this.hoursArray.push(this.hoursRow_('', '', ''))
  }

  protected removeHoursRow(index: number): void {
    this.removeRowWithUndo_(this.hoursArray, index)
  }

  private removeRowWithUndo_(array: FormArray, index: number): void {
    const removed = array.at(index)
    array.removeAt(index)
    this.userMsg.onLineRemoved(
      this.translation.translate('line_removed'),
      () => array.insert(Math.min(index, array.length), removed),
      this.destroyRef
    )
  }

  /** Error key under the name field: duplicate name (after leaving the field) or required. */
  protected nameError(): string | null {
    const ctrl = this.venueForm_.get('nameHebrew')
    if (ctrl?.errors?.['duplicateName'] && ctrl.touched) return 'duplicate_venue_name'
    return this.validationErrors_()['nameHebrew'] || null
  }

  private validateForm_(): boolean {
    const errors: Record<string, string> = {}
    const val = this.venueForm_.getRawValue()
    if (!val.nameHebrew?.trim()) errors['nameHebrew'] = 'field_name_required'
    this.validationErrors_.set(errors)
    const hoursBroken = Object.values(this.refreshHoursErrors_()).some(isBrokenHours)
    if (hoursBroken) this.hoursSubmitAttempted_.set(true)
    return Object.keys(errors).length === 0 && !hoursBroken
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
    } catch (err) {
      // Plan 540: mark the refused name; the interceptor toasted a server refusal, any other failure gets one here.
      this.validationErrors_.update((cur) => ({ ...cur, ...serverFieldErrors(err, { nameHebrew: 'nameHebrew' }) }))
      if (!refusalShownToUser(err)) this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
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
    const hours: VenueOperatingHours[] = ((v.operatingHours ?? []) as HoursRaw[])
      .filter((row) => {
        const result = checkHoursRow(row)
        return result === 'ok' || result === 'overnight'
      })
      .map((row) => ({ days: row.days.trim(), time: formatTimeRange(row.open, row.close) }))

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
}
