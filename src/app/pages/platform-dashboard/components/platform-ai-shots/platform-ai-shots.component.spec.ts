import { ComponentFixture, TestBed } from '@angular/core/testing'
import { PlatformAdminService } from '@services/platform-admin.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import type { AiShotRow, AiShotsReport } from '@models/ai-shot.model'
import { PlatformAiShotsComponent } from './platform-ai-shots.component'

const row = (id: string, extra: Partial<AiShotRow> = {}): AiShotRow => ({
  _id: id,
  nameHebrew: `dish ${id}`,
  prompt: 'a request',
  ingredientCount: 3,
  keptRatio: 0.5,
  source: 'text',
  createdAt: '2026-11-14T10:00:00.000Z',
  ...extra
})

const DICT: Record<string, string> = { platform_ai_shots_accuracy: 'דיוק ה-AI: {n}' }

describe('PlatformAiShotsComponent (plan 600)', () => {
  let fixture: ComponentFixture<PlatformAiShotsComponent>
  let getAiShots: jasmine.Spy
  let promoteAiShot: jasmine.Spy
  let removeSharedAiShot: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>

  const text = (): string => fixture.nativeElement.textContent as string
  const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('button'))

  async function setup(report: AiShotsReport): Promise<void> {
    getAiShots = jasmine.createSpy('getAiShots').and.resolveTo(report)
    promoteAiShot = jasmine.createSpy('promoteAiShot').and.resolveTo(row('new'))
    removeSharedAiShot = jasmine.createSpy('removeSharedAiShot').and.resolveTo(undefined)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    TestBed.configureTestingModule({
      imports: [PlatformAiShotsComponent],
      providers: [
        { provide: PlatformAdminService, useValue: { getAiShots, promoteAiShot, removeSharedAiShot } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        { provide: TranslationService, useValue: { translate: (key: string) => DICT[key] ?? key } }
      ]
    })
    fixture = TestBed.createComponent(PlatformAiShotsComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('renders both lists with the kept percent, "—" when unknown, and the business only on candidates', async () => {
    await setup({
      shared: [row('s1', { keptRatio: null })],
      candidates: [row('c1', { businessName: 'Biz One' })]
    })
    const shared = fixture.nativeElement.querySelector('[data-testid="ai-shots-shared"]') as HTMLElement
    const candidates = fixture.nativeElement.querySelector('[data-testid="ai-shots-candidates"]') as HTMLElement
    expect(text()).toContain('platform_ai_shots_shared')
    expect(text()).toContain('platform_ai_shots_candidates')
    expect(shared.textContent).toContain('דיוק ה-AI: —')
    expect(shared.textContent).not.toContain('Biz One')
    expect(candidates.textContent).toContain('דיוק ה-AI: 50%')
    expect(candidates.textContent).toContain('Biz One')
  })

  it('promote calls the service and reloads both lists', async () => {
    await setup({ shared: [], candidates: [row('c1', { businessName: 'Biz One' })] })
    buttons()
      .find((b) => b.textContent?.includes('platform_ai_shots_promote'))!
      .click()
    await fixture.whenStable()
    expect(promoteAiShot).toHaveBeenCalledWith('c1')
    expect(getAiShots).toHaveBeenCalledTimes(2)
  })

  it('remove calls the service; a refusal shows platform_ai_shots_error', async () => {
    await setup({ shared: [row('s1')], candidates: [] })
    removeSharedAiShot.and.rejectWith(new Error('404'))
    buttons()
      .find((b) => b.textContent?.includes('platform_ai_shots_remove'))!
      .click()
    await fixture.whenStable()
    expect(removeSharedAiShot).toHaveBeenCalledWith('s1')
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('platform_ai_shots_error')
  })

  it('explains the section, labels each row «דיוק ה-AI: n%» and styles the buttons (plan 612)', async () => {
    await setup({
      shared: [row('s1', { keptRatio: 0.88 })],
      candidates: [
        row('c1', { keptRatio: 0.5, businessName: 'Biz One' }),
        row('c2', { keptRatio: 1, businessName: 'Biz Two' })
      ]
    })
    const desc = fixture.nativeElement.querySelector('[data-testid="ai-shots-desc"]') as HTMLElement
    expect(desc.textContent?.trim()).toBe('platform_ai_shots_desc_all')
    expect(text()).toContain('platform_ai_shots_shared_hint')
    expect(text()).toContain('platform_ai_shots_candidates_hint_all')
    const rows = Array.from(fixture.nativeElement.querySelectorAll('article.c-glass-card.ai-shot')) as HTMLElement[]
    expect(rows.length).toBe(3)
    expect(rows.map((r) => r.querySelector('.ai-shot__meta')!.textContent!.trim().split(' · ')[0])).toEqual([
      'דיוק ה-AI: 88%',
      'דיוק ה-AI: 50%',
      'דיוק ה-AI: 100%'
    ])
    const remove = buttons().find((b) => b.textContent?.includes('platform_ai_shots_remove'))!
    expect(remove.classList).toContain('c-btn-ghost')
    expect(buttons().find((b) => b.textContent?.includes('platform_ai_shots_promote'))!.classList).toContain(
      'c-btn-primary'
    )
    expect(fixture.nativeElement.querySelector('.c-btn-secondary')).toBeNull()
  })
})
