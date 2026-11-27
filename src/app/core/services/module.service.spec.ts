import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import type { Business } from '@schemas/entities'
import { BusinessService } from './business.service'
import { ModuleService } from './module.service'

describe('ModuleService', () => {
  const business = signal<Business | null>(null)
  const loaded = signal(true)
  let service: ModuleService

  beforeEach(() => {
    business.set(null)
    loaded.set(true)
    TestBed.configureTestingModule({
      providers: [{ provide: BusinessService, useValue: { business_: business, loaded_: loaded } }]
    })
    service = TestBed.inject(ModuleService)
  })

  it('a business without modules has the four defaults and not consultant_diag', () => {
    business.set({ _id: 'b1', name: 'x' } as Business)
    expect(service.has('events')).toBeTrue()
    expect(service.has('event_logistics')).toBeTrue()
    expect(service.has('frontdesk')).toBeTrue()
    expect(service.has('ai_create')).toBeTrue()
    expect(service.has('consultant_diag')).toBeFalse()
  })

  it('menu_design is off by default and gates menuDesigns only when it is on (plan 764)', () => {
    business.set({ _id: 'b1', name: 'x' } as Business)
    expect(service.has('menu_design')).toBeFalse()
    expect(service.hasType('menuDesigns')).toBeFalse()
    business.set({ _id: 'b1', name: 'x', modules: ['events', 'menu_design'] } as Business)
    expect(service.has('menu_design')).toBeTrue()
    expect(service.hasType('menuDesigns')).toBeTrue()
  })

  it('modules: [frontdesk] has only frontdesk', () => {
    business.set({ _id: 'b1', name: 'x', modules: ['frontdesk'] } as Business)
    expect(service.has('frontdesk')).toBeTrue()
    expect(service.has('events')).toBeFalse()
    expect(service.has('ai_create')).toBeFalse()
  })

  it('has(list) is true when either is on', () => {
    business.set({ _id: 'b1', name: 'x', modules: ['frontdesk'] } as Business)
    expect(service.has(['events', 'frontdesk'])).toBeTrue()
    expect(service.has(['events', 'event_logistics'])).toBeFalse()
  })

  it('hasType follows MODULE_OF_TYPE and leaves other types open', () => {
    business.set({ _id: 'b1', name: 'x', modules: ['events'] } as Business)
    expect(service.hasType('requests')).toBeFalse()
    expect(service.hasType('clients')).toBeTrue()
    expect(service.hasType('products')).toBeTrue()
  })

  it('answers from the defaults before the business has loaded', () => {
    loaded.set(false)
    expect(service.has('events')).toBeTrue()
  })

  it('ready() resolves at once when loaded, after the load, and when signed out', async () => {
    await service.ready()
    loaded.set(false)
    let done = false
    const pending = service.ready().then(() => (done = true))
    await Promise.resolve()
    expect(done).toBeFalse()
    loaded.set(true)
    TestBed.flushEffects()
    await pending
    expect(done).toBeTrue()
  })
})
