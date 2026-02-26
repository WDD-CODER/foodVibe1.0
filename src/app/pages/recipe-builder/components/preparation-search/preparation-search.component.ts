import { Component, inject, input, signal, computed, output, effect, viewChild, ElementRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { PreparationRegistryService, type PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ClickOutSideDirective } from '@directives/click-out-side'

@Component({
  selector: 'app-preparation-search',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, TranslatePipe],
  templateUrl: './preparation-search.component.html',
  styleUrl: './preparation-search.component.scss'
})
export class PreparationSearchComponent {
  private readonly prepRegistry = inject(PreparationRegistryService)

  /** Category from the row's category dropdown; used when adding a new preparation. */
  selectedCategory = input<string>('')

  /** When set, focus the search input if rowIndex matches (used when a new workflow row is added). */
  focusTrigger = input<number | null>(null)
  rowIndex = input<number>(0)

  preparationSelected = output<PreparationEntry>()
  preparationAdded = output<PreparationEntry>()
  focusDone = output<void>()

  protected searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput')
  searchQuery_ = signal<string>('')
  protected showResults_ = signal(false)

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
  }

  /** Focus the search input (e.g. after adding a new row). */
  focusSearch(): void {
    this.searchInputRef()?.nativeElement?.focus()
  }

  protected filteredResults_ = computed(() => {
    const query = this.searchQuery_().toLowerCase().trim()
    if (query.length < 2) return []

    const preps = this.prepRegistry.allPreparations_()
    return preps.filter(p => p.name.toLowerCase().includes(query))
  })

  protected groupedResults_ = computed(() => {
    const results = this.filteredResults_()
    const byCategory = new Map<string, PreparationEntry[]>()
    for (const p of results) {
      const list = byCategory.get(p.category) ?? []
      list.push(p)
      byCategory.set(p.category, list)
    }
    return Array.from(byCategory.entries())
  })

  protected showAddOption_ = computed(() => {
    const query = this.searchQuery_().trim()
    return query.length >= 2 && this.filteredResults_().length === 0
  })

  protected categories_ = computed(() => this.prepRegistry.preparationCategories_())

  selectPreparation(entry: PreparationEntry): void {
    this.preparationSelected.emit(entry)
    this.searchQuery_.set('')
    this.showResults_.set(false)
  }

  async addPreparationDirectly(): Promise<void> {
    const name = this.searchQuery_().trim()
    if (!name) return

    const cats = this.categories_()
    const category = this.selectedCategory().trim() || (cats.length > 0 ? cats[0] : '')
    if (!category) return

    await this.prepRegistry.registerPreparation(name, category)
    const entry: PreparationEntry = { name, category }
    this.preparationAdded.emit(entry)
    this.preparationSelected.emit(entry)
    this.searchQuery_.set('')
    this.showResults_.set(false)
  }
}
