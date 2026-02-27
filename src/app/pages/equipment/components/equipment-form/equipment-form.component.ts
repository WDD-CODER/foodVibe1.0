import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EquipmentDataService } from '@services/equipment-data.service';
import {
  Equipment,
  EquipmentCategory,
  ScalingRule,
} from '@models/equipment.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

const CATEGORIES: EquipmentCategory[] = [
  'heat_source',
  'tool',
  'container',
  'packaging',
  'infrastructure',
  'consumable',
];

@Component({
  selector: 'app-equipment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './equipment-form.component.html',
  styleUrl: './equipment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly destroyRef = inject(DestroyRef);

  protected equipmentForm_!: FormGroup;
  protected isEditMode_ = signal(false);
  protected categories = CATEGORIES;

  ngOnInit(): void {
    this.buildForm();
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const equipment = data['equipment'] as Equipment | null | undefined;
      if (equipment) {
        this.isEditMode_.set(true);
        this.hydrateForm(equipment);
      } else {
        this.patchScalingDefaults();
      }
    });
  }

  private buildForm(): void {
    this.equipmentForm_ = this.fb.group({
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

  private hydrateForm(e: Equipment): void {
    this.equipmentForm_.patchValue({
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

  private patchScalingDefaults(): void {
    this.equipmentForm_.patchValue({
      scaling_enabled_: false,
      per_guests_: 25,
      min_quantity_: 1,
      max_quantity_: null,
    });
  }

  async onSubmit(): Promise<void> {
    if (this.equipmentForm_.invalid) return;
    const v = this.equipmentForm_.getRawValue();
    const now = new Date().toISOString();
    const scalingRule: ScalingRule | undefined = v.scaling_enabled_
      ? {
          per_guests_: Number(v.per_guests_),
          min_quantity_: Number(v.min_quantity_),
          max_quantity_: v.max_quantity_ != null && v.max_quantity_ !== '' ? Number(v.max_quantity_) : undefined,
        }
      : undefined;

    if (this.isEditMode_()) {
      const equipment = this.route.snapshot.data['equipment'] as Equipment;
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
    } else {
      await this.equipmentData.addEquipment({
        name_hebrew: v.name_hebrew,
        category_: v.category_,
        owned_quantity_: Number(v.owned_quantity_),
        scaling_rule_: scalingRule,
        is_consumable_: !!v.is_consumable_,
        notes_: v.notes_ || undefined,
        created_at_: now,
        updated_at_: now,
      });
    }
    this.router.navigate(['/equipment/list']);
  }

  onCancel(): void {
    this.router.navigate(['/equipment/list']);
  }
}
