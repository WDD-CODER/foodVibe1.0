import type { AssistantEngine, RunStepKey } from '@models/assistant-run.model'

/** Plan 756: everything that shapes the assistant's answers — where each is changed, and by whom. */
export type SettingWho = 'owner' | 'foodvibe' | 'fixed'

export type SettingValueKind =
  | 'hours'
  | 'profile_fields'
  | 'knowledge_approved'
  | 'knowledge_public'
  | 'level'
  | 'handoff_text'
  | 'tone'
  | 'active_hours'
  | 'request_kinds'
  | 'confirm_mode'
  | 'tables'
  | 'models'
  | 'engine'
  | 'none'

export interface SettingRow {
  id: string
  steps: readonly RunStepKey[]
  who: SettingWho
  /** The screen where it is changed; absent for a fixed row. Starts with '/'. */
  route?: string
  queryParams?: Record<string, string>
  /** The target screen exists only with this module. */
  needsModule?: 'tables'
  value: SettingValueKind
  engineField?: keyof AssistantEngine
  /** Where a fixed row lives in the code; shown to the platform admin only. */
  code?: string
}

const SETTINGS = '/frontdesk/settings'
const KNOWLEDGE = '/frontdesk/knowledge'

const ENGINE_FILE = 'server/services/assistant-engine-settings.js · ENGINE_RULES.'

/**
 * A number of the engine, the same for every business: fixed for everybody but the platform admin, who changes it in
 * its row (plan 760). `readBy` names more code that works with it.
 */
const fixedNumber = (
  id: string,
  steps: readonly RunStepKey[],
  engineField: keyof AssistantEngine,
  readBy = ''
): SettingRow => ({
  id,
  steps,
  who: 'fixed',
  value: 'engine',
  engineField,
  code: ENGINE_FILE + engineField + (readBy && ' · ' + readBy)
})

export const SETTING_ROWS: readonly SettingRow[] = [
  { id: 'hours', steps: ['facts', 'guardrails'], who: 'owner', route: SETTINGS, value: 'hours' },
  { id: 'profile_facts', steps: ['facts', 'guardrails'], who: 'owner', route: SETTINGS, value: 'profile_fields' },
  { id: 'knowledge', steps: ['facts', 'guardrails'], who: 'owner', route: KNOWLEDGE, value: 'knowledge_approved' },
  { id: 'knowledge_public', steps: ['facts'], who: 'owner', route: KNOWLEDGE, value: 'knowledge_public' },
  { id: 'level', steps: ['setup', 'send'], who: 'owner', route: SETTINGS, value: 'level' },
  { id: 'handoff_text', steps: ['send'], who: 'owner', route: SETTINGS, value: 'handoff_text' },
  { id: 'tone', steps: ['prompt'], who: 'owner', route: SETTINGS, value: 'tone' },
  { id: 'active_hours', steps: ['precheck'], who: 'owner', route: SETTINGS, value: 'active_hours' },
  { id: 'request_kinds', steps: ['prompt', 'decide'], who: 'owner', route: SETTINGS, value: 'request_kinds' },
  {
    id: 'table_rules',
    steps: ['tables'],
    who: 'owner',
    route: SETTINGS,
    needsModule: 'tables',
    value: 'confirm_mode'
  },
  {
    id: 'floor_plan',
    steps: ['facts', 'tables'],
    who: 'owner',
    route: '/frontdesk/floor-plan',
    needsModule: 'tables',
    value: 'tables'
  },
  {
    id: 'ai_models',
    steps: ['ai'],
    who: 'foodvibe',
    route: '/dashboard',
    queryParams: { tab: 'metadata' },
    value: 'models'
  },
  { id: 'monthly_cap', steps: ['ai'], who: 'foodvibe', route: '/platform', value: 'none' },
  fixedNumber('daily_turns', ['limit'], 'dailyTurns'),
  fixedNumber('quiet_wait', ['inbound'], 'quietMs'),
  fixedNumber('max_wait', ['inbound'], 'maxWaitMs'),
  fixedNumber('history_window', ['history'], 'historyWindow'),
  fixedNumber('glue_max', ['prompt'], 'glueMax'),
  fixedNumber('turn_limit', ['precheck'], 'turnLimit'),
  fixedNumber('follow_up_max', ['precheck'], 'followUpMax'),
  fixedNumber('first_model_limit', ['ai'], 'firstModelMs'),
  fixedNumber('turn_budget', ['ai'], 'turnBudgetMs'),
  {
    id: 'guard_words',
    steps: ['precheck'],
    who: 'fixed',
    value: 'none',
    code: 'server/constants/frontdesk-guard-words.js'
  },
  fixedNumber('facts_budget', ['facts'], 'factsMaxChars', 'server/services/fact-pick.js · pickFacts'),
  {
    id: 'prompt_rules',
    steps: ['prompt'],
    who: 'fixed',
    value: 'none',
    code: 'server/services/frontdesk-prompt.js · TURN_SYSTEM_PROMPT, TABLE_SYSTEM_PROMPT'
  },
  {
    id: 'answer_checks',
    steps: ['shape', 'guardrails'],
    who: 'fixed',
    value: 'none',
    code: 'shared/schemas/front-desk/turn-answer.schema.ts · server/services/frontdesk-guardrails.js · applyGuardrails'
  }
]

export const settingNameKey = (id: string): string => 'asr_set_' + id
