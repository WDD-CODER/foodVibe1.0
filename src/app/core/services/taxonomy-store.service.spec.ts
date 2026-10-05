import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TaxonomyStore, TermInUseError, TermReadOnlyError } from './taxonomy-store.service'
import { StorageService } from './async-storage.service'
import { UserService } from './user.service'
import { TranslationService } from './translation.service'
import type { User } from '../models/user.model'

const term = (userId: string, kind: string, key: string, sortOrder = 0, extra: Record<string, unknown> = {}) => ({
  _id: `${kind}:${userId}:${key}`,
  schemaVersion: 2,
  userId,
  createdAt: 1,
  updatedAt: 1,
  sortOrder,
  kind,
  key,
  ...extra
})

describe('TaxonomyStore', () => {
  let store: TaxonomyStore
  let storage: jasmine.SpyObj<StorageService>
  const user = signal<User | null>({ _id: 'u1', name: 'u', email: 'u@x', role: 'user' })

  beforeEach(() => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x', role: 'user' })
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['query', 'post', 'put', 'remove'])
    storage.query.and.returnValue(
      Promise.resolve([
        term('u1', 'allergen', 'lupin', 0),
        term('__master__', 'allergen', 'nuts', 1),
        term('__master__', 'allergen', 'gluten', 0),
        term('__master__', 'label', 'vegan', 0, { color: '#10B981' })
      ])
    )
    storage.post.and.callFake(<T>(_t: string, body: T) =>
      Promise.resolve({ ...term('u1', 'x', 'x'), ...body, _id: 'new' })
    )
    storage.put.and.callFake(<T>(_t: string, body: T) => Promise.resolve(body))
    storage.remove.and.returnValue(Promise.resolve())
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k?: string) => (k === 'taxonomy_term_in_use' ? 'in use: {names}' : String(k)))

    TestBed.configureTestingModule({
      providers: [
        TaxonomyStore,
        { provide: StorageService, useValue: storage },
        { provide: UserService, useValue: { user_: user } },
        { provide: TranslationService, useValue: translation }
      ]
    })
    store = TestBed.inject(TaxonomyStore)
  })

  describe('reading', () => {
    it('loads once, even with concurrent callers', async () => {
      await Promise.all([store.ensureLoaded(), store.ensureLoaded()])
      await store.ensureLoaded()
      expect(storage.query).toHaveBeenCalledTimes(1)
      expect(store.isLoaded_()).toBeTrue()
    })

    it('lists a kind shared-first, each group by sortOrder', async () => {
      await store.ensureLoaded()
      expect(
        store
          .terms('allergen')()
          .map((t) => t.key)
      ).toEqual(['gluten', 'nuts', 'lupin'])
      expect(
        store
          .terms('label')()
          .map((t) => t.key)
      ).toEqual(['vegan'])
      expect(store.terms('allergen')).toBe(store.terms('allergen')) // cached per kind
    })

    it('finds by key and tells shared from own', async () => {
      await store.ensureLoaded()
      expect(store.isShared(store.find('allergen', 'nuts')!)).toBeTrue()
      expect(store.isShared(store.find('allergen', 'lupin')!)).toBeFalse()
      expect(store.find('allergen', 'nope')).toBeUndefined()
    })

    it('a signed-out load (401) resolves without terms', async () => {
      storage.query.and.returnValue(Promise.reject(new HttpErrorResponse({ status: 401 })))
      await store.reload()
      expect(store.allTerms_()).toEqual([])
      expect(store.isLoaded_()).toBeFalse()
    })

    it('any other load error is rethrown', async () => {
      storage.query.and.returnValue(Promise.reject(new Error('boom')))
      await expectAsync(store.reload()).toBeRejectedWithError('boom')
    })
  })

  describe('editing rights', () => {
    it('a user edits own terms only; an admin edits shared ones too', async () => {
      await store.ensureLoaded()
      const shared = store.find('allergen', 'nuts')!
      const own = store.find('allergen', 'lupin')!
      expect(store.canEdit(own)).toBeTrue()
      expect(store.canEdit(shared)).toBeFalse()
      user.set({ _id: 'boss', name: 'b', email: 'b@x', role: 'admin' })
      expect(store.canEdit(shared)).toBeTrue()
    })

    it('updateByKey / removeByKey refuse a shared term for a non-admin', async () => {
      await store.ensureLoaded()
      await expectAsync(store.updateByKey('allergen', 'nuts', { sortOrder: 5 })).toBeRejectedWith(
        jasmine.any(TermReadOnlyError)
      )
      await expectAsync(store.removeByKey('allergen', 'nuts')).toBeRejectedWith(jasmine.any(TermReadOnlyError))
      expect(storage.put).not.toHaveBeenCalled()
      expect(storage.remove).not.toHaveBeenCalled()
    })

    it('updateByKey / removeByKey return false for an unknown key', async () => {
      await store.ensureLoaded()
      expect(await store.updateByKey('allergen', 'nope', { sortOrder: 1 })).toBeFalse()
      expect(await store.removeByKey('allergen', 'nope')).toBeFalse()
    })
  })

  describe('writing', () => {
    it('add posts at the end of the kind and appends to the list', async () => {
      await store.ensureLoaded()
      await store.add('allergen', 'celery', {})
      expect(storage.post).toHaveBeenCalledWith('taxonomyTerms', { kind: 'allergen', key: 'celery', sortOrder: 2 })
      expect(
        store
          .terms('allergen')()
          .map((t) => t.key)
      ).toContain('celery')
    })

    it('a shared add sends shared: true and replaces the own term with the same key', async () => {
      await store.ensureLoaded()
      storage.post.and.returnValue(Promise.resolve(term('__master__', 'allergen', 'lupin', 2) as never))
      await store.add('allergen', 'lupin', {}, { shared: true })
      expect(storage.post).toHaveBeenCalledWith(
        'taxonomyTerms',
        jasmine.objectContaining({ shared: true, key: 'lupin' })
      )
      const lupins = store
        .terms('allergen')()
        .filter((t) => t.key === 'lupin')
      expect(lupins.length).toBe(1)
      expect(store.isShared(lupins[0])).toBeTrue()
    })

    it('updateByKey puts only the changes and the id, then replaces the term', async () => {
      await store.ensureLoaded()
      storage.put.and.returnValue(
        Promise.resolve({ ...term('u1', 'allergen', 'lupine'), _id: 'allergen:u1:lupin' } as never)
      )
      expect(await store.updateByKey('allergen', 'lupin', { key: 'lupine' })).toBeTrue()
      expect(storage.put.calls.mostRecent().args).toEqual([
        'taxonomyTerms',
        jasmine.objectContaining({ key: 'lupine', _id: 'allergen:u1:lupin' })
      ])
      expect(store.find('allergen', 'lupine')).toBeDefined()
    })

    it('a shared term re-keyed by an admin folds an own term that already had the new key', async () => {
      user.set({ _id: 'boss', name: 'b', email: 'b@x', role: 'admin' })
      await store.ensureLoaded()
      storage.put.and.returnValue(
        Promise.resolve({ ...term('__master__', 'allergen', 'lupin', 1), _id: 'allergen:__master__:nuts' } as never)
      )
      await store.updateByKey('allergen', 'nuts', { key: 'lupin' })
      const keys = store
        .terms('allergen')()
        .map((t) => `${t.userId}:${t.key}`)
      expect(keys).toEqual(['__master__:gluten', '__master__:lupin'])
    })

    it('removeByKey deletes and drops the term from the list', async () => {
      await store.ensureLoaded()
      expect(await store.removeByKey('allergen', 'lupin')).toBeTrue()
      expect(storage.remove).toHaveBeenCalledWith('taxonomyTerms', 'allergen:u1:lupin')
      expect(store.find('allergen', 'lupin')).toBeUndefined()
    })

    it('a 409 on remove becomes TermInUseError with the documents, and the term stays', async () => {
      await store.ensureLoaded()
      const referencedBy = [{ type: 'products', _id: 'p1', name: 'עגבניה' }]
      storage.remove.and.returnValue(Promise.reject(new HttpErrorResponse({ status: 409, error: { referencedBy } })))
      const err = await store.removeByKey('allergen', 'lupin').catch((e: unknown) => e)
      expect(err).toEqual(jasmine.any(TermInUseError))
      expect((err as TermInUseError).referencedBy).toEqual(referencedBy)
      expect(store.find('allergen', 'lupin')).toBeDefined()
    })

    it('other remove errors are rethrown as-is', async () => {
      await store.ensureLoaded()
      storage.remove.and.returnValue(Promise.reject(new HttpErrorResponse({ status: 500 })))
      await expectAsync(store.removeByKey('allergen', 'lupin')).toBeRejectedWith(jasmine.any(HttpErrorResponse))
    })

    it('reorder saves the new sortOrder of editable terms only', async () => {
      await store.ensureLoaded()
      storage.query.and.returnValue(
        Promise.resolve([
          term('u1', 'eventType', 'a', 0),
          term('u1', 'eventType', 'b', 1),
          term('__master__', 'eventType', 'm', 0)
        ])
      )
      await store.reload()
      storage.put.and.callFake(<T>(_t: string, body: T) => {
        const b = body as { _id: string; sortOrder: number }
        const [kind, userId, key] = b._id.split(':')
        return Promise.resolve(term(userId, kind, key, b.sortOrder) as never)
      })
      await store.reorder('eventType', ['b', 'a', 'm'])
      expect(storage.put).toHaveBeenCalledTimes(2)
      expect(storage.put.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ sortOrder: 0, _id: 'eventType:u1:b' }))
      expect(storage.put.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ sortOrder: 1, _id: 'eventType:u1:a' }))
    })
  })

  describe('errorMessage', () => {
    it('describes read-only and in-use errors, null for anything else', () => {
      expect(store.errorMessage(new TermReadOnlyError())).toBe('taxonomy_shared_admin_only')
      expect(
        store.errorMessage(
          new TermInUseError([
            { type: 'products', _id: 'p1', name: 'א' },
            { type: 'recipes', _id: 'r1', name: 'ב' }
          ])
        )
      ).toBe('in use: א, ב')
      expect(store.errorMessage(new Error('x'))).toBeNull()
    })
  })
})
