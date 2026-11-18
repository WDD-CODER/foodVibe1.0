import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, Settings, TrendingUp, UserPlus } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { PlatformAdminService, type BusinessRow } from '@services/platform-admin.service'
import type { AiUsageParams, AiUsageReport, AiUsageRow } from 'src/app/core/models/ai-usage.model'
import { BusinessService } from '@services/business.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { GrantAccessDialogService } from './components/grant-access-dialog/grant-access-dialog.service'
import { PlatformLogisticsItemsComponent } from './components/platform-logistics-items/platform-logistics-items.component'
import { PlatformAiShotsComponent } from './components/platform-ai-shots/platform-ai-shots.component'
import { PlatformLearningComponent } from './components/platform-learning/platform-learning.component'
import { PlatformBusinessDialogService } from './components/platform-business-dialog/platform-business-dialog.service'
import { FrontDeskAdminDialogService } from './components/front-desk-admin-dialog/front-desk-admin-dialog.service'
import { PlatformDashboardPage } from './platform-dashboard.page'

@Component({ selector: 'app-platform-logistics-items', standalone: true, template: '' })
class StubLogisticsItemsComponent {}

@Component({ selector: 'app-platform-ai-shots', standalone: true, template: '' })
class StubAiShotsComponent {}
@Component({ selector: 'app-platform-learning', standalone: true, template: '' })
class StubLearningComponent {}

const DAY = 86_400_000
const FAIL_TEXTS: Record<string, string> = {
  ai_fail_no_sections: 'לא נמצאו מנות',
  ai_fail_timeout: 'ה-AI לא ענה בזמן'
}

function row(id: string, extra: Partial<BusinessRow> = {}, events: Partial<BusinessRow['events']> = {}): BusinessRow {
  return {
    _id: id,
    name: id,
    ownerName: 'o',
    staffCount: 1,
    createdAt: 1,
    internal: false,
    lastActivityAt: Date.now(),
    activeDays7: 0,
    events: { total: 0, active: 0, closed: 0, finished: 0, ...events },
    closeRate: null,
    lastEventDate: null,
    frontDesk: null,
    modules: ['events', 'event_logistics', 'frontdesk', 'ai_create'],
    aiPrivate: false,
    aiMonthlyTokenCap: null,
    aiTokensThisMonth: 0,
    ...extra
  }
}

