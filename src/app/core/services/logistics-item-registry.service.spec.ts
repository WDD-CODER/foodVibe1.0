import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LogisticsItemRegistryService, LogisticsItemTerm } from './logistics-item-registry.service'
import { TaxonomyStore } from './taxonomy-store.service'

const term = (key: string, phase: 'intake' | 'site_visit', environments?: LogisticsItemTerm['environments']) =>
  ({
    _id: key,
    userId: '__master__',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    kind: 'logisticsItem',
    key,
    sortOrder: 0,
    phase,
    section: 'space',
    answerType: 'status',
    environments
  }) as LogisticsItemTerm

describe('LogisticsItemRegistryService', () => {
  let service: LogisticsItemRegistryService
  let loadSafely: jasmine.Spy

  beforeEach(() => {
    const terms_ = signal([
      term('a', 'site_visit'),
      term('b', 'site_visit', ['outdoor_field']),
      term('c', 'intake'),
      term('d', 'intake', ['client_home'])
    ])
    loadSafely = jasmine.createSpy('loadSafely').and.resolveTo()
    TestBed.configureTestingModule({
      providers: [{ provide: TaxonomyStore, useValue: { terms: () => terms_, loadSafely } }]
    })
    service = TestBed.inject(LogisticsItemRegistryService)
  })

  const keys = (s: () => LogisticsItemTerm[]) => s().map((t) => t.key)

  it('hides an item of another environment', () => {
    expect(keys(service.forPhase('site_visit', 'professional_kitchen'))).toEqual(['a'])
  })

  it('shows an item of the matching environment', () => {
    expect(keys(service.forPhase('site_visit', 'outdoor_field'))).toEqual(['a', 'b'])
  })

  it('shows every item when the environment is unknown', () => {
    expect(keys(service.forPhase('site_visit', undefined))).toEqual(['a', 'b'])
  })

  it('returns only the items of the phase', () => {
    expect(keys(service.forPhase('intake', undefined))).toEqual(['c', 'd'])
  })

  it('returns the same signal for the same arguments', () => {
    expect(service.forPhase('intake', 'client_home')).toBe(service.forPhase('intake', 'client_home'))
  })

  it('loadSafely logs through the store with its own event name', async () => {
    await service.loadSafely({ track: true })
    expect(loadSafely).toHaveBeenCalledWith(
      { event: 'logistics_items.load.failed', message: 'Loading logistics items failed' },
      { track: true }
    )
  })
})
