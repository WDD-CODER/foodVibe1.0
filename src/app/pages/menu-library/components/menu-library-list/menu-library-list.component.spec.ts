import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule, Palette } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { Router, provideRouter } from '@angular/router'
import type { ModuleKey } from '@schemas/modules-pure'
import { MenuLibraryListComponent } from './menu-library-list.component'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ModuleService } from '@services/module.service'
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

  const modulesOn = signal<ModuleKey[]>([])

  beforeEach(async () => {
    modulesOn.set([])
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
      imports: [MenuLibraryListComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Palette })],
      providers: [
        { provide: ModuleService, useValue: { has: (key: ModuleKey) => modulesOn().includes(key) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MenuEventDataService, useValue: { allMenuEvents_: store.asReadonly() } },
        { provide: UserService, useValue: { isLoggedIn: () => true, user_: signal(null), isOwner_: () => false } }
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

  describe('the menu designs entry (plan 765)', () => {
    const button = (): HTMLButtonElement | null => fixture.nativeElement.querySelector('.header-designs-btn')
    const headerButtons = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.ph-end > button')) as HTMLElement[]

    const switchOn = (modules: ModuleKey[]): void => {
      modulesOn.set(modules)
      fixture.detectChanges()
    }

    it('shows the button before "new menu" only with both menu_design and events', () => {
      expect(button()).toBeNull()
      switchOn(['menu_design'])
      expect(button()).toBeNull()
      switchOn(['events'])
      expect(button()).toBeNull()
      switchOn(['events', 'menu_design'])
      expect(button()?.textContent?.trim()).toBe('menu_designs')
      const buttons = headerButtons()
      const newMenu = buttons.find((b) => b.classList.contains('c-btn-primary'))!
      expect(buttons.indexOf(button()!)).toBeLessThan(buttons.indexOf(newMenu))
    })

    it('goes to /menu-design', () => {
      const router = TestBed.inject(Router)
      const navigate = spyOn(router, 'navigate').and.resolveTo(true)
      switchOn(['events', 'menu_design'])
      button()!.click()
      expect(navigate).toHaveBeenCalledWith(['/menu-design'])
    })

    for (const width of [1100, 360]) {
      it(`lies on no other part of the header at ${width}px`, () => {
        const host: HTMLElement = fixture.nativeElement
        host.style.display = 'block'
        host.style.width = `${width}px`
        document.body.appendChild(host)
        switchOn(['events', 'menu_design'])
        const mine = button()!.getBoundingClientRect()
        expect(mine.width).toBeGreaterThan(0)
        const others = [
          host.querySelector<HTMLElement>('.ph-title')!,
          host.querySelector<HTMLElement>('.ph-search')!,
          ...headerButtons().filter((b) => b !== button())
        ].map((part) => part.getBoundingClientRect())
        for (const other of others.filter((box) => box.width > 0)) {
          const overlaps =
            mine.left < other.right - 1 &&
            other.left < mine.right - 1 &&
            mine.top < other.bottom - 1 &&
            other.top < mine.bottom - 1
          expect(overlaps)
            .withContext(`${JSON.stringify(mine)} / ${JSON.stringify(other)}`)
            .toBeFalse()
        }
        host.remove()
      })
    }
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
