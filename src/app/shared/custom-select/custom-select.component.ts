import {
  ChangeDetectionStrategy,
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
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClickOutSideDirective } from '../../core/directives/click-out-side'
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component'
import { LucideAngularModule } from 'lucide-angular'
import { TranslationService } from '../../core/services/translation.service'
import { dedupeAndFilterOptions } from '../../core/utils/dedupe-select-options.util'
import { InputClearComponent } from '../input-clear/input-clear.component'
import { AddOptionRowComponent } from '../add-option-row/add-option-row.component'
import { AddOptionLabel, addOptionLabel, findOptionByLabel } from '../../core/utils/add-option.util'
import { KeyedPickerSearch, scrollHighlightIntoView } from '../../core/utils/keyed-picker-search.util'

/** Per-instance id prefix for option ids when no triggerId is given. */
let nextCustomSelectId = 0
/** KeyedPickerSearch key — one picker per component instance. */
const PICKER_KEY = 0

@Component({
  selector: 'app-custom-select',
  standalone: true,
  host: { tabIndex: '-1' },
  imports: [
    CommonModule,
    TranslatePipe,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    LucideAngularModule,
    InputClearComponent,
    AddOptionRowComponent
  ],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: CustomSelectComponent, multi: true }],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomSelectComponent implements ControlValueAccessor {
  options = input.required<{ value: string; label: string }[]>()
  placeholder = input<string>('')
  maxHeight = input<number>(240)
  translateLabels = input<boolean>(true)
  /** When true, trigger is an input and options are filtered by typing ("starts with" + script). Default false to preserve existing layout. */
  typeToFilter = input<boolean>(false)
  /** Optional id for the trigger (e.g. for focus management). */
  triggerId = input<string>('')
  /** When true, use compact sizing to match native select in dense forms (e.g. quick-add modal). */
  compact = input<boolean>(false)
  /** 'chip' = pill trigger (e.g. recipe ingredients unit). Default = bordered trigger. */
  variant = input<'default' | 'chip'>('default')
  /** Option value treated as "add new" for styling and pinned at end when filtering. Parent handles in valueChange. */
  addNewValue = input<string>('__add_unit__')
  /** Generic "add new <thing>" key (add-option rule 2) — default pairs with the default unit sentinel. Never bare `add`. */
  addNewLabelKey = input<string>('add_new_unit')
  /** Opt in when the caller's add flow takes the typed name (via addNewChosen): shows `הוסף "<typed>"`. */
  allowTypedAdd = input<boolean>(false)

  valueChange = output<string>()
  /** Emitted right before the add-new sentinel is selected: the typed new name, or '' for the generic add. */
  addNewChosen = output<string>()

  private _value = signal<string>('')
  private _onChange: (value: string) => void = () => {}
  private _onTouched: () => void = () => {}
  private _disabled = signal(false)
  private readonly translationService = inject(TranslationService)
  private readonly injector = inject(Injector)
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef)

  @ViewChild('triggerRef') protected triggerRef?: ElementRef<HTMLButtonElement>
  @ViewChild('inputRef') protected inputRef?: ElementRef<HTMLInputElement>

  protected open = signal(false)
  private readonly picker_ = new KeyedPickerSearch()
  protected highlightedIndex = computed(() => this.picker_.highlighted(PICKER_KEY))
  private readonly instanceId_ = `cs-${++nextCustomSelectId}`
  /** Option id prefix — for `aria-activedescendant` (focus stays in the input, rule 5d). */
  protected optionIdPrefix_ = computed(() => (this.triggerId() || this.instanceId_) + '-opt-')
  protected searchQuery_ = signal('')
  private closeTimeout: ReturnType<typeof setTimeout> | null = null
  /** When true, next trigger focus came from mouse (click); do not auto-open dropdown. */
  private _focusFromMouse = false

  /** When host receives programmatic focus (e.g. from FocusByRowDirective), forward to trigger. */
  @HostListener('focus')
  protected onHostFocus(): void {
    if (this.typeToFilter()) {
      this.inputRef?.nativeElement?.focus()
    } else {
      this.triggerRef?.nativeElement?.focus()
    }
  }

  protected selectedLabel = computed(() => {
    const v = this._value()
    const opts = this.options()
    const opt = opts.find((o) => o.value === v)
    return opt ? opt.label : ''
  })

  /** Options filtered by search: contains, prefix matches first (rule F). Add-new option is always pinned at end. Deduplicated by translated label (prefer current value). */
  protected filteredOptions_ = computed(() => {
    const raw = this.searchQuery_().trim()
    const opts = this.options()
    const addNewVal = this.addNewValue()
    const addNewOpt = opts.find((o) => o.value === addNewVal)
    const rest = addNewOpt ? opts.filter((o) => o.value !== addNewVal) : opts
    const currentValue = this._value()
    const deduped = dedupeAndFilterOptions(rest, raw, currentValue, (k) =>
      this.translateLabels() ? this.translationService.translate(k) : k
    )
    return addNewOpt ? [...deduped, addNewOpt] : deduped
  })

  /** The add-new option from the full options list; null when absent or the search exactly names an option (rule X). */
  protected addNewOption_ = computed(() => {
    const addNewVal = this.addNewValue()
    const addOpt = this.options().find((o) => o.value === addNewVal) ?? null
    if (!addOpt || !this.typeToFilter()) return addOpt
    const rest = this.options().filter((o) => o.value !== addNewVal)
    return findOptionByLabel(this.searchQuery_(), rest, (o) => this.displayLabel_(o.label)) ? null : addOpt
  })

  /** Add option label: typed new name (not an existing option by on-screen label), else the generic key (rule 2–3). */
  protected addLabel_ = computed<AddOptionLabel>(() => {
    const addNewVal = this.addNewValue()
    const rest = this.options().filter((o) => o.value !== addNewVal)
    const typed = this.typeToFilter() && this.allowTypedAdd() ? this.searchQuery_() : ''
    return addOptionLabel(typed, rest, (o) => this.displayLabel_(o.label), this.addNewLabelKey())
  })

  /** Options for the scrollable list — excludes the add-new sentinel (rendered separately as footer). */
  protected visibleOptions_ = computed(() => {
    const all = this.typeToFilter() ? this.filteredOptions_() : this.options()
    const addNewVal = this.addNewValue()
    return all.filter((o) => o.value !== addNewVal)
  })

  /** Options in display and keyboard order: the list, then the single add option last (rule 1, 5e). */
  protected keyboardOptions_ = computed(() => {
    const add = this.addNewOption_()
    const visible = this.visibleOptions_()
    return add ? [...visible, add] : visible
  })

  /** Input display value: when open show search query, when closed show selected label (translated if needed). */
  protected inputDisplayValue_ = computed(() => {
    if (this.open()) return this.searchQuery_()
    const v = this._value()
    if (!v) return ''
    const label = this.selectedLabel()
    return this.translateLabels() ? this.translationService.translate(label) : label
  })

  /** For chip + typeToFilter: input size attribute so width matches placeholder or value. Min 4 so "בחר" fits. */
  protected chipInputSize_ = computed(() => {
    if (this.variant() !== 'chip' || !this.typeToFilter()) return null
    const placeholderText = this.translationService.translate(this.placeholder())
    const displayLen = this.inputDisplayValue_().length
    const placeholderLen = placeholderText.length
    return Math.max(4, placeholderLen, displayLen)
  })

  private displayLabel_(label: string): string {
    return this.translateLabels() ? this.translationService.translate(label) : label
  }

  private setHighlight_(index: number): void {
    this.picker_.setHighlighted(PICKER_KEY, index)
  }

  writeValue(value: string): void {
    this._value.set(value ?? '')
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled)
  }

  protected get value(): string {
    return this._value()
  }

  protected get disabled(): boolean {
    return this._disabled()
  }

  protected toggle(): void {
    if (this._disabled()) return
    this.clearCloseTimeout()
    const next = !this.open()
    this.open.set(next)
    if (next) {
      const idx = this.keyboardOptions_().findIndex((o) => o.value === this._value())
      this.setHighlight_(idx >= 0 ? idx : 0)
    }
  }

  protected close(): void {
    this.clearCloseTimeout()
    this.open.set(false)
    if (this.typeToFilter()) this.searchQuery_.set('')
    this._onTouched()
  }

  protected openDropdown(): void {
    if (this._disabled() || this.open()) return
    this.clearCloseTimeout()
    this.open.set(true)
    this.searchQuery_.set('')
    this.setHighlight_(0)
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 0)
  }

  /** Search clear (X, type-to-filter only): empty the filter, keep the list open with every option (plan 364). */
  protected onClearSearch(): void {
    this.clearCloseTimeout()
    this.searchQuery_.set('')
    this.setHighlight_(0)
    this.inputRef?.nativeElement?.focus()
  }

  protected onInputInput(value: string): void {
    this.searchQuery_.set(value ?? '')
    if (!this.open()) this.open.set(true)
    this.setHighlight_(0)
  }

  /** Search-box keys (rule 5): shared KeyedPickerSearch; Tab closes and lets the browser move focus. */
  protected onInputKeydown(e: KeyboardEvent): void {
    if (!this.open()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.openDropdown()
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
      onHighlightMove: () => this.scrollHighlightIntoView_()
    })
  }

  private scrollHighlightIntoView_(): void {
    afterNextRender(() => scrollHighlightIntoView(this.hostRef.nativeElement), { injector: this.injector })
  }

  /** Select an option; the add-new sentinel first reports the typed name (rule 2) via addNewChosen. */
  private pick_(opt: { value: string; label: string } | undefined): void {
    if (!opt) return
    if (opt.value === this.addNewValue()) {
      const label = this.addLabel_()
      this.addNewChosen.emit(label.kind === 'typed' ? label.text : '')
    }
    this.select(opt.value)
  }

  /** Close after a short delay so option click can run first when focus moves on mousedown. */
  protected onTriggerBlur(): void {
    if (!this.open()) return
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null
      this.close()
    }, 120)
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeout != null) {
      clearTimeout(this.closeTimeout)
      this.closeTimeout = null
    }
  }

  protected select(value: string): void {
    this._value.set(value)
    this._onChange(value)
    this.valueChange.emit(value)
    this.close()
  }

  protected onTriggerMousedown(): void {
    this._focusFromMouse = true
  }

  /** Open dropdown when trigger receives focus from Tab or programmatic focus; skip when focus came from click. */
  protected onTriggerFocus(): void {
    if (this._focusFromMouse) {
      this._focusFromMouse = false
      return
    }
    if (!this._disabled() && !this.open()) {
      this.openDropdown()
    }
  }

  protected onTriggerClick(): void {
    this.toggle()
  }

  protected onOptionClick(opt: { value: string; label: string }): void {
    this.pick_(opt)
  }

  /** Button-mode keys: bound on the trigger, and on the host for keys from inside the open list. */
  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (this.typeToFilter() && (e.target as HTMLElement)?.tagName === 'INPUT') return
    // Keys the list uses are its own: stop them on the trigger so a page's (keydown) on this host
    // doesn't also move focus (rule K). Tab and a closed-list Escape still bubble.
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key) || (e.key === 'Escape' && this.open())) {
      e.stopPropagation()
    }
    if (!this.open()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.toggle()
      }
      return
    }
    const opts = this.keyboardOptions_()
    let idx = this.highlightedIndex()
    if (e.key === 'Escape') {
      e.preventDefault()
      this.close()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (idx >= 0 && opts[idx]) this.pick_(opts[idx])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      idx = Math.min(idx + 1, opts.length - 1)
      this.setHighlight_(idx)
      this.scrollHighlightIntoView_()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      idx = Math.max(idx - 1, 0)
      this.setHighlight_(idx)
      this.scrollHighlightIntoView_()
      return
    }
    if (e.key === 'Tab') {
      this.close()
    }
  }
}
