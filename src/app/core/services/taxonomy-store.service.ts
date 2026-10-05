import { Injectable, computed, inject, signal, type Signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { StorageService } from './async-storage.service'
import { UserService } from './user.service'
import { TranslationService } from './translation.service'
import type { TaxonomyKind, TaxonomyTerm, TaxonomyTermOf } from '@models/v2'

const COLLECTION = 'taxonomyTerms'
const MASTER = '__master__'

/** Kind-specific fields of a term (everything except the server-owned base fields). */
export type TermExtras<K extends TaxonomyKind> = Omit<
  TaxonomyTermOf<K>,
  | '_id'
  | 'schemaVersion'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'deletedBy'
  | 'kind'
  | 'key'
  | 'sortOrder'
>

/** A document that still uses a term the user tried to delete (server 409 `referencedBy`). */
export interface TermReference {
  type: string
  _id: string
  name: string
}

/** Thrown by remove() when the server blocks deleting a term that is still used. */
export class TermInUseError extends Error {
  constructor(readonly referencedBy: TermReference[]) {
    super('Term is still used')
  }
}

/** Thrown when a non-admin tries to change a shared (master) term. */
export class TermReadOnlyError extends Error {
  constructor() {
    super('Shared terms can only be changed by an admin')
  }
}

/**
 * Plan 321 Phase 3 — one store for every taxonomy kind (categories, allergens, labels, courses,
 * units, preparation categories/preparations, menu/event/section types, equipment categories).
 *
 * Reads the `taxonomyTerms` collection, which the server returns as master ∪ own. Shared
 * (master) terms are editable only by an admin (Human, 2026-10-05); everyone else edits only
 * their own terms. Ordering: shared terms first, then own, each by `sortOrder`.
 */
@Injectable({ providedIn: 'root' })
export class TaxonomyStore {
  private readonly storage = inject(StorageService)
  private readonly userService = inject(UserService)
  private readonly translation = inject(TranslationService)

  private readonly terms_ = signal<TaxonomyTerm[]>([])
  private readonly loaded_ = signal(false)
  private loadPromise_: Promise<void> | null = null
  private readonly byKind_ = new Map<TaxonomyKind, Signal<TaxonomyTerm[]>>()

  readonly allTerms_ = this.terms_.asReadonly()
  readonly isLoaded_ = this.loaded_.asReadonly()
  readonly isAdmin_ = computed(() => this.userService.user_()?.role === 'admin')

  // ── Read ────────────────────────────────────────────────────────────────

  /** Terms of one kind, shared first, each group by sortOrder. */
  terms<K extends TaxonomyKind>(kind: K): Signal<TaxonomyTermOf<K>[]> {
    let sig = this.byKind_.get(kind)
    if (!sig) {
      sig = computed(() =>
        this.terms_()
          .filter((t) => t.kind === kind)
          .sort((a, b) => Number(b.userId === MASTER) - Number(a.userId === MASTER) || a.sortOrder - b.sortOrder)
      )
      this.byKind_.set(kind, sig)
    }
    return sig as Signal<TaxonomyTermOf<K>[]>
  }

  find<K extends TaxonomyKind>(kind: K, key: string): TaxonomyTermOf<K> | undefined {
    return this.terms(kind)().find((t) => t.key === key)
  }

  isShared(term: TaxonomyTerm): boolean {
    return term.userId === MASTER
  }

  /** Own terms are always editable; shared terms only by an admin. */
  canEdit(term: TaxonomyTerm): boolean {
    return !this.isShared(term) || this.isAdmin_()
  }

  /** Loads once; concurrent callers share the same request. */
  ensureLoaded(): Promise<void> {
    if (this.loaded_()) return Promise.resolve()
    return this.reload()
  }

  reload(): Promise<void> {
    this.loadPromise_ ??= this.storage
      .query<TaxonomyTerm>(COLLECTION)
      .then((terms) => {
        this.terms_.set(terms)
        this.loaded_.set(true)
      })
      .catch((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401) return
        throw err
      })
      .finally(() => {
        this.loadPromise_ = null
      })
    return this.loadPromise_
  }

  // ── Create / Update / Delete ────────────────────────────────────────────

  /** Adds a term at the end of its kind. `shared` (admin only) adds it for everyone. */
  async add<K extends TaxonomyKind>(
    kind: K,
    key: string,
    extras: TermExtras<K>,
    options: { shared?: boolean } = {}
  ): Promise<TaxonomyTermOf<K>> {
    const sortOrder = this.terms(kind)().reduce((max, t) => Math.max(max, t.sortOrder + 1), 0)
    const body = { ...extras, kind, key, sortOrder, ...(options.shared && { shared: true }) }
    const created = (await this.storage.post(COLLECTION, body)) as unknown as TaxonomyTermOf<K>
    // A new shared term replaces the user's own term with the same key (the server folds it).
    this.terms_.update((all) => [...all.filter((t) => !(options.shared && t.kind === kind && t.key === key)), created])
    return created
  }

  /**
   * Updates a term. Changing `key` makes the server rename the key in every document that
   * uses it (own docs, or everyone's for a shared term) — callers reload those lists.
   */
  async update<K extends TaxonomyKind>(
    term: TaxonomyTermOf<K>,
    changes: Partial<TermExtras<K>> & { key?: string; sortOrder?: number }
  ): Promise<TaxonomyTermOf<K>> {
    const saved = (await this.storage.put(COLLECTION, { ...changes, _id: term._id })) as unknown as TaxonomyTermOf<K>
    this.terms_.update((all) =>
      all
        .filter((t) => !(this.isShared(saved) && t._id !== saved._id && t.kind === saved.kind && t.key === saved.key))
        .map((t) => (t._id === saved._id ? saved : t))
    )
    return saved
  }

  /** Deletes a term. Throws TermInUseError (with the documents) when it is still used. */
  async remove(term: TaxonomyTerm): Promise<void> {
    try {
      await this.storage.remove(COLLECTION, term._id)
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        throw new TermInUseError((err.error?.referencedBy as TermReference[] | undefined) ?? [])
      }
      throw err
    }
    this.terms_.update((all) => all.filter((t) => t._id !== term._id))
  }

  // ── By key (what the registry facades work with) ────────────────────────

  /** Applies `changes` to the term `key` of `kind`. False when there is no such term. */
  async updateByKey<K extends TaxonomyKind>(
    kind: K,
    key: string,
    changes: Partial<TermExtras<K>> & { key?: string; sortOrder?: number }
  ): Promise<boolean> {
    const term = this.find(kind, key)
    if (!term) return false
    if (!this.canEdit(term)) throw new TermReadOnlyError()
    await this.update(term, changes)
    return true
  }

  /** Deletes the term `key` of `kind`. False when there is no such term. */
  async removeByKey(kind: TaxonomyKind, key: string): Promise<boolean> {
    const term = this.find(kind, key)
    if (!term) return false
    if (!this.canEdit(term)) throw new TermReadOnlyError()
    await this.remove(term)
    return true
  }

  /** User-facing text for a store error, or null when it is not one of the store's own. */
  errorMessage(err: unknown): string | null {
    if (err instanceof TermReadOnlyError) return this.translation.translate('taxonomy_shared_admin_only')
    if (err instanceof TermInUseError) {
      const names = err.referencedBy.map((r) => r.name).join(', ')
      return this.translation.translate('taxonomy_term_in_use').replace('{names}', names)
    }
    return null
  }

  /** Persists a new order for the editable terms of one kind (keys in display order). */
  async reorder(kind: TaxonomyKind, orderedKeys: string[]): Promise<void> {
    const terms = this.terms(kind)()
    for (const [sortOrder, key] of orderedKeys.entries()) {
      const term = terms.find((t) => t.key === key)
      if (term && this.canEdit(term) && term.sortOrder !== sortOrder) await this.update(term, { sortOrder })
    }
  }
}
