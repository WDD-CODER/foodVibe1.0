import { RUN_REASONS, RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { AssistantEngine } from '@models/assistant-run.model'
import { FLOW_STEPS, flowReadsKey, flowWhatKey } from './assistant-flow.data'

/** A record so that a new engine number cannot be left out of this list without a compile error. */
const ENGINE: Record<keyof AssistantEngine, true> = {
  quietMs: true,
  maxWaitMs: true,
  dailyTurns: true,
  turnLimit: true,
  followUpMax: true,
  historyWindow: true,
  glueMax: true,
  factsMaxChars: true,
  firstModelMs: true,
  turnBudgetMs: true
}

describe('FLOW_STEPS (plan 756)', () => {
  it('has the 13 run steps, in the run order', () => {
    expect(FLOW_STEPS.map((s) => s.key)).toEqual([...RUN_STEP_KEYS])
    expect(FLOW_STEPS.length).toBe(13)
  })

  it('tags every step, and exactly one of them is the AI step', () => {
    for (const step of FLOW_STEPS) expect(['script', 'data', 'ai']).toContain(step.kind)
    expect(FLOW_STEPS.filter((s) => s.kind === 'ai').map((s) => s.key)).toEqual(['ai'])
  })

  it('stops only with known reasons, and places every reason but "error" in a step', () => {
    const placed = FLOW_STEPS.flatMap((s) => [...s.stops])
    for (const reason of placed) expect(RUN_REASONS as readonly string[]).toContain(reason)
    const missing = RUN_REASONS.filter((reason) => reason !== 'error' && !placed.includes(reason))
    expect(missing).toEqual([])
    expect(placed).not.toContain('error')
  })

  it('names the code of every step and shows only engine numbers that exist', () => {
    for (const step of FLOW_STEPS) {
      expect(step.code.length).withContext(step.key).toBeGreaterThan(0)
      for (const fact of step.facts) expect(Object.keys(ENGINE)).toContain(fact)
    }
  })

  it('builds the dictionary keys of a step', () => {
    expect(flowWhatKey('ai')).toBe('asr_flow_what_ai')
    expect(flowReadsKey('send')).toBe('asr_flow_reads_send')
  })
})
