import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { NewBookingDialogComponent } from './new-booking-dialog.component'
import { BookingDataService } from '@services/booking-data.service'
import { ClientDataService } from '@services/client-data.service'
import { FloorPlanDataService } from '@services/floor-plan-data.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { jerusalemEpoch } from '@schemas/front-desk/local-time'
import { ROOM, profileWith, tableKeyOf } from '@schemas/testing/table-engine-fixtures'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const DATE = '2026-06-02'
const SLOTS = [
  { time: '19:00', available: true },
  { time: '19:30', available: false },
  { time: '20:00', available: true }
]

describe('NewBookingDialogComponent (plan 672)', () => {
  let fixture: ComponentFixture<NewBookingDialogComponent>
  let create: jasmine.Spy
  let availability: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = (): HTMLElement => fixture.nativeElement
  const byId = (id: string): HTMLElement | null => el().querySelector(`[data-testid="${id}"]`)
  const save = (): HTMLButtonElement => byId('nb-save') as HTMLButtonElement
  const settle = (): void => {
    tick()
    fixture.detectChanges()
    tick()
    fixture.detectChanges()
  }
  const type = (id: string, value: string): void => {
    const input = el().querySelector('#' + id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const chooseTime = (time: string): void => {
    ;(byId('nb-time-' + time) as HTMLElement).click()
    fixture.detectChanges()
  }
  const fillGuest = (): void => {
    type('nb-name', 'דנה')
    type('nb-phone', '052-1234567')
  }

  function setup(owner: boolean, plan: typeof ROOM | null = ROOM): { saved: jasmine.Spy; closed: jasmine.Spy } {
    create = jasmine.createSpy('create').and.resolveTo({ ok: true, booking: { tableKeys: [tableKeyOf(1)] } })
    availability = jasmine.createSpy('availability').and.callFake(() => Promise.resolve(SLOTS))
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    const now = jerusalemEpoch('2026-06-01', '10:00')
    TestBed.configureTestingModule({
      imports: [NewBookingDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: BookingDataService,
          useValue: {
            availability,
            create,
            dayBoard: () => Promise.resolve({ bookings: [], holds: [], unassigned: [], now })
          }
        },
        {
          provide: FloorPlanDataService,
          useValue: { plan_: signal(plan), ensureLoaded: () => Promise.resolve(), loadFailed_: signal(false) }
        },
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_: signal(profileWith()), ensureLoaded: () => Promise.resolve() }
        },
        { provide: ClientDataService, useValue: { allClients_: signal([]) } },
        { provide: MenuEventDataService, useValue: { allMenuEvents_: signal([]) } },
        { provide: PermissionService, useValue: { isOwner_: signal(owner) } },
        { provide: TranslationService, useValue: translation },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(NewBookingDialogComponent)
    fixture.componentRef.setInput('date', DATE)
    const saved = jasmine.createSpy('saved')
    const closed = jasmine.createSpy('closed')
    fixture.componentInstance.saved.subscribe(saved)
    fixture.componentInstance.closed.subscribe(closed)
    fixture.detectChanges()
    settle()
    return { saved, closed }
  }

  it('Save is disabled until a guest name and phone, a date, a party and a time are set', fakeAsync(() => {
    setup(true)
    expect(save().disabled).toBeTrue()
    fillGuest()
    expect(save().disabled).toBeTrue()
    chooseTime('20:00')
    expect(save().disabled).toBeFalse()
    type('nb-phone', '12')
    expect(save().disabled).toBeTrue()
    flush()
  }))

  it('the time chips come from the availability call and a taken time is disabled', fakeAsync(() => {
    setup(true)
    expect(availability).toHaveBeenCalledWith(DATE, 2, undefined)
    expect((byId('nb-time-19:00') as HTMLButtonElement).disabled).toBeFalse()
    expect((byId('nb-time-19:30') as HTMLButtonElement).disabled).toBeTrue()
    flush()
  }))

  it("choosing a time shows the engine's table as the selected keys of the small map", fakeAsync(() => {
    setup(true)
    chooseTime('20:00')
    expect(byId('floor-table-1')?.getAttribute('aria-pressed')).toBe('true')
    expect(byId('floor-table-2')?.getAttribute('aria-pressed')).toBe('false')
    expect(byId('nb-offered')?.textContent).toContain('nb_offered')
    flush()
  }))

  it('plan 702: the owner sees the map and the info button before a time is chosen; a tap changes nothing', fakeAsync(() => {
    setup(true)
    fillGuest()
    expect(byId('nb-map')).toBeTruthy()
    expect(byId('nb-pick-other')).toBeTruthy()
    expect(byId('nb-pick-time')?.textContent).toContain('nb_pick_time_first')
    expect(byId('nb-offered')).toBeNull()
    ;(byId('floor-table-2') as HTMLElement).click()
    fixture.detectChanges()
    expect(byId('floor-table-2')?.getAttribute('aria-pressed')).toBe('false')
    chooseTime('20:00')
    expect(byId('nb-pick-time')).toBeNull()
    expect(byId('nb-offered')).toBeTruthy()
    save().click()
    settle()
    expect(create.calls.mostRecent().args[0].tableKeys).toBeUndefined()
    flush()
  }))

  it('plan 702: staff see the map without the info button before a time; with no plan there is no map', fakeAsync(() => {
    setup(false)
    expect(byId('nb-map')).toBeTruthy()
    expect(byId('nb-pick-other')).toBeNull()
    flush()
    TestBed.resetTestingModule()
    setup(true, null)
    expect(byId('nb-map')).toBeNull()
    flush()
  }))

  it('a save without a tapped table sends no tableKeys', fakeAsync(() => {
    const { saved, closed } = setup(true)
    fillGuest()
    chooseTime('20:00')
    save().click()
    settle()
    expect(create).toHaveBeenCalledOnceWith({
      guest: { name: 'דנה', phone: '052-1234567' },
      date: DATE,
      time: '20:00',
      partySize: 2
    })
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('nb_saved')
    expect(saved).toHaveBeenCalled()
    expect(closed).toHaveBeenCalled()
    flush()
  }))

  it("an owner's tap on another table sends that key as tableKeys", fakeAsync(() => {
    setup(true)
    fillGuest()
    chooseTime('20:00')
    ;(byId('floor-table-2') as HTMLElement).click()
    fixture.detectChanges()
    expect(byId('floor-table-2')?.getAttribute('aria-pressed')).toBe('true')
    save().click()
    settle()
    expect(create.calls.mostRecent().args[0].tableKeys).toEqual([tableKeyOf(2)])
    flush()
  }))

  it('for staff a tap on the small map changes nothing and there is no hint', fakeAsync(() => {
    setup(false)
    fillGuest()
    chooseTime('20:00')
    expect(byId('nb-pick-other')).toBeNull()
    expect(byId('nb-offered')).toBeTruthy()
    ;(byId('floor-table-2') as HTMLElement).click()
    fixture.detectChanges()
    expect(byId('floor-table-1')?.getAttribute('aria-pressed')).toBe('true')
    save().click()
    settle()
    expect(create.calls.mostRecent().args[0].tableKeys).toBeUndefined()
    flush()
  }))

  it('the owner has the hint as a tooltip, not as text', fakeAsync(() => {
    setup(true)
    chooseTime('20:00')
    const hint = byId('nb-pick-other') as HTMLElement
    expect(hint.getAttribute('title')).toBe('nb_pick_other')
    expect(hint.textContent).not.toContain('nb_pick_other')
    flush()
  }))

  it('a 409 NO_TABLE shows the alternatives and a tap on one sets the date and the time', fakeAsync(() => {
    const { closed } = setup(true)
    fillGuest()
    chooseTime('20:00')
    create.and.resolveTo({
      ok: false,
      code: 'NO_TABLE',
      alternatives: [
        { date: DATE, time: '19:00' },
        { date: '2026-06-03', time: '20:00' }
      ]
    })
    save().click()
    settle()
    expect(byId('nb-no-table')).toBeTruthy()
    expect(closed).not.toHaveBeenCalled()
    expect(byId('nb-alt-' + DATE + '-19:00')?.textContent).toContain('19:00')
    expect(byId('nb-alt-2026-06-03-20:00')?.textContent).toContain('nb_tomorrow')
    availability.calls.reset()
    ;(byId('nb-alt-2026-06-03-20:00') as HTMLElement).click()
    settle()
    expect(availability).toHaveBeenCalledWith('2026-06-03', 2, undefined)
    expect(byId('nb-alternatives')).toBeNull()
    expect(byId('nb-time-20:00')?.classList).toContain('active')
    flush()
  }))

  it('any other failure shows nb_save_failed and keeps the dialog open with everything typed', fakeAsync(() => {
    const { closed } = setup(true)
    fillGuest()
    chooseTime('20:00')
    create.and.resolveTo({ ok: false, code: null })
    save().click()
    settle()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('nb_save_failed')
    expect(byId('nb-save-failed')).toBeTruthy()
    expect(closed).not.toHaveBeenCalled()
    expect((el().querySelector('#nb-name') as HTMLInputElement).value).toBe('דנה')
    flush()
  }))

  it('a failed availability read shows nb_times_failed with a retry', fakeAsync(() => {
    setup(true)
    availability.and.resolveTo(null)
    fixture.componentInstance['retry']()
    settle()
    expect(byId('nb-times-failed')?.textContent).toContain('nb_times_failed')
    flush()
  }))
})
