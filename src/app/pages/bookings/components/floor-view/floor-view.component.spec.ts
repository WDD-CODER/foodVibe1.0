import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { Ban, LucideAngularModule, Phone } from 'lucide-angular'
import { FloorViewComponent } from './floor-view.component'
import { BookingDataService, type DayBoard } from '@services/booking-data.service'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { jerusalemDateTime } from '@schemas/front-desk/local-time'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const table = (key: string, number: string, x: number) => ({
  key,
  number,
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
})
const PLAN = {
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [table('tab001', '11', 0), table('tab002', '12', 5), table('tab003', '13', 10)]
}

describe('FloorViewComponent (plan 671)', () => {
  let fixture: ComponentFixture<FloorViewComponent>
  let dayBoard: jasmine.Spy
  let plan_: ReturnType<typeof signal<unknown>>
  let owner_: ReturnType<typeof signal<boolean>>
  let profile_: ReturnType<typeof signal<unknown>>
  let setConfirmMode: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement
  let dayBookings: unknown[] = []
  let setTables: jasmine.Spy
  const board = (): DayBoard => ({ bookings: dayBookings as never, holds: [], unassigned: [], now: Date.now() })
  const today = (): string => jerusalemDateTime(Date.now()).date

  function setup(): void {
    dayBoard = jasmine.createSpy('dayBoard').and.callFake(() => Promise.resolve(board()))
    setTables = jasmine.createSpy('setTables').and.resolveTo({ ok: true, booking: {} })
    plan_ = signal<unknown>(PLAN)
    owner_ = signal(true)
    profile_ = signal<unknown>({ hours: [] })
    setConfirmMode = jasmine.createSpy('setConfirmMode').and.resolveTo(true)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetErrorMsg',
      'onSetWarningMsg',
      'onSetSuccessMsg'
    ])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [FloorViewComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Ban, Phone })],
      providers: [
        provideRouter([]),
        { provide: BookingDataService, useValue: { dayBoard, setTables, setStatus: jasmine.createSpy('setStatus') } },
        {
          provide: FloorPlanDataService,
          useValue: { plan_, ensureLoaded: () => Promise.resolve(), loadFailed_: signal(false) }
        },
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_, ensureLoaded: () => Promise.resolve(), setConfirmMode }
        },
        { provide: PermissionService, useValue: { isOwner_: owner_ } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(FloorViewComponent)
    fixture.componentRef.setInput('date', today())
    fixture.detectChanges()
    tick()
    fixture.detectChanges()
  }

  it('passes one state per table to the map', fakeAsync(() => {
    setup()
    const tables = el().querySelectorAll('[data-testid^="floor-table-"]')
    expect(tables.length).toBe(3)
    expect(tables[0].getAttribute('data-state')).toBe('free')
    expect(el().querySelector('[data-testid="floor-state-12"]')?.textContent).toContain('fv_state_free')
    fixture.destroy()
    flush()
  }))

  it('a failed day read shows the error state with a retry, and the retry loads', fakeAsync(() => {
    setup()
    dayBoard.and.resolveTo(null)
    fixture.componentRef.setInput('date', '2030-01-01')
    fixture.detectChanges()
    tick()
    fixture.detectChanges()
    expect(el().querySelector('app-empty-state')?.textContent).toContain('fv_load_failed')
    dayBoard.and.callFake(() => Promise.resolve(board()))
    ;(el().querySelector('app-empty-state button') as HTMLButtonElement).click()
    tick()
    fixture.detectChanges()
    expect(el().querySelectorAll('[data-testid^="floor-table-"]').length).toBe(3)
    fixture.destroy()
    flush()
  }))

  it('a plan with no table asks the owner to draw the room; staff get no link', fakeAsync(() => {
    setup()
    plan_.set({ ...PLAN, tables: [] })
    fixture.detectChanges()
    expect(el().querySelector('app-empty-state')?.textContent).toContain('fv_no_room')
    expect(el().querySelector('[data-testid="fv-draw-room"]')).toBeTruthy()
    owner_.set(false)
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="fv-draw-room"]')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('reloads after 45 s, not while hidden, once on focus, and stops after destroy', fakeAsync(() => {
    setup()
    expect(dayBoard).toHaveBeenCalledTimes(1)
    tick(45000)
    expect(dayBoard).toHaveBeenCalledTimes(2)
    const hidden = spyOnProperty(document, 'hidden', 'get').and.returnValue(true)
    tick(45000)
    expect(dayBoard).toHaveBeenCalledTimes(2)
    hidden.and.returnValue(false)
    window.dispatchEvent(new Event('focus'))
    tick()
    expect(dayBoard).toHaveBeenCalledTimes(3)
    fixture.destroy()
    tick(200000)
    window.dispatchEvent(new Event('focus'))
    tick()
    expect(dayBoard).toHaveBeenCalledTimes(3)
  }))

  it('a failed background reload keeps the room and warns once per streak', fakeAsync(() => {
    setup()
    dayBoard.and.resolveTo(null)
    tick(45000)
    tick(45000)
    fixture.detectChanges()
    expect(el().querySelectorAll('[data-testid^="floor-table-"]').length).toBe(3)
    expect(userMsg.onSetWarningMsg).toHaveBeenCalledTimes(1)
    fixture.destroy()
    flush()
  }))

  it('the owner flips the mode with one tap; staff only see it as text', fakeAsync(() => {
    setup()
    const button = el().querySelector('[data-testid="fv-mode"]') as HTMLButtonElement
    expect(button.tagName).toBe('BUTTON')
    expect(button.textContent).toContain('fv_mode_manual')
    button.click()
    tick()
    expect(setConfirmMode).toHaveBeenCalledOnceWith('auto')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('fv_mode_auto_on')
    owner_.set(false)
    fixture.detectChanges()
    expect(el().querySelector('button[data-testid="fv-mode"]')).toBeNull()
    expect(el().querySelector('[data-testid="fv-mode"]')?.textContent).toContain('fv_mode_manual')
    fixture.destroy()
    flush()
  }))

  it('a failed mode write keeps the old mode and shows the error', fakeAsync(() => {
    setup()
    setConfirmMode.and.resolveTo(false)
    ;(el().querySelector('[data-testid="fv-mode"]') as HTMLButtonElement).click()
    tick()
    fixture.detectChanges()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('fv_mode_failed')
    expect(el().querySelector('[data-testid="fv-mode"]')?.textContent).toContain('fv_mode_manual')
    fixture.destroy()
    flush()
  }))
})

