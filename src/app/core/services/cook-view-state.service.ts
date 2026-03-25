import { Injectable, signal, computed } from '@angular/core'

const STORAGE_KEY = 'cook_view_last_recipe_id'
const RECENT_IDS_KEY = 'cook_view_recent_ids'
const MAX_RECENT = 3

@Injectable({ providedIn: 'root' })
export class CookViewStateService {
  private readonly lastRecipeId_ = signal<string | null>(this.readStored())
  private readonly recentIds_ = signal<string[]>(this.readRecentIds())

  lastRecipeId = computed(() => this.lastRecipeId_())
  recentIds = this.recentIds_.asReadonly()

  setLastViewedRecipeId(id: string): void {
    this.lastRecipeId_.set(id)
    try {
      sessionStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }

    // Prepend to recent IDs, deduplicate, cap at MAX_RECENT
    const current = this.recentIds_()
    const updated = [id, ...current.filter(r => r !== id)].slice(0, MAX_RECENT)
    this.recentIds_.set(updated)
    try {
      localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  clearLastViewed(): void {
    this.lastRecipeId_.set(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  private readStored(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  }

  private readRecentIds(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_IDS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch {
      return []
    }
  }
}
