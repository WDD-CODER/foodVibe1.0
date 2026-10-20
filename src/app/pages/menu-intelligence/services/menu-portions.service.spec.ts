import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { FormBuilder, type FormGroup } from '@angular/forms'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { MenuPortionsService } from './menu-portions.service'

describe('MenuPortionsService', () => {
  let service: MenuPortionsService
  let form: FormGroup
  let version: ReturnType<typeof signal<number>>
  let coefficients: Record<string, number>

  const item = (over: Record<string, unknown> = {}): FormGroup =>
    TestBed.inject(FormBuilder).group({
      recipeId: ['r1'],
      recipeType: ['dish'],
      serving_portions: [1],
      coefficient_override: [null as number | null],
      ...over
    })

  beforeEach(() => {
    coefficients = { 'eventType:פרטי': 1.15, 'eventType:חתונה': 1.2, 'menuType:buffet_family': 1.1 }
    TestBed.configureTestingModule({
      providers: [
        MenuPortionsService,
        { provide: KitchenStateService, useValue: { recipes_: () => [] } },
        {
          provide: TaxonomyStore,
          useValue: {
            isLoaded_: () => true,
            find: (kind: string, key: string) =>
              `${kind}:${key}` in coefficients ? { key, coefficient: coefficients[`${kind}:${key}`] } : undefined
          }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    service = TestBed.inject(MenuPortionsService)
    const fb = TestBed.inject(FormBuilder)
    form = fb.group({
      eventType: ['פרטי'],
      servingType: ['buffet_family'],
      guestCount: [100],
      sections: fb.array([fb.group({ _id: ['s1'], items: fb.array([item()]) })])
    })
    version = signal(0)
    service.bind(form, version)
  })

  const bump = (): void => version.update((v) => v + 1)

  it('gives event coefficient x serving coefficient (1.15 x 1.1 = 1.265 -> 127 portions)', () => {
    const p = service.at(0, 0)
    expect(p?.coefficient).toBeCloseTo(1.265, 9)
    expect(p?.portions).toBe(127)
    expect(p?.overridden).toBeFalse()
  })

  it('uses the item override and flags it', () => {
    form.get('sections.0.items.0.coefficient_override')?.setValue(1.1)
    bump()
    expect(service.at(0, 0)).toEqual({ portions: 110, coefficient: 1.1, overridden: true })
  })

  it('changing the event type moves only dishes without an override', () => {
    const items = form.get('sections.0.items') as unknown as { push(c: FormGroup): void }
    items.push(item())
    form.get('sections.0.items.0.coefficient_override')?.setValue(1.1)
    form.get('eventType')?.setValue('חתונה')
    bump()
    expect(service.at(0, 0)?.portions).toBe(110)
    expect(service.at(0, 1)?.portions).toBe(132)
  })

  it('guests 0 gives 0 portions; portions per diner 0 gives 0', () => {
    form.get('guestCount')?.setValue(0)
    bump()
    expect(service.at(0, 0)?.portions).toBe(0)
    form.get('guestCount')?.setValue(100)
    form.get('sections.0.items.0.serving_portions')?.setValue(0)
    bump()
    expect(service.at(0, 0)?.portions).toBe(0)
  })

  it('keeps the snapshots of a loaded event when the term changes later', () => {
    service.remember({
      eventTypeSnapshot: { key: 'פרטי', name: 'פרטי', coefficient: 1 },
      servingTypeSnapshot: { key: 'buffet_family', name: 'buffet_family', coefficient: 1 }
    })
    coefficients['eventType:פרטי'] = 2
    bump()
    expect(service.at(0, 0)?.portions).toBe(100)
    expect(service.snapshots('פרטי', 'buffet_family').eventTypeSnapshot?.coefficient).toBe(1)
  })

  it('freezes the picked type on the form change, not inside the computed', () => {
    form.get('eventType')?.setValue('חתונה')
    bump()
    coefficients['eventType:חתונה'] = 3
    bump()
    expect(service.at(0, 0)?.coefficient).toBeCloseTo(1.2 * 1.1, 9)
  })

  it('takes a new snapshot from the current term when the key changes', () => {
    service.remember({ eventTypeSnapshot: { key: 'פרטי', name: 'פרטי', coefficient: 1 } })
    expect(service.snapshots('חתונה', '').eventTypeSnapshot).toEqual({ key: 'חתונה', name: 'חתונה', coefficient: 1.2 })
  })

  it('returns null for a row that does not exist', () => {
    expect(service.at(3, 0)).toBeNull()
    expect(service.at(0, 5)).toBeNull()
  })
})
