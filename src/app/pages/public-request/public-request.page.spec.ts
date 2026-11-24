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

  async function setup(result: PublicProfileResult | Promise<never>): Promise<void> {
    api = {
      availability: jasmine.createSpy('availability').and.resolveTo({ ok: true, slots: [] }),
      loadProfile: jasmine
        .createSpy('loadProfile')
        .and.returnValue(result instanceof Promise ? result : Promise.resolve(result)),
      send: jasmine.createSpy('send').and.resolveTo({ ok: true, reference: 'ABCD1234', token: 'T'.repeat(32) })
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

  it('shows one app-loader while loading and an app-empty-state for an unknown slug (plan 708)', async () => {
    await setup(new Promise<never>(() => undefined))
    expect(el().querySelectorAll('app-loader').length).toBe(1)
    TestBed.resetTestingModule()
    await setup({ state: 'not_found' })
    expect(el().querySelectorAll('app-empty-state').length).toBe(1)
    expect(el().querySelector('app-loader')).toBeNull()
  })

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

  it('without tableBooking: no availability read, the time field stays and the body has no areaKey', async () => {
    await setup(oneKind(0))
    cmp().date_.set('2030-01-01')
    cmp().answers_.set({ diet: 'x' })
    await settle()
    expect(api.availability).not.toHaveBeenCalled()
    expect(el().querySelector('[data-testid="pb-times"]')).toBeNull()
    cmp().goNext()
    query.next(convertToParamMap({ step: '3' }))
    await settle()
    cmp().name_.set('דנה כהן')
    cmp().phone_.set('0521234567')
    cmp().consent_.set(true)
    await cmp().submit()
    await settle()
    const input = api.send.calls.mostRecent().args[1]
    expect('areaKey' in input).toBeFalse()
    expect(input.wanted).toEqual({ date: '2030-01-01', partySize: 2 })
    expect(el().textContent).toContain('pb_done_title')
  })

  describe('table mode (plan 670)', () => {
    const tableProfile = (): PublicProfileResult => {
      if (PROFILE.state !== 'ready') throw new Error('fixture')
      return {
        state: 'ready',
        profile: {
          ...PROFILE.profile,
          kinds: [
            { kind: 'table', questions: [{ key: 'seating', label: 'ישיבה', type: 'text', required: false }], rules: {} }
          ],
          tableBooking: {
            areas: [
              { key: 'areaa1', name: 'בפנים' },
              { key: 'areab2', name: 'בחוץ' }
            ]
          }
        }
      }
    }
    const slots = (...t: [string, boolean][]) => ({
      ok: true,
      slots: t.map(([time, available]) => ({ time, available }))
    })
    const chip = (t: string) => el().querySelector(`[data-testid="pb-time-${t}"] input`) as HTMLInputElement

    it('shows the hours as chips; a taken one is disabled; the seating question is hidden; areas show', async () => {
      await setup(tableProfile())
      api.availability.and.resolveTo(slots(['19:00', false], ['20:00', true]))
      cmp().date_.set('2030-01-01')
      await settle()
      expect(api.availability).toHaveBeenCalledWith('my-place', '2030-01-01', 2, undefined)
      expect(chip('19:00').disabled).toBeTrue()
      expect(chip('20:00').disabled).toBeFalse()
      expect(el().querySelector('#pb-time')).toBeNull()
      expect(el().querySelector('#pb-q-seating')).toBeNull()
      expect(el().querySelectorAll('[data-testid="pb-areas"] input').length).toBe(3)
    })

    it('a change of date or area reads again and clears an hour that is no longer free', async () => {
      await setup(tableProfile())
      api.availability.and.resolveTo(slots(['20:00', true]))
      cmp().date_.set('2030-01-01')
      await settle()
      chip('20:00').click()
      await settle()
      expect((cmp() as unknown as { time_: () => string }).time_()).toBe('20:00')
      api.availability.and.resolveTo(slots(['20:00', false], ['21:00', true]))
      cmp().date_.set('2030-01-02')
      await settle()
      expect(api.availability).toHaveBeenCalledTimes(2)
      expect((cmp() as unknown as { time_: () => string }).time_()).toBe('')
      api.availability.and.resolveTo(slots(['21:00', true]))
      ;(el().querySelectorAll('[data-testid="pb-areas"] input')[1] as HTMLInputElement).click()
      await settle()
      expect(api.availability).toHaveBeenCalledTimes(3)
      expect(api.availability.calls.mostRecent().args[3]).toBe('areaa1')
    })

    it('a full day shows the line and the next free time, which selects that date and hour', async () => {
      await setup(tableProfile())
      api.availability.and.callFake((_s: string, date: string) =>
        Promise.resolve(
          date === '2030-01-01'
            ? { ok: true, slots: [{ time: '20:00', available: false }], next: { date: '2030-01-03', time: '19:30' } }
            : slots(['19:30', true])
        )
      )
      cmp().date_.set('2030-01-01')
      await settle()
      expect(el().querySelector('[data-testid="pb-times-full"]')).toBeTruthy()
      const next = el().querySelector('[data-testid="pb-next-free"]') as HTMLButtonElement
      expect(next.textContent).toContain('pb_next_free')
      next.click()
      await settle()
      expect((cmp() as unknown as { date_: () => string }).date_()).toBe('2030-01-03')
      expect(chip('19:30').checked).toBeTrue()
    })

    it('a failed read shows a retry; too many shows no retry', async () => {
      await setup(tableProfile())
      api.availability.and.resolveTo({ ok: false, code: 'FAILED' })
      cmp().date_.set('2030-01-01')
      await settle()
      expect(el().querySelector('[data-testid="pb-times-retry"]')).toBeTruthy()
      api.availability.and.resolveTo({ ok: false, code: 'TOO_MANY' })
      ;(el().querySelector('[data-testid="pb-times-retry"]') as HTMLButtonElement).click()
      await settle()
      expect(el().textContent).toContain('pb_too_many')
      expect(el().querySelector('[data-testid="pb-times-retry"]')).toBeNull()
    })

    async function toContact(): Promise<void> {
      api.availability.and.resolveTo(slots(['20:00', true]))
      cmp().date_.set('2030-01-01')
      await settle()
      chip('20:00').click()
      ;(el().querySelectorAll('[data-testid="pb-areas"] input')[2] as HTMLInputElement).click()
      await settle()
      cmp().goNext()
      query.next(convertToParamMap({ step: '3' }))
      await settle()
      cmp().name_.set('דנה כהן')
      cmp().phone_.set('0521234567')
      cmp().consent_.set(true)
    }

    it('sends the area key and no seating answer; confirmed shows the confirmed card and the calendar button', async () => {
      await setup(tableProfile())
      api.send.and.resolveTo({
        ok: true,
        reference: 'ABCD1234',
        token: 'T'.repeat(32),
        confirmed: true,
        booking: { date: '2030-01-01', time: '20:00', partySize: 2 }
      })
      await toContact()
      await cmp().submit()
      await settle()
      const input = api.send.calls.mostRecent().args[1]
      expect(input.areaKey).toBe('areab2')
      expect(input.answers).toEqual([])
      expect(input.wanted.time).toBe('20:00')
      expect(el().querySelector('[data-testid="pb-done-title"]')?.textContent).toContain('pb_done_confirmed_title')
      expect(el().querySelector('[data-testid="pb-calendar"]')).toBeTruthy()
    })

    it('confirmed: false shows the waiting title and no calendar button', async () => {
      await setup(tableProfile())
      api.send.and.resolveTo({ ok: true, reference: 'ABCD1234', token: 'T'.repeat(32), confirmed: false })
      await toContact()
      await cmp().submit()
      await settle()
      expect(el().querySelector('[data-testid="pb-done-title"]')?.textContent).toContain('pb_done_waiting_title')
      expect(el().querySelector('[data-testid="pb-calendar"]')).toBeNull()
    })

    it('409 NO_TABLE returns to step 2 with the alternatives as chips', async () => {
      await setup(tableProfile())
      api.send.and.resolveTo({
        ok: false,
        code: 'NO_TABLE',
        issues: [],
        alternatives: [{ date: '2030-01-01', time: '21:00' }]
      })
      await toContact()
      await cmp().submit()
      query.next(convertToParamMap({ step: '2' }))
      await settle()
      expect(cmp().step_()).toBe(2)
      expect(el().querySelector('[data-testid="pb-time-taken"]')).toBeTruthy()
      const alt = el().querySelector('[data-testid="pb-alt"]') as HTMLButtonElement
      expect(alt.textContent).toContain('01/01 21:00')
      api.availability.and.resolveTo(slots(['21:00', true]))
      alt.click()
      await settle()
      expect(chip('21:00').checked).toBeTrue()
    })
  })
})
