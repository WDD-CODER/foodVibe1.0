import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, Send, Settings } from 'lucide-angular'
import { FrontDeskOnboardingComponent } from './frontdesk-onboarding.page'
import { buildIntake, type IntakeState } from './onboarding-fields'
import { BusinessService } from '@services/business.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { KnowledgeItemDataService } from '@services/knowledge-item-data.service'
import { MenuEventTypeService } from '@services/menu-event-type.service'
import { PermissionService } from '@services/permission.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { templateFor } from '@schemas/front-desk-templates'
import type { FrontDeskProfile } from '@models/front-desk-profile.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const t = (k: string | undefined): string => k ?? ''

describe('FrontDeskOnboardingComponent (plan 556)', () => {
  let fixture: ComponentFixture<FrontDeskOnboardingComponent>
  let profile_: WritableSignal<FrontDeskProfile | null>
  let saveFrontDeskIntake: jasmine.Spy
  let createManual: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>

  type Internals = {
    form: { controls: Record<string, { setValue: (v: unknown) => void }> }
    save: () => Promise<void>
    sendTestRequest: () => Promise<void>
    hasRealChanges: () => boolean
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const section = (name: string) => el().querySelector(`[data-testid="sec-${name}"]`)

  async function setup(initial: FrontDeskProfile | null = null, owner = true): Promise<void> {
    profile_ = signal(initial)
    saveFrontDeskIntake = jasmine
      .createSpy('saveFrontDeskIntake')
      .and.resolveTo({ profileId: 'p1', knowledge: { created: 1, updated: 0, skipped: 2 }, baseline: 'skipped' })
    createManual = jasmine.createSpy('createManual').and.resolveTo({ ok: true })
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [FrontDeskOnboardingComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Settings, Send })],
      providers: [
        provideRouter([]),
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_, ensureLoaded: () => Promise.resolve(), reloadFromStorage: () => Promise.resolve() }
        },
        {
          provide: KnowledgeItemDataService,
          useValue: {
            allItems_: signal([]),
            ensureLoaded: () => Promise.resolve(),
            reloadFromStorage: () => Promise.resolve()
          }
        },
        { provide: BusinessService, useValue: { business_: signal(null), saveFrontDeskIntake } },
        { provide: RequestDataService, useValue: { createManual } },
        { provide: MenuEventTypeService, useValue: { allEventTypes_: signal(['wedding']) } },
        { provide: PermissionService, useValue: { can: () => owner } },
        { provide: TranslationService, useValue: { translate: t } },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    fixture = TestBed.createComponent(FrontDeskOnboardingComponent)
    await settle()
  }

  const pick = async (type: string) => {
    cmp().form.controls['type'].setValue(type)
    await settle()
  }

  it("shows only the type picker until a type is chosen, then the shared sections plus that type's section", async () => {
    await setup()
    expect(section('basics')).toBeNull()
    await pick('catering')
    expect(section('basics')).not.toBeNull()
    expect(section('faq')).not.toBeNull()
    expect(section('catering')).not.toBeNull()
    expect(section('restaurant')).toBeNull()
    await pick('restaurant')
    expect(section('restaurant')).not.toBeNull()
    expect(section('catering')).toBeNull()
    await pick('other')
    expect(section('restaurant')).toBeNull()
    expect(section('catering')).toBeNull()
    expect(section('private_chef')).toBeNull()
  })

  it('starts with the baseline group collapsed and opens it from its chip', async () => {
    await setup()
    await pick('catering')
    const toggle = el().querySelector<HTMLButtonElement>('[data-testid="baseline-toggle"]')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(el().querySelector('[data-testid="baseline-group"]')!.classList.contains('ob-baseline--closed')).toBeTrue()
    toggle.click()
    await settle()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(el().querySelector('[data-testid="baseline-group"]')!.classList.contains('ob-baseline--closed')).toBeFalse()
  })

  it('saves everything in one call and shows the saved and skipped messages', async () => {
    await setup()
    await pick('catering')
    cmp().form.controls['display_name'].setValue('קייטרינג')
    cmp().form.controls['slug'].setValue('my-catering')
    await cmp().save()
    expect(saveFrontDeskIntake).toHaveBeenCalledTimes(1)
    const body = saveFrontDeskIntake.calls.first().args[0]
    expect(body.businessType).toBe('catering')
    expect(body.profile.displayName).toBe('קייטרינג')
    expect(userMsg.onSetSuccessMsg.calls.mostRecent().args[0]).toContain('onboarding_saved')
    expect(userMsg.onSetSuccessMsg.calls.mostRecent().args[0]).toContain('onboarding_knowledge_skipped')
  })

  it('does not save a new profile without a name and a valid slug', async () => {
    await setup()
    await pick('catering')
    await cmp().save()
    expect(saveFrontDeskIntake).not.toHaveBeenCalled()
  })

  it('shows the owner-only message to staff', async () => {
    await setup(null, false)
    expect(el().querySelector('[data-testid="owner-only"]')).not.toBeNull()
  })

  it('disables the test request until a profile with an enabled kind exists, then sends one test request', async () => {
    await setup()
    await pick('catering')
    const button = () => el().querySelector<HTMLButtonElement>('[data-testid="onboarding-test-request"]')!
    expect(button().disabled).toBeTrue()
    profile_.set({
      _id: 'p1',
      ...templateFor('catering'),
      slug: 'my-catering',
      displayName: 'ק',
      phone: '0501234567'
    } as unknown as FrontDeskProfile)
    await settle()
    expect(button().disabled).toBeFalse()
    await cmp().sendTestRequest()
    const input = createManual.calls.first().args[0]
    expect(input.test).toBeTrue()
    expect(input.kind).toBe('event')
    expect(input.guestPhone).toBe('0501234567')
    expect(input.wanted.partySize).toBe(30)
  })
})

