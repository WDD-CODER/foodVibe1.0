import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener,
  ViewChild,
  ElementRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '../../core/directives/click-out-side';
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-custom-select',
  standalone: true,
  host: { tabIndex: '-1' },
  imports: [
    CommonModule,
    TranslatePipe,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    LucideAngularModule
  ],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: CustomSelectComponent, multi: true }
  ],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss'
})
export class CustomSelectComponent implements ControlValueAccessor {
  options = input.required<{ value: string; label: string }[]>();
  placeholder = input<string>('');
  maxHeight = input<number>(240);
  translateLabels = input<boolean>(true);
  /** Optional id for the trigger (e.g. for focus management). */
  triggerId = input<string>('');

  valueChange = output<string>();

  private _value = signal<string>('');
  private _onChange: (value: string) => void = () => {};
  private _onTouched: () => void = () => {};
  private _disabled = signal(false);

  @ViewChild('triggerRef') protected triggerRef?: ElementRef<HTMLButtonElement>;

  protected open = signal(false);
  protected highlightedIndex = signal(-1);

  /** When host receives programmatic focus (e.g. from FocusByRowDirective), forward to trigger. */
  @HostListener('focus')
  protected onHostFocus(): void {
    this.triggerRef?.nativeElement?.focus();
  }

  protected selectedLabel = computed(() => {
    const v = this._value();
    const opts = this.options();
    const opt = opts.find((o) => o.value === v);
    return opt ? opt.label : '';
  });

  writeValue(value: string): void {
    this._value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  protected get value(): string {
    return this._value();
  }

  protected get disabled(): boolean {
    return this._disabled();
  }

  protected toggle(): void {
    if (this._disabled()) return;
    const next = !this.open();
    this.open.set(next);
    if (next) {
      const idx = this.options().findIndex((o) => o.value === this._value());
      this.highlightedIndex.set(idx >= 0 ? idx : 0);
    }
  }

  protected close(): void {
    this.open.set(false);
    this._onTouched();
  }

  protected select(value: string): void {
    this._value.set(value);
    this._onChange(value);
    this.valueChange.emit(value);
    this.close();
  }

  protected onTriggerClick(): void {
    this.toggle();
  }

  protected onOptionClick(opt: { value: string; label: string }): void {
    this.select(opt.value);
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (!this.open()) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
      return;
    }
    const opts = this.options();
    let idx = this.highlightedIndex();
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx >= 0 && opts[idx]) this.select(opts[idx].value);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, opts.length - 1);
      this.highlightedIndex.set(idx);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
      this.highlightedIndex.set(idx);
      return;
    }
    if (e.key === 'Tab') {
      this.close();
    }
  }
}
