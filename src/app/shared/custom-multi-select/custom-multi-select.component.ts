import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  computed,
  viewChild,
  ElementRef,
  inject,
  afterNextRender,
  Injector
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClickOutSideDirective } from '../../core/directives/click-out-side'
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component'
import { LucideAngularModule } from 'lucide-angular'
import { TranslationService } from '../../core/services/translation.service'
import { InputClearComponent } from '../input-clear/input-clear.component'
import { AddOptionRowComponent } from '../add-option-row/add-option-row.component'
import {
  AddOptionLabel,
  addOptionLabel,
  DEFAULT_ADD_NEW_LABEL_KEY,
  findOptionByLabel
} from '../../core/utils/add-option.util'
import { filterOptionsByLabel } from '../../core/utils/option-filter.util'
import { KeyedPickerSearch, scrollHighlightIntoView } from '../../core/utils/keyed-picker-search.util'

export interface CustomMultiSelectOption {
  value: string
  label: string
  color?: string
}

/** Per-instance id prefix for option ids when no triggerId is given. */
let nextMultiSelectId = 0
/** KeyedPickerSearch key — one picker per component instance. */
const PICKER_KEY = 0

@Component({
  selector: 'app-custom-multi-select',
  standalone: true,
  host: { tabIndex: '-1', '(focus)': 'onHostFocus()', '(keydown)': 'onKeydown($event)' },
  imports: [
    CommonModule,
    TranslatePipe,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    LucideAngularModule,
    InputClearComponent,
    AddOptionRowComponent
  ],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: CustomMultiSelectComponent, multi: true }],
  templateUrl: './custom-multi-select.component.html',
  styleUrl: './custom-multi-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomMultiSelectComponent implements ControlValueAccessor {
  // INJECTED
  private _injector = inject(Injector)
  private _translationService = inject(TranslationService)
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef)

  // INPUTS
  options = input.required<CustomMultiSelectOption[]>()
  placeholder = input<string>('')
  maxHeight = input<number>(240)
  translateLabels = input<boolean>(true)
  triggerId = input<string>('')
  compact = input<boolean>(false)
  variant = input<'default' | 'chip'>('default')
  readonlyChips = input<string[]>([])
  /** Sentinel option value for the single "add" option (add-option rule 1); '' = no add option. */
  addNewValue = input<string>('')
  /** Generic "add new <thing>" key shown when nothing new is typed (add-option rule 2). Never bare `add`. */
  addNewLabelKey = input<string>(DEFAULT_ADD_NEW_LABEL_KEY)
  /** Opt in when the caller's add flow takes the typed name (via addNewChosen): shows `הוסף "<typed>"`. */
  allowTypedAdd = input<boolean>(false)
  searchable = input<boolean>(false)
  triggerTitle = input<string>('')
  clearable = input<boolean>(false)

  // OUTPUTS
  valueChange = output<string[]>()
  /** The add option was chosen: the typed new name, or '' for the generic add (open the modal). */
  addNewChosen = output<string>()
  cleared = output<void>()

  // SIGNALS
  private _value = signal<string[]>([])
  private _onChange: (value: string[]) => void = () => {}
  private _onTouched: () => void = () => {}
  private _isDisabled = signal(false)

  protected readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('triggerRef')
  protected readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInputRef')

  protected isOpen = signal(false)
  private closeTimeout: ReturnType<typeof setTimeout> | null = null
  private isFocusFromMouse_ = false
  protected searchQuery_ = signal('')
  private readonly picker_ = new KeyedPickerSearch()
  private readonly instanceId_ = `cms-${++nextMultiSelectId}`

  // COMPUTED
  protected highlightedIndex = computed(() => this.picker_.highlighted(PICKER_KEY))

  /** Option id prefix — for `aria-activedescendant` (focus stays in the search input, rule 5d). */
  protected optionIdPrefix_ = computed(() => (this.triggerId() || this.instanceId_) + '-opt-')

  /** The single add option (rule 1) — when the caller lists the `addNewValue` sentinel and the search doesn't exactly name an option (rule X). */
  protected addNewOption_ = computed(() => {
    const addNew = this.addNewValue()
    const addOpt = addNew ? (this.options().find((o) => o.value === addNew) ?? null) : null
    if (!addOpt || !this.searchable()) return addOpt
    const rest = this.options().filter((o) => o.value !== addNew)
    return findOptionByLabel(this.searchQuery_(), rest, (o) => this.getDisplayText_(o.label)) ? null : addOpt
  })

  /** Options to show: exclude the add sentinel, already selected and readonly chips; search by on-screen label (rule 3). */
  protected dropdownOptions_ = computed(() => {
    const value = this._value()
    const readonly = this.readonlyChips()
    const addNew = this.addNewValue()
    const query = this.searchable() ? this.searchQuery_() : ''
    const pickable = this.options().filter(
      (o) => !(addNew && o.value === addNew) && !value.includes(o.value) && !readonly.includes(o.value)
    )
    return filterOptionsByLabel(pickable, query, (o) => this.getDisplayText_(o.label))
  })

  /** Display and keyboard order: the options, then the add option last (rule 5e). */
  protected keyboardOptions_ = computed(() => {
    const add = this.addNewOption_()
    const opts = this.dropdownOptions_()
    return add ? [...opts, add] : opts
  })

  /** Add option label: typed new name (no option has that on-screen label), else the generic key (rule 2–3). */
  protected addLabel_ = computed<AddOptionLabel>(() => {
    const addNew = this.addNewValue()
    const all = this.options().filter((o) => o.value !== addNew)
    const typed = this.searchable() && this.allowTypedAdd() ? this.searchQuery_() : ''
    return addOptionLabel(typed, all, (o) => this.getDisplayText_(o.label), this.addNewLabelKey())
  })

  protected onHostFocus(): void {
    this.triggerRef()?.nativeElement?.focus()
  }

  writeValue(value: string[] | null): void {
    this._value.set(Array.isArray(value) ? [...value] : [])
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this._onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this._isDisabled.set(isDisabled)
  }

  protected get value(): string[] {
    return this._value()
  }

  protected get disabled(): boolean {
    return this._isDisabled()
  }

  // CREATE
  protected addOption(value: string): void {
    const current = this._value()
    if (current.includes(value)) return
    const next = [...current, value]
    this._value.set(next)
    this._onChange(next)
    this.valueChange.emit(next)
  }

  // READ
  /** Resolve option for a value (for chip label/color); fallback to value as label. */
  protected getOptionForValue(value: string): CustomMultiSelectOption {
    return this.options().find((o) => o.value === value) ?? { value, label: value }
  }

  /** Luminance-based text color for chip (contrast on background). */
  protected getChipTextColor(hex: string): string {
    if (!hex?.trim()) return 'var(--color-text-main)'
    let h = hex.trim()
    if (h.startsWith('#')) h = h.slice(1)
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    if (h.length !== 6) return '#0f172a'
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#0f172a' : '#ffffff'
  }

  /** Returns the display text for an option — translated when translateLabels is true. */
  private getDisplayText_(label: string): string {
    return this.translateLabels() ? this._translationService.translate(label) || label : label
  }

  // DELETE
  protected removeOption(value: string): void {
    const next = this._value().filter((v) => v !== value)
    this._value.set(next)
    this._onChange(next)
    this.valueChange.emit(next)
  }

  // UI HANDLERS
  protected toggle(): void {
    if (this._isDisabled()) return
    this.clearCloseTimeout()
    const next = !this.isOpen()
    this.isOpen.set(next)
    if (next) {
      this.setHighlight_(0)
      if (this.searchable()) this.focusSearchInput_()
    }
  }

  protected close(): void {
    this.clearCloseTimeout()
    this.isOpen.set(false)
    this.searchQuery_.set('')
    this._onTouched()
  }

  protected openDropdown(): void {
    if (this._isDisabled()) return
    this.clearCloseTimeout()
    this.isOpen.set(true)
    this.setHighlight_(0)
    if (this.searchable()) this.focusSearchInput_()
  }

  protected onTriggerBlur(): void {
    if (!this.isOpen()) return
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null
      this.close()
    }, 120)
  }

  /** Called when the search input receives focus — cancels any pending close. */
  protected onSearchInputFocus_(): void {
    this.clearCloseTimeout()
  }

  /** Called when the search input loses focus — schedule close like the trigger does. */
  protected onSearchInputBlur_(): void {
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null
      this.close()
    }, 120)
  }

  protected onOptionClick(opt: CustomMultiSelectOption): void {
    this.pick_(opt)
  }

  /** Search clear (X): empty the filter, keep the list open with every option (plan 364). */
  protected onClearSearch(): void {
    this.searchQuery_.set('')
    this.setHighlight_(0)
    this.searchInputRef()?.nativeElement?.focus()
  }

  protected onSearchInput(q: string): void {
    this.searchQuery_.set(q)
    this.setHighlight_(0)
  }

  /** Search-box keys (rule 5): shared KeyedPickerSearch; Space types; Tab closes and lets the browser move focus. */
  protected onSearchKeydown(e: KeyboardEvent): void {
    e.stopPropagation()
    if (e.key === 'Tab') {
      this.close()
      return
    }
    const opts = this.keyboardOptions_()
    this.picker_.handleKeydown(PICKER_KEY, e, {
      optionCount: opts.length,
      onSelect: (idx) => this.pick_(opts[idx]),
      onClose: () => {
        this.close()
        // Focus stays on the field without reopening the list (rule 5f).
        this.isFocusFromMouse_ = true
        this.triggerRef()?.nativeElement?.focus()
      },
      onHighlightMove: () => this.scrollHighlightIntoView_()
    })
  }

  protected onTriggerMousedown(): void {
    this.isFocusFromMouse_ = true
  }

  protected onTriggerFocus(): void {
    if (this.isFocusFromMouse_) {
      this.isFocusFromMouse_ = false
      return
    }
    if (!this._isDisabled() && !this.isOpen()) {
      this.openDropdown()
    }
  }

  protected onTriggerClick(): void {
    this.toggle()
  }

  /** Trigger keys (no search box): same keyboard rules; Space toggles like Enter. */
  protected onKeydown(e: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.toggle()
      }
      return
    }
    if (e.key === 'Tab') {
      this.close()
      return
    }
    const opts = this.keyboardOptions_()
    this.picker_.handleKeydown(PICKER_KEY, e, {
      optionCount: opts.length,
      onSelect: (idx) => this.pick_(opts[idx]),
      onClose: () => this.close(),
      onHighlightMove: () => this.scrollHighlightIntoView_(),
      selectOnSpace: true
    })
  }

  /** Add the option (list stays open), or run the add: emits the typed new name, '' for the generic add (rule 2). */
  private pick_(opt: CustomMultiSelectOption | undefined): void {
    if (!opt) return
    if (opt.value === this.addNewValue()) {
      const label = this.addLabel_()
      this.addNewChosen.emit(label.kind === 'typed' ? label.text : '')
      this.close()
      return
    }
    this.addOption(opt.value)
    const count = this.keyboardOptions_().length
    if (this.highlightedIndex() > count - 1) this.setHighlight_(Math.max(0, count - 1))
  }

  private setHighlight_(index: number): void {
    this.picker_.setHighlighted(PICKER_KEY, index)
  }

  private scrollHighlightIntoView_(): void {
    afterNextRender(() => scrollHighlightIntoView(this.hostRef.nativeElement), { injector: this._injector })
  }

  private focusSearchInput_(): void {
    afterNextRender(
      () => {
        this.searchInputRef()?.nativeElement?.focus()
      },
      { injector: this._injector }
    )
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeout != null) {
      clearTimeout(this.closeTimeout)
      this.closeTimeout = null
    }
  }
}
