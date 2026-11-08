import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { MessageCircle, Undo2 } from 'lucide-angular'
import { EventPlanService } from 'src/app/core/engine/event-plan.service'
import { computeEventPlan } from 'src/app/core/engine/event-plan.engine'
import { FIXTURE_SUPPLIERS, buildFixtureInput, makeEvent } from 'src/app/core/engine/testing/event-plan.fixture'
import type { EventPlan } from 'src/app/core/engine/event-plan.types'
import type { Supplier } from '@models/supplier.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { BusinessService } from '@services/business.service'
import { UserService } from '@services/user.service'
import { ProductDataService } from '@services/product-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import type { MenuEvent } from '@models/menu-event.model'
import type { Product } from '@models/product.model'
import { makeProduct, makeRecipe, makeInput, productIng } from 'src/app/core/engine/testing/event-plan.fixture'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { SupplierOrdersComponent } from './supplier-orders.component'

const RLM = '\u200F'
const TEXTS: Record<string, string> = {
  no_supplier: 'ללא ספק',
  order_msg_title: 'הזמנה – {business}',
  order_msg_event: 'לאירוע: {event}',
  order_msg_thanks: 'תודה!',
  unit_short_unit: "יח'",
  kg: 'ק"ג',
  supplier_orders_copied: 'הועתק – הדבק ב-WhatsApp',
  supplier_orders_invalid_phone: 'מספר לא תקין – הועתק להדבקה'
}

