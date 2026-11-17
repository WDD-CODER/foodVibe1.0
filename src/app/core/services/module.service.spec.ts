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
    business.set({ _id: 'b1', name: 'x' } as Business)
    loaded.set(true)
    TestBed.configureTestingModule({
      providers: [{ provide: BusinessService, useValue: { business_: business, loaded_: loaded } }]
    })
    service = TestBed.inject(ModuleService)
  })

  it('a business without modules has the four defaults and not consultant_diag', () => {
    expect(service.has('events')).toBeTrue()
    expect(service.has('event_logistics')).toBeTrue()
    expect(service.has('frontdesk')).toBeTrue()
    expect(service.has('ai_create')).toBeTrue()
    expect(service.has('consultant_diag')).toBeFalse()
  })

  it("modules: ['frontdesk'] has only frontdesk", () => {
    business.set({ _id: 'b1', name: 'x', modules: ['frontdesk'] } as Business)
    expect(service.modules_()).toEqual(['frontdesk'])
    expect(service.has('events')).toBeFalse()
  })

  it('has() with a list is true when either is on', () => {
    business.set({ _id: 'b1', name: 'x', modules: ['frontdesk'] } as Business)
    expect(service.has(['events', 'frontdesk'])).toBeTrue()
    expect(service.has(['events', 'ai_create'])).toBeFalse()
  })

  it('hasType follows MODULE_OF_TYPE and leaves other types open', () => {
    business.set({ _id: 'b1', name: 'x', modules: ['events'] } as Business)
    expect(service.hasType('requests')).toBeFalse()
    expect(service.hasType('clients')).toBeTrue()
    expect(service.hasType('products')).toBeTrue()
  })

  it('before the business loaded it answers from the defaults', () => {
    loaded.set(false)
    business.set(null)
    expect(service.has('events')).toBeTrue()
  })

  it('ready() resolves at once when loaded (also signed out or after a failed load)', async () => {
    business.set(null)
    await service.ready()
  })

  it('ready() waits for the load to finish', async () => {
    loaded.set(false)
    let done = false
    const p = service.ready().then(() => (done = true))
    TestBed.flushEffects()
    expect(done).toBeFalse()
    loaded.set(true)
    TestBed.flushEffects()
    await p
    expect(done).toBeTrue()
  })
})
