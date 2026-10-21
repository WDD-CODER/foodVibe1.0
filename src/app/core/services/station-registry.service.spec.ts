import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { StationRegistryService } from './station-registry.service'
import { StorageService } from './async-storage.service'
import { UserService } from './user.service'
import { TranslationService } from './translation.service'

const term = (key: string, sortOrder: number, userId = '__master__') => ({
  _id: `station:${userId}:${key}`,
  userId,
  schemaVersion: 2,
  createdAt: 1,
  updatedAt: 1,
  kind: 'station',
  key,
  sortOrder
})

describe('StationRegistryService', () => {
  let service: StationRegistryService
  let storage: jasmine.SpyObj<StorageService>
  let isAdmin_: ReturnType<typeof signal<boolean>>

  beforeEach(fakeAsync(() => {
    isAdmin_ = signal(false)
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['query', 'put', 'post', 'remove'])
    storage.query.and.callFake(<T>(type: string) =>
      Promise.resolve((type === 'taxonomyTerms' ? [term('חם', 0), term('קר', 1), term('גריל', 0, 'u1')] : []) as T[])
    )
    storage.post.and.callFake(<T>(_type: string, body: T) =>
      Promise.resolve({ _id: 'new', userId: 'u1', schemaVersion: 2, createdAt: 1, updatedAt: 1, ...body })
    )
    storage.put.and.callFake(<T>(_type: string, body: T) => Promise.resolve({ ...term('גריל', 0, 'u1'), ...body }))
    storage.remove.and.returnValue(Promise.resolve())

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storage },
        { provide: UserService, useValue: { user_: signal(null), isAdmin_ } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    service = TestBed.inject(StationRegistryService)
    tick()
  }))

  it('lists the shared stations first, then the user own, as keys', () => {
    expect(service.stations_()).toEqual(['חם', 'קר', 'גריל'])
  })

  it('adds a trimmed station as a plain station term and returns its key', fakeAsync(() => {
    let key = ''
    void service.addStation('  פס  ').then((k) => (key = k))
    tick()
    expect(storage.post).toHaveBeenCalledWith('taxonomyTerms', jasmine.objectContaining({ kind: 'station', key: 'פס' }))
    expect(key).toBe('פס')
    expect(service.stations_()).toContain('פס')
  }))

  it('returns the existing key for a duplicate name without posting', fakeAsync(() => {
    let key = ''
    void service.addStation('קר').then((k) => (key = k))
    tick()
    expect(key).toBe('קר')
    expect(storage.post).not.toHaveBeenCalled()
  }))

  it('returns an empty key for a blank name', fakeAsync(() => {
    let key = 'x'
    void service.addStation('   ').then((k) => (key = k))
    tick()
    expect(key).toBe('')
    expect(storage.post).not.toHaveBeenCalled()
  }))

  it('renames an own station through a key change', fakeAsync(() => {
    let ok = false
    void service.renameStation('גריל', 'גריל פחמים').then((r) => (ok = r))
    tick()
    expect(ok).toBeTrue()
    expect(storage.put).toHaveBeenCalledWith('taxonomyTerms', jasmine.objectContaining({ key: 'גריל פחמים' }))
  }))

  it('refuses to rename or remove a shared station unless admin', fakeAsync(() => {
    let renameErr: unknown
    let removeErr: unknown
    service.renameStation('חם', 'חם מאוד').catch((e: unknown) => (renameErr = e))
    service.removeStation('חם').catch((e: unknown) => (removeErr = e))
    tick()
    expect(renameErr).toBeTruthy()
    expect(removeErr).toBeTruthy()
    expect(storage.put).not.toHaveBeenCalled()
    expect(storage.remove).not.toHaveBeenCalled()
    expect(service.canEdit('חם')).toBeFalse()
    expect(service.canEdit('גריל')).toBeTrue()
    isAdmin_.set(true)
    expect(service.canEdit('חם')).toBeTrue()
  }))

  it('removes an own station', fakeAsync(() => {
    void service.removeStation('גריל')
    tick()
    expect(storage.remove).toHaveBeenCalledWith('taxonomyTerms', 'station:u1:גריל')
    expect(service.stations_()).not.toContain('גריל')
  }))
})
