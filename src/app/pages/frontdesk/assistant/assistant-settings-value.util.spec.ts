import type { AssistantBusinessSetup, AssistantEngine, AssistantSetup } from '@models/assistant-run.model'
import { changeBlock, settingValue } from './assistant-settings-value.util'
import { SETTING_ROWS } from './assistant-settings.data'

const ENGINE: AssistantEngine = {
  quietMs: 2000,
  maxWaitMs: 6000,
  dailyTurns: 300,
  turnLimit: 8,
  followUpMax: 3,
  historyWindow: 12,
  glueMax: 5,
  factsMaxChars: 6000,
  firstModelMs: 2500,
  turnBudgetMs: 35000
}
const BUSINESS: AssistantBusinessSetup = {
  level: 1,
  status: 'active',
  tone: 'warm',
  handoffTextSet: false,
  activeHoursSet: false,
  hoursSet: true,
  profileFieldsFilled: 3,
  profileFieldsTotal: 4,
  kindsOn: 2,
  knowledgeApproved: 5,
  knowledgePublic: 4,
  tablesOn: true,
  confirmMode: 'auto'
}

const row = (id: string) => SETTING_ROWS.find((r) => r.id === id)!
const setup = (over: Partial<AssistantBusinessSetup> = {}, models?: string[]): AssistantSetup => ({
  engine: ENGINE,
  business: { ...BUSINESS, ...over },
  ...(models && { models })
})
const value = (id: string, over: Partial<AssistantBusinessSetup> = {}) => settingValue(row(id), setup(over), false)

describe('settingValue (plan 756)', () => {
  it('has nothing to show before the setup is read', () => {
    for (const r of SETTING_ROWS)
      expect(settingValue(r, null, true))
        .withContext(r.id)
        .toBeNull()
  })

  it('without a profile shows only the engine numbers (and the model order to the admin)', () => {
    const none: AssistantSetup = { engine: ENGINE, business: null }
    for (const r of SETTING_ROWS) {
      const shown = settingValue(r, none, false)
      if (r.value === 'engine') expect(shown).withContext(r.id).not.toBeNull()
      else expect(shown).withContext(r.id).toBeNull()
    }
  })

  it('says whether the hours are set', () => {
    expect(value('hours')).toEqual({ key: 'asr_val_set' })
    expect(value('hours', { hoursSet: false })).toEqual({ key: 'asr_val_not_set' })
  })

  it('counts the profile fields, the knowledge items and the request kinds', () => {
    expect(value('profile_facts')).toEqual({ key: 'asr_val_filled', params: { n: 3, total: 4 } })
    expect(value('knowledge')).toEqual({ key: 'asr_val_items', params: { n: 5 } })
    expect(value('knowledge_public')).toEqual({ key: 'asr_val_public', params: { n: 4 } })
    expect(value('request_kinds')).toEqual({ key: 'asr_val_kinds', params: { n: 2 } })
    expect(value('knowledge', { knowledgeApproved: 0 })).toEqual({ key: 'asr_val_items', params: { n: 0 } })
  })

  it('names the level, the handover text, the tone and the active hours', () => {
    expect(value('level', { level: 0 })).toEqual({ key: 'fd_assistant_choice_0' })
    expect(value('level', { level: 1 })).toEqual({ key: 'fd_assistant_choice_1' })
    expect(value('level', { level: 2 })).toEqual({ key: 'fd_assistant_level_2' })
    expect(value('handoff_text', { handoffTextSet: true })).toEqual({ key: 'asr_val_custom' })
    expect(value('handoff_text')).toEqual({ key: 'asr_val_default_text' })
    expect(value('tone')).toEqual({ key: 'fd_tone_warm' })
    expect(value('tone', { tone: 'formal' })).toEqual({ key: 'fd_tone_formal' })
    expect(value('active_hours', { activeHoursSet: true })).toEqual({ key: 'asr_val_hours_set' })
    expect(value('active_hours')).toEqual({ key: 'asr_val_any_hour' })
  })

  it('says how a table is confirmed, only while the table service works', () => {
    expect(value('table_rules', { tablesOn: false })).toEqual({ key: 'asr_val_tables_off' })
    expect(value('table_rules', { confirmMode: 'manual' })).toEqual({ key: 'fd_ts_mode_manual' })
    expect(value('table_rules')).toEqual({ key: 'fd_ts_mode_auto' })
    expect(value('floor_plan')).toEqual({ key: 'asr_val_tables_on' })
    expect(value('floor_plan', { tablesOn: false })).toEqual({ key: 'asr_val_tables_off' })
  })

  it('gives the model order to the admin only', () => {
    const data = setup({}, ['a', 'b'])
    expect(settingValue(row('ai_models'), data, false)).toBeNull()
    expect(settingValue(row('ai_models'), data, true)).toEqual({ text: 'a → b' })
    expect(settingValue(row('ai_models'), setup(), true)).toBeNull()
    expect(settingValue(row('monthly_cap'), data, true)).toBeNull()
  })

  it('shows an engine number, a time in seconds with one decimal', () => {
    expect(value('quiet_wait')).toEqual({ key: 'asr_engine_secs', params: { n: '2.0' } })
    expect(value('first_model_limit')).toEqual({ key: 'asr_engine_secs', params: { n: '2.5' } })
    expect(value('facts_budget')).toEqual({ key: 'asr_engine_val_factsMaxChars', params: { n: 6000 } })
    expect(value('guard_words')).toBeNull()
  })
})

describe('changeBlock (plan 756)', () => {
  const of = (id: string, isAdmin: boolean, tablesModule: boolean) => changeBlock(row(id), { isAdmin, tablesModule })

  it('blocks a FoodVibe setting for everybody but the admin', () => {
    expect(of('ai_models', false, true)).toBe('asr_set_why_foodvibe')
    expect(of('ai_models', true, true)).toBeNull()
  })

  it('blocks a table setting without the tables module, the admin too', () => {
    expect(of('floor_plan', false, false)).toBe('asr_set_why_tables_off')
    expect(of('floor_plan', true, false)).toBe('asr_set_why_tables_off')
    expect(of('floor_plan', false, true)).toBeNull()
    expect(of('level', false, false)).toBeNull()
  })
})
