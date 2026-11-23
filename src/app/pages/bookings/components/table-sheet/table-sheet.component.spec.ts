import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableSheetComponent } from './table-sheet.component'
import { BookingDataService, type DayBoard } from '@services/booking-data.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { TableLook } from 'src/app/core/utils/table-state.util'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const NOW = 1_800_000_000_000
const MIN = 60000
const TABLE = {
  key: 'tab002',
  number: '12',
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x: 0,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
}
const PLAN = {
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [TABLE]
}
const booking = (over: object = {}) => ({
  _id: 'b1',
  kind: 'table',
  status: 'confirmed',
  clientId: 'c1',
  guestName: 'כהן',
  time: '19:00',
  partySize: 3,
  startAt: NOW - 5 * MIN,
  endAt: NOW + 85 * MIN,
  tableKeys: ['tab002'],
  ...over
})

describe('TableSheetComponent (plan 686)', () => {
  let fixture: ComponentFixture<TableSheetComponent>
  let setStatus: jasmine.Spy
  let confirmOpen: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)
  const click = (id: string): void => {
    ;(byId(id) as HTMLElement).click()
  }

  function setup(opts: { bookings?: object[]; look?: TableLook; live?: boolean; moment?: number; active?: boolean }): {
    changed: jasmine.Spy
    closed: jasmine.Spy
    moveRequested: jasmine.Spy
  } {
    setStatus = jasmine.createSpy('setStatus').and.resolveTo({ ok: true, booking: {} })
    confirmOpen = jasmine.createSpy('open').and.resolveTo(true)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      imports: [TableSheetComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: BookingDataService, useValue: { setStatus } },
        { provide: ConfirmModalService, useValue: { open: confirmOpen } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(TableSheetComponent)
    const board = { bookings: opts.bookings ?? [], holds: [], unassigned: [], now: NOW } as unknown as DayBoard
    fixture.componentRef.setInput('table', { ...TABLE, active: opts.active ?? true })
    fixture.componentRef.setInput('board', board)
    fixture.componentRef.setInput('plan', PLAN)
    fixture.componentRef.setInput('moment', opts.moment ?? NOW)
    fixture.componentRef.setInput('live', opts.live ?? true)
    fixture.componentRef.setInput('look', opts.look ?? { state: 'free' })
    const changed = jasmine.createSpy('changed')
    const closed = jasmine.createSpy('closed')
    const moveRequested = jasmine.createSpy('moveRequested')
    fixture.componentInstance.changed.subscribe(changed)
    fixture.componentInstance.closed.subscribe(closed)
    fixture.componentInstance.moveRequested.subscribe(moveRequested)
    fixture.detectChanges()
    return { changed, closed, moveRequested }
  }

  const confirmedLook: TableLook = { state: 'late', bookingId: 'b1', name: 'כהן', time: '19:00' }
  const seatedLook: TableLook = { state: 'seated', bookingId: 'b1', name: 'כהן', time: '19:00' }

  it('a confirmed booking shows seat, cancel and move, and no-show once its time came', () => {
    setup({ bookings: [booking()], look: confirmedLook })
    expect(byId('tsh-seat')).toBeTruthy()
    expect(byId('tsh-cancel')).toBeTruthy()
    expect(byId('tsh-move')).toBeTruthy()
    expect(byId('tsh-finish')).toBeNull()
    expect(byId('tsh-no-show')).toBeTruthy()
  })

  it('no-show is absent before the start time', () => {
    setup({ bookings: [booking({ startAt: NOW + 10 * MIN })], look: confirmedLook })
    expect(byId('tsh-seat')).toBeTruthy()
    expect(byId('tsh-no-show')).toBeNull()
  })

  it('a seated booking shows finish, cancel and move', () => {
    setup({ bookings: [booking({ status: 'seated' })], look: seatedLook })
    expect(byId('tsh-finish')).toBeTruthy()
    expect(byId('tsh-cancel')).toBeTruthy()
    expect(byId('tsh-move')).toBeTruthy()
    expect(byId('tsh-seat')).toBeNull()
    expect(byId('tsh-no-show')).toBeNull()
  })

  it('a free table shows no booking action (only the walk-in one) and the next booking', () => {
    setup({ bookings: [booking({ _id: 'b2', startAt: NOW + 60 * MIN, time: '20:30', guestName: 'לוי' })] })
    expect(byId('tsh-free')).toBeTruthy()
    expect(el().querySelectorAll('button.c-chip--tap').length).toBe(1)
    expect(byId('tsh-walk-in')).toBeTruthy()
    expect(byId('tsh-next')?.textContent).toContain('לוי')
    expect(byId('tsh-next')?.textContent).toContain('20:30')
  })

  it('a free table with no later booking says so', () => {
    setup({})
    expect(byId('tsh-no-next')).toBeTruthy()
  })

  it('a not-active table shows only its label', () => {
    setup({ look: { state: 'not_active' }, active: false })
    expect(byId('tsh-state')?.textContent).toContain('fv_state_not_active')
    expect(byId('tsh-now')).toBeNull()
    expect(byId('tsh-next')).toBeNull()
    expect(el().querySelectorAll('button.c-chip--tap').length).toBe(0)
  })

  it('shows the not-live line and no action when the strip shows another hour', () => {
    setup({ bookings: [booking()], look: confirmedLook, live: false })
    expect(byId('tsh-now-name')?.textContent).toContain('כהן')
    expect(byId('tsh-not-live')).toBeTruthy()
    expect(byId('tsh-seat')).toBeNull()
    expect(byId('tsh-move')).toBeNull()
  })

  it('the client link is absent for walk-in and test client ids', () => {
    setup({ bookings: [booking()], look: confirmedLook })
    expect(byId('tsh-client')?.getAttribute('href')).toBe('/clients/c1')
    fixture.destroy()
    TestBed.resetTestingModule()
    for (const clientId of ['__walk_in__', '__test__']) {
      setup({ bookings: [booking({ clientId })], look: confirmedLook })
      expect(byId('tsh-client')).toBeNull()
      fixture.destroy()
      TestBed.resetTestingModule()
    }
  })

  it('seat calls setStatus once and closes the sheet on success', fakeAsync(() => {
    const out = setup({ bookings: [booking()], look: confirmedLook })
    click('tsh-seat')
    tick()
    expect(setStatus).toHaveBeenCalledOnceWith('b1', 'seated')
    expect(out.changed).toHaveBeenCalledTimes(1)
    expect(out.closed).toHaveBeenCalledTimes(1)
    flush()
  }))

  it('BAD_STATUS shows bk_bad_status, reloads and keeps the sheet open', fakeAsync(() => {
    const out = setup({ bookings: [booking()], look: confirmedLook })
    setStatus.and.resolveTo({ ok: false, code: 'BAD_STATUS' })
    click('tsh-seat')
    tick()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('bk_bad_status')
    expect(out.changed).toHaveBeenCalledTimes(1)
    expect(out.closed).not.toHaveBeenCalled()
    flush()
  }))

  it('another failure shows rq_decision_failed and keeps the sheet open', fakeAsync(() => {
    const out = setup({ bookings: [booking()], look: confirmedLook })
    setStatus.and.resolveTo({ ok: false, code: null })
    click('tsh-seat')
    tick()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('rq_decision_failed')
    expect(out.closed).not.toHaveBeenCalled()
    flush()
  }))

  it('cancel asks first and does nothing on "no"', fakeAsync(() => {
    const out = setup({ bookings: [booking()], look: confirmedLook })
    confirmOpen.and.resolveTo(false)
    click('tsh-cancel')
    tick()
    expect(confirmOpen).toHaveBeenCalledWith('bk_cancel_confirm')
    expect(setStatus).not.toHaveBeenCalled()
    expect(out.closed).not.toHaveBeenCalled()
    confirmOpen.and.resolveTo(true)
    click('tsh-cancel')
    tick()
    expect(setStatus).toHaveBeenCalledOnceWith('b1', 'cancelled')
    flush()
  }))

  it('disables every button while a call runs', fakeAsync(() => {
    setup({ bookings: [booking()], look: confirmedLook })
    let release: (v: unknown) => void = () => undefined
    setStatus.and.returnValue(new Promise((r) => (release = r)))
    click('tsh-seat')
    fixture.detectChanges()
    expect((byId('tsh-cancel') as HTMLButtonElement).disabled).toBeTrue()
    expect((byId('tsh-move') as HTMLButtonElement).disabled).toBeTrue()
    release({ ok: true, booking: {} })
    tick()
    flush()
  }))

  it('move asks the floor view to enter move mode with the booking id', () => {
    const out = setup({ bookings: [booking()], look: confirmedLook })
    click('tsh-move')
    expect(out.moveRequested).toHaveBeenCalledOnceWith('b1')
  })

  it('a free table offers the walk-in button, which asks for its dialog with the table key (plan 672)', () => {
    setup({ bookings: [] })
    const walkIn = jasmine.createSpy('walkInRequested')
    fixture.componentInstance.walkInRequested.subscribe(walkIn)
    click('tsh-walk-in')
    expect(walkIn).toHaveBeenCalledOnceWith('tab002')
  })

  it('the walk-in button is disabled with the not-live title when the view is not live (plan 672)', () => {
    setup({ bookings: [], live: false })
    const button = byId('tsh-walk-in') as HTMLButtonElement
    expect(button.disabled).toBeTrue()
    expect(button.getAttribute('title')).toBe('tsh_not_live')
  })

  it('a table with a booking has no walk-in button (plan 672)', () => {
    setup({ bookings: [booking()], look: confirmedLook })
    expect(byId('tsh-walk-in')).toBeNull()
  })
})
