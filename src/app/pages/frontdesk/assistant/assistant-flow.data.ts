import type { AssistantEngine, RunStepKey } from '@models/assistant-run.model'

/** Plan 756: the 13 steps of a run as fixed data, one entry per `RUN_STEP_KEYS` key in that order. */
export type FlowKind = 'script' | 'data' | 'ai'

export interface FlowStep {
  key: RunStepKey
  kind: FlowKind
  /** Reasons (entries of RUN_REASONS) this step can stop a run with. */
  stops: readonly string[]
  /** Engine numbers shown as "current value" lines under the step. */
  facts: readonly (keyof AssistantEngine)[]
  /** Where the step runs; shown to the platform admin only. Code, never translated. */
  code: string
}

/** `error` (an unexpected failure anywhere) belongs to no step and is left out on purpose. */
export const FLOW_STEPS: readonly FlowStep[] = [
  {
    key: 'inbound',
    kind: 'script',
    stops: [],
    facts: ['quietMs', 'maxWaitMs'],
    code: 'server/services/inbound.js · afterStored, nextStep · server/services/frontdesk-lease.js · takeLease, noteWaiting'
  },
  {
    key: 'setup',
    kind: 'data',
    stops: [],
    facts: [],
    code: 'server/services/frontdesk-turn.js · runTurnInner (frontDeskProfiles, turnProfile)'
  },
  {
    key: 'limit',
    kind: 'script',
    stops: ['quota'],
    facts: ['dailyTurns'],
    code: 'server/services/frontdesk-turn.js · runTurnInner (aiUsage) · server/services/assistant-engine-settings.js · engineSettings'
  },
  {
    key: 'history',
    kind: 'data',
    stops: [],
    facts: ['historyWindow'],
    code: 'server/services/frontdesk-turn.js · runTurnInner (messages) · server/services/assistant-engine-settings.js · engineSettings'
  },
  {
    key: 'precheck',
    kind: 'script',
    stops: ['removal', 'keyword', 'outside_hours', 'turn_limit', 'follow_up_limit'],
    facts: ['turnLimit', 'followUpMax'],
    code: 'server/services/frontdesk-guardrails.js · preCheck, isRemoval · server/constants/frontdesk-guard-words.js'
  },
  {
    key: 'facts',
    kind: 'data',
    stops: [],
    facts: ['factsMaxChars'],
    code: 'server/services/knowledge.js · publicFacts · server/services/fact-pick.js · pickFacts · server/services/frontdesk-tables.js · tablesFor'
  },
  {
    key: 'prompt',
    kind: 'script',
    stops: [],
    facts: ['glueMax'],
    code: 'server/services/frontdesk-prompt.js · buildTurnBody, unansweredTail'
  },
  {
    key: 'ai',
    kind: 'ai',
    stops: ['busy', 'timeout', 'quota', 'other'],
    facts: ['firstModelMs', 'turnBudgetMs'],
    code: 'server/routes/ai/frontdesk.js · askTurnModel · server/services/gemini-client.js · callGemini'
  },
  {
    key: 'shape',
    kind: 'script',
    stops: ['other'],
    facts: [],
    code: 'shared/schemas/front-desk/turn-answer.schema.ts · askTurnModel (one retry)'
  },
  {
    key: 'guardrails',
    kind: 'script',
    stops: [
      'model',
      'low_content',
      'internals',
      'invented_link',
      'deferred',
      'completion_claim',
      'unsupported_time',
      'table_number',
      'unsupported_price'
    ],
    facts: [],
    code: 'server/services/frontdesk-guardrails.js · applyGuardrails'
  },
  {
    key: 'tables',
    kind: 'script',
    stops: ['table_engine'],
    facts: [],
    code: 'server/services/frontdesk-tables.js · handleTableIntent · shared/schemas/front-desk/table-engine.ts'
  },
  {
    key: 'decide',
    kind: 'script',
    stops: ['open_request'],
    facts: [],
    code: 'server/services/frontdesk-turn.js · decide'
  },
  {
    key: 'send',
    kind: 'script',
    stops: ['send_refused', 'taken_over', 'closed', 'lease_lost', 'overtaken'],
    facts: [],
    code: 'server/services/frontdesk-turn.js · handOff, holdGuest, removeGuest, finishSuggestion · server/services/frontdesk-lease.js · leaseCheck · server/services/outbound.js · sendOut'
  }
]

export const flowWhatKey = (key: RunStepKey): string => 'asr_flow_what_' + key
