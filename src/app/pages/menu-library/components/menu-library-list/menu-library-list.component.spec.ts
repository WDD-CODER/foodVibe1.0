import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { MenuLibraryListComponent } from './menu-library-list.component'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { MenuIntelligenceService } from '@services/menu-intelligence.service'
import { UserService } from '@services/user.service'
import type { EventStage, MenuEvent } from '@models/menu-event.model'

describe('MenuLibraryListComponent stage filter', () => {
  let fixture: ComponentFixture<MenuLibraryListComponent>
  let component: MenuLibraryListComponent
  let store: ReturnType<typeof signal<MenuEvent[]>>

  const make = (_id: string, stage: EventStage | undefined, extra: Partial<MenuEvent> = {}): MenuEvent => ({
    _id,
    name: `אירוע ${_id}`,
    eventType: '',
    servingType: '',
    guestCount: 10,
    sections: [],
    stage,
    ...extra
  })

  const names = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.card-title')).map((n) => (n as HTMLElement).textContent?.trim())
  const filter = () => component as unknown as { stageFilter_: { (): string; set(v: string): void } }

  beforeEach(async () => {
    sessionStorage.clear()
    store = signal<MenuEvent[]>([
      make('a', 'inquiry'),
      make('b', 'quote_sent'),
      make('c', 'ordering'),
      make('d', 'finished'),
      make('e', 'not_closed'),
      make('f', 'inquiry', { legacy: true })
    ])
    await TestBed.configureTestingModule({
      imports: [MenuLibraryListComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        {
          provide: MenuIntelligenceService,
          useValue: { hydrateDerivedPortions: (e: MenuEvent) => e, computeFoodCostPctFromActualRevenue: () => 0 }
        },
        { provide: UserService, useValue: { isLoggedIn: () => true, user_: signal(null) } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(MenuLibraryListComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('opens on the "active" view that hides finished and not-closed events', () => {
    expect(filter().stageFilter_()).toBe('active')
    expect(names()).toEqual(jasmine.arrayWithExactContents(['אירוע a', 'אירוע b', 'אירוע c', 'אירוע f']))
  })

  it('stage=all shows every event', () => {
    filter().stageFilter_.set('all')
    fixture.detectChanges()
    expect(names().length).toBe(6)
  })

  it('stage=quote_sent shows only that stage', () => {
    filter().stageFilter_.set('quote_sent')
    fixture.detectChanges()
    expect(names()).toEqual(['אירוע b'])
  })

  it('a finished or lost stage can be picked from the filter', () => {
    filter().stageFilter_.set('not_closed')
    fixture.detectChanges()
    expect(names()).toEqual(['אירוע e'])
  })

  it('shows a stage chip on every card and the "ישן" tag only on legacy events', () => {
    const cards = Array.from(fixture.nativeElement.querySelectorAll('article.event-card')) as HTMLElement[]
    expect(cards.length).toBe(4)
    expect(cards.every((card) => !!card.querySelector('.tag.stage'))).toBeTrue()
    const legacy = cards.filter((card) => !!card.querySelector('.tag.legacy'))
    expect(legacy.length).toBe(1)
    expect(legacy[0].querySelector('.card-title')?.textContent?.trim()).toBe('אירוע f')
  })
})
