import { RUN_OUTCOMES, RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { RunStep, RunStepKey } from '@models/assistant-run.model'
import { STEP_FIELDS, outcomeTone, reasonKey, stepRows, verdictOf } from './assistant-run-view.util'

const steps = (stopped?: RunStepKey): RunStep[] =>
  RUN_STEP_KEYS.map((key) => ({ key, status: key === stopped ? 'stopped' : 'ok', ms: 0 }))

describe('assistant-run-view.util (plan 752)', () => {
  it('verdictOf() gives one sentence for every outcome', () => {
    for (const outcome of RUN_OUTCOMES) {
      expect(verdictOf({ outcome, steps: steps() })).toEqual({
        key: `asr_verdict_${outcome}`,
        params: { reason: '', step: '' }
      })
    }
  })

  it('a handover names the stopped step and the reason; an unknown reason has its own key', () => {
    expect(verdictOf({ outcome: 'handover', reason: 'keyword', steps: steps('precheck') }).params).toEqual({
      reason: 'asr_reason_keyword',
      step: 'asr_step_precheck'
    })
    expect(verdictOf({ outcome: 'handover', reason: 'brand_new', steps: steps() }).params.reason).toBe(
      'asr_reason_unknown'
    )
    expect(reasonKey('open_request')).toBe('asr_reason_open_request')
  })

  it('outcomeTone() colours all six outcomes', () => {
    expect(RUN_OUTCOMES.map(outcomeTone)).toEqual(['green', 'green', 'amber', 'red', 'red', 'red'])
  })

  it('STEP_FIELDS covers the 13 steps', () => {
    expect(Object.keys(STEP_FIELDS).sort()).toEqual([...RUN_STEP_KEYS].sort())
  })

  it('stepRows() shows registered fields only', () => {
    const rows = stepRows({ key: 'history', out: { messages: 3, aiTurns: 0, messageIds: ['a'], secret: 'x' } }, 'out')
    expect(rows).toEqual([
      { labelKey: 'asr_f_messages', kind: 'number', value: '3' },
      { labelKey: 'asr_f_ai_turns', kind: 'number', value: '0' }
    ])
    expect(stepRows({ key: 'history' }, 'in')).toEqual([])
  })

  it('stepRows() counts an array, shows seconds, joins a list and names yes, no and an enum', () => {
    expect(stepRows({ key: 'facts', out: { factIds: ['a', 'b'], tablesOn: false } }, 'out')).toEqual([
      { labelKey: 'asr_f_facts', kind: 'count', value: '2' },
      { labelKey: 'asr_f_tables_on', kind: 'bool', value: 'false', valueKey: 'asr_no' }
    ])
    expect(stepRows({ key: 'inbound', out: { waitedMs: 6040, via: 'direct' } }, 'out')).toEqual([
      { labelKey: 'asr_f_waited', kind: 'ms', value: '6.0' },
      { labelKey: 'asr_f_via', kind: 'enum', value: 'direct', valueKey: 'asr_via_direct' }
    ])
    const kinds = Array.from({ length: 14 }, (_, i) => `k${i}`)
    const [list] = stepRows({ key: 'setup', out: { kinds } }, 'out')
    expect(list.value.split(', ').length).toBe(12)
  })

  it('stepRows() leaves out an absent, null or empty value', () => {
    expect(stepRows({ key: 'ai', out: { model: null, raw: '', attempts: [] } }, 'out')).toEqual([
      { labelKey: 'asr_f_attempts', kind: 'count', value: '0' }
    ])
  })
})
