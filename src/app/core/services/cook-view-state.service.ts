import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'cook_view_last_recipe_id';

@Injectable({ providedIn: 'root' })
export class CookViewStateService {
  private readonly lastRecipeId_ = signal<string | null>(this.readStored());

  lastRecipeId = computed(() => this.lastRecipeId_());

  setLastViewedRecipeId(id: string): void {
    this.lastRecipeId_.set(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  clearLastViewed(): void {
    this.lastRecipeId_.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private readStored(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
