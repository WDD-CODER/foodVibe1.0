import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { AssistantRunView, RunStep } from '@models/assistant-run.model'
import { RunDetailComponent } from './run-detail.component'

const DICT: Record<string, string> = {
  asr_verdict_handover: 'העוזר העביר את השיחה לצוות. נעצר בשלב "{step}": {reason}.',
  asr_verdict_answered: 'העוזר ענה לאורח.',
  asr_step_guardrails: 'בדיקות בטיחות',
  asr_reason_invented_link: 'קישור לא מוכר',
  asr_admin_viewed: 'צוות FoodVibe צפה ברשומה הזו ב-{date}',
  asr_expires: 'נמחק אוטומטית ב-{date}',
  asr_prompt_not_kept: 'הבקשה המלאה נשמרת רק כשהעוזר נעצר או נכשל',
  asr_step_nothing: 'אין פרטים לשלב הזה'
}

const steps = (): RunStep[] =>
  RUN_STEP_KEYS.map((key) => {
    if (key === 'ai') return { key, status: 'ok', ms: 900, in: { feature: 'x' }, out: { raw: 'RAW-ANSWER' } }
    if (key === 'guardrails') return { key, status: 'stopped', ms: 1, out: { reason: 'invented_link' } }
    if (key === 'tables') return { key, status: 'skipped', ms: 0 }
    return { key, status: 'ok', ms: 1 }
  })

const run = (over: Partial<AssistantRunView> = {}): AssistantRunView => ({
  _id: 'r1',
  businessId: 'b1',
  conversationId: 'c1',
  mode: 'turn',
  level: 1,
  startedAt: Date.UTC(2026, 10, 20, 12, 0),
  endedAt: Date.UTC(2026, 10, 20, 12, 0, 2),
  ms: 2000,
  expiresAt: '2026-12-20T12:00:00.000Z',
  trigger: { messageIds: ['g1'], text: 'hi' },
  outcome: 'handover',
  reason: 'invented_link',
  fallbackUsed: false,
  steps: steps(),
  ...over
})