describe('buildIntake (plan 556)', () => {
  const state = (over: Partial<IntakeState> = {}): IntakeState => ({
    type: 'catering',
    values: {},
    hours: [],
    closedDates: [],
    eventTypes: [],
    faq: [],
    baseline: {},
    tone: 'warm',
    ...over
  })

  it('writes nothing for empty fields', () => {
    const body = buildIntake(state(), t)
    expect(body.knowledge).toEqual([])
    expect(body.baseline).toBeUndefined()
    expect(body.profile).toEqual({ assistant: { tone: 'warm' }, requestKinds: { tasting: { enabled: false } } })
  })

  it('turns lead days into hours and event types into options, and fills items with the right topic and visibility', () => {
    const body = buildIntake(
      state({
        values: {
          lead_days: 14,
          min_guests: '40',
          areas: 'צפון, מרכז',
          tasting_enabled: true,
          price_by_style: '100',
          cancellation: 'חודש'
        },
        eventTypes: ['wedding'],
        baseline: { inquiriesPerMonth: '12', foodCostPct: '' }
      }),
      t
    )
    expect(body.profile.requestKinds).toEqual({
      event: { rules: { minPartySize: 40, minLeadHours: 336, areas: ['צפון', 'מרכז'] }, eventTypeOptions: ['wedding'] },
      tasting: { enabled: true }
    })
    expect(body.knowledge).toContain(jasmine.objectContaining({ topic: 'prices', visibility: 'public', answer: '100' }))
    expect(body.knowledge).toContain(
      jasmine.objectContaining({ topic: 'policy', question: 'onboarding_q_cancellation' })
    )
    expect(body.baseline).toEqual({ inquiriesPerMonth: 12 })
  })

  it('joins the "who answers" and approval fields into one internal item each', () => {
    const body = buildIntake(state({ values: { who_answers: 'דנה', answer_hours: '9-17', approver: 'יוסי' } }), t)
    const channels = body.knowledge.find((k) => k.question === 'onboarding_q_who_answers')!
    expect(channels).toEqual(jasmine.objectContaining({ topic: 'other', visibility: 'internal' }))
    expect(channels.answer).toBe('onboarding_q_who_answers: דנה\nonboarding_q_answer_hours: 9-17')
    expect(body.knowledge.filter((k) => k.question === 'onboarding_q_approver').length).toBe(1)
  })

  it('maps private chef fields to the event rules and the travel areas to the service area when empty', () => {
    const body = buildIntake(
      state({
        type: 'private_chef',
        values: {
          min_guests: 2,
          max_guests: 20,
          min_budget_per_guest: 150,
          lead_hours: 48,
          travel_areas: 'חיפה',
          consultation_enabled: false
        }
      }),
      t
    )
    expect(body.profile.requestKinds).toEqual({
      consultation: { enabled: false },
      event: { rules: { minPartySize: 2, maxPartySize: 20, minBudgetPerGuest: 150, minLeadHours: 48, areas: ['חיפה'] } }
    })
    expect(body.profile.serviceArea).toBe('חיפה')
  })

  it('maps restaurant fields to the table rule and the sitting length, and one FAQ row to a public item', () => {
    const body = buildIntake(
      state({
        type: 'restaurant',
        values: { max_party_no_call: 8, sitting_minutes: 90 },
        faq: [{ question: 'יש חניה?', answer: 'כן', topic: 'faq' }]
      }),
      t
    )
    expect(body.profile.requestKinds).toEqual({ table: { rules: { maxPartySize: 8 }, defaultDurationMinutes: 90 } })
    expect(body.knowledge).toEqual([{ topic: 'faq', question: 'יש חניה?', answer: 'כן', visibility: 'public' }])
  })
})
