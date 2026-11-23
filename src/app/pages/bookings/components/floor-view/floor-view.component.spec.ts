import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { Ban, LucideAngularModule } from 'lucide-angular'
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
  const board = (): DayBoard => ({ bookings: [], holds: [], unassigned: [], now: Date.now() })
  const today = (): string => jerusalemDateTime(Date.now()).date

  function setup(): void {
    dayBoard = jasmine.createSpy('dayBoard').and.callFake(() => Promise.resolve(board()))
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
      imports: [FloorViewComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Ban })],
      providers: [
        provideRouter([]),
        { provide: BookingDataService, useValue: { dayBoard } },
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
