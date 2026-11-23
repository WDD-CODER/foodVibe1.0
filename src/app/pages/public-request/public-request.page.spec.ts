import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { CalendarPlus, ClipboardCheck, LucideAngularModule, MessageCircle, Phone } from 'lucide-angular'
import { PublicRequestPage } from './public-request.page'
import { PublicRequestService, type PublicProfileResult } from './services/public-request.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const PROFILE: PublicProfileResult = {
  state: 'ready',
  profile: {
    available: true,
    displayName: 'הבית',
    phone: '03-1234567',
    hours: [],
    kinds: [
      {
        kind: 'table',
        questions: [{ key: 'diet', label: 'תזונה', type: 'text', required: true }],
        rules: { maxPartySize: 10 }
      },
      { kind: 'tasting', questions: [], rules: {} }
    ]
  }
}

const SLOTS = {
  ok: true,
  slots: [
    { time: '19:00', available: false },
    { time: '20:00', available: true }
  ]
}

const tableProfile = (areas: { key: string; name: string }[] = []): PublicProfileResult => {
  if (PROFILE.state !== 'ready') throw new Error('fixture')
  return {
    state: 'ready',
    profile: {
      ...PROFILE.profile,
      tableBooking: { areas },
      kinds: [{ kind: 'table', questions: [], rules: {}, durationMinutes: 90 }]
    }
  }
}

const oneKind = (i: number): PublicProfileResult => {
  if (PROFILE.state !== 'ready') throw new Error('fixture')
  return { state: 'ready', profile: { ...PROFILE.profile, kinds: [PROFILE.profile.kinds[i]] } }
}

