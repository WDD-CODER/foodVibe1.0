import {
  Component,
  ChangeDetectionStrategy,
  AfterViewChecked,
  input,
  output,
  signal,
  computed,
  ViewChildren,
  ViewChild,
  QueryList,
  ElementRef
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { ScrollableDropdownComponent } from '../scrollable-dropdown/scrollable-dropdown.component'

@Component({
  selector: 'app-chip-search-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule, ClickOutSideDirective, ScrollableDropdownComponent],
  templateUrl: './chip-search-dropdown.component.html',
  styleUrl: './chip-search-dropdown.component.scss'
})
export class ChipSearchDropdownComponent implements AfterViewChecked {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  options          = input<string[]>([])
  selected         = input<string[]>([])
  displayFn        = input<(key: string) => string>(k => k)
  searchFilterFn   = input<((option: string, query: string) => boolean) | null>(null)
  placeholder      = input<string>('')
  addNewLabel      = input<string | null>(null)
  showAddNewAlways = input<boolean>(false)
  chipClass        = input<string>('chipe')
  noOptionsLabel   = input<string | null>(null)

  // ── Outputs ─────────────────────────────────────────────────────────────────
  add     = output<string>()
  remove  = output<string>()
  addNew  = output<string>()
  blurred = output<void>()

  // ── View refs ────────────────────────────────────────────────────────────────
  @ViewChildren('dropdownItem') private dropdownItems!: QueryList<ElementRef<HTMLElement>>
  @ViewChild('searchInput')     private searchInputRef?: ElementRef<HTMLInputElement>

  // ── Internal state ───────────────────────────────────────────────────────────
  protected searchQuery_    = signal('')
  protected showDropdown_   = signal(false)
  protected highlightIndex_ = signal(-1)
  private   focusPending_   = false

  // ── Computed ─────────────────────────────────────────────────────────────────
  protected filteredOptions_ = computed(() => {
    const raw  = this.searchQuery_().trim()
    const opts = this.options()
    if (!raw) return opts
    const customFilter = this.searchFilterFn()
    if (customFilter) return opts.filter(o => customFilter(o, raw))
    const qLower   = raw.toLowerCase()
    const isHebrew = /[\u0590-\u05FF]/.test(raw)
    const isLatin  = /[a-zA-Z]/.test(raw)
    const display  = this.displayFn()
    return opts.filter(o => {
      const label = display(o)
      if (isHebrew) return label.startsWith(raw)
      if (isLatin)  return /[a-zA-Z]/.test(label) && label.toLowerCase().startsWith(qLower)
      return label.toLowerCase().startsWith(qLower)
    })
  })

  protected hasAddNew_ = computed(() => {
    if (this.addNewLabel() == null) return false
    const query = this.searchQuery_().trim()
    if (!query) return this.showAddNewAlways()
    const display    = this.displayFn()
    const inOptions  = this.options().some(o => display(o).toLowerCase() === query.toLowerCase())
    const inSelected = this.selected().some(s => display(s).toLowerCase() === query.toLowerCase())
    return !inOptions && !inSelected
  })

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngAfterViewChecked(): void {
    if (this.focusPending_ && this.showDropdown_()) {
      this.focusPending_ = false
      const idx   = this.highlightIndex_()
      const items = this.dropdownItems
      if (items?.length && idx >= 0 && idx < items.length) {
        (items.get(idx) as ElementRef<HTMLElement>)?.nativeElement?.focus()
      }
    }
  }

  // ── Protected methods ─────────────────────────────────────────────────────────
  protected openDropdown(): void {
    this.showDropdown_.set(true)
    this.highlightIndex_.set(-1)
  }

  protected closeDropdown(): void {
    this.showDropdown_.set(false)
    this.searchQuery_.set('')
    this.highlightIndex_.set(-1)
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

  protected onInputKeydown(ev: KeyboardEvent): void {
    const key = ev.key
    if (key === 'ArrowDown') {
      ev.preventDefault()
      if (!this.showDropdown_()) this.openDropdown()
      this.highlightIndex_.set(0)
      this.focusPending_ = true
    } else if (key === 'ArrowUp') {
      ev.preventDefault()
      if (!this.showDropdown_()) this.openDropdown()
      const total = this.filteredOptions_().length + (this.hasAddNew_() ? 1 : 0)
      this.highlightIndex_.set(Math.max(0, total - 1))
      this.focusPending_ = true
    } else if (key === 'Escape') {
      this.closeDropdown()
    }
  }

  protected onDropdownKeydown(ev: KeyboardEvent): void {
    if (!this.showDropdown_()) return
    const key       = ev.key
    const filtered  = this.filteredOptions_()
    const hasAddNew = this.hasAddNew_()
    const total     = filtered.length + (hasAddNew ? 1 : 0)

    if (key === 'Escape') {
      ev.preventDefault()
      this.closeDropdown()
      this.searchInputRef?.nativeElement?.focus()
      return
    }
    if (total === 0) return
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== ' ') return
    ev.preventDefault()

    let idx = this.highlightIndex_()
    if (key === 'ArrowDown') {
      idx = idx < total - 1 ? idx + 1 : 0
      this.highlightIndex_.set(idx)
      this.focusItem(idx)
    } else if (key === 'ArrowUp') {
      idx = idx > 0 ? idx - 1 : total - 1
      this.highlightIndex_.set(idx)
      this.focusItem(idx)
    } else if (key === 'Enter' || key === ' ') {
      if (idx >= 0 && idx < filtered.length) {
        this.add.emit(filtered[idx])
      } else if (hasAddNew && idx === filtered.length) {
        this.emitAddNew()
      }
      this.searchInputRef?.nativeElement?.focus()
    }
  }

  protected emitAddNew(): void {
    this.addNew.emit(this.searchQuery_().trim())
    this.searchQuery_.set('')
    this.highlightIndex_.set(-1)
  }

  // ── Private methods ───────────────────────────────────────────────────────────
  private focusItem(index: number): void {
    setTimeout(() => {
      const items = this.dropdownItems
      if (items?.length && index >= 0 && index < items.length) {
        (items.get(index) as ElementRef<HTMLElement>)?.nativeElement?.focus()
      }
    }, 0)
  }
}
