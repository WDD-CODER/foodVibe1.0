import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  viewChild
} from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AddOptionLabel, addOptionLabel, findOptionByLabel } from 'src/app/core/utils/add-option.util'
import { filterOptionsByLabel } from 'src/app/core/utils/option-filter.util'
import { KeyedPickerSearch, scrollHighlightIntoView } from 'src/app/core/utils/keyed-picker-search.util'
import { AddOptionRowComponent } from '../add-option-row/add-option-row.component'
import { InputClearComponent } from '../input-clear/input-clear.component'
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component'

/** Where a pick came from: Enter/Space on the highlighted row, or a click/tap. */
export type SearchPickSource = 'keyboard' | 'pointer'

/** One chosen result. */
export interface SearchPick<T> {
  option: T
  source: SearchPickSource
}

/** The add option was chosen: the typed new name, or '' for the generic "add new <thing>". */
export interface SearchAddPick {
  typed: string
  source: SearchPickSource
}

/** One row in the list; `header` is set on the first row of a group (grouped lists only). */
interface SearchRow<T> {
  option: T
  index: number
  header: string | null
}

/** KeyedPickerSearch key — one picker per component instance. */
const PICKER_KEY = 0
/** Per-instance id prefix for option ids (aria-activedescendant) when no inputId is given. */
let nextSearchComboboxId = 0

/**
 * The one search box with a results list (family `search-combobox`): a text field, a clear (X), a listbox of
 * results and one add option. It owns rules F (contains, prefix first), X (exact name hides the add row),
 * K (first row highlighted, arrows stop at the ends, Enter picks, Escape closes, Tab closes) and the
 * add-option label; the page owns what a pick or an add DOES (rule W: the add opens its window) and
 * announces it (rule M). Use `app-custom-select` instead when the user only picks one value from a short list.
 *
 * Look: `variant="box"` is the engine input box (`.c-input-wrapper`); `variant="plain"` is a bare row styled by the page
 * through CSS variables on the host: `--search-combobox-input-{padding,font,font-size,text-align,color,background,
 * border,radius,focus-border-color,focus-shadow}`, `--search-combobox-option-{font,font-size,highlight-ring}`,
 * `--search-combobox-field-border-block-end`, `--search-combobox-placeholder-color`, `--search-combobox-list-inset`,
 * `--search-combobox-position`, `--search-combobox-z-index`.
 */
