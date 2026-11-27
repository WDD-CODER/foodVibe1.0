import { RUN_OUTCOMES, RUN_REASONS, RUN_STEP_KEYS } from '@schemas/entities'
import type { AssistantRun, RunOutcome, RunStep, RunStepKey } from '@schemas/entities'

/** Plan 752 (C-RUNS): one run of the assistant. Mirror of the shared schema (a server-only collection). */
export { RUN_OUTCOMES, RUN_REASONS, RUN_STEP_KEYS }
export type { RunOutcome, RunStep, RunStepKey }

/** One run as GET /assistant-runs/:id answers it; `promptRules` and `prompt` reach the platform admin only. */
export type AssistantRunView = Omit<AssistantRun, 'expiresAt'> & { expiresAt: string; promptRules?: string }

/** One row of GET /assistant-runs. `textHidden`: the acting platform admin sees the words only by opening the run. */
export type AssistantRunRow = {
  _id: string
  conversationId: string
  test?: true
  mode: 'turn' | 'suggest'
  startedAt: number
  ms: number
  outcome: RunOutcome
  reason?: string
  fallbackUsed: boolean
  model?: string
  text: string
  textHidden?: true
}

export type RunFilter = 'all' | 'answered' | 'handover' | 'fallback'

/** Plan 756: the engine's fixed numbers, read by the server from the constants the turn itself uses. */
export interface AssistantEngine {
  quietMs: number
  maxWaitMs: number
  dailyTurns: number
  turnLimit: number
  followUpMax: number
  historyWindow: number
  glueMax: number
  factsMaxChars: number
  firstModelMs: number
  turnBudgetMs: number
}

/** Plan 756: this business's own values that shape the assistant's answers. */
export interface AssistantBusinessSetup {
  level: 0 | 1 | 2
  status: string
  tone: 'warm' | 'formal'
  handoffTextSet: boolean
  activeHoursSet: boolean
  hoursSet: boolean
  profileFieldsFilled: number
  profileFieldsTotal: number
  kindsOn: number
  knowledgeApproved: number
  knowledgePublic: number
  tablesOn: boolean
  confirmMode: 'auto' | 'manual'
}

/** The answer of GET /assistant-runs/setup; `models` (the order they are tried) reaches the platform admin only. */
export interface AssistantSetup {
  engine: AssistantEngine
  business: AssistantBusinessSetup | null
  models?: string[]
}
