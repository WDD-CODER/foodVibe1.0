import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener,
  ViewChild,
  ElementRef,
  inject,
  afterNextRender,
  Injector
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '../../core/directives/click-out-side';
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component';
import { LucideAngularModule } from 'lucide-angular';
import { TranslationService } from '../../core/services/translation.service';

export interface CustomMultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

@Component({
  selector: 'app-custom-multi-select',
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
    { provide: NG_VALUE_ACCESSOR, useExisting: CustomMultiSelectComponent, multi: true }
  ],
  templateUrl: './custom-multi-select.component.html',
  styleUrl: './custom-multi-select.component.scss'
})
export class CustomMultiSelectComponent implements ControlValueAccessor {
  options = input.required<CustomMultiSelectOption[]>();
  placeholder = input<string>('');
  maxHeight = input<number>(240);
  translateLabels = input<boolean>(true);
  triggerId = input<string>('');
  compact = input<boolean>(false);
  variant = input<'default' | 'chip'>('default');
  readonlyChips = input<string[]>([]);
  addNewValue = input<string>('');
  searchable = input<boolean>(false);
  triggerTitle = input<string>('');
  clearable = input<boolean>(false);

  valueChange = output<string[]>();
  addNewChosen = output<string>();
  cleared = output<void>();

  private _value = signal<string[]>([]);
  private _onChange: (value: string[]) => void = () => {};
  private _onTouched: () => void = () => {};
  private _disabled = signal(false);

  private _injector = inject(Injector);
  private _translationService = inject(TranslationService);

  @ViewChild('triggerRef') protected triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('searchInputRef') protected searchInputRef?: ElementRef<HTMLInputElement>;

  protected open = signal(false);
  protected highlightedIndex = signal(-1);
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private _focusFromMouse = false;

  protected searchQuery_ = signal('');

  /** Returns the display text for an option — translated when translateLabels is true. */
  private getDisplayText_(label: string): string {
    return this.translateLabels()
      ? (this._translationService.translate(label) || label)
      : label;
  }

  /** Options to show in dropdown: exclude already selected and readonly chips, with optional search filter. */
  protected dropdownOptions_ = computed(() => {
    const opts = this.options();
    const value = this._value();
    const readonly = this.readonlyChips();
    const addNew = this.addNewValue();
    const query = this.searchQuery_().toLowerCase().trim();
    const isSearchable = this.searchable();

    return opts.filter((o) => {
      // When searchable, never show the static addNew option (dynamic one replaces it)
      if (isSearchable && addNew && o.value === addNew) return false;
      // Exclude already selected and readonly
      if (o.value !== addNew && (value.includes(o.value) || readonly.includes(o.value))) return false;
      // Apply search filter against the translated display text
      if (isSearchable && query) {
        return this.getDisplayText_(o.label).toLowerCase().includes(query);
      }
      return true;
    });
  });

  /** Show dynamic "create new" option when searchable and query doesn't exactly match any displayed option. */
  protected showDynamicAddNew_ = computed(() => {
    if (!this.searchable()) return false;
    const query = this.searchQuery_().trim();
    if (!query) return false;
    return !this.dropdownOptions_().some(
      (o) => this.getDisplayText_(o.label).toLowerCase() === query.toLowerCase()
    );
  });

  @HostListener('focus')
  protected onHostFocus(): void {
    this.triggerRef?.nativeElement?.focus();
  }

  writeValue(value: string[] | null): void {
    this._value.set(Array.isArray(value) ? [...value] : []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  protected get value(): string[] {
    return this._value();
  }

  protected get disabled(): boolean {
    return this._disabled();
  }

  /** Resolve option for a value (for chip label/color); fallback to value as label. */
  protected getOptionForValue(value: string): CustomMultiSelectOption {
    return this.options().find((o) => o.value === value) ?? { value, label: value };
  }

  /** Luminance-based text color for chip (contrast on background). */
  protected getChipTextColor(hex: string): string {
    if (!hex?.trim()) return 'var(--color-text-main)';
    let h = hex.trim();
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return '#0f172a';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#0f172a' : '#ffffff';
  }

  protected toggle(): void {
    if (this._disabled()) return;
    this.clearCloseTimeout();
    const next = !this.open();
    this.open.set(next);
    if (next) {
      const opts = this.dropdownOptions_();
      this.highlightedIndex.set(opts.length > 0 ? 0 : -1);
      if (this.searchable()) {
        this.focusSearchInput_();
      }
    }
  }

  protected close(): void {
    this.clearCloseTimeout();
    this.open.set(false);
    this.searchQuery_.set('');
    this._onTouched();
  }

  protected openDropdown(): void {
    if (this._disabled()) return;
    this.clearCloseTimeout();
    this.open.set(true);
    const opts = this.dropdownOptions_();
    this.highlightedIndex.set(opts.length > 0 ? 0 : -1);
    if (this.searchable()) {
      this.focusSearchInput_();
    }
  }

  private focusSearchInput_(): void {
    afterNextRender(() => {
      this.searchInputRef?.nativeElement?.focus();
    }, { injector: this._injector });
  }

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

  /** Called when the search input receives focus — cancels any pending close. */
  protected onSearchInputFocus_(): void {
    this.clearCloseTimeout();
  }

  /** Called when the search input loses focus — schedule close like the trigger does. */
  protected onSearchInputBlur_(): void {
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null;
      this.close();
    }, 120);
  }

  protected addOption(value: string): void {
    const current = this._value();
    if (current.includes(value)) return;
    const next = [...current, value];
    this._value.set(next);
    this._onChange(next);
    this.valueChange.emit(next);
  }

  protected removeOption(value: string): void {
    const next = this._value().filter((v) => v !== value);
    this._value.set(next);
    this._onChange(next);
    this.valueChange.emit(next);
  }

  protected onOptionClick(opt: CustomMultiSelectOption): void {
    if (opt.value === this.addNewValue()) {
      this.addNewChosen.emit(this.searchQuery_().trim());
      this.close();
      return;
    }
    this.addOption(opt.value);
    // Keep dropdown open for multi-select
  }

  protected onSearchInput(q: string): void {
    this.searchQuery_.set(q);
    this.highlightedIndex.set(0);
  }

  protected onDynamicAddNewClick(): void {
    this.addNewChosen.emit(this.searchQuery_().trim());
    this.close();
  }

  protected onTriggerMousedown(): void {
    this._focusFromMouse = true;
  }

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

  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (!this.open()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.toggle();
      }
      return;
    }
    const opts = this.dropdownOptions_();
    let idx = this.highlightedIndex();
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (idx >= 0 && opts[idx]) {
        if (opts[idx].value === this.addNewValue()) {
          this.addNewChosen.emit(this.searchQuery_().trim());
          this.close();
        } else {
          this.addOption(opts[idx].value);
        }
      } else if (idx < 0 && this.showDynamicAddNew_()) {
        this.onDynamicAddNewClick();
      }
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
