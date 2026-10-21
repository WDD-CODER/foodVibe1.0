import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ViewChild,
  ElementRef,
  inject,
  afterNextRender,
  Injector
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component'
import { InputClearComponent } from '../input-clear/input-clear.component'
import { AddOptionRowComponent } from '../add-option-row/add-option-row.component'
import { AddOptionLabel, addOptionLabel, findOptionByLabel } from '../../core/utils/add-option.util'
import { filterOptionsByLabel } from '../../core/utils/option-filter.util'
import { KeyedPickerSearch, scrollHighlightIntoView } from '../../core/utils/keyed-picker-search.util'

/** Per-instance id prefix, so two dropdowns on one page never share option / input ids (plan 364). */
let nextChipSearchDropdownId = 0
/** KeyedPickerSearch key — one picker per component instance. */
const PICKER_KEY = 0

/**
 * @deprecated Plan 452 / ADR 0025: new code uses `app-custom-multi-select`. This stays only for the product form (category,
 * supplier, allergens) until `custom-multi-select` gains the inline chip box, `showAddNewAlways`, `noOptionsLabel` and a
 * caller filter. Do not add new users.
 */
@Component({
  selector: 'app-chip-search-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideAngularModule,
    ClickOutSideDirective,
    ScrollableDropdownComponent,
    InputClearComponent,
    AddOptionRowComponent
  ],
  templateUrl: './chip-search-dropdown.component.html',
  styleUrl: './chip-search-dropdown.component.scss'
})
export class ChipSearchDropdownComponent {
  // ── Injected ────────────────────────────────────────────────────────────────
  private readonly injector = inject(Injector)
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef)

  // ── Inputs ──────────────────────────────────────────────────────────────────
  options = input<string[]>([])
  selected = input<string[]>([])
  displayFn = input<(key: string) => string>((k) => k)
  searchFilterFn = input<((option: string, query: string) => boolean) | null>(null)
  placeholder = input<string>('')
  /** Generic "add new <thing>" dictionary key (add-option rule 2); null = no add option. */
  addNewLabelKey = input<string | null>(null)
  /** Show the generic add option even with nothing typed (or an exact match). */
  showAddNewAlways = input<boolean>(false)
  /** Opt in when the caller's add flow takes the typed name (via addNew): shows `הוסף "<typed>"`. */
  allowTypedAdd = input<boolean>(false)
  chipClass = input<string>('chipe')
  noOptionsLabel = input<string | null>(null)

  // ── Outputs ─────────────────────────────────────────────────────────────────
  add = output<string>()
  remove = output<string>()
  /** The add option was chosen: the typed new name, or '' for the generic add (open the modal). */
  addNew = output<string>()
  blurred = output<void>()

  // ── View refs ────────────────────────────────────────────────────────────────
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>

  // ── Internal state ───────────────────────────────────────────────────────────
  protected readonly instanceId = `csd-${++nextChipSearchDropdownId}`
  protected searchQuery_ = signal('')
  protected showDropdown_ = signal(false)
  private readonly picker_ = new KeyedPickerSearch()

  // ── Computed ─────────────────────────────────────────────────────────────────
  protected highlightIndex_ = computed(() => this.picker_.highlighted(PICKER_KEY))

  /** Typed text filters by on-screen label: contains, prefix matches first (rule F); or the caller's filter. */
  protected filteredOptions_ = computed(() => {
    const raw = this.searchQuery_().trim()
    const opts = this.options()
    if (!raw) return opts
    const customFilter = this.searchFilterFn()
    if (customFilter) return opts.filter((o) => customFilter(o, raw))
    return filterOptionsByLabel(opts, raw, this.displayFn())
  })

  /** Add option label: typed new name (no option or chip has that on-screen label), else the generic key. */
  protected addLabel_ = computed<AddOptionLabel>(() =>
    addOptionLabel(
      this.allowTypedAdd() ? this.searchQuery_() : '',
      [...this.options(), ...this.selected()],
      this.displayFn(),
      this.addNewLabelKey() ?? ''
    )
  )

  /** One add option (rule 1): for a typed new name, or the generic add when `showAddNewAlways`; never on an exact match. */
  protected hasAddNew_ = computed(() => {
    if (this.addNewLabelKey() == null) return false
    if (this.isExactMatch_()) return false
    return this.addLabel_().kind === 'typed' || this.showAddNewAlways()
  })

  /** The search exactly names an option or a chosen chip: no add option at all (rule X). */
  private isExactMatch_ = computed(
    () => !!findOptionByLabel(this.searchQuery_(), [...this.options(), ...this.selected()], this.displayFn())
  )

  /** Options then the add option — the keyboard order (rule 5e). */
  protected optionCount_ = computed(() => this.filteredOptions_().length + (this.hasAddNew_() ? 1 : 0))

  // ── Protected methods ─────────────────────────────────────────────────────────
  protected openDropdown(): void {
    this.showDropdown_.set(true)
    this.picker_.setHighlighted(PICKER_KEY, 0)
  }

  protected closeDropdown(): void {
    this.showDropdown_.set(false)
    this.picker_.onQueryChange(PICKER_KEY, '')
    this.searchQuery_.set('')
  }

  protected onQueryInput(value: string): void {
    this.searchQuery_.set(value)
    this.picker_.onQueryChange(PICKER_KEY, value)
    if (!this.showDropdown_()) this.showDropdown_.set(true)
  }

  /** Search clear (X): empty the query, keep the list open with every option, refocus (plan 364). */
  protected onClearSearch(): void {
    this.searchQuery_.set('')
    this.picker_.onQueryChange(PICKER_KEY, '')
    this.showDropdown_.set(true)
    this.searchInputRef?.nativeElement?.focus()
  }

  protected onBoxClick(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).closest?.('.chipe')) return
    this.openDropdown()
    setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 0)
  }

  protected onBlurred(): void {
    this.closeDropdown()
    this.blurred.emit()
  }

  protected onOptionClick(opt: string): void {
    this.add.emit(opt)
    this.closeDropdown()
  }

  /** Search-box keys (rule 5): focus stays in the input; no wrap; Tab closes and lets the browser move focus. */
  protected onInputKeydown(ev: KeyboardEvent): void {
    if (!this.showDropdown_()) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault()
        this.openDropdown()
      }
      return
    }
    if (ev.key === 'Tab') {
      this.closeDropdown()
      return
    }
    const filtered = this.filteredOptions_()
    this.picker_.handleKeydown(PICKER_KEY, ev, {
      optionCount: this.optionCount_(),
      onSelect: (idx) => {
        if (idx < filtered.length) this.onOptionClick(filtered[idx])
        else this.emitAddNew()
      },
      onClose: () => this.closeDropdown(),
      onHighlightMove: () =>
        afterNextRender(() => scrollHighlightIntoView(this.hostRef.nativeElement, '.dropdown-item--highlight'), {
          injector: this.injector
        })
    })
  }

  protected emitAddNew(): void {
    const label = this.addLabel_()
    this.addNew.emit(label.kind === 'typed' ? label.text : '')
    this.closeDropdown()
  }
}
