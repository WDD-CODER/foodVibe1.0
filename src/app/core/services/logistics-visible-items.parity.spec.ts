import { TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { LogisticsItemRegistryService, LogisticsItemTerm } from './logistics-item-registry.service'
import { BusinessService } from './business.service'
import { TaxonomyStore } from './taxonomy-store.service'
import { visibleLogisticsItems } from '@schemas/logistics/visible-items'

type Phase = 'intake' | 'site_visit'
type Env = LogisticsItemTerm['environments'] extends (infer E)[] | undefined ? E : never
type HiddenBusiness = { hiddenLogisticsKeys?: { key: string; at: number }[] } | null

const term = (key: string, phase: Phase, environments?: Env[], extra: Record<string, unknown> = {}) =>
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
const own = (key: string, createdAt: number, extra: Record<string, unknown> = {}) =>
  term(key, 'site_visit', undefined, { userId: 'u1', createdBy: 'u1', createdAt, ...extra })

interface Fixture {
  name: string
  terms: LogisticsItemTerm[]
  hidden: { key: string; at: number }[]
  createdAt: number
  phase: Phase
  environment: Env | undefined
}
const fx = (name: string, terms: LogisticsItemTerm[], createdAt: number, over: Partial<Fixture> = {}): Fixture => ({
  name,
  terms,
  hidden: [],
  createdAt,
  phase: 'site_visit',
  environment: undefined,
  ...over
})

const FIXTURES: Fixture[] = [
  fx('seed term on an older event', [term('seed', 'site_visit', undefined, { createdAt: 9000 })], 5),
  fx('own term after the event', [own('mine', 100)], 50),
  fx('own term before the event', [own('mine', 100)], 150),
  fx(
    'promoted key, old event',
    [term('p', 'site_visit', undefined, { createdBy: 'admin', createdAt: 900 }), own('p', 100, { foldedAt: 905 })],
    150
  ),
  fx(
    'promoted key, event older than the own copy',
    [term('p', 'site_visit', undefined, { createdBy: 'admin', createdAt: 900 }), own('p', 100, { foldedAt: 905 })],
    50
  ),
  fx('removed term, before', [term('r', 'site_visit', undefined, { removedAt: 500 })], 400),
  fx('removed term, after', [term('r', 'site_visit', undefined, { removedAt: 500 })], 600),
  fx('removedAt 0', [term('z', 'site_visit', undefined, { removedAt: 0 })], 600),
  fx('business-hidden, before', [term('h', 'site_visit')], 400, { hidden: [{ key: 'h', at: 500 }] }),
  fx('business-hidden, after', [term('h', 'site_visit')], 600, { hidden: [{ key: 'h', at: 500 }] }),
  fx('phase intake', [term('a', 'site_visit'), term('c', 'intake'), term('d', 'intake')], 5, { phase: 'intake' }),
  fx('environment matches', [term('a', 'site_visit'), term('b', 'site_visit', ['outdoor_field' as Env])], 5, {
    environment: 'outdoor_field' as Env
  }),
  fx('environment does not match', [term('a', 'site_visit'), term('b', 'site_visit', ['outdoor_field' as Env])], 5, {
    environment: 'professional_kitchen' as Env
  }),
  fx('no environment', [term('a', 'site_visit'), term('b', 'site_visit', ['outdoor_field' as Env])], 5),
  fx('order kept, first term filtered', [term('x', 'intake'), term('b', 'site_visit'), term('a', 'site_visit')], 5)
]

describe('visibleLogisticsItems parity with LogisticsItemRegistryService.forEvent', () => {
  let service: LogisticsItemRegistryService
  let terms_: WritableSignal<LogisticsItemTerm[]>
  let business_: WritableSignal<HiddenBusiness>

  beforeEach(() => {
    terms_ = signal<LogisticsItemTerm[]>([])
    business_ = signal<HiddenBusiness>(null)
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TaxonomyStore,
          useValue: {
            terms: (kind: string) => (kind === 'logisticsItem' ? terms_ : signal<unknown[]>([])),
            loadSafely: () => Promise.resolve()
          }
        },
        { provide: BusinessService, useValue: { business_ } }
      ]
    })
    service = TestBed.inject(LogisticsItemRegistryService)
  })

  for (const f of FIXTURES) {
    it(`same keys in the same order: ${f.name}`, () => {
      terms_.set(f.terms)
      business_.set(f.hidden.length ? { hiddenLogisticsKeys: f.hidden } : null)
      const fromService = service.forEvent(f.createdAt, f.phase, f.environment).map((t) => t.key)
      const fromShared = visibleLogisticsItems({
        terms: f.terms,
        hiddenLogisticsKeys: f.hidden,
        eventCreatedAt: f.createdAt,
        phase: f.phase,
        environment: f.environment
      }).map((t) => t.key)
      expect(fromShared).toEqual(fromService)
    })
  }
})
