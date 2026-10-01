import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME } from '@services/equipment-data.service'
import { Equipment, EquipmentCategory, ScalingRule } from '@models/equipment.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { LoggingService } from '@services/logging.service'
import { useSavingState } from 'src/app/core/utils/saving-state.util'

const CATEGORIES: EquipmentCategory[] = [
  'heat_source',
  'tool',
  'container',
  'packaging',
  'infrastructure',
  'consumable'
]

@Component({
  selector: 'app-equipment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    CustomSelectComponent
  ],
  templateUrl: './equipment-form.component.html',
  styleUrl: './equipment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquipmentFormComponent implements OnInit, AfterViewInit {
  @ViewChild('nameInput') private nameInputRef?: ElementRef<HTMLInputElement>

  private readonly fb = inject(FormBuilder)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly equipmentData = inject(EquipmentDataService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly logging = inject(LoggingService)

  protected equipmentForm_!: FormGroup
  protected isEditMode_ = signal(false)
  private readonly saving = useSavingState()
  protected readonly isSaving_ = this.saving.isSaving_
  protected categories = CATEGORIES
  protected categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }))
  protected validationErrors_ = signal<Record<string, string>>({})

  ngOnInit(): void {
    this.buildForm()
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const equipment = data['equipment'] as Equipment | null | undefined
      if (equipment) {
        this.isEditMode_.set(true)
        this.hydrateForm(equipment)
      } else {
        this.patchScalingDefaults()
      }
    })
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.nameInputRef?.nativeElement?.focus(), 0)
  }

  private buildForm(): void {
    this.equipmentForm_ = this.fb.group({
      nameHebrew: ['', [Validators.required]],
      category: ['tool', [Validators.required]],
      ownedQuantity: [1, [Validators.required, Validators.min(0)]],
      isConsumable: [false],
      notes: [''],
      scaling_enabled_: [false],
      perGuests: [25, [Validators.min(1)]],
      minQuantity: [1, [Validators.min(0)]],
      maxQuantity: [null as number | null]
    })
  }

  private hydrateForm(e: Equipment): void {
    this.equipmentForm_.patchValue({
      nameHebrew: e.nameHebrew ?? '',
      category: e.category ?? 'tool',
      ownedQuantity: e.ownedQuantity ?? 0,
      isConsumable: e.isConsumable ?? false,
      notes: e.notes ?? '',
      scaling_enabled_: !!e.scalingRule,
      perGuests: e.scalingRule?.perGuests ?? 25,
      minQuantity: e.scalingRule?.minQuantity ?? 1,
      maxQuantity: e.scalingRule?.maxQuantity ?? null
    })
  }

  private patchScalingDefaults(): void {
    this.equipmentForm_.patchValue({
      scaling_enabled_: false,
      perGuests: 25,
      minQuantity: 1,
      maxQuantity: null
    })
  }

  private validateForm_(): boolean {
    const errors: Record<string, string> = {}
    const val = this.equipmentForm_.getRawValue()
    if (!val.nameHebrew?.trim()) errors['nameHebrew'] = 'field_name_required'
    if (!val.category?.trim()) errors['category'] = 'field_category_required'
    this.validationErrors_.set(errors)
    return Object.keys(errors).length === 0
  }

  async onSubmit(): Promise<void> {
    if (!this.validateForm_()) {
      this.equipmentForm_.markAllAsTouched()
      this.userMsg.onSetErrorMsg(this.translation.translate('form_has_errors'))
      return
    }
    if (this.equipmentForm_.invalid) return
    await this.saving.withSaving(async () => {
      try {
        const v = this.equipmentForm_.getRawValue()
        const now = Date.now()
        const scalingRule: ScalingRule | undefined = v.scaling_enabled_
          ? {
              perGuests: Number(v.perGuests),
              minQuantity: Number(v.minQuantity),
              maxQuantity: v.maxQuantity != null && v.maxQuantity !== '' ? Number(v.maxQuantity) : undefined
            }
          : undefined

        if (this.isEditMode_()) {
          const equipment = this.route.snapshot.data['equipment'] as Equipment
          const updated: Equipment = {
            ...equipment,
            nameHebrew: v.nameHebrew,
            category: v.category,
            ownedQuantity: Number(v.ownedQuantity),
            isConsumable: !!v.isConsumable,
            notes: v.notes ?? undefined,
            scalingRule: scalingRule,
            updatedAt: now
          }
          await this.equipmentData.updateEquipment(updated)
        } else {
          await this.equipmentData.addEquipment({
            nameHebrew: v.nameHebrew,
            category: v.category,
            ownedQuantity: Number(v.ownedQuantity),
            scalingRule: scalingRule,
            isConsumable: !!v.isConsumable,
            notes: v.notes || undefined,
            createdAt: now,
            updatedAt: now
          })
        }
        const listPath = this.router.url.startsWith('/inventory/equipment')
          ? ['/inventory/equipment']
          : ['/equipment/list']
        this.router.navigate(listPath)
      } catch (err) {
        this.logging.error({ event: 'equipment.save_error', message: 'Equipment save error', context: { err } })
        const msg =
          err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME
            ? (this.translation.translate('duplicate_equipment_name') ?? 'כלי עם שם זה כבר קיים')
            : (this.translation.translate('save_failed') ?? 'שגיאה בשמירה')
        this.userMsg.onSetErrorMsg(msg)
      }
    })
  }

  onCancel(): void {
    const listPath = this.router.url.startsWith('/inventory/equipment') ? ['/inventory/equipment'] : ['/equipment/list']
    this.router.navigate(listPath)
  }
}
