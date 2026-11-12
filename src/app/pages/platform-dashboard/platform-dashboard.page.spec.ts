import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { PlatformAdminService, type BusinessRow } from '@services/platform-admin.service'
import type { AiUsageParams, AiUsageReport, AiUsageRow } from 'src/app/core/models/ai-usage.model'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { PlatformLogisticsItemsComponent } from './components/platform-logistics-items/platform-logistics-items.component'
import { PlatformDashboardPage } from './platform-dashboard.page'

@Component({ selector: 'app-platform-logistics-items', standalone: true, template: '' })
class StubLogisticsItemsComponent {}

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
  let getAiUsage: jasmine.Spy<(params?: AiUsageParams) => Promise<AiUsageReport>>

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
      imports: [PlatformDashboardPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: PlatformAdminService,
          useValue: {
            rows_: rows_.asReadonly(),
            load: () => Promise.resolve(),
            getAiUsage,
            downloadAiUsageCsv: jasmine.createSpy('downloadAiUsageCsv').and.resolveTo(),
            setInternal: jasmine.createSpy('setInternal').and.resolveTo()
          }
        },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
        },
        { provide: TranslationService, useValue: { translate: (key: string) => FAIL_TEXTS[key] ?? key } },
        provideRouter([])
      ]
    })
    // The logistics list (plan 532) has its own spec; here it is an empty stub.
    TestBed.overrideComponent(PlatformDashboardPage, {
      remove: { imports: [PlatformLogisticsItemsComponent] },
      add: { imports: [StubLogisticsItemsComponent] }
    })
    fixture = TestBed.createComponent(PlatformDashboardPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const names = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody th')).map(
      (el) => (el.textContent ?? '').trim().split(/\s+/)[0]
    )
  const header = (index: number): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('thead .sort-btn')[index]

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
    const trs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'))
    const cls = (name: string): string => trs.find((tr) => tr.textContent?.includes(name))!.className
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
    const cells = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map((tr) =>
      tr.querySelectorAll('td')[9].textContent?.trim()
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
    expect(cells).toEqual(['3/8 · fd_status_pilot', '—'])
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
