import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { MenuLibraryListComponent } from './menu-library-list.component'
import { MenuEventDataService } from '@services/menu-event-data.service'
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

  describe('revenue and food cost from the pricing summary (plan 445)', () => {
    const pricing = { foodCost: 4000, revenue: 10000, profit: 6000, profitPct: 60, partial: false, computedAt: 1 }
    const ts = () =>
      component as unknown as {
        getTotalSalePriceDisplay(e: MenuEvent): string
        getFoodCostPctDisplay(e: MenuEvent): string
        sortBy_: { set(v: string): void }
        sortOrder_: { set(v: string): void }
      }

    it('shows pricing.revenue and the food cost % of it', () => {
      const event = make('p', 'inquiry', { pricing })
      expect(ts().getTotalSalePriceDisplay(event)).toBe('₪10,000.00')
      expect(ts().getFoodCostPctDisplay(event)).toBe('40.0%')
    })

    it('shows "—" when the event has no pricing', () => {
      const event = make('p', 'inquiry')
      expect(ts().getTotalSalePriceDisplay(event)).toBe('—')
      expect(ts().getFoodCostPctDisplay(event)).toBe('—')
    })

    it('marks a partial summary on the card', () => {
      store.set([make('p', 'inquiry', { pricing: { ...pricing, partial: true } })])
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.tag.cost')?.textContent).toContain('partial_total')
    })

    it('sorts by food cost % with events without pricing last, in both directions', () => {
      store.set([
        make('none', 'inquiry'),
        make('high', 'inquiry', { pricing: { ...pricing, foodCost: 8000 } }),
        make('low', 'inquiry', { pricing })
      ])
      filter().stageFilter_.set('all')
      ts().sortBy_.set('food_cost')
      ts().sortOrder_.set('asc')
      fixture.detectChanges()
      expect(names()).toEqual(['אירוע low', 'אירוע high', 'אירוע none'])
      ts().sortOrder_.set('desc')
      fixture.detectChanges()
      expect(names()).toEqual(['אירוע high', 'אירוע low', 'אירוע none'])
    })
  })

  describe('new-inquiry window placement (plan 460)', () => {
    it('renders the dialog outside .menu-library-container, whose backdrop-filter would shrink its overlay', () => {
      const open = component as unknown as { isInquiryOpen_: { set(v: boolean): void } }
      expect(fixture.nativeElement.querySelector('app-new-inquiry-dialog')).toBeNull()
      open.isInquiryOpen_.set(true)
      fixture.detectChanges()
      const dialog = fixture.nativeElement.querySelector('app-new-inquiry-dialog') as HTMLElement | null
      expect(dialog).not.toBeNull()
      expect(dialog?.closest('.menu-library-container')).toBeNull()
      expect(dialog?.querySelector('.c-modal-overlay')).not.toBeNull()
    })
  })
})
