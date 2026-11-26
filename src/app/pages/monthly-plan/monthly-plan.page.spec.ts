import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, CalendarDays } from 'lucide-angular'
import type { MonthPlan } from '@schemas/entities'
import { defaultFixed, defaultLabour, monthKeyOf } from '@schemas/month/month-rules'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { MonthlyPlanPage } from './monthly-plan.page'
import { MonthPlanService } from './services/month-plan.service'

const month = (key: string, over: Partial<MonthPlan> = {}): MonthPlan =>
  ({
    _id: 'm-' + key,
    schemaVersion: 2,
    businessId: 'b1',
    createdBy: 'u1',
    createdAt: 1,
    updatedAt: 1,
    month: key,
    status: 'open',
    targets: { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 10 },
    vatRatePct: 18,
    dealerType: 'murshe',
    revenue: { plan: null, actual: null },
    fixed: defaultFixed(),
    labour: defaultLabour(),
    purchases: { actual: null },
    ...over
  }) as MonthPlan

describe('MonthlyPlanPage (plan 727)', () => {
  let fixture: ComponentFixture<MonthlyPlanPage>
  let service: jasmine.SpyObj<MonthPlanService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)

  const press = (id: string) => {
    byId<HTMLButtonElement>(id)!.click()
    fixture.detectChanges()
  }
  /** The box of a forecast / actual side, opening its chip first; other boxes are always there. */
  const box = (id: string) => {
    if (!byId(id)) press(id + '-chip')
    return byId<HTMLInputElement>(id)!
  }
  const type = (id: string, value: string) => {
    const input = box(id)
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const text = (id: string) => byId(id)?.textContent ?? ''
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  /** Opens a box and lets Angular write its first value, so a later typed value stays in the box. */
  const openBox = async (id: string) => {
    box(id)
    await settle()
  }

  async function setup(list: MonthPlan[] | Error): Promise<void> {
    service = jasmine.createSpyObj('MonthPlanService', ['list', 'get', 'create', 'update'])
    if (list instanceof Error) service.list.and.rejectWith(list)
    else service.list.and.resolveTo(list)
    userMsg = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    confirm = jasmine.createSpyObj('ConfirmModalService', ['open'])
    confirm.open.and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [MonthlyPlanPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, CalendarDays })],
      providers: [
        provideRouter([]),
        { provide: MonthPlanService, useValue: service },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info']) }
      ]
    })
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(MonthlyPlanPage)
    await settle()
  }

  it('shows the empty state with the new month button when there are no months', async () => {
    await setup([])
    expect(byId('mp-empty')).not.toBeNull()
    expect(el().textContent).toContain('mp_empty')
  })

  it('a failed load shows the readable error and retry loads again', async () => {
    await setup(new Error('x'))
    expect(byId('mp-load-error')).not.toBeNull()
    service.list.and.resolveTo([month('2026-11')])
    byId<HTMLButtonElement>('mp-retry')!.click()
    await settle()
    expect(byId('mp-load-error')).toBeNull()
    expect(byId('mp-revenue')).not.toBeNull()
  })

  it('opens the newest month with closed revenue pairs and the five targets', async () => {
    await setup([month('2026-11'), month('2026-10')])
    expect(byId('mp-revenue-plan')).toBeNull()
    expect(byId('mp-revenue-actual')).toBeNull()
    expect(box('mp-revenue-plan').value).toBe('')
    expect(box('mp-revenue-plan').placeholder).toBe('mp_not_entered')
    expect(box('mp-revenue-actual').value).toBe('')
    const values = ['foodPct', 'labourPct', 'primePct', 'fixedPct', 'profitPct'].map(
      (k) => byId<HTMLInputElement>('mp-target-' + k)!.value
    )
    expect(values).toEqual(['32', '33', '65', '25', '10'])
    expect(byId('mp-vat-line')!.textContent).toContain('mp_vat_line')
  })

  it('plan 749: the target norm is a hover hint on the box, not text beside it', async () => {
    await setup([month('2026-11')])
    for (const [key, band] of [
      ['foodPct', 'mp_band'],
      ['primePct', 'mp_band_max']
    ]) {
      const input = byId<HTMLInputElement>('mp-target-' + key)!
      expect(input.closest('.c-input-wrapper')!.getAttribute('title')).toBe(band)
      const described = el().querySelector('#' + input.getAttribute('aria-describedby'))!
      expect(described.textContent).toBe(band)
      expect(described.classList).toContain('visually-hidden')
      expect(byId('mp-band-' + key)).toBeNull()
    }
    const visible = byId('mp-targets')!.cloneNode(true) as HTMLElement
    visible.querySelectorAll('.visually-hidden').forEach((node) => node.remove())
    expect(visible.textContent).not.toContain('mp_band')
  })

  it('an empty revenue box saves nothing, 0 saves 0 (not null) and a changed target is sent', async () => {
    await setup([month('2026-11')])
    service.update.and.callFake(async (key, body) =>
      month(key, {
        revenue: { plan: body.revenue?.plan ?? null, actual: body.revenue?.actual ?? null },
        targets: { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 8 }
      })
    )
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
    await openBox('mp-revenue-actual')
    await openBox('mp-revenue-plan')
    type('mp-revenue-actual', '0')
    type('mp-revenue-plan', '120000')
    type('mp-target-profitPct', '8')
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeFalse()
    byId<HTMLButtonElement>('mp-save')!.click()
    await settle()
    expect(service.update).toHaveBeenCalledOnceWith('2026-11', {
      revenue: { plan: 120000, actual: 0 },
      targets: { profitPct: 8 }
    })
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('mp_saved')
    expect(box('mp-revenue-actual').value).toBe('0')
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
  })

  it('opening and closing a chip is not a change', async () => {
    await setup([month('2026-11')])
    press('mp-revenue-plan-chip')
    press('mp-revenue-plan-chip')
    press('lc-actual-chip')
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
  })

  it('every pair starts closed again when another month opens', async () => {
    await setup([month('2026-11'), month('2026-10')])
    press('mp-revenue-plan-chip')
    press('fc-rent-actual-chip')
    await (fixture.componentInstance as unknown as { pick(m: string): Promise<void> }).pick('2026-10')
    await settle()
    expect(byId('mp-revenue-plan')).toBeNull()
    expect(byId('fc-rent-actual')).toBeNull()
  })

  it('clearing a box that held 0 sends null', async () => {
    await setup([month('2026-11', { revenue: { plan: 100, actual: 0 } })])
    service.update.and.resolveTo(month('2026-11', { revenue: { plan: 100, actual: null } }))
    type('mp-revenue-actual', '')
    byId<HTMLButtonElement>('mp-save')!.click()
    await settle()
    expect(service.update).toHaveBeenCalledOnceWith('2026-11', { revenue: { actual: null } })
  })

  describe('plan 749: the month picture follows what is typed, without saving', () => {
    afterEach(() => expect(service.update).not.toHaveBeenCalled())

    it('(a) a typed 0 actual revenue shows ₪0.00 at once', async () => {
      await setup([month('2026-11', { revenue: { plan: 100000, actual: null } })])
      expect(byId('mf-card')).not.toBeNull()
      expect(text('mf-badge')).toContain('mp_completeness')
      expect(text('mf-actual-revenue')).toContain('mp_not_entered')
      type('mp-revenue-actual', '0')
      expect(text('mf-actual-revenue')).toContain('₪0.00')
      expect(byId('dpc-card')).not.toBeNull()
    })

    it('(b) an added fixed line counts as typed and stops counting when removed', async () => {
      await setup([month('2026-11')])
      type('fc-rent-actual', '12000')
      expect(text('mf-actual-fixed')).toContain('₪12,000.00')
      press('fc-add')
      type('fc-own9-actual', '1500')
      expect(text('mf-actual-fixed')).toContain('₪13,500.00')
      press('fc-remove-own9')
      await settle()
      expect(confirm.open).toHaveBeenCalled()
      expect(text('mf-actual-fixed')).toContain('₪12,000.00')
    })

    it('(c) the estimated mode shows the estimated total, the detailed mode the sum of the lines', async () => {
      await setup([month('2026-11')])
      type('fc-rent-actual', '12000')
      press('fc-mode-rough')
      type('fc-rough-actual', '30000')
      expect(text('mf-actual-fixed')).toContain('₪30,000.00')
      press('fc-mode-lines')
      expect(text('mf-actual-fixed')).toContain('₪12,000.00')
    })

    it('(d) typed gross staff cost shows the employer cost', async () => {
      await setup([month('2026-11')])
      expect(byId('mp-flag-estimate')).toBeNull()
      type('lc-actual', '40000')
      expect(text('mf-actual-labour')).toContain('₪50,000.00')
      expect(byId('mp-flag-estimate')).not.toBeNull()
    })

    it('(e) an emptied food target box keeps the saved target in the figures', async () => {
      await setup([month('2026-11', { revenue: { plan: 100000, actual: null } })])
      type('mp-target-foodPct', '')
      expect(text('mf-plan-foodCost')).toContain('₪32,000.00')
      expect(text('mp-figures')).not.toContain('NaN')
      type('mp-target-foodPct', '30')
      expect(text('mf-plan-foodCost')).toContain('₪30,000.00')
    })

    it('typed purchases show as the actual food cost', async () => {
      await setup([month('2026-11')])
      type('mp-purchases-actual', '4200')
      expect(text('mf-actual-foodCost')).toContain('₪4,200.00')
    })

    it('the faded forecast in an empty actual box is not counted', async () => {
      await setup([month('2026-11', { revenue: { plan: 100000, actual: null } })])
      expect(box('mp-revenue-actual').placeholder).toBe('100,000')
      box('mp-revenue-actual').dispatchEvent(new Event('blur'))
      fixture.detectChanges()
      expect(text('mf-actual-revenue')).toContain('mp_not_entered')
      expect(text('mf-missing')).toContain('mp_missing')
      expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
    })

    it('the fixed «חלקי» flag carries the lines without an actual and describes itself', async () => {
      await setup([month('2026-11')])
      const flag = byId('mp-flag-fixed-partial')!
      expect(flag.title).toBe('mp_fixed_missing_lines')
      expect(el().querySelector('#' + flag.getAttribute('aria-describedby'))!.textContent).toBe(flag.title)
      press('fc-mode-rough')
      expect(byId('mp-flag-fixed-partial')!.title).toBe('mp_missing')
    })
  })

  it('plan 749: a stored employer total reads as gross, is not a change by itself and is saved as gross', async () => {
    await setup([
      month('2026-11', { labour: { mode: 'employer', factor: 1.25, plan: 50000, actual: 62500 } } as Partial<MonthPlan>)
    ])
    expect(box('lc-plan').getAttribute('aria-label')).toContain('mp_chip_plan')
    expect(byId('lc-actual-chip')).not.toBeNull()
    expect(text('lc-actual-chip')).toContain('₪50,000.00')
    expect(text('mf-actual-labour')).toContain('₪62,500.00')
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
    service.update.and.resolveTo(month('2026-11', { revenue: { plan: 5, actual: null } }))
    type('mp-revenue-plan', '5')
    byId<HTMLButtonElement>('mp-save')!.click()
    await settle()
    expect(service.update.calls.mostRecent().args[1].labour).toEqual({
      mode: 'gross',
      factor: 1.25,
      plan: 40000,
      actual: 50000
    })
  })

  it('a failed save keeps the typed values and shows the error', async () => {
    await setup([month('2026-11')])
    service.update.and.rejectWith(new Error('boom'))
    await openBox('mp-revenue-plan')
    type('mp-revenue-plan', '500')
    byId<HTMLButtonElement>('mp-save')!.click()
    await settle()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('mp_save_failed')
    expect(box('mp-revenue-plan').value).toBe('500')
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeFalse()
  })

  it('a target outside its band gets the amber tag', async () => {
    await setup([month('2026-11')])
    expect(byId('mp-out-foodPct')).toBeNull()
    type('mp-target-foodPct', '40')
    expect(byId('mp-out-foodPct')).not.toBeNull()
  })

  it('a 409 on create loads the stored month and opens it with the message', async () => {
    await setup([month('2026-10')])
    byId<HTMLButtonElement>('mp-new-month')!.click()
    await settle()
    service.create.and.rejectWith({ status: 409 })
    const stored = month(monthKeyOf(Date.now()))
    service.get.and.resolveTo(stored)
    byId<HTMLButtonElement>('mp-create')!.click()
    await settle()
    expect(service.get).toHaveBeenCalled()
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('mp_month_exists')
    expect(byId('mp-new-form')).toBeNull()
  })

  it('a new month opens with the 201 answer', async () => {
    await setup([])
    byId<HTMLButtonElement>('mp-empty')!.querySelector('button')!.click()
    await settle()
    service.create.and.callFake(async (key) => month(key))
    byId<HTMLButtonElement>('mp-create')!.click()
    await settle()
    expect(service.create).toHaveBeenCalledTimes(1)
    expect(byId('mp-revenue')).not.toBeNull()
  })

  it('a closed month is read-only and tagged', async () => {
    await setup([month('2026-11', { status: 'closed' })])
    expect(byId('mp-closed')).not.toBeNull()
    expect(byId<HTMLButtonElement>('mp-revenue-plan-chip')!.disabled).toBeTrue()
    press('mp-revenue-plan-chip')
    expect(byId('mp-revenue-plan')).toBeNull()
    expect(byId('mp-save')).toBeNull()
  })

  it('"amount includes VAT" divides the typed amount by 1.18 when the box is left', async () => {
    await setup([month('2026-11')])
    press('mp-incl-vat-plan')
    type('mp-revenue-plan', '118')
    expect(text('mf-plan-revenue')).toContain('₪118.00')
    box('mp-revenue-plan').dispatchEvent(new Event('blur'))
    await settle()
    expect(box('mp-revenue-plan').value).toBe('100')
    expect(text('mf-plan-revenue')).toContain('₪100.00')
  })

  it('a dealer without VAT (patur) has no "includes VAT" box', async () => {
    await setup([month('2026-11', { dealerType: 'patur', vatRatePct: 0 })])
    expect(byId('mp-incl-vat-plan')).toBeNull()
  })

  describe('plan 729: fixed costs, labour and purchases', () => {
    it('shows the three inputs; a typed purchases total and a fixed line are saved as whole groups', async () => {
      await setup([month('2026-11')])
      expect(byId('fc-card')).not.toBeNull()
      expect(byId('lc-card')).not.toBeNull()
      expect(byId('mp-purchases-plan-chip')).toBeNull()
      service.update.and.callFake(async (key, body) =>
        month(key, { fixed: body.fixed, purchases: body.purchases } as Partial<MonthPlan>)
      )
      type('mp-purchases-actual', '4200')
      type('fc-rent-actual', '12000')
      byId<HTMLButtonElement>('mp-save')!.click()
      await settle()
      const body = service.update.calls.mostRecent().args[1]
      expect(body.purchases).toEqual({ actual: 4200 })
      expect(body.fixed!.lines.find((l) => l.id === 'rent')!.actual).toBe(12000)
      expect(body.labour).toBeUndefined()
      expect(body.revenue).toBeUndefined()
      expect(byId('fc-entered')!.textContent).toContain('mp_fixed_entered')
    })

    it('a month stored before this plan shows the defaults and stores them on its first save', async () => {
      const older = month('2026-11')
      delete (older as Partial<MonthPlan>).fixed
      delete (older as Partial<MonthPlan>).labour
      delete (older as Partial<MonthPlan>).purchases
      await setup([older])
      expect(el().querySelectorAll('[data-testid^="fc-line-"]').length).toBe(8)
      expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
      service.update.and.resolveTo(month('2026-11', { revenue: { plan: 5, actual: null } }))
      type('mp-revenue-plan', '5')
      byId<HTMLButtonElement>('mp-save')!.click()
      await settle()
      const body = service.update.calls.mostRecent().args[1]
      expect(body.revenue).toEqual({ plan: 5 })
      expect(body.fixed).toEqual(defaultFixed())
      expect(body.labour).toEqual(defaultLabour())
      expect(body.purchases).toEqual({ actual: null })
    })

    it('a changed line counts as unsaved changes until saved', async () => {
      await setup([month('2026-11')])
      expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
      type('fc-rent-plan', '9000')
      expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeFalse()
    })

    it('gross labour with an amount is flagged as an estimate; fixed lines not all entered are flagged partial', async () => {
      await setup([
        month('2026-11', { labour: { mode: 'gross', factor: 1.25, plan: null, actual: 10000 } } as Partial<MonthPlan>)
      ])
      expect(byId('mp-flag-estimate')).not.toBeNull()
      expect(byId('mp-flag-fixed-partial')).not.toBeNull()
    })

    it('a closed month keeps the new chips shut', async () => {
      await setup([month('2026-11', { status: 'closed' })])
      expect(byId<HTMLButtonElement>('mp-purchases-actual-chip')!.disabled).toBeTrue()
      expect(byId<HTMLButtonElement>('fc-rent-actual-chip')!.disabled).toBeTrue()
      expect(byId<HTMLButtonElement>('lc-actual-chip')!.disabled).toBeTrue()
    })
  })

  it('shows the soft line when the targets do not add up to 100', async () => {
    await setup([month('2026-11')])
    expect(byId('mp-sum-off')).toBeNull()
    type('mp-target-fixedPct', '30')
    expect(byId('mp-sum-off')).not.toBeNull()
  })
})
