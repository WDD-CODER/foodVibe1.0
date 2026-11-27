import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { AssistantEngine } from '@models/assistant-run.model'
import { FlowMapComponent } from './flow-map.component'

/** Keys are looked up in lower case, as the real translation service does. */
const DICT: Record<string, string> = {
  asr_flow_intro: 'כל הודעה עוברת את {n} השלבים',
  asr_reason_removal: 'האורח ביקש שלא יפנו אליו',
  asr_reason_keyword: 'מילה שדורשת אדם',
  asr_reason_outside_hours: 'מחוץ לשעות',
  asr_reason_turn_limit: 'השיחה ארוכה מדי',
  asr_reason_unsupported_time: 'שעה שלא מופיעה במידע',
  asr_reason_send_refused: 'השליחה נדחתה',
  asr_reason_taken_over: 'איש צוות נכנס לשיחה',
  asr_reason_closed: 'השיחה נסגרה',
  asr_reason_lease_lost: 'טופל מחדש',
  asr_reason_overtaken: 'האורח כתב שוב',
  asr_engine_quietms: 'מתחיל לענות אחרי {n} שניות',
  asr_engine_maxwaitms: 'ולכל המאוחר {n} שניות',
  asr_flow_what_inbound: 'הודעת האורח נשמרת',
  asr_flow_stops_none: 'השלב הזה לא עוצר',
  asr_flow_stops: 'מה יכול לעצור כאן',
  asr_flow_reads: 'מאיפה השלב קורא'
}

const ENGINE: AssistantEngine = {
  quietMs: 3000,
  maxWaitMs: 9000,
  dailyTurns: 300,
  turnLimit: 8,
  followUpMax: 3,
  historyWindow: 12,
  glueMax: 5,
  factsMaxChars: 6000,
  firstModelMs: 6000,
  turnBudgetMs: 35000
}

describe('FlowMapComponent (plan 756)', () => {
  let fixture: ComponentFixture<FlowMapComponent>

  async function create(inputs: { engine?: AssistantEngine | null; isAdmin?: boolean } = {}) {
    await TestBed.configureTestingModule({
      imports: [FlowMapComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => DICT[k.toLowerCase()] ?? k }
        }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(FlowMapComponent)
    fixture.componentRef.setInput('engine', inputs.engine === undefined ? ENGINE : inputs.engine)
    fixture.componentRef.setInput('isAdmin', inputs.isAdmin ?? false)
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const all = (id: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`))
  const buttons = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid^="flow-step-"]'))
  const panel = (key: string) => el().querySelector<HTMLElement>(`#flow-panel-${key}`)
  const press = (id: string) => {
    byId(id)!.click()
    fixture.detectChanges()
  }

  it('shows the 13 steps in run order, all closed, each with its kind', async () => {
    await create()
    expect(buttons().map((b) => b.getAttribute('data-testid'))).toEqual(RUN_STEP_KEYS.map((key) => 'flow-step-' + key))
    for (const button of buttons()) expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(all('flow-kind').length).toBe(13)
    expect(el().querySelector('.asr-flow__intro')!.textContent).toContain('13')
  })

  it('opens one step at a time and closes it on a second press', async () => {
    await create()
    press('flow-step-precheck')
    expect(byId('flow-step-precheck')!.getAttribute('aria-expanded')).toBe('true')
    for (const reason of ['removal', 'keyword', 'outside_hours', 'turn_limit']) {
      expect(panel('precheck')!.textContent).toContain(DICT['asr_reason_' + reason])
    }
    press('flow-step-ai')
    expect(panel('precheck')).toBeNull()
    expect(byId('flow-step-precheck')!.getAttribute('aria-expanded')).toBe('false')
    expect(panel('ai')).not.toBeNull()
    press('flow-step-ai')
    expect(panel('ai')).toBeNull()
  })

  it('keeps the code and the reason codes from the owner', async () => {
    await create()
    press('flow-step-guardrails')
    expect(panel('guardrails')!.textContent).toContain(DICT['asr_reason_unsupported_time'])
    expect(byId('flow-code')).toBeNull()
    expect(byId('flow-reason-code')).toBeNull()
    expect(el().textContent).not.toContain('applyGuardrails')
    expect(el().textContent).not.toContain('unsupported_time')
  })

  it('gives the platform admin the code path and the reason codes', async () => {
    await create({ isAdmin: true })
    press('flow-step-guardrails')
    expect(byId('flow-code')!.textContent).toContain('applyGuardrails')
    expect(all('flow-reason-code').map((c) => c.textContent!.trim())).toContain('unsupported_time')
  })

  it('shows the current values from the engine, in seconds', async () => {
    await create()
    press('flow-step-inbound')
    const lines = all('flow-engine')
    expect(lines.length).toBe(2)
    expect(lines[0].textContent).toContain('3.0')
    expect(lines[1].textContent).toContain('9.0')
    expect(panel('inbound')!.textContent).toContain('השלב הזה לא עוצר')
  })

  it('plan 760: an open step says what can stop it, and has no "what this step reads" row', async () => {
    await create()
    for (const key of RUN_STEP_KEYS) {
      press('flow-step-' + key)
      const titles = Array.from(panel(key)!.querySelectorAll('dt')).map((t) => t.textContent!.trim())
      expect(titles).withContext(key).toContain(DICT['asr_flow_stops'])
      expect(titles).withContext(key).not.toContain(DICT['asr_flow_reads'])
      expect(panel(key)!.textContent).withContext(key).not.toContain('asr_flow_reads')
    }
  })

  it('shows every reason of the send step', async () => {
    await create()
    press('flow-step-send')
    for (const reason of ['send_refused', 'taken_over', 'closed', 'lease_lost', 'overtaken']) {
      expect(panel('send')!.textContent).toContain(DICT['asr_reason_' + reason])
    }
  })

  it('without the engine numbers still explains the step', async () => {
    await create({ engine: null })
    press('flow-step-inbound')
    expect(byId('flow-engine')).toBeNull()
    expect(panel('inbound')!.textContent).toContain('הודעת האורח נשמרת')
  })

  it('asks to open the runs or the settings', async () => {
    await create()
    const runs = jasmine.createSpy('openRuns')
    const settings = jasmine.createSpy('openSettings')
    fixture.componentInstance.openRuns.subscribe(runs)
    fixture.componentInstance.openSettings.subscribe(settings)
    press('flow-to-runs')
    expect(runs).toHaveBeenCalledTimes(1)
    press('flow-step-prompt')
    press('flow-to-settings')
    expect(settings).toHaveBeenCalledTimes(1)
  })
})
