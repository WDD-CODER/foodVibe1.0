import { TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { LogisticsItemRegistryService, LogisticsItemTerm } from './logistics-item-registry.service'
import { BusinessService } from './business.service'
import { TaxonomyStore } from './taxonomy-store.service'

const term = (
  key: string,
  phase: 'intake' | 'site_visit',
  environments?: LogisticsItemTerm['environments'],
  extra: Record<string, unknown> = {}
) =>
  ({
    _id: key + String(extra['userId'] ?? ''),
    userId: '__master__',
    createdBy: '__master__',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    kind: 'logisticsItem',
    key,
    sortOrder: 0,
    phase,
    section: 'space',
    answerType: 'status',
    environments,
    ...extra
  }) as unknown as LogisticsItemTerm

type HiddenBusiness = { hiddenLogisticsKeys?: { key: string; at: number }[] } | null

describe('LogisticsItemRegistryService', () => {
  let service: LogisticsItemRegistryService
  let loadSafely: jasmine.Spy
  let terms_: WritableSignal<LogisticsItemTerm[]>
  let sectionTerms_: WritableSignal<unknown[]>
  let business_: WritableSignal<HiddenBusiness>

  beforeEach(() => {
    sectionTerms_ = signal<unknown[]>([])
    business_ = signal<HiddenBusiness>(null)
    terms_ = signal<LogisticsItemTerm[]>([
      term('a', 'site_visit'),
      term('b', 'site_visit', ['outdoor_field']),
      term('c', 'intake'),
      term('d', 'intake', ['client_home'])
    ])
    loadSafely = jasmine.createSpy('loadSafely').and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TaxonomyStore,
          useValue: { terms: (kind: string) => (kind === 'logisticsItem' ? terms_ : sectionTerms_), loadSafely }
        },
        { provide: BusinessService, useValue: { business_ } }
      ]
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

  describe('forEvent (plan 579 date rule)', () => {
    const own = (key: string, createdAt: number, extra: Record<string, unknown> = {}) =>
      term(key, 'site_visit', undefined, { userId: 'u1', createdBy: 'u1', createdAt, ...extra })
    const keysFor = (createdAt: number) => service.forEvent(createdAt, 'site_visit', undefined).map((t) => t.key)

    it('a seed term shows on an event older than it', () => {
      terms_.set([term('seed', 'site_visit', undefined, { createdAt: 9000 })])
      expect(keysFor(5)).toEqual(['seed'])
    })

    it('an own term created after the event does not show; one created before does', () => {
      terms_.set([own('mine', 100)])
      expect(keysFor(50)).toEqual([])
      expect(keysFor(150)).toEqual(['mine'])
    })

    it('a promoted key (new master + folded own) shows on the business old event', () => {
      terms_.set([
        term('p', 'site_visit', undefined, { createdBy: 'admin', createdAt: 900 }),
        own('p', 100, { foldedAt: 905 })
      ])
      expect(keysFor(150)).toEqual(['p'])
      expect(keysFor(50)).toEqual([])
      expect(service.items_().length).toBe(1)
    })

    it('a removed term shows on an event created before the removal, not after', () => {
      terms_.set([term('r', 'site_visit', undefined, { removedAt: 500 })])
      expect(keysFor(400)).toEqual(['r'])
      expect(keysFor(600)).toEqual([])
      expect(service.items_()).toEqual([])
    })

    it('removedAt 0 counts as live', () => {
      terms_.set([term('z', 'site_visit', undefined, { removedAt: 0 })])
      expect(keysFor(600)).toEqual(['z'])
      expect(service.items_().length).toBe(1)
    })

    it('a business-hidden key shows only on events created before the hide', () => {
      terms_.set([term('h', 'site_visit')])
      business_.set({ hiddenLogisticsKeys: [{ key: 'h', at: 500 }] })
      expect(keysFor(400)).toEqual(['h'])
      expect(keysFor(600)).toEqual([])
      expect(keys(service.defaultItems_)).toEqual([])
    })

    it('lists the built-in sections, then own ones, with labels', () => {
      sectionTerms_.set([{ key: 'סעיף שלי' }])
      expect(service.sections_().slice(0, 2)).toEqual(['infrastructure', 'space'])
      expect(service.sections_().at(-1)).toBe('סעיף שלי')
      expect(service.sectionLabel('space')).toBe('logistics_section_space')
      expect(service.sectionLabel('סעיף שלי')).toBe('סעיף שלי')
    })
  })
})
