import { Component, input, inject, output, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { take } from 'rxjs/operators';
import { KitchenStateService } from '@services/kitchen-state.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { TranslationService } from '@services/translation.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service';
import { CustomMultiSelectComponent } from 'src/app/shared/custom-multi-select/custom-multi-select.component';
import { ScalingChipComponent } from 'src/app/shared/scaling-chip/scaling-chip.component';
import { ScrollIndicatorsDirective } from '@directives/scroll-indicators.directive';
import { RecipeYieldManager } from 'src/app/core/utils/recipe-yield-manager.util';

@Component({
  selector: 'app-recipe-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ClickOutSideDirective, TranslatePipe, CustomMultiSelectComponent, ScalingChipComponent, ScrollIndicatorsDirective],
  templateUrl: './recipe-header.component.html',
  styleUrl: './recipe-header.component.scss'
})
export class RecipeHeaderComponent {
  // INJECTED
  private fb = inject(FormBuilder);
  private unitRegistryService = inject(UnitRegistryService);
  private kitchenStateService = inject(KitchenStateService);
  private metadataRegistry = inject(MetadataRegistryService);
  private translationService = inject(TranslationService);
  private labelCreationModal = inject(LabelCreationModalService);
  private cdr = inject(ChangeDetectorRef);

  // INPUTS
  form = input.required<FormGroup>();
  recipeType = input<'dish' | 'preparation'>();
  imageUrl = input<string | null>(null);
  readonlyMode = input<boolean>(false);
  currentCost = input<number>(0);
  totalWeightG = input<number>(0);
  totalBrutoWeightG = input<number>(0);
  totalVolumeL = input<number>(0);
  totalVolumeMl = input<number>(0);
  unconvertibleForWeight = input<string[]>([]);
  unconvertibleForVolume = input<string[]>([]);
  resetTrigger = input<number>(0);
  autoLabels = input<string[]>([]);

  // OUTPUTS
  openUnitCreator = output<string>();
  imageChange = output<string>();
  importTextClick = output<void>();

  // YIELD MANAGER
  readonly yield = new RecipeYieldManager(
    this.form,
    this.unitRegistryService.allUnitKeys_,
    this.resetTrigger,
    this.fb
  )

  // SIGNALS & CONSTANTS
  readonly placeholderPath = 'assets/style/img/recipe_placeholder.png';

  // LABELS
  protected labelMultiSelectOptions_ = computed(() => {
    const all = this.metadataRegistry.allLabels_().map((l) => ({
      value: l.key,
      label: l.key,
      color: l.color
    }));
    return [...all, { value: '__add_label__', label: 'create_new_label' }];
  });

  protected get labelsControl(): FormControl<string[]> {
    return this.form().get('labels') as FormControl<string[]>;
  }

  protected hasManualLabels_ = computed(() => {
    const arr = (this.form().get('labels')?.value ?? []) as string[];
    return arr.length > 0;
  });

  protected hasAnyLabelsInContainer_ = computed(() => {
    const manual = (this.form().get('labels')?.value ?? []) as string[];
    const auto = this.autoLabels();
    return manual.length > 0 || auto.length > 0;
  });

  // WRAPPERS — CDR / output handling

  protected toggleTypeWrapper(): void {
    this.yield.toggleType()
    this.cdr.markForCheck()
  }

  protected onPrimaryUnitChangeWrapper(event: Event): void {
    const value = (event.target as HTMLSelectElement).value
    const result = this.yield.onPrimaryUnitChange(value)
    if (result === 'create_unit') {
      this.onCreateUnit()
      ;(event.target as HTMLSelectElement).value = this.yield.primaryUnitLabel_()
    }
  }

  protected changeSecondaryUnitWrapper(chipIndex: number, newUnit: string): void {
    this.yield.changeSecondaryUnit(chipIndex, newUnit)
    this.cdr.detectChanges()
  }

  // CREATE UNIT
  protected onCreateUnit(secondaryChipIndex?: number): void {
    this.unitRegistryService.openUnitCreator();
    this.unitRegistryService.unitAdded$.pipe(take(1)).subscribe((newUnit) => {
      if (secondaryChipIndex === undefined) {
        this.yield.setPrimaryUnit(newUnit);
      } else {
        this.changeSecondaryUnitWrapper(secondaryChipIndex, newUnit);
      }
    });
  }

  // METRICS
  metricsDisplayMode_ = signal<'weight' | 'volume'>('weight');
  metricsNoticeOpen_ = signal(false);

  toggleMetricsDisplayMode(): void {
    this.metricsDisplayMode_.update(m => m === 'weight' ? 'volume' : 'weight');
    this.metricsNoticeOpen_.set(false);
  }

  toggleMetricsNotice(): void {
    this.metricsNoticeOpen_.update(v => !v);
  }

  closeMetricsNotice(): void {
    this.metricsNoticeOpen_.set(false);
  }

  private metricsNoticeCloseTimeout_: ReturnType<typeof setTimeout> | null = null;

  onMetricsNoticeZoneEnter(): void {
    if (this.metricsNoticeCloseTimeout_ != null) {
      clearTimeout(this.metricsNoticeCloseTimeout_);
      this.metricsNoticeCloseTimeout_ = null;
    }
    if (this.unconvertibleNamesFiltered_().length > 0) {
      this.metricsNoticeOpen_.set(true);
    }
  }

  onMetricsNoticeZoneLeave(): void {
    if (this.metricsNoticeCloseTimeout_ != null) {
      clearTimeout(this.metricsNoticeCloseTimeout_);
    }
    this.metricsNoticeCloseTimeout_ = setTimeout(() => {
      this.metricsNoticeCloseTimeout_ = null;
      this.metricsNoticeOpen_.set(false);
    }, 150);
  }

  protected unconvertibleNamesForCurrentMode_ = computed(() => {
    return this.metricsDisplayMode_() === 'weight'
      ? this.unconvertibleForWeight()
      : this.unconvertibleForVolume();
  });

  protected unconvertibleNamesFiltered_ = computed(() =>
    this.unconvertibleNamesForCurrentMode_().filter((n) => (n != null && String(n).trim().length > 0))
  );

  protected showMetricsNoticeIcon_ = computed(() =>
    this.metricsDisplayMode_() === 'volume' && this.unconvertibleNamesFiltered_().length > 0
  );

  // LABELS ACTIONS
  protected clearAllManualLabels(): void {
    this.form().get('labels')?.setValue([], { emitEvent: true });
  }

  protected async openCreateLabel(): Promise<void> {
    const result = await this.labelCreationModal.open();
    if (!result?.key || !result?.hebrewLabel) return;
    try {
      this.translationService.updateDictionary(result.key, result.hebrewLabel);
      await this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers);
      const current = (this.form().get('labels')?.value ?? []) as string[];
      if (!current.includes(result.key)) {
        this.form().get('labels')?.setValue([...current, result.key], { emitEvent: true });
      }
    } catch {
      // Error already shown by registry
    }
  }

  // UPDATE
  onImageSelected(event: Event): void {
    if (this.readonlyMode()) return
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      this.imageChange.emit(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
}
