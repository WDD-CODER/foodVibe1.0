import { RUN_REASONS } from '@models/assistant-run.model'
import type { AssistantRunView, RunOutcome, RunStep, RunStepKey } from '@models/assistant-run.model'

/** Plan 752: pure functions that turn a run of the assistant into labelled lines. */

export type OutcomeTone = 'green' | 'amber' | 'red'
export type FieldKind = 'text' | 'number' | 'ms' | 'count' | 'bool' | 'enum' | 'list' | 'raw' | 'tries'
export type FieldDef = { name: string; labelKey: string; kind: FieldKind; enumPrefix?: string }
/** One call to an AI model as the page shows it. */
export type TryLine = { model: string; seconds: string; resultKey: string }
/** One labelled value of a step; `valueKey` is a dictionary key shown instead of `value`. */
export type StepRow =
  | { labelKey: string; kind: Exclude<FieldKind, 'tries'>; value: string; valueKey?: string }
  | { labelKey: string; kind: 'tries'; value: TryLine[] }
type Attempt = { model?: unknown; ms?: unknown; ok?: unknown; reason?: unknown; status?: unknown }

const LIST_MAX = 12
const TRIES_MAX = 8
const BUSY_STATUSES = new Set<unknown>([429, 500, 502, 503, 504])
const TRY_KEYS: Record<string, string> = {
  slow: 'asr_try_slow',
  timeout: 'asr_try_timeout',
  network: 'asr_try_busy',
  model_exhausted: 'asr_try_quota',
  all_exhausted: 'asr_try_quota',
  business_cap: 'asr_try_quota'
}

/** Plan 754: the dictionary key of how one call to a model ended. */
export function tryResultKey(attempt: Attempt): string {
  if (attempt.ok) return 'asr_try_ok'
  if (attempt.reason === 'gemini_error') return BUSY_STATUSES.has(attempt.status) ? 'asr_try_busy' : 'asr_try_other'
  return TRY_KEYS[String(attempt.reason)] ?? 'asr_try_other'
}

const TONES: Record<RunOutcome, OutcomeTone> = {
  answered: 'green',
  asked: 'green',
  draft: 'amber',
  handover: 'red',
  failed: 'red',
  removed: 'red',
  dropped: 'amber',
  superseded: 'amber'
}

export const outcomeTone = (outcome: RunOutcome): OutcomeTone => TONES[outcome]

export const reasonKey = (reason: string): string =>
  (RUN_REASONS as readonly string[]).includes(reason) ? `asr_reason_${reason}` : 'asr_reason_unknown'

/** The one sentence on top of a run: its dictionary key and the keys that fill `{reason}` and `{step}`. */
export function verdictOf(run: Pick<AssistantRunView, 'outcome' | 'reason' | 'steps'>): {
  key: string
  params: { reason: string; step: string }
} {
  const stopped = run.steps.find((s) => s.status === 'stopped')
  return {
    key: `asr_verdict_${run.outcome}`,
    params: {
      reason: run.reason ? reasonKey(run.reason) : '',
      step: stopped ? `asr_step_${stopped.key}` : ''
    }
  }
}

const field = (name: string, kind: FieldKind, labelKey: string, enumPrefix?: string): FieldDef => ({
  name,
  kind,
  labelKey,
  ...(enumPrefix && { enumPrefix })
})

const WHY = field('why', 'enum', 'asr_f_why', 'asr_why_')
const REASON = field('reason', 'enum', 'asr_f_reason', 'asr_reason_')

