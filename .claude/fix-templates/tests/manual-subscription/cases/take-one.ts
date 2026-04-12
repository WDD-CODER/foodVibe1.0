// Component: quick-add-product-modal.component.ts (adapted)
import { Component, inject } from '@angular/core';
import { take } from 'rxjs';

@Component({ selector: 'app-quick-add', template: '' })
export class QuickAddComponent {
  private unitRegistry = inject(UnitRegistryService);

  onCreateUnit(): void {
    this.unitRegistry.unitAdded$
      .pipe(take(1))
      .subscribe((newUnit) => {
        this.applyUnit(newUnit);
      });
  }

  private applyUnit(unit: any): void {}
}
