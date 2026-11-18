'use strict'
/**
 * Plan 622 (C-LOGX): the pure rules that turn a model's numbered answers into a safe checklist draft.
 * No database, no logger. The model only ever names a question by its position in the list the server built.
 */
const {
  logisticsModelAnswerSchema, LOGISTICS_DRAFT_STATUSES, LOGISTICS_EXTRACT_ADHOC_MAX,
} = require('../generated/schemas/logistics/extract.schema')
const { LOGISTICS_TEXT_MAX, LOGISTICS_LABEL_MAX } = require('../generated/schemas/entities/event-logistics')

const QUANTITY_MAX = 100000

/** The numbered question block (numbering from 0). */
function buildQuestionList(questions) {
  if (!questions.length) return '(none)'
  return questions
    .map((q, n) => `${n}. ${JSON.stringify(q.key)} [${q.answerType}]${q.hint ? ' — ' + JSON.stringify(q.hint) : ''}`)
    .join('\n')
}

const cleanText = value => (typeof value === 'string' ? value.trim().slice(0, LOGISTICS_TEXT_MAX) : '')
const validQuantity = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= QUANTITY_MAX
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

/** The status a stored answer stands for: `needed` paid by the client is `client_provides`. */
const effectiveStatus = a => (a.status === 'needed' && a.payer === 'client' ? 'client_provides' : a.status)

/**
 * `model` is the parsed JSON the model returned. Returns null when it does not fit the schema, else
 * `{ answers, conflicts, adhoc, unanswered }`.
 */
function cleanLogisticsDraft({ questions, model, storedAnswers = [], sections = [] }) {
  const parsed = logisticsModelAnswerSchema.safeParse(model)
  if (!parsed.success) return null
  const answers = []
  const conflicts = []
  const seen = new Set()
  for (const m of parsed.data.answers) {
    if (m.i >= questions.length || seen.has(m.i)) continue
    seen.add(m.i)
    if (!LOGISTICS_DRAFT_STATUSES.includes(m.status)) continue
    const q = questions[m.i]
    const quantity = q.answerType === 'quantity' && validQuantity(m.quantity) ? m.quantity : undefined
    const text = cleanText(m.text) || undefined
    if (q.answerType === 'text' && !text) continue
    const stored = storedAnswers.find(a => a.itemKey === q.key)
    if (stored && stored.status !== 'unchecked') {
      const same = effectiveStatus(stored) === m.status
        && (stored.quantity ?? undefined) === quantity
        && cleanText(stored.text) === (text ?? '')
      if (same) continue
      conflicts.push({
        itemKey: q.key,
        current: clean({ status: stored.status, quantity: stored.quantity, text: stored.text, payer: stored.payer }),
        suggested: clean({ status: m.status, quantity, text }),
      })
      continue
    }
    answers.push(clean({ itemKey: q.key, phase: q.phase, section: q.section, status: m.status, quantity, text }))
  }

  const adhoc = []
  const labels = new Set()
  const keys = new Set(questions.map(q => q.key))
  for (const x of parsed.data.extra ?? []) {
    if (adhoc.length >= LOGISTICS_EXTRACT_ADHOC_MAX) break
    const label = typeof x.label === 'string' ? x.label.trim().slice(0, LOGISTICS_LABEL_MAX) : ''
    if (!label) continue
    const lower = label.toLowerCase()
    if (labels.has(lower) || keys.has(label)) continue
    if (!LOGISTICS_DRAFT_STATUSES.includes(x.status)) continue
    labels.add(lower)
    adhoc.push(clean({
      label,
      section: x.section && sections.includes(x.section) ? x.section : 'other',
      status: x.status,
      text: cleanText(x.text) || undefined,
    }))
  }

  const drafted = new Set(answers.map(a => a.itemKey))
  const unanswered = questions
    .filter(q => {
      const stored = storedAnswers.find(a => a.itemKey === q.key)
      return !(stored && stored.status !== 'unchecked') && !drafted.has(q.key)
    })
    .map(q => q.key)
  return { answers, conflicts, adhoc, unanswered }
}

/** Lines saved unchanged / lines suggested (answers + ad-hoc); 1 when nothing was suggested. Conflicts are not counted. */
function keptRatio(aiDraft, saved) {
  const suggested = [...(aiDraft?.answers ?? []), ...(aiDraft?.adhoc ?? [])]
  if (!suggested.length) return 1
  const savedLines = Array.isArray(saved) ? saved : []
  const kept = suggested.filter(s => savedLines.some(l => {
    const sameLine = s.itemKey !== undefined ? l.itemKey === s.itemKey : l.label === s.label
    return sameLine && l.status === s.status && (l.quantity ?? undefined) === (s.quantity ?? undefined)
      && (l.text ?? '').trim() === (s.text ?? '').trim()
  })).length
  return kept / suggested.length
}

module.exports = { buildQuestionList, cleanLogisticsDraft, keptRatio }
