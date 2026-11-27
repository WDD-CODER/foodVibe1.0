import type { AssistantBusinessSetup, AssistantEngine, AssistantSetup } from '@models/assistant-run.model'
import type { SettingRow, SettingValueKind } from './assistant-settings.data'

/** Plan 756: one setting's value for this business — a dictionary key with its numbers, or text that is not translated. */
export type SettingValue = { key: string; params?: Record<string, string | number> } | { text: string } | null

/** An engine number as it is shown: a time in milliseconds becomes seconds, with at most one decimal. */
export const engineAmount = (field: keyof AssistantEngine, engine: AssistantEngine): number =>
  field.endsWith('Ms') ? Math.round(engine[field] / 100) / 10 : engine[field]

type BusinessKind = Exclude<SettingValueKind, 'models' | 'engine' | 'none'>

const LEVEL_KEYS: Record<AssistantBusinessSetup['level'], string> = {
  0: 'fd_assistant_choice_0',
  1: 'fd_assistant_choice_1',
  2: 'fd_assistant_level_2'
}

const BUSINESS_VALUES: Record<BusinessKind, (b: AssistantBusinessSetup) => SettingValue> = {
  hours: (b) => ({ key: b.hoursSet ? 'asr_val_set' : 'asr_val_not_set' }),
  profile_fields: (b) => ({
    key: 'asr_val_filled',
    params: { n: b.profileFieldsFilled, total: b.profileFieldsTotal }
  }),
  knowledge_approved: (b) => ({ key: 'asr_val_items', params: { n: b.knowledgeApproved } }),
  knowledge_public: (b) => ({ key: 'asr_val_public', params: { n: b.knowledgePublic } }),
  level: (b) => ({ key: LEVEL_KEYS[b.level] }),
  handoff_text: (b) => ({ key: b.handoffTextSet ? 'asr_val_custom' : 'asr_val_default_text' }),
  tone: (b) => ({ key: `fd_tone_${b.tone}` }),
  active_hours: (b) => ({ key: b.activeHoursSet ? 'asr_val_hours_set' : 'asr_val_any_hour' }),
  request_kinds: (b) => ({ key: 'asr_val_kinds', params: { n: b.kindsOn } }),
  confirm_mode: (b) => ({ key: b.tablesOn ? `fd_ts_mode_${b.confirmMode}` : 'asr_val_tables_off' }),
  tables: (b) => ({ key: b.tablesOn ? 'asr_val_tables_on' : 'asr_val_tables_off' })
}

/** `null` when there is nothing to show: no data yet, no profile, or a value this viewer does not get. */
export function settingValue(row: SettingRow, setup: AssistantSetup | null, isAdmin: boolean): SettingValue {
  if (!setup) return null
  const kind = row.value
  if (kind === 'none') return null
  if (kind === 'models') return isAdmin && setup.models?.length ? { text: setup.models.join(' → ') } : null
  if (kind === 'engine') {
    const field = row.engineField
    return field ? { key: `asr_engine_val_${field}`, params: { n: engineAmount(field, setup.engine) } } : null
  }
  return setup.business ? BUSINESS_VALUES[kind](setup.business) : null
}

/** Why the "change" button of a setting is blocked for this viewer, or `null`. Never asked for a fixed row. */
export function changeBlock(row: SettingRow, viewer: { isAdmin: boolean; tablesModule: boolean }): string | null {
  if (row.who === 'foodvibe' && !viewer.isAdmin) return 'asr_set_why_foodvibe'
  if (row.needsModule === 'tables' && !viewer.tablesModule) return 'asr_set_why_tables_off'
  return null
}