describe('RunDetailComponent (plan 752)', () => {
  let fixture: ComponentFixture<RunDetailComponent>

  async function create(value: AssistantRunView = run(), isAdmin = false) {
    await TestBed.configureTestingModule({
      imports: [RunDetailComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: TranslationService, useValue: { translate: (k: string) => DICT[k] ?? k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(RunDetailComponent)
    fixture.componentRef.setInput('run', value)
    fixture.componentRef.setInput('isAdmin', isAdmin)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const buttons = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button.asr-step'))
  const expanded = () => buttons().filter((b) => b.getAttribute('aria-expanded') === 'true')
  const click = (id: string) => {
    byId(id)!.click()
    fixture.detectChanges()
  }

  it('draws the 13 steps in order, each pointing at its panel', async () => {
    await create()
    expect(buttons().map((b) => b.getAttribute('data-testid'))).toEqual(RUN_STEP_KEYS.map((k) => `asr-step-${k}`))
    for (const button of buttons()) {
      expect(el().querySelector(`#${button.getAttribute('aria-controls')}`)).not.toBeNull()
    }
  })

  it('starts with the first stopped step open; a click toggles a step', async () => {
    await create()
    expect(expanded().map((b) => b.getAttribute('data-testid'))).toEqual(['asr-step-guardrails'])
    click('asr-step-guardrails')
    expect(expanded().length).toBe(0)
    click('asr-step-setup')
    expect(byId('asr-step-setup')!.getAttribute('aria-expanded')).toBe('true')
    expect(el().querySelector('#asr-step-setup')!.textContent).toContain('אין פרטים לשלב הזה')
  })

  it('opens none of the steps of a run with no stop', async () => {
    await create(run({ outcome: 'answered', reason: undefined, steps: steps().map((s) => ({ ...s, status: 'ok' })) }))
    expect(expanded().length).toBe(0)
    expect(byId('asr-verdict')!.textContent!.trim()).toBe('העוזר ענה לאורח.')
  })

  it('says in one sentence where it stopped and why', async () => {
    await create()
    expect(byId('asr-verdict')!.textContent!.trim()).toBe(
      'העוזר העביר את השיחה לצוות. נעצר בשלב "בדיקות בטיחות": קישור לא מוכר.'
    )
  })

  it('shows the raw answer only inside the open AI step', async () => {
    await create()
    expect(el().querySelector('pre.asr-raw')).toBeNull()
    click('asr-step-ai')
    const raw = el().querySelector('#asr-step-ai pre.asr-raw')
    expect(raw?.textContent).toBe('RAW-ANSWER')
    expect(raw?.getAttribute('dir')).toBe('ltr')
    expect(el().querySelectorAll('pre.asr-raw').length).toBe(1)
  })

  it('plan 754: the open AI step shows one line per try; a run with no tries shows none', async () => {
    const attempts = [
      { model: 'm1', ms: 6003, ok: false, reason: 'slow' },
      { model: 'm2', ms: 1040, ok: true }
    ]
    await create(run({ steps: steps().map((s) => (s.key === 'ai' ? { ...s, out: { attempts } } : s)) }))
    click('asr-step-ai')
    const lines = Array.from(el().querySelectorAll('[data-testid="asr-try"]'))
    expect(lines.length).toBe(2)
    expect(lines[0].textContent).toContain('m1')
    expect(lines[0].textContent).toContain('asr_try_slow')
    expect(lines[0].querySelector('span[dir="ltr"]')!.textContent).toBe('m1')

    fixture.componentRef.setInput('run', run())
    fixture.detectChanges()
    click('asr-step-ai')
    expect(el().querySelector('#asr-step-ai pre.asr-raw')).not.toBeNull()
    expect(byId('asr-try')).toBeNull()
  })

  it('plan 753: links to the run it continues only when there is one', async () => {
    await create()
    expect(byId('asr-follows')).toBeNull()
    fixture.componentRef.setInput('run', run({ followsRunId: 'r0' }))
    fixture.detectChanges()
    expect(byId('asr-follows')!.getAttribute('href')).toBe('/frontdesk/assistant/runs/r0')
  })

  it('shows no prompt button to an owner', async () => {
    await create(run({ prompt: { lead: 'LEAD', tone: 'warm', tablesOn: false } }))
    expect(byId('asr-prompt-toggle')).toBeNull()
    expect(byId('asr-prompt-not-kept')).toBeNull()
  })

  it('opens and closes the full prompt for the admin', async () => {
    await create(run({ prompt: { lead: 'LEAD', tone: 'warm', tablesOn: false }, promptRules: 'RULES' }), true)
    expect(byId('asr-prompt-rules')).toBeNull()
    click('asr-prompt-toggle')
    expect(byId('asr-prompt-rules')!.textContent).toBe('RULES')
    expect(byId('asr-prompt-data')!.textContent).toBe('LEAD')
    click('asr-prompt-toggle')
    expect(byId('asr-prompt-rules')).toBeNull()
  })

  it('tells the admin the prompt was not kept', async () => {
    await create(run(), true)
    expect(byId('asr-prompt-toggle')).toBeNull()
    expect(byId('asr-prompt-not-kept')!.textContent).toContain('הבקשה המלאה נשמרת רק')
  })

  it('shows the admin view line only when the run was viewed, with the newest date', async () => {
    await create()
    expect(byId('asr-admin-viewed')).toBeNull()
    fixture.componentRef.setInput(
      'run',
      run({
        adminViews: [
          { at: Date.UTC(2026, 10, 21, 9, 0), userId: 'boss' },
          { at: Date.UTC(2026, 10, 23, 9, 0), userId: 'boss' }
        ]
      })
    )
    fixture.detectChanges()
    expect(byId('asr-admin-viewed')!.textContent).toContain('23.11.2026')
  })
})
