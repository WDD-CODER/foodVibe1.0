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
  private unitRegistryService = inject(UnitRegistryService);
  protected isOpen_ = this.unitRegistryService.isCreatorOpen_;

  netUnitCost = input<number>(0);
  unitSaved = output<{ symbol: string, rate: number }>();
  closed = output<void>();

  // Technical Keys for logic
  newUnitName_ = signal('');
  newUnitValue_ = signal(1);
  basisUnit_ = signal<string>(''); // 🛠️ REFACTORED: Use technical key 'gram'

  protected basisOptions_ = this.unitRegistryService.allUnitKeys_;

  save() {
    if (this.newUnitName_() && this.newUnitValue_() > 0) {
      // We save the custom name as the key and the rate as the value
      this.unitRegistryService.registerUnit(this.newUnitName_(), this.newUnitValue_());
      this.unitRegistryService.closeUnitCreator();
      this.resetFields();
    }
  }

  close() {
    this.unitRegistryService.closeUnitCreator();
    this.resetFields();
  }

  private resetFields() {
    this.newUnitName_.set('');
    this.newUnitValue_.set(1);
    this.basisUnit_.set(''); // 🛠️ REFACTORED: Use technical key 'gram'
  }

  resetAndClose() {
    this.close();
    this.closed.emit();
  }
}