describe('SupplierOrdersComponent', () => {
  let fixture: ComponentFixture<SupplierOrdersComponent>
  let component: SupplierOrdersComponent
  let plan: EventPlan
  let suppliers: Supplier[]
  let userMsg: jasmine.SpyObj<UserMsgService>
  let writeText: jasmine.Spy
  let openSpy: jasmine.Spy
  let storedEvents: MenuEvent[]
  let updateMenuEvent: jasmine.Spy
  let isOwner: boolean
  let extraProducts: Product[]
  const sharePrev = Object.getOwnPropertyDescriptor(Navigator.prototype, 'share')

  const veg = (): Supplier => suppliers[1]
  const message = (business = 'מטבח בדיקה'): string =>
    `${RLM}הזמנה – ${business}\n${RLM}לאירוע: אירוע בדיקה · 20.11.2026\n\n` +
    `${RLM}עגבנייה – 18.75 ק"ג (2 ארגז)\n${RLM}שמן זית – 1.6 ק"ג\n\n${RLM}תודה!`

  function setShare(fn: unknown): void {
    Object.defineProperty(navigator, 'share', { value: fn, configurable: true, writable: true })
  }

  function create(): void {
    const input = buildFixtureInput()
    const planService = jasmine.createSpyObj<EventPlanService>('EventPlanService', ['planFor'])
    planService.planFor.and.callFake(() => plan)
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => TEXTS[k ?? ''] ?? k ?? '')
    TestBed.configureTestingModule({
      imports: [SupplierOrdersComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, MessageCircle, Undo2 })],
      providers: [
        { provide: EventPlanService, useValue: planService },
        {
          provide: KitchenStateService,
          useValue: {
            productsById_: signal(new Map([...input.products, ...extraProducts].map((p) => [p._id, p]))),
            suppliersById_: signal(new Map(suppliers.map((s) => [s._id, s])))
          }
        },
        { provide: TranslationService, useValue: translation },
        { provide: ProductDataService, useValue: { updateProduct: () => Promise.resolve() } },
        { provide: MenuEventDataService, useValue: { allMenuEvents_: signal(storedEvents), updateMenuEvent } },
        { provide: PermissionService, useValue: { can: () => isOwner } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: BusinessService, useValue: { business_: signal({ name: 'מטבח בדיקה' }) } },
        { provide: UserService, useValue: { user_: signal({ name: 'שם האדם' }) } }
      ]
    })
    fixture = TestBed.createComponent(SupplierOrdersComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('event', makeEvent([]))
    fixture.detectChanges()
  }

  function click(selector: string, index = 0): void {
    const el = fixture.debugElement.queryAll(By.css(selector))[index].nativeElement as HTMLElement
    el.click()
  }

  beforeEach(() => {
    storedEvents = []
    isOwner = true
    extraProducts = []
    updateMenuEvent = jasmine.createSpy('updateMenuEvent').and.callFake((e: MenuEvent) => Promise.resolve(e))
    plan = computeEventPlan(buildFixtureInput())
    suppliers = FIXTURE_SUPPLIERS.map((s) => ({ ...s }))
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetSuccessMsg',
      'onSetWarningMsg',
      'onSetErrorMsg'
    ])
    writeText = jasmine.createSpy('writeText').and.resolveTo()
    spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText } as unknown as Clipboard)
    openSpy = spyOn(window, 'open').and.returnValue(null)
    setShare(undefined)
  })

  afterEach(() => {
    if (sharePrev) Object.defineProperty(Navigator.prototype, 'share', sharePrev)
    delete (navigator as unknown as Record<string, unknown>)['share']
  })

  it('shows one card per supplier plus "no supplier", and WhatsApp only on the supplier', () => {
    create()
    const names = fixture.debugElement.queryAll(By.css('.so-card-name')).map((e) => e.nativeElement.textContent.trim())
    expect(names).toEqual(['ירקן', 'ללא ספק'])
    expect(fixture.debugElement.queryAll(By.css('.c-btn-primary')).length).toBe(1)
  })

  it('puts the partial badge only on the card that holds the unpriced lemon (plan 444)', () => {
    create()
    const badges = fixture.debugElement.queryAll(By.css('.so-card app-partial-cost-badge'))
    expect(badges.length).toBe(2)
    const chips = fixture.debugElement.queryAll(By.css('.so-card .partial-chip'))
    expect(chips.length).toBe(1)
    const cardMissing = component['cardMissing_']()
    expect(cardMissing[0]).toEqual([])
    expect(cardMissing[1].map((m) => m.name)).toEqual(['לימון'])
  })

  it('opens WhatsApp on a valid mobile number with the encoded message', async () => {
    create()
    await component['send'](component['orders_']().cards[0])
    expect(openSpy).toHaveBeenCalledWith(
      'https://wa.me/972527654321?text=' + encodeURIComponent(message()),
      '_blank',
      'noopener'
    )
  })

  it('uses the share sheet when the supplier has no phone', async () => {
    suppliers[1] = { ...veg(), phone: '' }
    const share = jasmine.createSpy('share').and.resolveTo()
    setShare(share)
    create()
    await component['send'](component['orders_']().cards[0])
    expect(share).toHaveBeenCalledOnceWith({ text: message() })
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('copies and says so when there is no phone and no share sheet', async () => {
    suppliers[1] = { ...veg(), phone: '' }
    create()
    await component['send'](component['orders_']().cards[0])
    expect(writeText).toHaveBeenCalledWith(message())
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('הועתק – הדבק ב-WhatsApp')
  })

  it('copies and warns when the phone is not a mobile number', async () => {
    suppliers[1] = { ...veg(), phone: '03-1234567' }
    create()
    await component['send'](component['orders_']().cards[0])
    expect(openSpy).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledWith(message())
    expect(userMsg.onSetWarningMsg).toHaveBeenCalledWith('מספר לא תקין – הועתק להדבקה')
  })

  it('shows the message in a textarea when the clipboard refuses', async () => {
    writeText.and.rejectWith(new Error('blocked'))
    create()
    click('.so-actions .c-btn-ghost', 0)
    await fixture.whenStable()
    fixture.detectChanges()
    const area = fixture.debugElement.query(By.css('textarea.so-manual-text')).nativeElement as HTMLTextAreaElement
    expect(area.value).toBe(message())
    expect(userMsg.onSetSuccessMsg).not.toHaveBeenCalled()
  })

  it('copies every supplier with "copy all"', async () => {
    create()
    click('.so-header .c-btn-ghost')
    await fixture.whenStable()
    const text = writeText.calls.mostRecent().args[0] as string
    expect(text.indexOf('ירקן')).toBeGreaterThan(-1)
    expect(text.indexOf('ירקן')).toBeLessThan(text.indexOf('ללא ספק'))
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('הועתק – הדבק ב-WhatsApp')
  })

  it('shows "supplier_orders_nothing" and no cards for an empty plan', () => {
    plan = { ...plan, rawLines: [] }
    create()
    expect(fixture.debugElement.queryAll(By.css('.so-card')).length).toBe(0)
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('supplier_orders_nothing')
  })

  it('emits close on Escape and on a backdrop click', () => {
    create()
    const spy = jasmine.createSpy('close')
    component.close.subscribe(spy)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(spy).toHaveBeenCalledTimes(1)
    click('.c-modal-overlay')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  describe('cheaper elsewhere and per-event move (plan 536)', () => {
    const onion = makeProduct({
      _id: 'onion',
      nameHebrew: 'בצל',
      baseUnit: 'kg',
      sources: [
        { supplierId: 'david', price: 4, addedAt: 0 },
        { supplierId: 'shuk', price: 6, addedAt: 0 }
      ]
    })
    const soup = makeRecipe({
      _id: 'soup',
      nameHebrew: 'מרק',
      recipeType: 'dish',
      ingredients: [{ ...productIng('onion', 2, 'kg', 'בצל'), supplierId: 'shuk' }]
    })

    function createWithOnion(moves?: MenuEvent['supplierMoves'], withId = true): void {
      suppliers = [
        { _id: 'david', nameHebrew: 'דוד' } as unknown as Supplier,
        { _id: 'shuk', nameHebrew: 'שוק' } as unknown as Supplier
      ]
      extraProducts = [onion]
      const base = {
        ...makeEvent([{ recipeId: 'soup', derivedPortions: 1 }]),
        ...(moves ? { supplierMoves: moves } : {})
      }
      const event: MenuEvent = withId ? base : { ...base, _id: '' }
      storedEvents = withId ? [event] : []
      plan = computeEventPlan(makeInput(event, [onion], [soup]))
      create()
      fixture.componentRef.setInput('event', event)
      fixture.detectChanges()
    }
    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? ''
    const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('.so-move-btn'))

    it('shows the hint and the move button on the dearer supplier card', () => {
      createWithOnion()
      expect(text()).toContain('cheaper_at_supplier')
      expect(buttons().length).toBe(1)
      expect(buttons()[0].disabled).toBeFalse()
    })

    it('a click saves the stored event with the move added', async () => {
      createWithOnion()
      buttons()[0].click()
      await fixture.whenStable()
      expect(updateMenuEvent).toHaveBeenCalledTimes(1)
      const saved = updateMenuEvent.calls.mostRecent().args[0] as MenuEvent
      expect(saved.supplierMoves).toEqual([{ productId: 'onion', fromSupplierId: 'shuk', toSupplierId: 'david' }])
    })

    it('a moved line shows where it came from and the undo button removes the move', async () => {
      createWithOnion([{ productId: 'onion', fromSupplierId: 'shuk', toSupplierId: 'david' }])
      expect(text()).toContain('supplier_moved_from')
      expect(text()).not.toContain('cheaper_at_supplier')
      buttons()[0].click()
      await fixture.whenStable()
      expect((updateMenuEvent.calls.mostRecent().args[0] as MenuEvent).supplierMoves).toEqual([])
    })

    it('staff see the hint but no move or undo button', () => {
      isOwner = false
      createWithOnion()
      expect(text()).toContain('cheaper_at_supplier')
      expect(buttons().length).toBe(0)
    })

    it('the button is disabled while the event is not saved', () => {
      createWithOnion(undefined, false)
      expect(buttons()[0].disabled).toBeTrue()
    })

    it('a save error shows save_failed and writes nothing else', async () => {
      updateMenuEvent = jasmine.createSpy('updateMenuEvent').and.rejectWith(new Error('x'))
      createWithOnion()
      buttons()[0].click()
      await fixture.whenStable()
      expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
      expect(buttons().length).toBe(1)
    })
  })
})
