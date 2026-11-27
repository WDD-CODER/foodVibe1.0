import { RUN_OUTCOMES, RUN_STEP_KEYS } from '@models/assistant-run.model'
import type { RunStep, RunStepKey } from '@models/assistant-run.model'
import { STEP_FIELDS, outcomeTone, reasonKey, stepRows, tryResultKey, verdictOf } from './assistant-run-view.util'

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

  it('outcomeTone() colours all eight outcomes', () => {
    expect(RUN_OUTCOMES.map(outcomeTone)).toEqual(['green', 'green', 'amber', 'red', 'red', 'red', 'amber', 'amber'])
  })

  it('plan 753: a dropped and a superseded run are amber', () => {
    expect(outcomeTone('dropped')).toBe('amber')
    expect(outcomeTone('superseded')).toBe('amber')
  })

  it('plan 753: a dropped run says who stepped in', () => {
    const verdict = verdictOf({ outcome: 'dropped', reason: 'taken_over', steps: steps('send') })
    expect(verdict.key).toBe('asr_verdict_dropped')
    expect(verdict.params.reason).toBe('asr_reason_taken_over')
  })

  it('plan 753: the send step shows how many messages arrived meanwhile', () => {
    expect(stepRows({ key: 'send', out: { overtaken: 2 } }, 'out')).toEqual([
      { labelKey: 'asr_f_overtaken', kind: 'number', value: '2' }
    ])
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
    expect(String(list.value).split(', ').length).toBe(12)
  })

  it('plan 755: the facts step shows how many were left out, their titles and how they were picked', () => {
    const out = {
      factIds: Array.from({ length: 19 }, (_, i) => `f${i}`),
      factsChars: 5812,
      tablesOn: false,
      pick: 'matched',
      leftOut: 23,
      leftOutIds: ['k17'],
      leftOutTitles: ['שאלה כללית 17', 'שאלה כללית 18']
    }
    const rows = stepRows({ key: 'facts', out }, 'out')
    expect(rows).toContain({ labelKey: 'asr_f_facts_left_out', kind: 'number', value: '23' })
    expect(rows).toContain({ labelKey: 'asr_f_left_out_titles', kind: 'list', value: 'שאלה כללית 17, שאלה כללית 18' })
    expect(rows).toContain({
      labelKey: 'asr_f_fact_pick',
      kind: 'enum',
      value: 'matched',
      valueKey: 'asr_factpick_matched'
    })
    expect(rows.some((row) => row.value === 'k17')).toBeFalse()
    expect(rows.length).toBe(6)
  })

  it('plan 755: a facts step without those fields gives the rows it gave before', () => {
    const rows = stepRows({ key: 'facts', out: { factIds: ['a'], factsChars: 12, tablesOn: true } }, 'out')
    expect(rows.map((row) => row.labelKey)).toEqual(['asr_f_facts', 'asr_f_facts_chars', 'asr_f_tables_on'])
  })

  it('plan 754: tryResultKey() names how a call ended', () => {
    expect(tryResultKey({ ok: true })).toBe('asr_try_ok')
    expect(tryResultKey({ ok: false, reason: 'slow' })).toBe('asr_try_slow')
    expect(tryResultKey({ ok: false, reason: 'timeout' })).toBe('asr_try_timeout')
    expect(tryResultKey({ ok: false, reason: 'network' })).toBe('asr_try_busy')
    for (const status of [429, 500, 502, 503, 504]) {
      expect(tryResultKey({ ok: false, reason: 'gemini_error', status })).toBe('asr_try_busy')
    }
    expect(tryResultKey({ ok: false, reason: 'gemini_error', status: 400 })).toBe('asr_try_other')
    for (const reason of ['model_exhausted', 'all_exhausted', 'business_cap']) {
      expect(tryResultKey({ ok: false, reason })).toBe('asr_try_quota')
    }
    expect(tryResultKey({ ok: false, reason: 'model_removed' })).toBe('asr_try_other')
  })

  it('plan 754: the AI step lists every try with its time, beside the count', () => {
    const attempts = [
      { model: 'm1', ms: 6003, ok: false, reason: 'slow' },
      { model: 'm2', ms: 1040, ok: true }
    ]
    expect(stepRows({ key: 'ai', out: { attempts } }, 'out')).toEqual([
      { labelKey: 'asr_f_attempts', kind: 'count', value: '2' },
      {
        labelKey: 'asr_f_try_list',
        kind: 'tries',
        value: [
          { model: 'm1', seconds: '6.0', resultKey: 'asr_try_slow' },
          { model: 'm2', seconds: '1.0', resultKey: 'asr_try_ok' }
        ]
      }
    ])
    const many = Array.from({ length: 10 }, () => ({ ok: true }))
    const [, tries] = stepRows({ key: 'ai', out: { attempts: many } }, 'out')
    expect(tries.value.length).toBe(8)
  })

  it('plan 754: the wait numbers and the time to answer are shown', () => {
    expect(stepRows({ key: 'inbound', out: { waitedMs: 500, quietMs: 500, capped: true } }, 'out')).toEqual([
      { labelKey: 'asr_f_waited', kind: 'ms', value: '0.5' },
      { labelKey: 'asr_f_quiet', kind: 'ms', value: '0.5' },
      { labelKey: 'asr_f_capped', kind: 'bool', value: 'true', valueKey: 'asr_yes' }
    ])
    expect(stepRows({ key: 'send', out: { answerMs: 5400 } }, 'out')).toEqual([
      { labelKey: 'asr_f_answer_ms', kind: 'ms', value: '5.4' }
    ])
  })

  it('stepRows() leaves out an absent, null or empty value', () => {
    expect(stepRows({ key: 'ai', out: { model: null, raw: '', attempts: [] } }, 'out')).toEqual([
      { labelKey: 'asr_f_attempts', kind: 'count', value: '0' }
    ])
  })
})