describe('PlatformDashboardPage', () => {
  let fixture: ComponentFixture<PlatformDashboardPage>
  let rows_: ReturnType<typeof signal<BusinessRow[]>>

  const aiRow = (key: string, extra: Partial<AiUsageRow> = {}): AiUsageRow => ({
    key,
    calls: 2,
    failedCalls: 1,
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    estCostUsd: 0.00123,
    ...extra
  })
  const report = (groupBy: 'business' | 'feature', rows: AiUsageRow[]): AiUsageReport => ({
    from: '2026-11-01',
    to: '2026-11-30',
    groupBy,
    pricesAsOf: '2026-11-10',
    rows,
    totals: { calls: 0, failedCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estCostUsd: 0 }
  })
  const downloadFrontDeskCsv = jasmine.createSpy('downloadFrontDeskCsv').and.resolveTo()
  let getAiUsage: jasmine.Spy<(params?: AiUsageParams) => Promise<AiUsageReport>>
  /** The signed-in session works in business 'a'. */
  const reloadBusiness = jasmine.createSpy('reload')
  const switchBusiness = jasmine.createSpy('switchBusiness')
  const grantDialogStub = { isOpen_: signal(false), open: jasmine.createSpy('open').and.resolveTo(false) }

  async function setup(rows: BusinessRow[], aiRows: AiUsageRow[] = []): Promise<void> {
    rows_ = signal(rows)
    getAiUsage = jasmine
      .createSpy('getAiUsage')
      .and.callFake((params?: AiUsageParams) =>
        Promise.resolve(
          params?.groupBy === 'feature'
            ? report('feature', [aiRow('parse_text', { calls: 3 }), aiRow('recipe_generate')])
            : report('business', aiRows)
        )
      )
    TestBed.configureTestingModule({
      imports: [
        PlatformDashboardPage,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Settings, TrendingUp, UserPlus })
      ],
      providers: [
        {
          provide: PlatformAdminService,
          useValue: {
            rows_: rows_.asReadonly(),
            load: () => Promise.resolve(),
            getAiUsage,
            getFrontDeskStats: () =>
              Promise.resolve({
                from: '2026-10-14',
                to: '2026-11-12',
                rows: [
                  {
                    businessId: 'a',
                    name: 'a',
                    requests: 7,
                    afterHoursPct: null,
                    approved: 3,
                    declined: 1,
                    medianMinutesToDecision: 12.5,
                    noShowRatePct: null,
                    eventsFromRequests: 0
                  }
                ]
              }),
            downloadFrontDeskCsv: downloadFrontDeskCsv,
            downloadAiUsageCsv: jasmine.createSpy('downloadAiUsageCsv').and.resolveTo(),
            setInternal: jasmine.createSpy('setInternal').and.resolveTo()
          }
        },
        {
          provide: BusinessService,
          useValue: { business_: signal({ _id: 'a' }).asReadonly(), reload: reloadBusiness }
        },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
        },
        { provide: TranslationService, useValue: { translate: (key: string) => FAIL_TEXTS[key] ?? key } },
        { provide: UserService, useValue: { homeBusinessId_: signal('home'), switchBusiness } },
        { provide: GrantAccessDialogService, useValue: grantDialogStub },
        provideRouter([])
      ]
    })
    // The logistics list (plan 532) has its own spec; here it is an empty stub.
    TestBed.overrideComponent(PlatformDashboardPage, {
      remove: { imports: [PlatformLogisticsItemsComponent, PlatformAiShotsComponent, PlatformLearningComponent] },
      add: { imports: [StubLogisticsItemsComponent, StubAiShotsComponent, StubLearningComponent] }
    })
    fixture = TestBed.createComponent(PlatformDashboardPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const names = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="biz-name"]')).map(
      (el) => (el.textContent ?? '').trim().split(/\s+/)[0]
    )
  const header = (index: number): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.platform-grid .sort-btn')[index]

  it('sorts by last activity, newest first, never-active last', async () => {
    await setup([
      row('old', { lastActivityAt: Date.now() - 3 * DAY }),
      row('never', { lastActivityAt: null }),
      row('new')
    ])
    expect(names()).toEqual(['new', 'old', 'never'])
  })

  it('sorts by a clicked header and reverses on the second click', async () => {
    await setup([row('a', {}, { total: 1 }), row('b', {}, { total: 5 }), row('c', {}, { total: 3 })])
    header(6).click()
    fixture.detectChanges()
    expect(names()).toEqual(['b', 'c', 'a'])
    header(6).click()
    fixture.detectChanges()
    expect(names()).toEqual(['a', 'c', 'b'])
  })

  it('colours idle rows', async () => {
    await setup([
      row('fresh'),
      row('d8', { lastActivityAt: Date.now() - 8 * DAY }),
      row('d15', { lastActivityAt: Date.now() - 15 * DAY }),
      row('none', { lastActivityAt: null })
    ])
    const trs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="biz-row"]'))
    const cls = (name: string): string =>
      trs
        .find((tr) => tr.textContent?.includes(name))!
        .className.split(' ')
        .filter((c) => c.startsWith('is-idle'))
        .join(' ')
    expect(cls('fresh')).toBe('')
    expect(cls('d8')).toBe('is-idle-7')
    expect(cls('d15')).toBe('is-idle-14')
    expect(cls('none')).toBe('is-idle-14')
  })

  it('totals only the businesses that are not internal', async () => {
    await setup([
      row('a', {}, { total: 4, active: 1, closed: 2, finished: 1 }),
      row('mine', { internal: true }, { total: 100, active: 0, closed: 100, finished: 0 })
    ])
    const totals = (
      (fixture.nativeElement as HTMLElement).querySelector('.platform-totals')?.textContent ?? ''
    ).replace(/\s+/g, ' ')
    expect(totals).toContain('platform_col_business 1')
    expect(totals).toContain('platform_col_events_total 4')
    expect(totals).toContain('platform_col_events_closed 2')
    expect(totals).toContain('platform_col_close_rate 50%')
  })

  it('shows the close rate as a whole percent and a dash when there is none', async () => {
    await setup([
      row('a', { closeRate: 0.5714, lastActivityAt: Date.now() }),
      row('b', { lastActivityAt: Date.now() - DAY })
    ])
    const cells = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="close-rate"]')).map(
      (el) => el.textContent?.trim()
    )
    expect(cells).toEqual(['57%', '—'])
  })

  it('shows the front desk progress and status, or a dash without a profile (plan 556)', async () => {
    await setup([
      row('a', { frontDesk: { status: 'pilot', done: 3, total: 8 }, lastActivityAt: Date.now() }),
      row('b', { lastActivityAt: Date.now() - DAY })
    ])
    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="frontdesk-cell"]')
    ).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim())
    expect(cells).toEqual(['3/8 · fd_status_pilot · fd_assistant_level_0', '—'])
  })

  it('shows the assistant level next to the status on each front desk row (plan 557)', async () => {
    await setup([
      row('a', { frontDesk: { status: 'active', done: 8, total: 8, assistantLevel: 1 }, lastActivityAt: Date.now() }),
      row('b', { frontDesk: { status: 'pilot', done: 2, total: 8 }, lastActivityAt: Date.now() - DAY })
    ])
    const levels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="fd-level"]')).map(
      (el) => (el.textContent ?? '').trim()
    )
    expect(levels).toEqual(['fd_assistant_level_1', 'fd_assistant_level_0'])
  })

  it('opens the front desk dialog on the row state when the edit button is clicked (plan 557)', async () => {
    await setup([row('a', { frontDesk: { status: 'pilot', done: 3, total: 8 } })])
    const dialog = TestBed.inject(FrontDeskAdminDialogService)
    const open = spyOn(dialog, 'open').and.resolveTo(false)
    ;((fixture.nativeElement as HTMLElement).querySelector('[data-testid="fd-edit"]') as HTMLButtonElement).click()
    expect(open).toHaveBeenCalledOnceWith({ businessId: 'a', name: 'a', status: 'pilot' })
  })

  describe('enter a business and give access (plan 632)', () => {
    const q = (id: string): NodeListOf<HTMLButtonElement> =>
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(`[data-testid="${id}"]`)

    beforeEach(() => {
      switchBusiness.calls.reset()
      grantDialogStub.open.calls.reset()
    })

    it('the enter button switches into the row business and is hidden on the admin home business', async () => {
      switchBusiness.and.resolveTo(true)
      await setup([row('a'), row('home')])
      expect(q('enter-business').length).toBe(1)
      q('enter-business')[0].click()
      expect(switchBusiness).toHaveBeenCalledOnceWith('a')
    })

    it('a failed enter shows the failure toast', async () => {
      switchBusiness.and.resolveTo(false)
      await setup([row('a')])
      q('enter-business')[0].click()
      await fixture.whenStable()
      expect(TestBed.inject(UserMsgService).onSetErrorMsg).toHaveBeenCalledWith('switch_failed')
    })

    it('the grant button opens the grant dialog for the row business', async () => {
      await setup([row('a')])
      q('grant-access')[0].click()
      expect(grantDialogStub.open).toHaveBeenCalledOnceWith({ businessId: 'a', name: 'a' })
    })
  })

  describe('modules and AI columns (plan 620)', () => {
    const text = (id: string): string =>
      ((fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`)?.textContent ?? '').trim()

    it('shows the module names joined with a dot, and a dash when none is on', async () => {
      await setup([row('a', { modules: ['events', 'frontdesk'] })])
      expect(text('biz-modules')).toBe('module_events · module_frontdesk')
    })

    it('shows a dash when no module is on', async () => {
      await setup([row('b', { modules: [] })])
      expect(text('biz-modules')).toBe('—')
    })

    it('shows tokens over the cap with thousands separators', async () => {
      await setup([row('a', { aiTokensThisMonth: 12345, aiMonthlyTokenCap: 100000 })])
      expect(text('biz-ai-month')).toContain('12,345 / 100,000')
    })

    it('shows "no cap" when there is none', async () => {
      await setup([row('b', { aiTokensThisMonth: 0 })])
      expect(text('biz-ai-month')).toContain('0 / platform_ai_no_cap')
    })

    it('shows the private tag only for a private business', async () => {
      await setup([row('a', { aiPrivate: true })])
      expect(text('biz-private-tag')).toBe('platform_ai_private_tag')
    })

    it('shows no private tag for a shared business', async () => {
      await setup([row('b')])
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="biz-private-tag"]')).toBeNull()
    })

    it('opens the dialog on the row when the settings button is pressed', async () => {
      await setup([row('a', { modules: ['events'], aiPrivate: true, aiMonthlyTokenCap: 5, aiTokensThisMonth: 2 })])
      const open = spyOn(TestBed.inject(PlatformBusinessDialogService), 'open').and.resolveTo(false)
      ;((fixture.nativeElement as HTMLElement).querySelector('[data-testid="biz-edit"]') as HTMLButtonElement).click()
      expect(open).toHaveBeenCalledOnceWith({
        businessId: 'a',
        name: 'a',
        modules: ['events'],
        aiPrivate: true,
        aiMonthlyTokenCap: 5,
        aiTokensThisMonth: 2
      })
    })

    it('reads the business again after a save on the business this session works in, so no refresh is needed', async () => {
      await setup([row('a')])
      reloadBusiness.calls.reset()
      spyOn(TestBed.inject(PlatformBusinessDialogService), 'open').and.resolveTo(true)
      ;((fixture.nativeElement as HTMLElement).querySelector('[data-testid="biz-edit"]') as HTMLButtonElement).click()
      await fixture.whenStable()
      expect(reloadBusiness).toHaveBeenCalledTimes(1)
    })

    it('does not read the business again after a cancel, or after a save on another business', async () => {
      await setup([row('a')])
      reloadBusiness.calls.reset()
      const open = spyOn(TestBed.inject(PlatformBusinessDialogService), 'open').and.resolveTo(false)
      const press = () =>
        ((fixture.nativeElement as HTMLElement).querySelector('[data-testid="biz-edit"]') as HTMLButtonElement).click()
      press()
      await fixture.whenStable()
      expect(reloadBusiness).not.toHaveBeenCalled()
      rows_.set([row('b')])
      fixture.detectChanges()
      open.and.resolveTo(true)
      press()
      await fixture.whenStable()
      expect(reloadBusiness).not.toHaveBeenCalled()
    })
  })

  describe('pinned name column (plan 611)', () => {
    it('keeps the name cells and header above anything that scrolls under them', async () => {
      await setup([row('a'), row('b')])
      const host = fixture.nativeElement as HTMLElement
      const z = (el: Element): number => Number(getComputedStyle(el).zIndex)
      const head = host.querySelector('.platform-grid .c-grid-header-cell.col-name')!
      const bodies = Array.from(host.querySelectorAll('[data-testid="biz-name"]'))
      expect(getComputedStyle(head).position).toBe('sticky')
      for (const cell of bodies) {
        expect(getComputedStyle(cell).position).toBe('sticky')
        expect(z(cell)).toBeGreaterThanOrEqual(1)
        expect(z(head)).toBeGreaterThan(z(cell))
      }
    })

    it('puts the front desk edit button in the row actions menu, not in the front desk cell', async () => {
      await setup([row('a', { frontDesk: { status: 'pilot', done: 3, total: 8 } })])
      const host = fixture.nativeElement as HTMLElement
      const edit = host.querySelector('[data-testid="fd-edit"]')!
      expect(edit.closest('app-row-actions-menu')).not.toBeNull()
      expect(edit.closest('[data-testid="frontdesk-cell"]')).toBeNull()
    })
  })

  describe('front desk columns (plan 559)', () => {
    const cell = (id: string): string =>
      ((fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`)?.textContent ?? '').trim()

    it('adds requests, median minutes and no-show % matched by business id, with a dash when there is none', async () => {
      await setup([row('a')])
      expect(cell('fd-requests')).toBe('7')
      expect(cell('fd-median')).toBe('12.5')
      expect(cell('fd-no-show')).toBe('—')
    })

    it('the export button downloads the CSV', async () => {
      await setup([row('a')])
      ;(
        (fixture.nativeElement as HTMLElement).querySelector('[data-testid="fd-export-csv"]') as HTMLButtonElement
      ).click()
      expect(downloadFrontDeskCsv).toHaveBeenCalled()
    })
  })

  describe('AI usage table (plan 566)', () => {
    const aiTrs = (): HTMLElement[] =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.ai-table tbody tr'))

    it('shows one row per business with calls, failed, tokens and a 4-decimal cost', async () => {
      await setup([row('a')], [aiRow('b1', { label: 'Alpha' }), aiRow('b2', { label: 'Beta', estCostUsd: 1.5 })])
      expect(getAiUsage).toHaveBeenCalledWith({ groupBy: 'business' })
      const cells = aiTrs().map((tr) => Array.from(tr.children).map((cell) => (cell.textContent ?? '').trim()))
      expect(cells).toEqual([
        ['Alpha', '2', '1', '15', '0.0012'],
        ['Beta', '2', '1', '15', '1.5000']
      ])
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('2026-11-10')
    })

    it('opens the per-feature rows of a clicked business, one at a time', async () => {
      await setup([row('a')], [aiRow('b1', { label: 'Alpha' }), aiRow('b2', { label: 'Beta' })])
      aiTrs()[0].click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(getAiUsage).toHaveBeenCalledWith({ groupBy: 'feature', businessId: 'b1' })
      expect(aiTrs().map((tr) => tr.className)).toEqual(['ai-row', 'ai-drill-row', 'ai-drill-row', 'ai-row'])
      expect(aiTrs()[1].textContent).toContain('ai_feature_parse_text')
      aiTrs()[3].click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(aiTrs().map((tr) => tr.className)).toEqual(['ai-row', 'ai-row', 'ai-drill-row', 'ai-drill-row'])
    })

    it('puts the failure reasons in the failed cell title (plan 580)', async () => {
      await setup(
        [row('a')],
        [aiRow('b1', { label: 'Alpha', failures: { timeout: 1, no_sections: 2 } }), aiRow('b2', { label: 'Beta' })]
      )
      const failedCell = (i: number): HTMLElement => aiTrs()[i].children[2] as HTMLElement
      expect(failedCell(0).getAttribute('title')).toBe('לא נמצאו מנות: 2 · ה-AI לא ענה בזמן: 1')
      expect(failedCell(1).hasAttribute('title')).toBe(false)
    })

    it('shows the empty state when there are no calls', async () => {
      await setup([row('a')], [])
      const host = fixture.nativeElement as HTMLElement
      expect(host.querySelector('.ai-table')).toBeNull()
      expect(host.querySelector('.ai-usage app-empty-state')?.textContent).toContain('platform_ai_empty')
    })
  })
})
