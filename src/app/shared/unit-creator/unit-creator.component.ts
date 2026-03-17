import { Component, computed, effect, inject, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UnitRegistryService } from '@services/unit-registry.service';
import { TranslationService } from '@services/translation.service';
import { KeyResolutionService } from '@services/key-resolution.service';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'unit-creator-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    SelectOnFocusDirective,
    CustomSelectComponent,
    TranslatePipe
  ],
  templateUrl: './unit-creator.component.html',
  styleUrl: './unit-creator.component.scss'
})
export class UnitCreatorModal {
  private unitRegistryService = inject(UnitRegistryService);
  private translationService = inject(TranslationService);
  private keyResolution = inject(KeyResolutionService);
  protected isOpen_ = this.unitRegistryService.isCreatorOpen_;

  constructor() {
    effect(() => {
      if (this.isOpen_()) {
        setTimeout(() => document.getElementById('unit-creator-name')?.focus(), 0);
      }
    });
  }

  netUnitCost = input<number>(0);
  unitSaved = output<{ symbol: string, rate: number }>();
  closed = output<void>();

  // Technical Keys for logic
  newUnitName_ = signal('');
  newUnitValue_ = signal(1);
  basisUnit_ = signal<string>(''); // 🛠️ REFACTORED: Use technical key 'gram'

  protected basisOptions_ = this.unitRegistryService.allUnitKeys_;
  protected basisUnitOptions_ = computed(() =>
    this.basisOptions_().map((k) => ({ value: k, label: k }))
  );

  protected isSaving_ = signal(false);
  protected errorMessage_ = signal<string | null>(null);

  async save(): Promise<void> {
    const name = this.newUnitName_();
    const value = this.newUnitValue_();
    const basis = this.basisUnit_();
    if (!name || value <= 0 || !basis || this.isSaving_()) return;
    this.errorMessage_.set(null);
    this.isSaving_.set(true);
    try {
      const result = await this.unitRegistryService.registerUnit(name, value, basis);
      if (!result.success) {
        if (result.alreadyOnProduct) {
          this.errorMessage_.set('unit_already_on_product');
        } else if (result.error) {
          this.errorMessage_.set(result.error);
        }
        return;
      }
      this.unitRegistryService.closeUnitCreator();
      this.resetFields();
    } catch (err) {
      this.errorMessage_.set('unit_save_error');
    } finally {
      this.isSaving_.set(false);
    }
  }

  close() {
    this.unitRegistryService.closeUnitCreator();
    this.resetFields();
  }

  private resetFields() {
    this.errorMessage_.set(null);
    this.newUnitName_.set('');
    this.newUnitValue_.set(1);
    this.basisUnit_.set(''); // 🛠️ REFACTORED: Use technical key 'gram'
  }

  resetAndClose() {
    this.close();
    this.closed.emit();
  }

  onUnitNameChange(value: string): void {
    this.newUnitName_.set(value);
    this.errorMessage_.set(null);
  }

  /** Focus the basis-unit dropdown trigger so user can open it with Enter/Space and use arrows. */
  focusBasisUnitSelect(): void {
    document.getElementById('unit-creator-basis-unit')?.focus();
  }

  /** Focus the amount input (after name resolution). */
  focusAmountInput(): void {
    document.getElementById('unit-creator-amount')?.focus();
  }

  /**
   * On Enter/Tab from name: if name is empty or resolves to a key, focus amount;
   * else open translation modal; on confirm focus amount, on cancel stay on name.
   */
  async onNameLeave(event: Event): Promise<void> {
    event.preventDefault();
    const trimmed = this.newUnitName_().trim();
    if (!trimmed) {
      this.focusAmountInput();
      return;
    }
    if (this.translationService.resolveUnit(trimmed)) {
      this.focusAmountInput();
      return;
    }
    const key = await this.keyResolution.ensureKeyForContext(trimmed, 'unit');
    if (key != null) {
      this.focusAmountInput();
    }
  }
}