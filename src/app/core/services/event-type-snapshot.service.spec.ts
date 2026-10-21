import { TestBed } from '@angular/core/testing'
import type { TypeSnapshot } from '@models/menu-event.model'
import { EventTypeSnapshotService } from './event-type-snapshot.service'
import { TaxonomyStore } from './taxonomy-store.service'
import { TranslationService } from './translation.service'

describe('EventTypeSnapshotService', () => {
  let service: EventTypeSnapshotService
  let terms: Record<string, { key: string; coefficient?: number }>

  beforeEach(() => {
    terms = {
      'eventType:חתונה': { key: 'חתונה', coefficient: 1.2 },
      'menuType:buffet_family': { key: 'buffet_family' }
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: TaxonomyStore, useValue: { find: (kind: string, key: string) => terms[`${kind}:${key}`] } },
        { provide: TranslationService, useValue: { translate: (k: string) => (k === 'buffet_family' ? 'בופה' : k) } }
      ]
    })
    service = TestBed.inject(EventTypeSnapshotService)
  })

  it('keeps a stored snapshot for the same key even after the term coefficient changed', () => {
    const stored: TypeSnapshot = { key: 'חתונה', name: 'חתונה', coefficient: 1.1 }
    expect(service.snapshotFor('eventType', 'חתונה', stored)).toBe(stored)
  })

  it('builds a new snapshot from the current term when the key is new', () => {
    const stored: TypeSnapshot = { key: 'פרטי', name: 'פרטי', coefficient: 1.15 }
    expect(service.snapshotFor('eventType', 'חתונה', stored)).toEqual({ key: 'חתונה', name: 'חתונה', coefficient: 1.2 })
  })

  it('uses the translated name', () => {
    expect(service.snapshotFor('menuType', 'buffet_family')?.name).toBe('בופה')
  })

  it('gives coefficient 1 for a term without a coefficient or an unknown key', () => {
    expect(service.snapshotFor('menuType', 'buffet_family')?.coefficient).toBe(1)
    expect(service.snapshotFor('eventType', 'לא קיים')?.coefficient).toBe(1)
  })

  it('gives nothing when no key is chosen', () => {
    expect(service.snapshotFor('eventType', '')).toBeUndefined()
  })
})