@Component({
  selector: 'app-search-combobox',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    LucideAngularModule,
    ClickOutSideDirective,
    TranslatePipe,
    InputClearComponent,
    ScrollableDropdownComponent,
    AddOptionRowComponent
  ],
  templateUrl: './search-combobox.component.html',
  styleUrl: './search-combobox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComboboxComponent<T> {
  // 1. INJECTED
  private readonly injector = inject(Injector)
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef)

  // 2. INPUTS
  /** Candidates, in display order. Pre-filtered when `clientFilter` is false (server search). */
  options = input.required<readonly T[]>()
  /** What the user typed (two-way, so a page that searches the server or resets the box can own it). */
  query = model('')
  /** The list may show. The box closes it on pick, Escape and Tab and opens it again on typing and focus. */
  open = model(true)
  /** On-screen text of an option — filtered on, matched for rule X, and shown unless an option template is given. */
  labelOf = input<(option: T) => string>((option) => String(option))
  /** Stable key per option for `@for` tracking; defaults to the label. */
  keyOf = input<((option: T) => string | number) | null>(null)
  /** Rule F on the client. Off when the page already filtered (server search, custom sort). */
  clientFilter = input(true)
  /** The list stays hidden until this many characters are typed (0 = always shown while mounted). */
  minChars = input(0)
  /** Cap on the rows shown (after filtering). */
  maxResults = input<number | null>(null)
  /** Options rule X and the add label compare against; defaults to `options`. */
  knownOptions = input<readonly T[] | null>(null)
  /** Dictionary key `add_new_<thing>` for the generic add option; null = no add option. */
  addLabelKey = input<string | null>(null)
  /** Offer the add option only for a typed new name (no generic row for an empty search). */
  addOnlyTyped = input(false)
  /** Dictionary key of the "no results" line; null = show nothing when the list is empty. */
  emptyKey = input<string | null>(null)
  /** Group results under a header (the group's dictionary key); rows are regrouped in first-seen order. */
  groupOf = input<((option: T) => string) | null>(null)
  /** Placeholder dictionary key (also the aria-label). */
  placeholder = input('')
  /** Id of the text field, for focus management by the page. */
  inputId = input('')
  /** Leading Lucide icon of the box variant (e.g. 'search'). */
  icon = input<string | null>(null)
  /** A textarea that grows with its text, for long names. */
  multiline = input(false)
  variant = input<'box' | 'plain'>('box')
  /** 'inline' lays the list under the field in normal flow (inside a page-owned panel). */
  listPosition = input<'overlay' | 'inline'>('overlay')
  maxHeight = input(240)
  /** Space picks like Enter (dish search only). */
  selectOnSpace = input(false)
  /** The page moves focus on Tab / Shift+Tab: the box closes the list, blocks the default and emits `tab`. */
  handleTab = input(false)
  /** Opening the field shows the list again (default). Off when a pick fills the field with the chosen name. */
  openOnFocus = input(true)
  /** Select the text when the field gets focus. */
  selectOnFocus = input(false)
  /** A click outside the box closes the list (and emits `outsideClick`). */
  closeOnOutsideClick = input(false)

  // 3. OUTPUTS
  picked = output<SearchPick<T>>()
  addChosen = output<SearchAddPick>()
  /** Escape while the list was showing (the list is already closed). */
  escaped = output<void>()
  /** Tab / Shift+Tab with `handleTab` set. */
  tab = output<KeyboardEvent>()
  /** A click outside the box, with `closeOnOutsideClick` set. */
  outsideClick = output<void>()
  /** A key the box did not use (Enter or Escape with the list closed, etc.): the page may. */
  unhandledKeydown = output<KeyboardEvent>()

  // 4. SIGNALS & CONSTANTS
  private readonly picker_ = new KeyedPickerSearch()
  private readonly instanceId_ = `sc-${++nextSearchComboboxId}`
  private readonly fieldRef_ = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('fieldRef')
  /** Rich rows: `<ng-template #optionTemplate let-option>…</ng-template>` as a child. */
  protected readonly optionTemplate = contentChild<TemplateRef<{ $implicit: T }>>('optionTemplate')

  // 5. COMPUTED
  protected readonly highlightedIndex = computed(() => this.picker_.highlighted(PICKER_KEY))
  protected readonly optionIdPrefix = computed(() => (this.inputId() || this.instanceId_) + '-opt-')

  /** Results after rule F and the cap, regrouped when `groupOf` is set. Index = keyboard position. */
  protected readonly rows = computed<SearchRow<T>[]>(() => {
    const raw = this.query().trim()
    let list: readonly T[] = this.options()
    if (this.clientFilter() && raw) list = filterOptionsByLabel(list, raw, this.labelOf())
    const max = this.maxResults()
    if (max !== null) list = list.slice(0, max)
    const groupOf = this.groupOf()
    if (!groupOf) return list.map((option, index) => ({ option, index, header: null }))
    const groups = new Map<string, T[]>()
    for (const option of list) {
      const key = groupOf(option)
      groups.set(key, [...(groups.get(key) ?? []), option])
    }
    let index = 0
    return Array.from(groups.entries()).flatMap(([header, items]) =>
      items.map((option, i) => ({ option, index: index++, header: i === 0 ? header : null }))
    )
  })

  /** What rule X and the add label compare against. */
  private readonly known_ = computed(() => this.knownOptions() ?? this.options())

  /** The add option's label: typed new name, else the generic key (rules 2-3). */
  protected readonly addLabel = computed<AddOptionLabel>(() =>
    addOptionLabel(this.query(), this.known_(), this.labelOf(), this.addLabelKey() ?? '')
  )

  /** One add option, last; never when the search names an existing option exactly (rule X). */
  protected readonly showsAdd = computed(() => {
    if (this.addLabelKey() === null) return false
    if (findOptionByLabel(this.query(), this.known_(), this.labelOf())) return false
    return !this.addOnlyTyped() || (this.query().trim() !== '' && this.addLabel().kind === 'typed')
  })

  /** Rows plus the add row — the keyboard order (rule 5e). */
  private readonly optionCount_ = computed(() => this.rows().length + (this.showsAdd() ? 1 : 0))

  private readonly reachable_ = computed(
    () => this.query().trim().length >= this.minChars() && (this.optionCount_() > 0 || !!this.emptyKey())
  )

  protected readonly visible = computed(() => this.open() && this.reachable_())

  constructor() {
    // A long name typed or set by the page: keep the textarea as tall as its text.
    effect(() => {
      this.query()
      if (this.multiline()) afterNextRender(() => this.fitHeight_(), { injector: this.injector })
    })
  }

  // 6. METHODS
  //READ

  protected keyOfOption(option: T): string | number {
    return (this.keyOf() ?? this.labelOf())(option)
  }

  //UPDATE

  /** Focus the text field (e.g. after the page opened a new row). */
  focus(): void {
    this.fieldRef_()?.nativeElement.focus()
  }

  protected onInput(value: string): void {
    this.query.set(value ?? '')
    this.open.set(true)
    this.picker_.setHighlighted(PICKER_KEY, 0)
  }

  protected onFocus(): void {
    if (this.selectOnFocus()) this.fieldRef_()?.nativeElement.select()
    if (!this.openOnFocus()) return
    this.open.set(true)
    this.picker_.setHighlighted(PICKER_KEY, 0)
  }

  /** Search clear (X): empty the field, keep focus in it (plan 363). */
  protected onClear(): void {
    this.query.set('')
    this.picker_.setHighlighted(PICKER_KEY, 0)
    this.focus()
  }

  protected onOutsideClick(): void {
    if (!this.closeOnOutsideClick()) return
    this.open.set(false)
    this.outsideClick.emit()
  }

  protected onRowClick(index: number): void {
    this.pick_(index, 'pointer')
  }

  protected onAddClick(): void {
    this.pick_(this.rows().length, 'pointer')
  }

  /** Rule K on the text field. Keys the box does not use go to `unhandledKeydown`. */
  protected onKeydown(e: KeyboardEvent): void {
    if (!this.visible()) {
      this.onKeydownClosed_(e)
      return
    }
    if (e.key === 'Tab' && !this.handleTab()) {
      this.open.set(false)
      return
    }
    this.picker_.handleKeydown(PICKER_KEY, e, {
      optionCount: this.optionCount_(),
      selectOnSpace: this.selectOnSpace(),
      onSelect: (index) => this.pick_(index, 'keyboard'),
      onClose: () => {
        this.open.set(false)
        this.escaped.emit()
      },
      onHighlightMove: () =>
        afterNextRender(() => scrollHighlightIntoView(this.hostRef.nativeElement), { injector: this.injector }),
      onTab: this.handleTab()
        ? (ke) => {
            this.open.set(false)
            this.tab.emit(ke)
          }
        : undefined
    })
    if (!e.defaultPrevented) this.unhandledKeydown.emit(e)
  }

  private onKeydownClosed_(e: KeyboardEvent): void {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !this.multiline() && this.canReopen_()) {
      e.preventDefault()
      this.open.set(true)
      this.picker_.setHighlighted(PICKER_KEY, 0)
      return
    }
    if (e.key === 'Tab' && this.handleTab()) {
      e.preventDefault()
      e.stopPropagation()
      this.tab.emit(e)
      return
    }
    this.unhandledKeydown.emit(e)
  }

  /** Arrows reopen a closed list only when there is something to show. */
  private canReopen_(): boolean {
    return this.query().trim() !== '' && this.reachable_()
  }

  /** Select row `index`, or the add option when it is past the rows. */
  private pick_(index: number, source: SearchPickSource): void {
    const rows = this.rows()
    this.open.set(false)
    this.picker_.setHighlighted(PICKER_KEY, 0)
    if (index >= 0 && index < rows.length) {
      this.picked.emit({ option: rows[index].option, source })
      return
    }
    const label = this.addLabel()
    this.addChosen.emit({ typed: label.kind === 'typed' ? label.text : '', source })
  }

  /** Grow the textarea to its content (one line when short). */
  private fitHeight_(): void {
    const el = this.fieldRef_()?.nativeElement
    if (!el || !this.multiline()) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
}