describe('PublicRequestPage (plan 555)', () => {
  let fixture: ComponentFixture<PublicRequestPage>
  let api: { loadProfile: jasmine.Spy; send: jasmine.Spy; availability: jasmine.Spy }
  let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>

  type Internals = {
    state_: () => string
    step_: () => number
    kind_: { set(v: string): void }
    date_: { set(v: string): void }
    time_: { (): string; set(v: string): void }
    party_: { set(v: number): void }
    area_: { set(v: string): void }
    answers_: { set(v: Record<string, string>): void }
    name_: { set(v: string): void }
    phone_: { set(v: string): void }
    consent_: { set(v: boolean): void }
    goNext(): void
    submit(): Promise<void>
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(result: PublicProfileResult): Promise<void> {
    api = {
      loadProfile: jasmine.createSpy('loadProfile').and.resolveTo(result),
      send: jasmine.createSpy('send').and.resolveTo({ ok: true, reference: 'ABCD1234', token: 'T'.repeat(32) }),
      availability: jasmine.createSpy('availability').and.resolveTo(SLOTS)
    }
    query = new BehaviorSubject(convertToParamMap({}))
    TestBed.configureTestingModule({
      imports: [
        PublicRequestPage,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, CalendarPlus, ClipboardCheck, MessageCircle, Phone })
      ],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'my-place' }) }, queryParamMap: query }
        },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        }
      ]
    })
    TestBed.overrideComponent(PublicRequestPage, {
      set: { providers: [{ provide: PublicRequestService, useValue: api }] }
    })
    fixture = TestBed.createComponent(PublicRequestPage)
    await settle()
  }

  it('shows the business name, the kind picker with one toggle per kind, and the footer', async () => {
    await setup(PROFILE)
    expect(el().textContent).toContain('הבית')
    expect(el().querySelectorAll('[data-testid="pb-step-kind"] input[type="radio"]').length).toBe(2)
    expect(el().textContent).toContain('pb_powered_by')
    expect(el().querySelector('app-header')).toBeNull()
  })

  it('not found shows the not-found state; unavailable shows the business name', async () => {
    await setup({ state: 'not_found' })
    expect(el().textContent).toContain('pb_not_found')
    TestBed.resetTestingModule()
    await setup({ state: 'unavailable', displayName: 'הבית' })
    expect(el().querySelector('[data-testid="pb-unavailable"]')).toBeTruthy()
    expect(el().textContent).toContain('pb_powered_by')
  })

  it('the first step needs a kind; then the details step opens and a required answer blocks the next step', async () => {
    await setup(PROFILE)
    cmp().goNext()
    expect(cmp().step_()).toBe(1)
    cmp().kind_.set('table')
    cmp().goNext()
    query.next(convertToParamMap({ step: '2' }))
    await settle()
    expect(cmp().step_()).toBe(2)
    expect(el().querySelector('[data-testid="pb-step-details"]')).toBeTruthy()
    cmp().goNext()
    query.next(convertToParamMap({ step: '2' }))
    await settle()
    expect(cmp().step_()).toBe(2)
    cmp().answers_.set({ diet: 'צמחוני' })
    cmp().goNext()
    query.next(convertToParamMap({ step: '3' }))
    await settle()
    expect(cmp().step_()).toBe(3)
    expect(el().querySelector('[data-testid="pb-step-contact"]')).toBeTruthy()
  })

  it('a deep link to step 3 starts at step 1', async () => {
    await setup(PROFILE)
    query.next(convertToParamMap({ step: '3' }))
    await settle()
    expect(cmp().step_()).toBe(1)
  })

  it('sends the request with consent and no label, then shows the reference and the status link', async () => {
    await setup(oneKind(0))
    expect(cmp().step_()).toBe(2)
    cmp().date_.set('2030-01-01')
    cmp().answers_.set({ diet: 'צמחוני' })
    cmp().goNext()
    query.next(convertToParamMap({ step: '3' }))
    await settle()
    cmp().name_.set('דנה כהן')
    cmp().phone_.set('052-123 4567')
    cmp().consent_.set(true)
    await cmp().submit()
    await settle()
    const input = api.send.calls.mostRecent().args[1]
    expect(input).toEqual(
      jasmine.objectContaining({ kind: 'table', guestName: 'דנה כהן', guestPhone: '052-123 4567', consentTerms: true })
    )
    expect(input.answers).toEqual([{ questionKey: 'diet', value: 'צמחוני' }])
    expect(input.wanted.date).toBe('2030-01-01')
    expect(cmp().state_()).toBe('done')
    expect(el().querySelector('[data-testid="pb-reference"]')?.textContent).toContain('pb_reference')
    expect(el().querySelector('[data-testid="pb-status-link"]')).toBeTruthy()
  })

  it('does not send without the consent box', async () => {
    await setup(oneKind(1))
    cmp().goNext()
    query.next(convertToParamMap({ step: '3' }))
    await settle()
    cmp().name_.set('דנה כהן')
    cmp().phone_.set('0521234567')
    await cmp().submit()
    expect(api.send).not.toHaveBeenCalled()
  })

  describe('table mode (plan 670)', () => {
    const toDetails = async (): Promise<void> => {
      cmp().date_.set('2030-01-01')
      await settle()
    }
    const toSend = async (): Promise<void> => {
      cmp().goNext()
      query.next(convertToParamMap({ step: '3' }))
      await settle()
      cmp().name_.set('דנה כהן')
      cmp().phone_.set('0521234567')
      cmp().consent_.set(true)
      await cmp().submit()
      await settle()
    }
    const chip = (time: string): HTMLInputElement =>
      el().querySelector(`[data-testid="pb-time-${time}"]`) as HTMLInputElement

    it('without tableBooking the body has no areaKey and no availability read is made', async () => {
      await setup(oneKind(0))
      cmp().date_.set('2030-01-01')
      cmp().answers_.set({ diet: 'x' })
      await settle()
      expect(api.availability).not.toHaveBeenCalled()
      expect(el().querySelector('[data-testid="pb-times"]')).toBeNull()
      expect(el().querySelector('#pb-time')).toBeTruthy()
      await toSend()
      expect('areaKey' in api.send.calls.mostRecent().args[1]).toBeFalse()
    })

    it('an unavailable chip is disabled and cannot be chosen; the chosen hour is sent', async () => {
      await setup(
        tableProfile([
          { key: 'abcdef12', name: 'חצר' },
          { key: 'abcdef34', name: 'בר' }
        ])
      )
      await toDetails()
      expect(api.availability).toHaveBeenCalledWith('my-place', '2030-01-01', 2, undefined)
      expect(chip('19:00').disabled).toBeTrue()
      expect(chip('19:00').closest('label')?.classList.contains('pb-time--taken')).toBeTrue()
      expect(el().querySelector('#pb-time')).toBeNull()
      cmp().goNext()
      await settle()
      expect(cmp().step_()).toBe(2)
      chip('20:00').click()
      await settle()
      expect(cmp().time_()).toBe('20:00')
      expect(el().querySelectorAll('[data-testid="pb-areas"] input').length).toBe(3)
      ;(el().querySelectorAll('[data-testid="pb-areas"] input')[1] as HTMLInputElement).click()
      await settle()
      expect(api.availability.calls.mostRecent().args[3]).toBe('abcdef12')
      chip('20:00').click()
      await settle()
      await toSend()
      expect(api.send.calls.mostRecent().args[1].areaKey).toBe('abcdef12')
      expect(api.send.calls.mostRecent().args[1].wanted.time).toBe('20:00')
    })

    it('a change of date or party reads again and clears an hour that is no longer free', async () => {
      await setup(tableProfile())
      await toDetails()
      chip('20:00').click()
      await settle()
      expect(cmp().time_()).toBe('20:00')
      api.availability.and.resolveTo({ ok: true, slots: [{ time: '20:00', available: false }] })
      cmp().party_.set(4)
      await settle()
      expect(api.availability).toHaveBeenCalledTimes(2)
      expect(cmp().time_()).toBe('')
      cmp().date_.set('2030-01-02')
      await settle()
      expect(api.availability).toHaveBeenCalledTimes(3)
    })

    it('a full day shows the line and the next free time, which selects its date and hour', async () => {
      await setup(tableProfile())
      api.availability.and.callFake((_s: string, date: string) =>
        Promise.resolve(
          date === '2030-01-01'
            ? { ok: true, slots: [{ time: '19:00', available: false }], next: { date: '2030-01-03', time: '19:30' } }
            : { ok: true, slots: [{ time: '19:30', available: true }] }
        )
      )
      await toDetails()
      expect(el().querySelector('[data-testid="pb-times-full"]')).toBeTruthy()
      ;(el().querySelector('[data-testid="pb-next-free"]') as HTMLButtonElement).click()
      await settle()
      expect(cmp().time_()).toBe('19:30')
      expect(chip('19:30').checked).toBeTrue()
    })

    it('a failed read shows the line and a retry; too many shows no retry', async () => {
      await setup(tableProfile())
      api.availability.and.resolveTo({ ok: false, code: 'FAILED' })
      await toDetails()
      expect(el().textContent).toContain('pb_times_failed')
      api.availability.and.resolveTo(SLOTS)
      ;(el().querySelector('[data-testid="pb-times-retry"]') as HTMLButtonElement).click()
      await settle()
      expect(chip('20:00')).toBeTruthy()
      api.availability.and.resolveTo({ ok: false, code: 'TOO_MANY' })
      cmp().party_.set(3)
      await settle()
      expect(el().textContent).toContain('pb_too_many')
      expect(el().querySelector('[data-testid="pb-times-retry"]')).toBeNull()
    })

    it('a 409 NO_TABLE returns to step 2 with the alternatives as chips', async () => {
      await setup(tableProfile())
      await toDetails()
      chip('20:00').click()
      await settle()
      api.send.and.resolveTo({
        ok: false,
        code: 'NO_TABLE',
        issues: [],
        alternatives: [{ date: '2030-01-01', time: '21:00' }]
      })
      await toSend()
      query.next(convertToParamMap({ step: '2' }))
      await settle()
      expect(cmp().step_()).toBe(2)
      expect(cmp().time_()).toBe('')
      expect(el().textContent).toContain('pb_time_taken')
      const alts = el().querySelectorAll('[data-testid="pb-alt"]')
      expect(alts.length).toBe(1)
      expect(alts[0].textContent).toContain('01/01 21:00')
    })

    it('confirmed shows the confirmed title and the calendar button; not confirmed shows the waiting title', async () => {
      await setup(tableProfile())
      await toDetails()
      chip('20:00').click()
      await settle()
      api.send.and.resolveTo({
        ok: true,
        reference: 'ABCD1234',
        token: 'T'.repeat(32),
        confirmed: true,
        booking: { date: '2030-01-01', time: '20:00', partySize: 2 }
      })
      await toSend()
      expect(el().textContent).toContain('pb_done_confirmed_title')
      expect(el().querySelector('[data-testid="pb-calendar"]')).toBeTruthy()
      TestBed.resetTestingModule()
      await setup(tableProfile())
      await toDetails()
      chip('20:00').click()
      await settle()
      api.send.and.resolveTo({ ok: true, reference: 'ABCD1234', token: 'T'.repeat(32), confirmed: false })
      await toSend()
      expect(el().textContent).toContain('pb_done_waiting_title')
      expect(el().querySelector('[data-testid="pb-calendar"]')).toBeNull()
    })
  })

  it('a 429 shows the too-many message and keeps the form', async () => {
    await setup(oneKind(1))
    api.send.and.resolveTo({ ok: false, code: 'TOO_MANY', issues: [] })
    cmp().goNext()
    query.next(convertToParamMap({ step: '3' }))
    await settle()
    cmp().name_.set('דנה כהן')
    cmp().phone_.set('0521234567')
    cmp().consent_.set(true)
    await cmp().submit()
    await settle()
    expect(el().textContent).toContain('pb_too_many')
    expect(cmp().state_()).toBe('ready')
  })
})
