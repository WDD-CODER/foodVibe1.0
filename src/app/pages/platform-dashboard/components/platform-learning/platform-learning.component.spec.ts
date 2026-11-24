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
  platform_learning_private_note: '{count} עסקים במצב פרטי',
  platform_learning_saved_of: '{confirmed} מתוך {drafts} ({rate}%)',
  platform_learning_low_sample: 'מעט'
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

describe('PlatformLearningComponent (plans 630, 647)', () => {
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
    const rows = el().querySelectorAll('[data-testid="learning-flow-card"]')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('קריאת חשבונית')
    expect(rows[0].textContent).toContain('gemini-x')
    expect(rows[0].textContent).toContain('75%')
    expect(rows[1].textContent).toContain('platform_learning_model_unknown')
    expect(rows[1].textContent).toContain('—')
  })

  it('plan 642: shows saved out of made, and greys the accuracy below five saves', async () => {
    const one = stats({
      flows: [
        { feature: 'invoice_read', model: 'a', drafts: 9, confirmed: 1, avgKeptRatio: 1, weeks: [] },
        { feature: 'invoice_read', model: 'b', drafts: 9, confirmed: 5, avgKeptRatio: 0.8, weeks: [] }
      ]
    })
    await setup(() => Promise.resolve(one))
    const saved = el().querySelectorAll('[data-testid="learning-saved"]')
    const acc = el().querySelectorAll<HTMLElement>('[data-testid="learning-accuracy"]')
    expect(saved[0].textContent).toContain('1 מתוך 9 (11%)')
    expect(acc[0].textContent).toContain('100% (1)')
    expect(acc[0].classList).toContain('learning__low')
    expect(acc[0].getAttribute('title')).toBe('מעט')
    expect(acc[1].textContent).toContain('80% (5)')
    expect(acc[1].classList).not.toContain('learning__low')
    expect(acc[1].getAttribute('title')).toBe('platform_learning_kept_meaning')
  })

  it('plan 642: a null average shows a dash and no low-sample style', async () => {
    await setup(() => Promise.resolve(stats()))
    const acc = el().querySelectorAll<HTMLElement>('[data-testid="learning-accuracy"]')
    expect(acc[1].textContent?.trim()).toBe('—')
    expect(acc[1].classList).not.toContain('learning__low')
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
    expect(el().querySelector('[data-testid="learning-flow-card"]')).toBeNull()
  })

  it('plan 647: cards show name, saved-of-made, accuracy and a meaning line under each number', async () => {
    await setup(() => Promise.resolve(stats()))
    const cards = el().querySelectorAll('[data-testid="learning-flow-card"]')
    expect(cards.length).toBe(2)
    expect(cards[0].textContent).toContain('קריאת חשבונית')
    expect(cards[0].textContent).toContain('3 מתוך 4 (75%)')
    expect(cards[0].textContent).toContain('75% (3)')
    expect(cards[0].querySelectorAll('.learning__meaning').length).toBe(2)
    expect(cards[0].textContent).toContain('platform_learning_saved_meaning')
    expect(cards[0].textContent).toContain('platform_learning_kept_meaning')
  })

  it('plan 647: the weekly breakdown is inside the card, closed by default', async () => {
    await setup(() => Promise.resolve(stats()))
    const card = el().querySelector('[data-testid="learning-flow-card"]') as HTMLElement
    expect(card.querySelector('[data-testid="learning-week-row"]')).toBeNull()
    ;(card.querySelector('[data-testid="learning-by-week"]') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(card.querySelector('[data-testid="learning-week-row"]')).not.toBeNull()
  })

  it('plan 647: the supplier memory is three stat tiles', async () => {
    await setup(() => Promise.resolve(stats()))
    const tiles = el().querySelectorAll('[data-testid="learning-tile"]')
    expect(tiles.length).toBe(3)
    expect(tiles[0].textContent).toContain('7')
  })

  it('plan 647: no drafts and private businesses read the private empty state with the count', async () => {
    const dict = DICT
    dict['platform_learning_empty_private'] = '{count} פרטיים ואין נתונים'
    await setup(() => Promise.resolve(stats({ flows: [], privateBusinesses: 2 })))
    expect(el().querySelector('[data-testid="learning-empty-private"]')?.textContent).toContain('2 פרטיים')
    expect(el().querySelector('app-empty-state[data-testid="learning-empty-private"]')).not.toBeNull()
    delete dict['platform_learning_empty_private']
  })

  it('plan 647: no drafts and no private business read the plain empty state', async () => {
    await setup(() => Promise.resolve(stats({ flows: [], privateBusinesses: 0 })))
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().querySelector('[data-testid="learning-empty-private"]')).toBeNull()
  })

  it('plan 647: the file-store note is a warning banner and the numbers carry tooltips', async () => {
    await setup(
      () => Promise.resolve(stats()),
      () => Promise.resolve({ fileStore: false })
    )
    const warn = el().querySelector('[data-testid="learning-no-file-store"]') as HTMLElement
    expect(warn.classList).toContain('learning__warn')
    expect(warn.getAttribute('role')).toBe('status')
    const saved = el().querySelector('[data-testid="learning-saved"]') as HTMLElement
    expect(saved.getAttribute('title')).toBe('platform_learning_saved_meaning')
    expect(saved.getAttribute('aria-label')).toBe('platform_learning_saved_meaning')
  })

  it('a failed stats load shows the error, logs, and the empty state', async () => {
    await setup(() => Promise.reject(new Error('boom')))
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('platform_learning_error')
    expect(logging.error).toHaveBeenCalled()
    expect(el().querySelector('app-empty-state')).not.toBeNull()
    expect(el().textContent).toContain('platform_learning_title')
  })
})
