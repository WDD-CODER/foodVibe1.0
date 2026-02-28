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
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VenueDataService } from '@services/venue-data.service';
import { EquipmentDataService } from '@services/equipment-data.service';
import {
  VenueProfile,
  VenueInfraItem,
  EnvironmentType,
} from '@models/venue.model';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';

const ENV_TYPES: EnvironmentType[] = [
  'professional_kitchen',
  'outdoor_field',
  'client_home',
  'popup_venue',
];

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './venue-form.component.html',
  styleUrl: './venue-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly venueData = inject(VenueDataService);
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly destroyRef = inject(DestroyRef);

  protected venueForm_!: FormGroup;
  protected isEditMode_ = signal(false);
  protected isSaving_ = signal(false);
  protected envTypes = ENV_TYPES;

  protected get infraArray(): FormArray {
    return this.venueForm_?.get('available_infrastructure_') as FormArray;
  }

  protected get allEquipment_() {
    return this.equipmentData.allEquipment_();
  }

  ngOnInit(): void {
    this.buildForm();
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const venue = data['venue'] as VenueProfile | null | undefined;
      if (venue) {
        this.isEditMode_.set(true);
        this.hydrateForm(venue);
      }
    });
  }

  private buildForm(): void {
    this.venueForm_ = this.fb.group({
      name_hebrew: ['', [Validators.required]],
      environment_type_: ['outdoor_field', [Validators.required]],
      notes_: [''],
      available_infrastructure_: this.fb.array([]),
    });
  }

  private hydrateForm(v: VenueProfile): void {
    this.venueForm_.patchValue({
      name_hebrew: v.name_hebrew ?? '',
      environment_type_: v.environment_type_ ?? 'outdoor_field',
      notes_: v.notes_ ?? '',
    });
    const arr = this.infraArray;
    arr.clear();
    (v.available_infrastructure_ ?? []).forEach((item) => {
      arr.push(
        this.fb.group({
          equipment_id_: [item.equipment_id_, Validators.required],
          available_quantity_: [item.available_quantity_, [Validators.required, Validators.min(0)]],
        })
      );
    });
  }

  protected addInfraRow(): void {
    this.infraArray.push(
      this.fb.group({
        equipment_id_: ['', Validators.required],
        available_quantity_: [1, [Validators.required, Validators.min(0)]],
      })
    );
  }

  protected removeInfraRow(index: number): void {
    this.infraArray.removeAt(index);
  }

  async onSubmit(): Promise<void> {
    if (this.venueForm_.invalid) return;
    this.isSaving_.set(true);
    try {
      const v = this.venueForm_.getRawValue();
      const infra: VenueInfraItem[] = (v.available_infrastructure_ ?? [])
        .filter((row: { equipment_id_: string }) => row.equipment_id_)
        .map((row: { equipment_id_: string; available_quantity_: number }) => ({
          equipment_id_: row.equipment_id_,
          available_quantity_: Number(row.available_quantity_),
        }));

      const now = new Date().toISOString();

      if (this.isEditMode_()) {
        const venue = this.route.snapshot.data['venue'] as VenueProfile;
        await this.venueData.updateVenue({
          ...venue,
          name_hebrew: v.name_hebrew,
          environment_type_: v.environment_type_,
          notes_: v.notes_ || undefined,
          available_infrastructure_: infra,
        });
      } else {
        await this.venueData.addVenue({
          name_hebrew: v.name_hebrew,
          environment_type_: v.environment_type_,
          notes_: v.notes_ || undefined,
          available_infrastructure_: infra,
          created_at_: now,
        });
      }
      this.router.navigate(['/venues/list']);
    } finally {
      this.isSaving_.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/venues/list']);
  }

  protected equipmentName(id: string): string {
    return this.allEquipment_.find((e) => e._id === id)?.name_hebrew ?? id;
  }
}
