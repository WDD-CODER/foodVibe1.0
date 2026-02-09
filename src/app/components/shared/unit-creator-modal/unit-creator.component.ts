import { Component, inject, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UnitRegistryService } from '@services/unit-registry.service';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { SelectOnFocusDirective } from "@directives/select-on-focus.directive";
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'; // Adjusted name

@Component({
  selector: 'unit-creator-modal',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    ClickOutSideDirective, 
    SelectOnFocusDirective,
    TranslatePipe // 👈 Added
  ],
  templateUrl: './unit-creator.component.html',
  styleUrl: './unit-creator.component.scss'
})
export class UnitCreatorModal {
  private unitRegistry = inject(UnitRegistryService);
  protected isOpen_ = this.unitRegistry.isCreatorOpen_;

  netUnitCost = input<number>(0);
  unitSaved = output<{ symbol: string, rate: number }>();
  closed = output<void>();

  // Technical Keys for logic
  newUnitName = signal('');
  newUnitValue = signal(1);
  basisUnit = signal('grams'); // 🛠️ REFACTORED: Use technical key 'grams'

  save() {
    if (this.newUnitName() && this.newUnitValue() > 0) {
      // We save the custom name as the key and the rate as the value
      this.unitRegistry.registerUnit(this.newUnitName(), this.newUnitValue());
      this.unitRegistry.closeUnitCreator();
      this.resetFields();
    }
  }

  close() {
    this.unitRegistry.closeUnitCreator();
    this.resetFields();
  }

  private resetFields() {
    this.newUnitName.set('');
    this.newUnitValue.set(1);
    this.basisUnit.set('grams'); // 🛠️ REFACTORED: Use technical key 'grams'
  }

  resetAndClose() {
    this.close();
    this.closed.emit();
  }
}