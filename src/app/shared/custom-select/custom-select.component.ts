import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener,
  ViewChild,
  ElementRef,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '../../core/directives/click-out-side';
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService } from '../../core/services/translation.service';

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
  /** When true, trigger is an input and options are filtered by typing ("starts with" + script). Default false to preserve existing layout. */
  typeToFilter = input<boolean>(false);
  /** Optional id for the trigger (e.g. for focus management). */
  triggerId = input<string>('');
  /** When true, use compact sizing to match native select in dense forms (e.g. quick-add modal). */
  compact = input<boolean>(false);
  /** 'chip' = pill trigger (e.g. recipe ingredients unit). Default = bordered trigger. */
  variant = input<'default' | 'chip'>('default');
  /** Option value treated as "add new" for styling and pinned at end when filtering. Parent handles in valueChange. */
  addNewValue = input<string>('__add_unit__');

  valueChange = output<string>();

  private _value = signal<string>('');
  private _onChange: (value: string) => void = () => {};
  private _onTouched: () => void = () => {};
  private _disabled = signal(false);
  private readonly translationService = inject(TranslationService);

  @ViewChild('triggerRef') protected triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('inputRef') protected inputRef?: ElementRef<HTMLInputElement>;

  protected open = signal(false);
  protected highlightedIndex = signal(-1);
  protected searchQuery_ = signal('');
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  /** When true, next trigger focus came from mouse (click); do not auto-open dropdown. */
  private _focusFromMouse = false;

  /** When host receives programmatic focus (e.g. from FocusByRowDirective), forward to trigger. */
  @HostListener('focus')
  protected onHostFocus(): void {
    if (this.typeToFilter()) {
      this.inputRef?.nativeElement?.focus();
    } else {
      this.triggerRef?.nativeElement?.focus();
    }
  }

  protected selectedLabel = computed(() => {
    const v = this._value();
    const opts = this.options();
    const opt = opts.find((o) => o.value === v);
    return opt ? opt.label : '';
  });

  /** Options filtered by search: "starts with" + Hebrew vs Latin by script. Add-new option is always pinned at end. Deduplicated by translated label (prefer current value). */
  protected filteredOptions_ = computed(() => {
    const raw = this.searchQuery_().trim();
    const opts = this.options();
    const addNewVal = this.addNewValue();
    const addNewOpt = opts.find((o) => o.value === addNewVal);
    const rest = addNewOpt ? opts.filter((o) => o.value !== addNewVal) : opts;
    const currentValue = this._value();
    let baseList: { value: string; label: string }[];
    if (!raw) {
      baseList = rest;
    } else {
      const qLower = raw.toLowerCase();
      const isHebrew = /[\u0590-\u05FF]/.test(raw);
      const isLatin = /[a-zA-Z]/.test(raw);
      baseList = rest.filter((opt) => {
        const display = this.translateLabels() ? this.translationService.translate(opt.label) : opt.label;
        if (isHebrew) return display.startsWith(raw);
        if (isLatin) return /[a-zA-Z]/.test(display) && display.toLowerCase().startsWith(qLower);
        return display.toLowerCase().startsWith(qLower);
      });
    }
    const deduped: { value: string; label: string }[] = [];
    const seenDisplay = new Map<string, number>();
    for (const opt of baseList) {
      const display = this.translateLabels() ? this.translationService.translate(opt.label) : opt.label;
      const existingIdx = seenDisplay.get(display);
      if (existingIdx !== undefined) {
        if (opt.value === currentValue) deduped[existingIdx] = opt;
      } else {
        seenDisplay.set(display, deduped.length);
        deduped.push(opt);
      }
    }
    return addNewOpt ? [...deduped, addNewOpt] : deduped;
  });

  /** Input display value: when open show search query, when closed show selected label (translated if needed). */
  protected inputDisplayValue_ = computed(() => {
    if (this.open()) return this.searchQuery_();
    const v = this._value();
    if (!v) return '';
    const label = this.selectedLabel();
    return this.translateLabels() ? this.translationService.translate(label) : label;
  });

  /** For chip + typeToFilter: input size attribute so width matches placeholder or value. Min 4 so "בחר" fits. */
  protected chipInputSize_ = computed(() => {
    if (this.variant() !== 'chip' || !this.typeToFilter()) return null;
    const placeholderText = this.translationService.translate(this.placeholder());
    const displayLen = this.inputDisplayValue_().length;
    const placeholderLen = placeholderText.length;
    return Math.max(4, placeholderLen, displayLen);
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
    this.clearCloseTimeout();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      const idx = this.options().findIndex((o) => o.value === this._value());
      this.highlightedIndex.set(idx >= 0 ? idx : 0);
    }
  }

  protected close(): void {
    this.clearCloseTimeout();
    this.open.set(false);
    if (this.typeToFilter()) this.searchQuery_.set('');
    this._onTouched();
  }

  protected openDropdown(): void {
    if (this._disabled()) return;
    this.clearCloseTimeout();
    this.open.set(true);
    this.searchQuery_.set('');
    const filtered = this.filteredOptions_();
    const currentIdx = this._value()
      ? filtered.findIndex((o) => o.value === this._value())
      : -1;
    this.highlightedIndex.set(currentIdx >= 0 ? currentIdx : (filtered.length > 0 ? 0 : -1));
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 0);
  }

  protected onInputInput(value: string): void {
    this.searchQuery_.set(value ?? '');
    if (!this.open()) {
      this.open.set(true);
      const filtered = this.filteredOptions_();
      this.highlightedIndex.set(filtered.length > 0 ? 0 : -1);
    } else {
      const filtered = this.filteredOptions_();
      this.highlightedIndex.set(filtered.length > 0 ? 0 : -1);
    }
  }

  protected onInputKeydown(e: KeyboardEvent): void {
    if (!this.open()) {
      if (e.key === 'Escape') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.openDropdown();
      }
      return;
    }
    const opts = this.filteredOptions_();
    let idx = this.highlightedIndex();
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      this.inputRef?.nativeElement?.blur();
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
  }

  /** Close after a short delay so option click can run first when focus moves on mousedown. */
  protected onTriggerBlur(): void {
    if (!this.open()) return;
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null;
      this.close();
    }, 120);
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeout != null) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  protected select(value: string): void {
    this._value.set(value);
    this._onChange(value);
    this.valueChange.emit(value);
    this.close();
  }

  protected onTriggerMousedown(): void {
    this._focusFromMouse = true;
  }

  /** Open dropdown when trigger receives focus from Tab or programmatic focus; skip when focus came from click. */
  protected onTriggerFocus(): void {
    if (this._focusFromMouse) {
      this._focusFromMouse = false;
      return;
    }
    if (!this._disabled() && !this.open()) {
      this.openDropdown();
    }
  }

  protected onTriggerClick(): void {
    this.toggle();
  }

  protected onOptionClick(opt: { value: string; label: string }): void {
    this.select(opt.value);
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (this.typeToFilter() && (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (!this.open()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.toggle();
      }
      return;
    }
    const opts = this.typeToFilter() ? this.filteredOptions_() : this.options();
    let idx = this.highlightedIndex();
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
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
