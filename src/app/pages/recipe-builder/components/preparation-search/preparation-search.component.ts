import { Component, inject, input, signal, computed, output } from '@angular/core'
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

  preparationSelected = output<PreparationEntry>()
  preparationAdded = output<PreparationEntry>()

  searchQuery_ = signal<string>('')
  protected showResults_ = signal(false)

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
