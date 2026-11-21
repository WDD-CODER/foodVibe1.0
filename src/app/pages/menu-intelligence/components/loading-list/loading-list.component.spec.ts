import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { EquipmentDataService } from '@services/equipment-data.service'
import { EventPipelineService } from '@services/event-pipeline.service'
import { LogisticsItemRegistryService } from '@services/logistics-item-registry.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { TranslationService } from '@services/translation.service'
import type { Equipment } from '@models/equipment.model'
import type { MenuEvent } from '@models/menu-event.model'
import { LoadingListComponent } from './loading-list.component'

const eq = (id: string, ownedQuantity: number): Equipment => ({
  _id: id,
  nameHebrew: 'ציוד ' + id,
  category: 'tool',
  ownedQuantity,
  scalingRule: { perGuests: 50, minQuantity: 2, maxQuantity: 4 },
  isConsumable: false,
  createdAt: 1,
  updatedAt: 1
})

const answer = (itemKey: string, extra: Record<string, unknown> = {}) => ({
  itemKey,
  phase: 'site_visit' as const,
  section: 'space',
  status: 'needed' as const,
  payer: 'ours' as const,
  at: 1,
  by: 'u',
  byName: 'U',
  ...extra
})

describe('LoadingListComponent', () => {
  let fixture: ComponentFixture<LoadingListComponent>
  let el: HTMLElement
  let pipeline: jasmine.SpyObj<EventPipelineService>
  const store = signal<MenuEvent[]>([])
  const equipment = signal<Equipment[]>([])

  const event = (extra: Partial<MenuEvent> = {}): MenuEvent => ({
    _id: 'e1',
    name: 'אירוע',
    eventType: '',
    servingType: '',
    guestCount: 220,
    sections: [],
    stage: 'inquiry',
    siteLogistics: { answers: [answer('adhoc:1', { label: 'מנגל פחמים' })] },
    ...extra
  })
  const create = async () => {
    fixture = TestBed.createComponent(LoadingListComponent)
    fixture.componentRef.setInput('eventId', 'e1')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    el = fixture.nativeElement
  }
  const boxes = () => Array.from(el.querySelectorAll<HTMLInputElement>('.loading-table tbody input[type=checkbox]'))

  beforeEach(async () => {
    store.set([event()])
    equipment.set([eq('a', 3)])
    pipeline = jasmine.createSpyObj<EventPipelineService>('EventPipelineService', ['saveLoading'])
    pipeline.saveLoading.and.resolveTo({ ok: true, event: event() })
    await TestBed.configureTestingModule({
      imports: [LoadingListComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        {
          provide: EquipmentDataService,
          useValue: { allEquipment_: equipment.asReadonly(), ensureLoaded: () => Promise.resolve() }
        },
        { provide: EventPipelineService, useValue: pipeline },
        {
          provide: LogisticsItemRegistryService,
          useValue: { sections_: () => ['space'], sectionLabel: (k: string) => `logistics_section_${k}` }
        },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
  })

  it('shows the equipment row with its shortage and the ad-hoc logistics row', async () => {
    await create()
    const text = el.textContent ?? ''
    expect(text).toContain('ציוד a')
    expect(text).toContain('מנגל פחמים')
    expect(el.querySelector('.c-chip--red')?.textContent?.trim()).toBe('1')
    expect(boxes().length).toBe(2)
  })

  it('leaves out the answers of a question hidden on the event', async () => {
    store.set([event({ siteLogistics: { answers: [answer('adhoc:1', { label: 'מנגל' })], hiddenKeys: ['adhoc:1'] } })])
    await create()
    expect(el.textContent).not.toContain('מנגל')
  })

  it('a tick calls saveLoading with the row key and the new state', async () => {
    await create()
    boxes()[0].click()
    expect(pipeline.saveLoading).toHaveBeenCalledWith('e1', 'eq:a', true)
  })

  it('a ticked row is checked and the progress counts it', async () => {
    store.set([event({ siteLogistics: { answers: [], loaded: [{ key: 'eq:a', at: 1, by: 'u', byName: 'U' }] } })])
    await create()
    expect(boxes()[0].checked).toBeTrue()
    expect(el.querySelector('.loading-progress')?.textContent).toBe('loading_list_progress')
  })

  it('a finished event disables every box', async () => {
    store.set([event({ stage: 'finished' })])
    await create()
    expect(boxes().every((b) => b.disabled)).toBeTrue()
  })

  it('no rows: the empty state and a disabled print button', async () => {
    equipment.set([])
    store.set([event({ siteLogistics: { answers: [] } })])
    await create()
    expect(el.querySelector('app-empty-state')).not.toBeNull()
    expect(el.querySelector<HTMLButtonElement>('.loading-actions .c-btn-primary')!.disabled).toBeTrue()
  })

  it('adds the print body class and removes it on destroy; the print button prints', async () => {
    await create()
    expect(document.body.classList.contains('loading-list-open')).toBeTrue()
    const printSpy = spyOn(window, 'print')
    el.querySelector<HTMLButtonElement>('.loading-actions .c-btn-primary')!.click()
    expect(printSpy).toHaveBeenCalled()
    fixture.destroy()
    expect(document.body.classList.contains('loading-list-open')).toBeFalse()
  })

  it('the close button emits close', async () => {
    await create()
    let closed = false
    fixture.componentInstance.close.subscribe(() => (closed = true))
    el.querySelector<HTMLButtonElement>('.loading-actions .c-icon-btn')!.click()
    expect(closed).toBeTrue()
  })
})
