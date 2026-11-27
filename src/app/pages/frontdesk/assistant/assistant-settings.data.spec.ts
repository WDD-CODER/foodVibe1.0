import { routes } from '../../../app.routes'
import { RUN_STEP_KEYS } from '@models/assistant-run.model'
import { SETTING_ROWS, settingNameKey } from './assistant-settings.data'

const IDS = [
  'hours',
  'profile_facts',
  'knowledge',
  'knowledge_public',
  'level',
  'handoff_text',
  'tone',
  'active_hours',
  'request_kinds',
  'table_rules',
  'floor_plan',
  'ai_models',
  'monthly_cap',
  'daily_turns',
  'quiet_wait',
  'max_wait',
  'history_window',
  'glue_max',
  'turn_limit',
  'follow_up_max',
  'first_model_limit',
  'turn_budget',
  'guard_words',
  'facts_budget',
  'prompt_rules',
  'answer_checks'
]
const ENGINE_FIELDS = [
  'quietMs',
  'maxWaitMs',
  'dailyTurns',
  'turnLimit',
  'followUpMax',
  'historyWindow',
  'glueMax',
  'factsMaxChars',
  'firstModelMs',
  'turnBudgetMs'
]

describe('SETTING_ROWS (plan 756)', () => {
  it('has the 26 settings, in order, and no per-business guard words', () => {
    expect(SETTING_ROWS.map((r) => r.id)).toEqual(IDS)
    expect(SETTING_ROWS.length).toBe(26)
    expect(SETTING_ROWS.map((r) => r.id)).not.toContain('guard_words_business')
    expect(settingNameKey('level')).toBe('asr_set_level')
  })

  it('links only to screens that exist', () => {
    const paths = routes.map((r) => r.path)
    for (const row of SETTING_ROWS) {
      if (!row.route) continue
      expect(row.route.startsWith('/')).withContext(row.id).toBeTrue()
      expect(paths).withContext(row.id).toContain(row.route.slice(1))
    }
  })

  it('has a screen exactly when somebody may change it', () => {
    for (const row of SETTING_ROWS)
      expect(!!row.route)
        .withContext(row.id)
        .toBe(row.who !== 'fixed')
  })

  it('names the steps each setting affects', () => {
    for (const row of SETTING_ROWS) {
      expect(row.steps.length).withContext(row.id).toBeGreaterThan(0)
      for (const step of row.steps) expect(RUN_STEP_KEYS).toContain(step)
    }
  })

  it('reads every engine value from an engine number', () => {
    const engineRows = SETTING_ROWS.filter((r) => r.value === 'engine')
    expect(engineRows.length).toBeGreaterThan(0)
    for (const row of engineRows)
      expect(ENGINE_FIELDS)
        .withContext(row.id)
        .toContain(row.engineField ?? '')
  })
})
