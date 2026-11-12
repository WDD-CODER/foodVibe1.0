import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { ClipboardCheck, LucideAngularModule, MessageCircle, Phone } from 'lucide-angular'
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
  let api: { loadProfile: jasmine.Spy; send: jasmine.Spy }
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

  async function setup(result: PublicProfileResult): Promise<void> {
    api = {
      loadProfile: jasmine.createSpy('loadProfile').and.resolveTo(result),
      send: jasmine.createSpy('send').and.resolveTo({ ok: true, reference: 'ABCD1234', token: 'T'.repeat(32) })
    }
    query = new BehaviorSubject(convertToParamMap({}))
    TestBed.configureTestingModule({
      imports: [
        PublicRequestPage,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ClipboardCheck, MessageCircle, Phone })
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
