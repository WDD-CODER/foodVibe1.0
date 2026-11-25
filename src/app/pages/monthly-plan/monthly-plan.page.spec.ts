import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { LucideAngularModule, CalendarDays } from 'lucide-angular'
import type { MonthPlan } from '@schemas/entities'
import { monthKeyOf } from '@schemas/month/month-rules'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
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
    ...over
  }) as MonthPlan

describe('MonthlyPlanPage (plan 727)', () => {
  let fixture: ComponentFixture<MonthlyPlanPage>
  let service: jasmine.SpyObj<MonthPlanService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)

  const type = (id: string, value: string) => {
    const input = byId<HTMLInputElement>(id)!
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(list: MonthPlan[] | Error): Promise<void> {
    service = jasmine.createSpyObj('MonthPlanService', ['list', 'get', 'create', 'update'])
    if (list instanceof Error) service.list.and.rejectWith(list)
    else service.list.and.resolveTo(list)
    userMsg = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [MonthlyPlanPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, CalendarDays })],
      providers: [
        provideRouter([]),
        { provide: MonthPlanService, useValue: service },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: userMsg },
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

  it('opens the newest month with empty revenue boxes and the five targets with their bands', async () => {
    await setup([month('2026-11'), month('2026-10')])
    expect(byId<HTMLInputElement>('mp-revenue-plan')!.value).toBe('')
    expect(byId<HTMLInputElement>('mp-revenue-plan')!.placeholder).toBe('mp_not_entered')
    expect(byId<HTMLInputElement>('mp-revenue-actual')!.value).toBe('')
    const values = ['foodPct', 'labourPct', 'primePct', 'fixedPct', 'profitPct'].map(
      (k) => byId<HTMLInputElement>('mp-target-' + k)!.value
    )
    expect(values).toEqual(['32', '33', '65', '25', '10'])
    expect(byId('mp-band-foodPct')!.textContent).toContain('mp_band')
    expect(byId('mp-band-primePct')!.textContent).toContain('mp_band_max')
    expect(byId('mp-vat-line')!.textContent).toContain('mp_vat_line')
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
    expect(byId<HTMLInputElement>('mp-revenue-actual')!.value).toBe('0')
    expect(byId<HTMLButtonElement>('mp-save')!.disabled).toBeTrue()
  })

  it('clearing a box that held 0 sends null', async () => {
    await setup([month('2026-11', { revenue: { plan: 100, actual: 0 } })])
    service.update.and.resolveTo(month('2026-11', { revenue: { plan: 100, actual: null } }))
    type('mp-revenue-actual', '')
    byId<HTMLButtonElement>('mp-save')!.click()
    await settle()
    expect(service.update).toHaveBeenCalledOnceWith('2026-11', { revenue: { actual: null } })
  })

  it('a failed save keeps the typed values and shows the error', async () => {
    await setup([month('2026-11')])
    service.update.and.rejectWith(new Error('boom'))
    type('mp-revenue-plan', '500')
    byId<HTMLButtonElement>('mp-save')!.click()
    await settle()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('mp_save_failed')
    expect(byId<HTMLInputElement>('mp-revenue-plan')!.value).toBe('500')
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
    expect(byId<HTMLInputElement>('mp-revenue-plan')!.disabled).toBeTrue()
    expect(byId('mp-save')).toBeNull()
  })

  it('"amount includes VAT" divides the typed amount by 1.18 when the box is left', async () => {
    await setup([month('2026-11')])
    const box = byId<HTMLInputElement>('mp-incl-vat-plan')!
    box.click()
    fixture.detectChanges()
    type('mp-revenue-plan', '118')
    byId<HTMLInputElement>('mp-revenue-plan')!.dispatchEvent(new Event('blur'))
    await settle()
    expect(byId<HTMLInputElement>('mp-revenue-plan')!.value).toBe('100')
  })

  it('a dealer without VAT (patur) has no "includes VAT" box', async () => {
    await setup([month('2026-11', { dealerType: 'patur', vatRatePct: 0 })])
    expect(byId('mp-incl-vat-plan')).toBeNull()
  })

  it('shows the soft line when the targets do not add up to 100', async () => {
    await setup([month('2026-11')])
    expect(byId('mp-sum-off')).toBeNull()
    type('mp-target-fixedPct', '30')
    expect(byId('mp-sum-off')).not.toBeNull()
  })
})