/** What the page shows of each step. A field of a record that is not listed here is not shown. */
export const STEP_FIELDS: Record<RunStepKey, { in: FieldDef[]; out: FieldDef[] }> = {
  inbound: {
    in: [],
    out: [
      field('waitedMs', 'ms', 'asr_f_waited'),
      field('quietMs', 'ms', 'asr_f_quiet'),
      field('capped', 'bool', 'asr_f_capped'),
      field('answers', 'number', 'asr_f_answers'),
      field('via', 'enum', 'asr_f_via', 'asr_via_')
    ]
  },
  setup: {
    in: [],
    out: [
      field('level', 'number', 'asr_f_level'),
      field('simulated', 'bool', 'asr_f_simulated'),
      field('tone', 'enum', 'asr_f_tone', 'asr_tone_'),
      field('kinds', 'list', 'asr_f_kinds')
    ]
  },
  limit: {
    in: [field('limit', 'number', 'asr_f_limit')],
    out: [field('used', 'number', 'asr_f_used'), WHY]
  },
  history: {
    in: [],
    out: [field('messages', 'number', 'asr_f_messages'), field('aiTurns', 'number', 'asr_f_ai_turns')]
  },
  precheck: { in: [], out: [WHY, REASON] },
  facts: {
    in: [],
    out: [
      field('factIds', 'count', 'asr_f_facts'),
      field('leftOut', 'number', 'asr_f_facts_left_out'),
      field('leftOutTitles', 'list', 'asr_f_left_out_titles'),
      field('pick', 'enum', 'asr_f_fact_pick', 'asr_factpick_'),
      field('factsChars', 'number', 'asr_f_facts_chars'),
      field('tablesOn', 'bool', 'asr_f_tables_on')
    ]
  },
  prompt: {
    in: [],
    out: [
      field('today', 'text', 'asr_f_today'),
      field('leadChars', 'number', 'asr_f_lead_chars'),
      field('historyMessages', 'number', 'asr_f_history_sent')
    ]
  },
  ai: {
    in: [],
    out: [
      field('model', 'text', 'asr_f_model'),
      field('attempts', 'count', 'asr_f_attempts'),
      field('attempts', 'tries', 'asr_f_try_list'),
      field('raw', 'raw', 'asr_f_raw')
    ]
  },
  shape: {
    in: [],
    out: [field('tries', 'number', 'asr_f_tries'), field('issue', 'enum', 'asr_f_issue', 'asr_issue_')]
  },
  guardrails: {
    in: [],
    out: [
      REASON,
      field('usedFacts', 'count', 'asr_f_used_facts'),
      field('low', 'bool', 'asr_f_low'),
      field('intentAfter', 'enum', 'asr_f_intent', 'asr_intent_')
    ]
  },
  tables: {
    in: [
      field('intent', 'enum', 'asr_f_intent', 'asr_intent_'),
      field('date', 'text', 'asr_f_date'),
      field('time', 'text', 'asr_f_time'),
      field('partySize', 'number', 'asr_f_party')
    ],
    out: [field('result', 'enum', 'asr_f_table_result', 'asr_table_'), WHY]
  },
  decide: {
    in: [],
    out: [
      field('why', 'enum', 'asr_f_decide', 'asr_decide_'),
      field('missing', 'count', 'asr_f_missing'),
      field('requestWritten', 'bool', 'asr_f_request_written')
    ]
  },
  send: {
    in: [],
    out: [
      field('action', 'enum', 'asr_f_action', 'asr_send_'),
      field('refused', 'text', 'asr_f_refused'),
      field('answerMs', 'ms', 'asr_f_answer_ms'),
      field('chars', 'number', 'asr_f_chars'),
      field('overtaken', 'number', 'asr_f_overtaken')
    ]
  }
}

/** One row with a line per call, or none when there was no call. */
function tryRows(labelKey: string, value: unknown): StepRow[] {
  if (!Array.isArray(value) || value.length === 0) return []
  const lines = (value as Attempt[]).slice(0, TRIES_MAX).map((a) => ({
    model: String(a.model ?? '—'),
    seconds: (Number(a.ms ?? 0) / 1000).toFixed(1),
    resultKey: tryResultKey(a)
  }))
  return [{ labelKey, kind: 'tries', value: lines }]
}

/** The text of one field's value, or `null` when there is nothing to show. */
function shown(def: FieldDef, value: unknown): { value: string; valueKey?: string } | null {
  if (value === undefined || value === null || value === '') return null
  if (def.kind === 'count') return Array.isArray(value) ? { value: String(value.length) } : null
  if (def.kind === 'list') {
    if (!Array.isArray(value) || value.length === 0) return null
    return { value: value.slice(0, LIST_MAX).map(String).join(', ') }
  }
  if (def.kind === 'ms') return { value: (Number(value) / 1000).toFixed(1) }
  if (def.kind === 'bool') return { value: String(value), valueKey: value === true ? 'asr_yes' : 'asr_no' }
  if (def.kind === 'enum') return { value: String(value), valueKey: `${def.enumPrefix ?? ''}${String(value)}` }
  return { value: String(value) }
}

/** The registered fields of one side of a step that the record holds. */
export function stepRows(step: Pick<RunStep, 'key' | 'in' | 'out'>, side: 'in' | 'out'): StepRow[] {
  const data = step[side] ?? {}
  return STEP_FIELDS[step.key][side].flatMap((def): StepRow[] => {
    const kind = def.kind
    if (kind === 'tries') return tryRows(def.labelKey, data[def.name])
    const value = shown(def, data[def.name])
    return value ? [{ labelKey: def.labelKey, kind, ...value }] : []
  })
}
