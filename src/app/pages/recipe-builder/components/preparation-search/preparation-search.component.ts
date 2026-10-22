import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  computed,
  output,
  effect,
  viewChild
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { PreparationRegistryService, type PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClickOutSideDirective } from '@directives/click-out-side'
import {
  SearchComboboxComponent,
  type SearchAddPick,
  type SearchPick
} from 'src/app/shared/search-combobox/search-combobox.component'
import { notifyItemAdded } from 'src/app/core/utils/add-option.util'
import { AddItemModalService } from '@services/add-item-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'

@Component({
  selector: 'app-preparation-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, TranslatePipe, SearchComboboxComponent],
  templateUrl: './preparation-search.component.html',
  styleUrl: './preparation-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreparationSearchComponent {
  private readonly prepRegistry = inject(PreparationRegistryService)
  private readonly addItemModal = inject(AddItemModalService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

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

  protected searchBox_ = viewChild<SearchComboboxComponent<PreparationEntry>>(SearchComboboxComponent)
  searchQuery_ = signal<string>('')
  protected shouldShowResults_ = signal(false)
  protected readonly preparations_ = this.prepRegistry.allPreparations_
  protected readonly preparationLabel_ = (entry: PreparationEntry): string => entry.name
  protected readonly preparationKey_ = (entry: PreparationEntry): string => entry.category + '/' + entry.name
  protected readonly preparationCategory_ = (entry: PreparationEntry): string => entry.category

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
        this.shouldShowResults_.set(true)
        setTimeout(() => this.focusSearch(), 0)
      }
    })
  }

  /** Focus the search input (e.g. after adding a new row). */
  focusSearch(): void {
    this.searchBox_()?.focus()
  }

  protected categories = computed(() => this.prepRegistry.preparationCategories_())

  selectPreparation(entry: PreparationEntry): void {
    this.preparationSelected.emit(entry)
    this.searchQuery_.set('')
    this.shouldShowResults_.set(false)
  }

  /** A click only selects; Enter selects and also asks for the next row (rule K). */
  protected onPicked(pick: SearchPick<PreparationEntry>): void {
    this.selectPreparation(pick.option)
    if (pick.source === 'keyboard') this.addNewRowRequested.emit()
  }

  protected async onAddChosen(pick: SearchAddPick): Promise<void> {
    const saved = await this.addPreparationViaWindow(pick.typed)
    if (saved && pick.source === 'keyboard') this.addNewRowRequested.emit()
  }

  /** Enter with no list never types a line break; Escape with no list clears a non-empty field (plan 363). */
  protected onSearchKeyUnhandled(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
    } else if (e.key === 'Escape' && this.searchQuery_()) {
      e.preventDefault()
      e.stopPropagation()
      this.searchQuery_.set('')
    }
  }

  /** Add a preparation: always through the add window, prefilled with the typed name (rule W). */
  async addPreparationViaWindow(typed: string): Promise<boolean> {
    const cats = this.categories()
    const category = this.selectedCategory().trim() || (cats.length > 0 ? cats[0] : '')
    if (!category) return false
    this.shouldShowResults_.set(false)
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
}