describe('FloorViewComponent move mode (plan 686)', () => {
  // The shared setup lives in the describe above; this block repeats the small part it needs.
  let fixture: ComponentFixture<FloorViewComponent>
  let dayBoard: jasmine.Spy
  let setTables: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)
  const tap = (number: string): void => {
    ;(byId('floor-table-' + number) as HTMLElement).click()
    fixture.detectChanges()
  }
  const flushView = (): void => {
    tick()
    fixture.detectChanges()
  }

  function setup(): void {
    const booking = {
      _id: 'b1',
      kind: 'table',
      status: 'confirmed',
      clientId: 'c1',
      guestName: 'כהן',
      time: '19:00',
      partySize: 2,
      startAt: Date.now() - 5 * 60000,
      endAt: Date.now() + 85 * 60000,
      tableKeys: ['tab002']
    }
    dayBoard = jasmine
      .createSpy('dayBoard')
      .and.callFake(() => Promise.resolve({ bookings: [booking], holds: [], unassigned: [], now: Date.now() }))
    setTables = jasmine.createSpy('setTables').and.resolveTo({ ok: true, booking })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', [
      'onSetErrorMsg',
      'onSetWarningMsg',
      'onSetSuccessMsg'
    ])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [FloorViewComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Ban, Phone })],
      providers: [
        provideRouter([]),
        { provide: BookingDataService, useValue: { dayBoard, setTables, setStatus: jasmine.createSpy('setStatus') } },
        {
          provide: FloorPlanDataService,
          useValue: { plan_: signal<unknown>(PLAN), ensureLoaded: () => Promise.resolve(), loadFailed_: signal(false) }
        },
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_: signal<unknown>({ hours: [] }), ensureLoaded: () => Promise.resolve() }
        },
        { provide: PermissionService, useValue: { isOwner_: signal(true) } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(FloorViewComponent)
    fixture.componentRef.setInput('date', jerusalemDateTime(Date.now()).date)
    fixture.detectChanges()
    flushView()
  }

  /** Taps table 12, then "move": the sheet closes and the banner shows. */
  function startMove(): void {
    tap('12')
    expect(byId('table-sheet')).toBeTruthy()
    ;(byId('tsh-move') as HTMLElement).click()
    fixture.detectChanges()
  }

  it('a tap opens the sheet; "move" closes it and shows the banner with the party name', fakeAsync(() => {
    setup()
    startMove()
    expect(byId('table-sheet')).toBeNull()
    expect(byId('fv-move-banner')?.textContent).toContain('tsh_move_banner')
    fixture.destroy()
    flush()
  }))

  it('a tap on another table writes that one key, leaves move mode and reloads', fakeAsync(() => {
    setup()
    startMove()
    const loads = dayBoard.calls.count()
    tap('11')
    flushView()
    expect(setTables).toHaveBeenCalledOnceWith('b1', ['tab001'])
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('tsh_moved')
    expect(byId('fv-move-banner')).toBeNull()
    expect(dayBoard.calls.count()).toBe(loads + 1)
    fixture.destroy()
    flush()
  }))

  it('a refused write (409) shows tsh_move_refused and stays in move mode', fakeAsync(() => {
    setup()
    startMove()
    setTables.and.resolveTo({ ok: false, code: 'NO_TABLE' })
    tap('11')
    flushView()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('tsh_move_refused')
    expect(byId('fv-move-banner')).toBeTruthy()
    fixture.destroy()
    flush()
  }))

  it('any other failure shows rq_decision_failed and ends move mode', fakeAsync(() => {
    setup()
    startMove()
    setTables.and.resolveTo({ ok: false, code: null })
    tap('11')
    flushView()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('rq_decision_failed')
    expect(byId('fv-move-banner')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('Escape and the banner cancel leave move mode and write nothing', fakeAsync(() => {
    setup()
    startMove()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
    expect(byId('fv-move-banner')).toBeNull()
    startMove()
    ;(byId('fv-move-cancel') as HTMLElement).click()
    fixture.detectChanges()
    expect(byId('fv-move-banner')).toBeNull()
    expect(setTables).not.toHaveBeenCalled()
    fixture.destroy()
    flush()
  }))

  it("a tap on the booking's own table writes nothing and opens no sheet in move mode", fakeAsync(() => {
    setup()
    startMove()
    tap('12')
    flushView()
    expect(setTables).not.toHaveBeenCalled()
    expect(byId('table-sheet')).toBeNull()
    expect(byId('fv-move-banner')).toBeTruthy()
    fixture.destroy()
    flush()
  }))
})

describe('FloorViewComponent lists (plan 672)', () => {
  let fixture: ComponentFixture<FloorViewComponent>
  let setTables: jasmine.Spy
  let setStatus: jasmine.Spy
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)
  const all = (id: string): NodeListOf<Element> => el().querySelectorAll(`[data-testid="${id}"]`)
  const flushView = (): void => {
    tick()
    fixture.detectChanges()
  }
  const row = (id: string, over: object = {}) => ({
    _id: id,
    kind: 'table',
    status: 'confirmed',
    clientId: 'c1',
    guestName: 'שם ' + id,
    time: '19:00',
    partySize: 2,
    startAt: Date.now() + 20 * 60000,
    endAt: Date.now() + 110 * 60000,
    tableKeys: ['tab002'],
    ...over
  })

  function setup(bookings: object[], unassigned: string[]): void {
    const board = () => ({ bookings, holds: [], unassigned, now: Date.now() })
    setTables = jasmine.createSpy('setTables').and.resolveTo({ ok: true, booking: {} })
    setStatus = jasmine.createSpy('setStatus').and.resolveTo({ ok: true, booking: {} })
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [FloorViewComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Ban, Phone })],
      providers: [
        provideRouter([]),
        {
          provide: BookingDataService,
          useValue: { dayBoard: () => Promise.resolve(board()), setTables, setStatus }
        },
        {
          provide: FloorPlanDataService,
          useValue: { plan_: signal<unknown>(PLAN), ensureLoaded: () => Promise.resolve(), loadFailed_: signal(false) }
        },
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_: signal<unknown>({ hours: [] }), ensureLoaded: () => Promise.resolve() }
        },
        { provide: PermissionService, useValue: { isOwner_: signal(true) } },
        { provide: TranslationService, useValue: translation },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj<UserMsgService>('UserMsgService', [
            'onSetErrorMsg',
            'onSetWarningMsg',
            'onSetSuccessMsg'
          ])
        }
      ]
    })
    fixture = TestBed.createComponent(FloorViewComponent)
    fixture.componentRef.setInput('date', jerusalemDateTime(Date.now()).date)
    fixture.detectChanges()
    flushView()
  }

  it('shows the arriving rows (late flagged) and the not-assigned rows', fakeAsync(() => {
    setup(
      [
        row('a', { startAt: Date.now() - 30 * 60000 }),
        row('b'),
        row('c', { tableKeys: [], startAt: Date.now() + 60 * 60000 }),
        row('d', { status: 'seated' })
      ],
      ['c']
    )
    expect(all('arriving-row').length).toBe(3)
    expect(all('arriving-late').length).toBe(1)
    expect(all('unassigned-row').length).toBe(1)
    expect(byId('arriving-empty')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('an empty arriving list shows its message and the not-assigned panel is hidden', fakeAsync(() => {
    setup([row('d', { status: 'seated' })], [])
    expect(byId('arriving-empty')?.textContent).toContain('nb_arriving_empty')
    expect(byId('unassigned-list')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('"arrived" seats the booking', fakeAsync(() => {
    setup([row('b')], [])
    ;(byId('arriving-arrived') as HTMLElement).click()
    flushView()
    expect(setStatus).toHaveBeenCalledOnceWith('b', 'seated')
    fixture.destroy()
    flush()
  }))

  it('"assign" starts the pick-a-table mode and a tap on a table sends the tables write', fakeAsync(() => {
    setup([row('c', { tableKeys: [] })], ['c'])
    ;(byId('unassigned-assign') as HTMLElement).click()
    fixture.detectChanges()
    expect(byId('fv-move-banner')?.textContent).toContain('nb_assign_banner')
    ;(byId('floor-table-11') as HTMLElement).click()
    flushView()
    expect(setTables).toHaveBeenCalledOnceWith('c', ['tab001'])
    expect(byId('fv-move-banner')).toBeNull()
    fixture.destroy()
    flush()
  }))

  it('the bar has the two buttons; the walk-in button opens its dialog', fakeAsync(() => {
    setup([], [])
    expect(byId('fv-new-booking')).toBeTruthy()
    const walkIn = byId('fv-walk-in-open') as HTMLButtonElement
    expect(walkIn.disabled).toBe(false)
    walkIn.click()
    fixture.detectChanges()
    expect(byId('walk-in-dialog')).toBeTruthy()
    fixture.destroy()
    flush()
  }))
})
