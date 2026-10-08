import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ActivityValuePipe } from './activity-value.pipe'
import { TranslationService } from '../services/translation.service'
import { KitchenStateService } from '../services/kitchen-state.service'

describe('ActivityValuePipe', () => {
  let pipe: ActivityValuePipe

  beforeEach(() => {
    const dict: Record<string, string> = {
      vegetables: 'ירקות',
      gluten: 'גלוטן',
      dairy: 'חלב',
      activity_deleted_supplier: 'ספק שנמחק'
    }
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((key: string | undefined) => (key ? (dict[key.toLowerCase()] ?? key) : ''))
    const suppliers = new Map([
      ['s1', { _id: 's1', nameHebrew: 'ירקות כהן' }],
      ['s2', { _id: 's2', nameHebrew: 'פירות השרון' }]
    ])
    TestBed.configureTestingModule({
      providers: [
        ActivityValuePipe,
        { provide: TranslationService, useValue: translation },
        { provide: KitchenStateService, useValue: { suppliersById_: signal(suppliers) } }
      ]
    })
    pipe = TestBed.inject(ActivityValuePipe)
  })

  it('maps supplier ids to names', () => {
    expect(pipe.transform('s1,s2', 'supplier')).toBe('ירקות כהן, פירות השרון')
  })

  it('shows an unknown supplier id as a deleted supplier', () => {
    expect(pipe.transform('s1,gone', 'supplier')).toBe('ירקות כהן, ספק שנמחק')
  })

  it('translates canonical keys', () => {
    expect(pipe.transform('Gluten, Dairy', 'allergens')).toBe('גלוטן, חלב')
    expect(pipe.transform('vegetables', 'category')).toBe('ירקות')
  })

  it('keeps free-text fields as recorded', () => {
    expect(pipe.transform('Tomatoes, cherry', 'name')).toBe('Tomatoes, cherry')
    expect(pipe.transform('12 ₪', 'price')).toBe('12 ₪')
  })

  it('renders empty values as a dash', () => {
    expect(pipe.transform(undefined, 'category')).toBe('—')
    expect(pipe.transform('', 'supplier')).toBe('—')
    expect(pipe.transform('  ', 'allergens')).toBe('—')
  })
})
