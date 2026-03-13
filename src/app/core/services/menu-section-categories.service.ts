import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './async-storage.service';
import { TranslationService } from './translation.service';
import { TranslationKeyModalService, isTranslationKeyResult } from './translation-key-modal.service';

const STORAGE_KEY = 'MENU_SECTION_CATEGORIES';

const DEFAULT_SECTION_CATEGORIES = [
  'Amuse-Bouche', 'Appetizers', 'Soups', 'Salads',
  'Main Course', 'Sides', 'Desserts', 'Beverages',
];

interface MenuSectionCategoriesDoc {
  _id?: string;
  items: string[];
}

@Injectable({ providedIn: 'root' })
export class MenuSectionCategoriesService {
  private readonly storage = inject(StorageService);
  private readonly translationService = inject(TranslationService);
  private readonly translationKeyModal = inject(TranslationKeyModalService);

  private categories_ = signal<string[]>([]);
  readonly sectionCategories_ = this.categories_.asReadonly();

  constructor() {
    this.load();
  }

  /** Re-read from storage (e.g. after backup restore). */
  async reloadFromStorage(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const registries = await this.storage.query<MenuSectionCategoriesDoc>(STORAGE_KEY);
      const doc = registries[0];
      const items = doc?.items;
      if (Array.isArray(items) && items.length > 0) {
        this.categories_.set([...items]);
        return;
      }
      const payload: MenuSectionCategoriesDoc = doc?._id
        ? { ...doc, items: DEFAULT_SECTION_CATEGORIES }
        : { items: DEFAULT_SECTION_CATEGORIES };
      if (doc?._id) {
        await this.storage.put(STORAGE_KEY, payload as MenuSectionCategoriesDoc & { _id: string });
      } else {
        await this.storage.post(STORAGE_KEY, payload);
      }
      this.categories_.set([...DEFAULT_SECTION_CATEGORIES]);
    } catch {
      this.categories_.set([...DEFAULT_SECTION_CATEGORIES]);
    }
  }

  /** Add a section category if not already present; resolves Hebrew to key, or opens translation-key modal for English key; persists to storage. */
  async addCategory(name: string): Promise<void> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return;
    let keyToUse: string | null = this.translationService.resolveSectionCategory(trimmed);
    if (!keyToUse) {
      const modalResult = await this.translationKeyModal.open(trimmed, 'category');
      if (isTranslationKeyResult(modalResult)) {
        this.translationService.addKeyAndHebrew(modalResult.englishKey, modalResult.hebrewLabel);
        keyToUse = modalResult.englishKey;
      } else {
        keyToUse = trimmed;
      }
    }
    const current = this.categories_();
    if (keyToUse == null || current.includes(keyToUse)) return;
    const updated = [...current, keyToUse];
    await this.persist(updated);
  }

  async removeCategory(name: string): Promise<void> {
    const updated = this.categories_().filter(c => c !== name);
    if (updated.length === this.categories_().length) return;
    await this.persist(updated);
  }

  async renameCategory(oldName: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const updated = this.categories_().map(c => c === oldName ? trimmed : c);
    await this.persist(updated);
  }

  private async persist(items: string[]): Promise<void> {
    try {
      const registries = await this.storage.query<MenuSectionCategoriesDoc>(STORAGE_KEY);
      const doc = registries[0];
      const payload: MenuSectionCategoriesDoc & { _id?: string } = doc
        ? { ...doc, items }
        : { items };
      if (doc?._id) {
        await this.storage.put(STORAGE_KEY, { ...payload, _id: doc._id });
      } else {
        await this.storage.post(STORAGE_KEY, payload);
      }
      this.categories_.set(items);
    } catch {
      this.categories_.set(items);
    }
  }
}
