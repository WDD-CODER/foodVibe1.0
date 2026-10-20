import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  computed,
  output,
  effect,
  viewChild,
  ElementRef,
  Injector,
  afterNextRender
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { PreparationRegistryService, type PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { filterOptionsByLabel } from 'src/app/core/utils/option-filter.util'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { AddOptionRowComponent } from 'src/app/shared/add-option-row/add-option-row.component'
import { AddOptionLabel, addOptionLabel, notifyItemAdded } from 'src/app/core/utils/add-option.util'
import { AddItemModalService } from '@services/add-item-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { KeyedPickerSearch, scrollHighlightIntoView } from 'src/app/core/utils/keyed-picker-search.util'

/** KeyedPickerSearch key — one picker per component instance. */
const PICKER_KEY = 0
/** Per-instance id prefix for option ids (aria-activedescendant). */
let nextPrepSearchId = 0

@Component({
  selector: 'app-preparation-search',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ClickOutSideDirective,
    TranslatePipe,
    ScrollableDropdownComponent,
    SelectOnFocusDirective,
    InputClearComponent,
    AddOptionRowComponent
  ],
  templateUrl: './preparation-search.component.html',
  styleUrl: './preparation-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreparationSearchComponent {
  private readonly prepRegistry = inject(PreparationRegistryService)
  private readonly injector = inject(Injector)
  private readonly addItemModal = inject(AddItemModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Category from the row's category dropdown; used when adding a new preparation. */
  selectedCategory = input<string>('')

  /** When set, focus the search input if rowIndex matches (used when a new workflow row is added). */
  focusTrigger = input<number | null>(null)
  rowIndex = input<number>(0)
  /** Optional initial search query (e.g. when editing an existing preparation name). */
  initialQuery = input<string>('')

  preparationSelected = output<PreparationEntry>()
  preparationAdded = output<PreparationEntry>()
  focusDone = output<void>()
  /** Enter saved this row's preparation — parent opens a new row. */
  addNewRowRequested = output<void>()

  protected searchInputRef = viewChild<ElementRef<HTMLTextAreaElement>>('searchInput')
  searchQuery_ = signal<string>('')
  protected showResults_ = signal(false)
  /** Keyboard state (add-option rule 5): first option highlighted, no wrap, focus stays in the box. */
  private readonly picker_ = new KeyedPickerSearch()
  protected highlightedIndex_ = computed(() => this.picker_.highlighted(PICKER_KEY))
  protected readonly optionIdPrefix = `prep-search-${++nextPrepSearchId}-opt-`

  private lastHandledFocusTrigger: number | null = null

  constructor() {
    effect(() => {
      const trigger = this.focusTrigger()
      const row = this.rowIndex()
      if (trigger !== null && trigger === row && trigger !== this.lastHandledFocusTrigger) {
        this.lastHandledFocusTrigger = trigger
        setTimeout(() => this.focusSearch(), 0)
        this.focusDone.emit()
      }
      if (trigger === null) this.lastHandledFocusTrigger = null
    })
    effect(() => {
      const q = this.initialQuery()?.trim() ?? ''
      if (q) {
        this.searchQuery_.set(q)
        this.showResults_.set(true)
        setTimeout(() => {
          this.fitHeight_()
          this.focusSearch()
        }, 0)
      }
    })
  }

  /** Focus the search input (e.g. after adding a new row). */
  focusSearch(): void {
    this.searchInputRef()?.nativeElement?.focus()
  }

  /** Grow the search textarea to its content (one line when short), so long names wrap. */
  protected fitHeight_(): void {
    const el = this.searchInputRef()?.nativeElement
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  protected filteredResults_ = computed(() => {
    const raw = this.searchQuery_().trim()
    if (raw.length < 2) return []

    const preps = this.prepRegistry.allPreparations_()
    return filterOptionsByLabel(preps, raw, (p) => p.name)
  })

  /** Results grouped by category; each entry carries its keyboard index (display order). */
  protected groupedResults_ = computed(() => {
    const byCategory = new Map<string, PreparationEntry[]>()
    for (const p of this.filteredResults_()) {
      const list = byCategory.get(p.category) ?? []
      list.push(p)
      byCategory.set(p.category, list)
    }
    let index = 0
    return Array.from(byCategory.entries()).map(
      ([category, entries]) => [category, entries.map((entry) => ({ entry, index: index++ }))] as const
    )
  })

  /** Results in display (keyboard) order. */
  protected flatResults_ = computed(() => this.groupedResults_().flatMap(([, items]) => items.map((i) => i.entry)))

  /** Add label: a typed name that isn't an existing preparation (rules 2–3). */
  protected addLabel_ = computed<AddOptionLabel>(() =>
    addOptionLabel(this.searchQuery_(), this.prepRegistry.allPreparations_(), (p) => p.name, 'add_new_preparation')
  )

  /** One add option, last — only for a new typed name: preparations are added directly, there is no add modal. */
  protected showAddOption_ = computed(() => this.searchQuery_().trim().length >= 2 && this.addLabel_().kind === 'typed')

  protected listOpen_ = computed(() => this.showResults_() && (this.flatResults_().length > 0 || this.showAddOption_()))

  protected optionCount_ = computed(() => this.flatResults_().length + (this.showAddOption_() ? 1 : 0))

  protected categories = computed(() => this.prepRegistry.preparationCategories_())

  selectPreparation(entry: PreparationEntry): void {
    this.preparationSelected.emit(entry)
    this.searchQuery_.set('')
    this.showResults_.set(false)
  }

  protected onQueryInput(value: string): void {
    this.searchQuery_.set(value)
    this.showResults_.set(true)
    this.picker_.onQueryChange(PICKER_KEY, value)
    this.fitHeight_()
  }

  protected onSearchFocus(): void {
    this.showResults_.set(true)
    this.picker_.setHighlighted(PICKER_KEY, 0)
  }

  /** Rule 5 via KeyedPickerSearch. Enter saves the row with the highlighted option and asks for a new row. */
  protected onSearchKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      void this.onEnter(e)
      return
    }
    if (e.key === 'Escape') {
      this.onSearchEscape(e)
      return
    }
    if (!this.listOpen_()) return
    if (e.key === 'Tab') {
      this.showResults_.set(false)
      return
    }
    this.picker_.handleKeydown(PICKER_KEY, e, {
      optionCount: this.optionCount_(),
      onSelect: () => undefined,
      onClose: () => this.showResults_.set(false),
      onHighlightMove: () =>
        afterNextRender(() => scrollHighlightIntoView(this.hostRef.nativeElement), { injector: this.injector })
    })
  }

  /** Enter saves the row (highlighted match, or adds the typed name) and asks for a new row. */
  protected async onEnter(event: Event): Promise<void> {
    event.preventDefault()
    const results = this.flatResults_()
    const count = this.optionCount_()
    if (count === 0) return
    const idx = Math.min(this.highlightedIndex_(), count - 1)
    if (idx < results.length) {
      this.selectPreparation(results[idx])
      this.addNewRowRequested.emit()
      return
    }
    if (await this.addPreparationViaWindow()) this.addNewRowRequested.emit()
  }

  /** Add a preparation: always through the add window, prefilled with the typed name (rule W). */
  async addPreparationViaWindow(): Promise<boolean> {
    const typed = this.searchQuery_().trim()
    const cats = this.categories()
    const category = this.selectedCategory().trim() || (cats.length > 0 ? cats[0] : '')
    if (!category) return false
    this.showResults_.set(false)
    const name = (
      (await this.addItemModal.open({
        title: 'add_new_preparation',
        label: 'preparation',
        placeholder: 'preparation',
        saveLabel: 'save',
        initialValue: typed
      })) ?? ''
    ).trim()
    if (!name) {
      this.focusSearch()
      return false
    }
    const existed = this.prepRegistry.allPreparations_().some((p) => p.name === name)
    await this.prepRegistry.registerPreparation(name, category)
    // Select what was stored (the registry may keep an existing entry); nothing if the save failed (rule 4).
    const entry = this.prepRegistry.allPreparations_().find((p) => p.name === name) ?? (null as PreparationEntry | null)
    if (!entry) return false
    if (!existed) notifyItemAdded(this.userMsg, (k) => this.translation.translate(k), name)
    this.preparationAdded.emit(entry)
    this.preparationSelected.emit(entry)
    this.searchQuery_.set('')
    return true
  }

  /** Search clear (X): empty the field, close the results, keep focus in the field (plan 363). */
  protected onClearSearch(): void {
    this.searchQuery_.set('')
    this.showResults_.set(false)
    this.focusSearch()
    setTimeout(() => this.fitHeight_(), 0)
  }

  /** Escape closes an open list first (rule 5f); then clears a non-empty field; then bubbles (plan 363). */
  protected onSearchEscape(event: Event): void {
    if (this.listOpen_()) {
      event.preventDefault()
      event.stopPropagation()
      this.showResults_.set(false)
      return
    }
    if (!this.searchQuery_()) return
    event.preventDefault()
    event.stopPropagation()
    this.onClearSearch()
  }
}
