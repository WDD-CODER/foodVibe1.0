import { Component, inject, signal, computed, output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { PreparationRegistryService, type PreparationEntry } from '@services/preparation-registry.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

@Component({
  selector: 'app-preparation-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './preparation-search.component.html',
  styleUrl: './preparation-search.component.scss'
})
export class PreparationSearchComponent {
  private readonly prepRegistry = inject(PreparationRegistryService)

  preparationSelected = output<PreparationEntry>()
  preparationAdded = output<PreparationEntry>()

  searchQuery_ = signal<string>('')
  showAddForm_ = signal(false)
  addFormName_ = signal('')
  addFormCategory_ = signal('')
  showNewCategoryInput_ = signal(false)
  newCategoryName_ = signal('')

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
  }

  openAddForm(): void {
    this.addFormName_.set(this.searchQuery_().trim())
    const cats = this.categories_()
    if (cats.length === 0) {
      this.showNewCategoryInput_.set(true)
      this.addFormCategory_.set('')
    } else {
      this.addFormCategory_.set(cats[0])
    }
    this.showNewCategoryInput_.set(false)
    this.showAddForm_.set(true)
  }

  closeAddForm(): void {
    this.showAddForm_.set(false)
    this.addFormName_.set('')
    this.addFormCategory_.set('')
    this.newCategoryName_.set('')
    this.showNewCategoryInput_.set(false)
  }

  onCategoryChange(value: string): void {
    if (value === '__add_new__') {
      this.showNewCategoryInput_.set(true)
      this.addFormCategory_.set('')
    } else {
      this.showNewCategoryInput_.set(false)
      this.addFormCategory_.set(value)
    }
  }

  async addNewCategory(): Promise<void> {
    const name = this.newCategoryName_().trim()
    if (!name) return
    await this.prepRegistry.registerCategory(name)
    this.addFormCategory_.set(name)
    this.showNewCategoryInput_.set(false)
    this.newCategoryName_.set('')
  }

  async submitAddForm(): Promise<void> {
    let category = this.addFormCategory_()
    if (this.showNewCategoryInput_()) {
      const newName = this.newCategoryName_().trim()
      if (!newName) return
      await this.prepRegistry.registerCategory(newName)
      category = newName
    }

    const name = this.addFormName_().trim()
    if (!name || !category) return

    await this.prepRegistry.registerPreparation(name, category)
    const entry: PreparationEntry = { name, category }
    this.preparationAdded.emit(entry)
    this.preparationSelected.emit(entry)
    this.closeAddForm()
    this.searchQuery_.set('')
  }
}
