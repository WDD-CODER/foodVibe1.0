import { TestBed } from '@angular/core/testing'
import { StorageService } from './async-storage.service'
import { HttpStorageAdapter } from './http-storage.adapter'

/**
 * Plan 321 Phase 1 removed StorageService's localStorage fallback mode — it is now
 * a thin facade over HttpStorageAdapter. These tests verify the delegation, not HTTP
 * behavior itself (HttpStorageAdapter's own HTTP calls are exercised end-to-end by the
 * server's characterization tests — see server/test/generic.test.js).
 */
describe('StorageService', () => {
  let service: StorageService
  let adapter: jasmine.SpyObj<HttpStorageAdapter>
  const ENTITY_TYPE = 'test_entity'

  beforeEach(() => {
    adapter = jasmine.createSpyObj<HttpStorageAdapter>('HttpStorageAdapter', [
      'query',
      'get',
      'post',
      'pushToMaster',
      'put',
      'remove',
      'removePermanently',
      'trash',
      'restore',
      'restoreAll',
      'emptyTrash',
      'queryFiltered',
      'search',
      'count',
      'deleteBulk'
    ])
    TestBed.configureTestingModule({
      providers: [StorageService, { provide: HttpStorageAdapter, useValue: adapter }]
    })
    service = TestBed.inject(StorageService)
  })

  it('query() delegates to the adapter with no delay argument', async () => {
    adapter.query.and.resolveTo([{ _id: '1' }])
    const result = await service.query(ENTITY_TYPE)
    expect(adapter.query).toHaveBeenCalledWith(ENTITY_TYPE)
    expect(result).toEqual([{ _id: '1' }])
  })

  it('get() delegates to the adapter', async () => {
    adapter.get.and.resolveTo({ _id: '1' })
    await service.get(ENTITY_TYPE, '1')
    expect(adapter.get).toHaveBeenCalledWith(ENTITY_TYPE, '1')
  })

  it('post() delegates to the adapter and returns its resolved doc', async () => {
    const newEntity = { name: 'Test' }
    adapter.post.and.resolveTo({ _id: 'server-assigned', name: 'Test' } as { name: string } & { _id: string })
    const saved = await service.post(ENTITY_TYPE, newEntity)
    expect(adapter.post).toHaveBeenCalledWith(ENTITY_TYPE, newEntity)
    expect(saved._id).toBe('server-assigned')
  })

  it('put() delegates to the adapter', async () => {
    const updated = { _id: '1', status: 'new' }
    adapter.put.and.resolveTo(updated)
    await service.put(ENTITY_TYPE, updated)
    expect(adapter.put).toHaveBeenCalledWith(ENTITY_TYPE, updated)
  })

  it('remove() delegates to the adapter', async () => {
    adapter.remove.and.resolveTo(undefined)
    await service.remove(ENTITY_TYPE, '1')
    expect(adapter.remove).toHaveBeenCalledWith(ENTITY_TYPE, '1')
  })

  it('Trash calls (plan 407) delegate to the adapter', async () => {
    adapter.removePermanently.and.resolveTo(undefined)
    adapter.trash.and.resolveTo([])
    adapter.restore.and.resolveTo({ _id: '1' })
    adapter.restoreAll.and.resolveTo(undefined)
    adapter.emptyTrash.and.resolveTo(undefined)
    await service.removePermanently(ENTITY_TYPE, '1')
    await service.trash(ENTITY_TYPE)
    await service.restore(ENTITY_TYPE, '1')
    await service.restoreAll(ENTITY_TYPE)
    await service.emptyTrash(ENTITY_TYPE)
    expect(adapter.removePermanently).toHaveBeenCalledWith(ENTITY_TYPE, '1')
    expect(adapter.trash).toHaveBeenCalledWith(ENTITY_TYPE)
    expect(adapter.restore).toHaveBeenCalledWith(ENTITY_TYPE, '1')
    expect(adapter.restoreAll).toHaveBeenCalledWith(ENTITY_TYPE)
    expect(adapter.emptyTrash).toHaveBeenCalledWith(ENTITY_TYPE)
  })

  it('deleteBulk() delegates to the adapter', async () => {
    adapter.deleteBulk.and.resolveTo(undefined)
    await service.deleteBulk(ENTITY_TYPE, ['1', '2'])
    expect(adapter.deleteBulk).toHaveBeenCalledWith(ENTITY_TYPE, ['1', '2'])
  })

  it('count() delegates to the adapter with the filter', async () => {
    adapter.count.and.resolveTo(3)
    const count = await service.count(ENTITY_TYPE, 'lowStock')
    expect(adapter.count).toHaveBeenCalledWith(ENTITY_TYPE, 'lowStock')
    expect(count).toBe(3)
  })
})
