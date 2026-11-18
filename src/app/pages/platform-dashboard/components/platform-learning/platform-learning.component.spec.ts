import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { PlatformAdminService, type LearningStats } from '@services/platform-admin.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { PlatformLearningComponent } from './platform-learning.component'

const DICT: Record<string, string> = {
  ai_feature_invoice_read: 'קריאת חשבונית',
  platform_learning_private_note: '{count} עסקים במצב פרטי'
}

const stats = (over: Partial<LearningStats> = {}): LearningStats => ({
  days: 90,
  from: '2026-08-20',
  to: '2026-11-18',
  flows: [
    {
      feature: 'invoice_read',
      model: 'gemini-x',
      drafts: 4,
      confirmed: 3,
      avgKeptRatio: 0.75,
      weeks: [{ week: '2026-11-08', drafts: 4, confirmed: 3, avgKeptRatio: 0.75 }]
    },
    { feature: 'invoice_read', model: null, drafts: 1, confirmed: 0, avgKeptRatio: null, weeks: [] }
  ],
  brain: { suppliers: 7, names: 41, businesses: 3 },
  privateBusinesses: 0,
  truncated: false,
  ...over
})

describe('PlatformLearningComponent (plan 630)', () => {
  let fixture: ComponentFixture<PlatformLearningComponent>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let logging: jasmine.SpyObj<LoggingService>

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement

  async function setup(
    getStats: () => Promise<LearningStats>,
    getStatus: () => Promise<{ fileStore: boolean }> = () => Promise.resolve({ fileStore: true })
  ): Promise<void> {
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['error'])
    TestBed.configureTestingModule({
      imports: [PlatformLearningComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: PlatformAdminService, useValue: { getLearningStats: getStats, getLearningStatus: getStatus } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: logging },
        { provide: TranslationService, useValue: { translate: (key: string) => DICT[key] ?? key } }
      ]
    })
    fixture = TestBed.createComponent(PlatformLearningComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('shows rows with flow, model, counts and percent; null model and null average read plainly', async () => {
    await setup(() => Promise.resolve(stats()))
    const rows = el().querySelectorAll('[data-testid="learning-flow-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('קריאת חשבונית')
    expect(rows[0].textContent).toContain('gemini-x')
    expect(rows[0].textContent).toContain('75%')
    expect(rows[1].textContent).toContain('platform_learning_model_unknown')
    expect(rows[1].textContent).toContain('—')
  })

  it('opens and closes the week list on the chip, one at a time', async () => {
    await setup(() => Promise.resolve(stats()))
    const chips = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('[data-testid="learning-by-week"]'))
    const weekRows = (): number => el().querySelectorAll('[data-testid="learning-week-row"]').length
    expect(weekRows()).toBe(0)
    chips()[0].click()
    fixture.detectChanges()
    expect(chips()[0].getAttribute('aria-expanded')).toBe('true')
    expect(weekRows()).toBe(1)
    chips()[1].click()
    fixture.detectChanges()
    expect(weekRows()).toBe(0)
    expect(chips()[0].getAttribute('aria-expanded')).toBe('false')
    chips()[1].click()
    fixture.detectChanges()
    expect(chips()[1].getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the brain numbers', async () => {
    await setup(() => Promise.resolve(stats()))
    const brain = el().querySelector('[data-testid="learning-brain"]') as HTMLElement
    expect(brain.textContent).toContain('7')
    expect(brain.textContent).toContain('41')
    expect(brain.textContent).toContain('3')
  })

  it('shows the private note only when the count is above 0', async () => {
    await setup(() => Promise.resolve(stats()))
    expect(el().querySelector('[data-testid="learning-private-note"]')).toBeNull()
    TestBed.resetTestingModule()
    await setup(() => Promise.resolve(stats({ privateBusinesses: 2 })))
    expect(el().querySelector('[data-testid="learning-private-note"]')?.textContent).toContain('2 עסקים')
  })

  it('shows the file-store note only when fileStore is false', async () => {
    await setup(() => Promise.resolve(stats()))
    expect(el().querySelector('[data-testid="learning-no-file-store"]')).toBeNull()
    TestBed.resetTestingModule()
    await setup(
      () => Promise.resolve(stats()),
      () => Promise.resolve({ fileStore: false })
    )
    expect(el().querySelector('[data-testid="learning-no-file-store"]')).not.toBeNull()
  })

  it('shows no note and no toast when the status call fails', async () => {
    await setup(
      () => Promise.resolve(stats()),
      () => Promise.reject(new Error('x'))
    )
    expect(el().querySelector('[data-testid="learning-no-file-store"]')).toBeNull()
    expect(logging.error).toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).not.toHaveBeenCalled()
  })

  it('shows the empty state with no flows', async () => {
    await setup(() => Promise.resolve(stats({ flows: [] })))
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().querySelector('table')).toBeNull()
  })

  it('a failed stats load shows the error, logs, and the empty state', async () => {
    await setup(() => Promise.reject(new Error('boom')))
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('platform_learning_error')
    expect(logging.error).toHaveBeenCalled()
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().textContent).toContain('platform_learning_title')
  })
})
