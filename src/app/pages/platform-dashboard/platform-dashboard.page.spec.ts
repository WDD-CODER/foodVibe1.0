import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { PlatformAdminService, type BusinessRow } from '@services/platform-admin.service'
import { LoggingService } from '@services/logging.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { PlatformDashboardPage } from './platform-dashboard.page'

const DAY = 86_400_000

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
    ...extra
  }
}

describe('PlatformDashboardPage', () => {
  let fixture: ComponentFixture<PlatformDashboardPage>
  let rows_: ReturnType<typeof signal<BusinessRow[]>>

  async function setup(rows: BusinessRow[]): Promise<void> {
    rows_ = signal(rows)
    TestBed.configureTestingModule({
      imports: [PlatformDashboardPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: PlatformAdminService,
          useValue: {
            rows_: rows_.asReadonly(),
            load: () => Promise.resolve(),
            setInternal: jasmine.createSpy('setInternal').and.resolveTo()
          }
        },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
        },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        provideRouter([])
      ]
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
})
