import {
  Component,
  input,
  output,
  effect,
  inject,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component';
import { CounterComponent } from 'src/app/shared/counter/counter.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { QuantityStepOptions } from 'src/app/core/utils/quantity-step.util';
import { LucideAngularModule } from 'lucide-angular';

const ADD_NEW_UNIT_VALUE = '__add_unit__';

@Component({
  selector: 'app-scaling-chip',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomSelectComponent,
    CounterComponent,
    TranslatePipe,
    LucideAngularModule,
  ],
  templateUrl: './scaling-chip.component.html',
  styleUrl: './scaling-chip.component.scss',
})
export class ScalingChipComponent implements OnDestroy {
  value = input.required<number>();
  unit = input.required<string>();
  unitOptions = input.required<{ value: string; label: string }[]>();
  minAmount = input<number>(0);
  stepOptions = input<QuantityStepOptions | undefined>(undefined);
  variant = input<'primary' | 'secondary'>('primary');
  showRemove = input<boolean>(false);

  valueChange = output<number>();
  unitChange = output<string>();
  createUnit = output<void>();
  remove = output<void>();

  @ViewChild(CustomSelectComponent) customSelect?: CustomSelectComponent;

  readonly unitControl = new FormControl<string>('', { nonNullable: true });
  private subscription: { unsubscribe: () => void } | null = null;

  constructor() {
    effect(() => {
      const u = this.unit();
      this.unitControl.setValue(u ?? '', { emitEvent: false });
    });
    this.subscription = this.unitControl.valueChanges.subscribe((v) =>
      this.onUnitSelect(v)
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected onUnitSelect(value: string): void {
    if (value === ADD_NEW_UNIT_VALUE) {
      this.createUnit.emit();
      this.unitControl.setValue(this.unit(), { emitEvent: false });
      return;
    }
    this.unitChange.emit(value);
  }

  protected onRemove(): void {
    this.remove.emit();
  }

  protected get addNewValue(): string {
    return ADD_NEW_UNIT_VALUE;
  }
}
