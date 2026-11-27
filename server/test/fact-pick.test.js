'use strict'
/** Plan 755 (R-32): which knowledge lines are sent when they do not all fit. Pure: no database, no model. */
const { factTokens, formsOf, tokenMatch, scoreItem, pickFacts, factQueryOf, FACT_PICK_MODES } = require('../services/fact-pick')
const dictionary = require('../../public/assets/data/dictionary.json')

const BUDGET = 6000
const nn = i => String(i).padStart(2, '0')
const entry = (id, topic, question, answer) => ({
  id, line: `[${id}] ${topic}: Q: ${question} | A: ${answer}`, title: question, question, answer, variations: [],
})
const ids = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `k${nn(from + i)}`)
const BIG = [
  ...Array.from({ length: 38 }, (_, i) => entry(`k${nn(i + 1)}`, 'faq', `שאלה כללית ${nn(i + 1)}`, 'א'.repeat(300))),
  entry('k39', 'other', 'יש חניה ליד המסעדה?', 'יש חניון ציבורי במרחק 100 מטר, פתוח עד 23:30. ' + 'ג'.repeat(300)),
  entry('k40', 'other', 'אפשר להביא כלב?', 'ב'.repeat(300)),
]
const pick = ask => pickFacts({ items: BIG, budget: BUDGET, ...ask })

describe('factTokens', () => {
  it.each([
    ['יֵשׁ חֲנָיָה?', ['חניה']],
    ['Is there PARKING near you?', ['parking', 'near']],
    ['יש לכם חנייה בחינם ב-20:00?', ['חניה', 'בחינם']],
    ['כמה עולה ש"ח 50? צ\'יפס', ['עולה', 'שח', 'ציפס']],
    ['שלום', []],
    ['וכמה זה עולה?', ['עולה']],
    ['חניה חניה וחניה', ['חניה', 'וחניה']],
    ['', []],
    [null, []],
    [undefined, []],
  ])('%s', (text, tokens) => {
    expect(factTokens(text)).toEqual(tokens)
  })

  it('stops after max tokens', () => {
    expect(factTokens('חניה כלב מחיר', 2)).toEqual(['חניה', 'כלב'])
  })
})

describe('formsOf', () => {
  it.each([
    ['בחניה', ['בחניה', 'חניה']],
    ['ובחניה', ['ובחניה', 'בחניה', 'חניה']],
    ['שבחניה', ['שבחניה', 'בחניה', 'חניה']],
    ['לילד', ['לילד', 'ילד']],
    ['משלוח', ['משלוח', 'שלוח']],
    ['הבלוח', ['הבלוח', 'בלוח']],
    ['בית', ['בית']],
    ['parking', ['parking']],
  ])('%s', (token, forms) => {
    expect(formsOf(token)).toEqual(forms)
  })
})

describe('tokenMatch', () => {
  it.each([['בחניה', 'החניה'], ['חניה', 'חניה'], ['כלב', 'הכלב']])('%s and %s are the same word', (a, b) => {
    expect(tokenMatch(a, b)).toBe(3)
  })

  it.each([
    ['מחיר', 'מחירים'], ['ילדים', 'לילד'], ['חניה', 'חניון'], ['כשר', 'כשרות'], ['טבעוני', 'טבעונית'], ['עולה', 'עולים'],
    ['ולחניה', 'חניון'], ['parking', 'park'], ['reservation', 'reserve'],
  ])('%s and %s share their start', (a, b) => {
    expect(tokenMatch(a, b)).toBe(2)
  })

  it.each([
    ['שבת', 'שבוע'], ['כלב', 'חניה'], ['כלב', 'כלה'], ['עולה', 'עלות'], ['price', 'private'], ['bar', 'barbecue'],
  ])('%s and %s do not match', (a, b) => {
    expect(tokenMatch(a, b)).toBe(0)
  })
})

describe('scoreItem', () => {
  const PARKING = { question: 'יש חניה ליד המסעדה?', answer: 'יש חניון ציבורי במרחק 100 מטר' }
  const HOURS = { question: 'מה שעות הפתיחה?', answer: 'החניה סגורה בלילה' }
  const VARIED = { question: 'איפה משאירים את הרכב?', answer: 'ברחוב', variations: ['יש חניה?'] }

  it('counts a word of the question or "also asked" double a word of the answer', () => {
    expect(scoreItem(PARKING, ['חניה'])).toBe(12)
    expect(scoreItem(HOURS, ['חניה'])).toBe(6)
    expect(scoreItem(VARIED, ['חניה'])).toBe(12)
    expect(scoreItem(PARKING, ['כלב'])).toBe(0)
  })

  it('counts a context word half, and not twice when it is also asked now', () => {
    expect(scoreItem(PARKING, [], ['חניה'])).toBe(6)
    expect(scoreItem(HOURS, [], ['חניה'])).toBe(3)
    expect(scoreItem(PARKING, ['חניה'], ['חניה', 'מסעדה'])).toBe(18)
  })

  it('a follow-up question is helped by the words before it', () => {
    const asked = factTokens('וכמה זה עולה?')
    expect(scoreItem(PARKING, asked, factTokens('יש חניה? יש חניון ציבורי'))).toBe(13)
    expect(scoreItem({ question: 'מחירון', answer: 'מנה עולה 50' }, asked, factTokens('יש חניה?'))).toBe(6)
  })
})

describe('pickFacts', () => {
  it('sends the item the guest asks about, whole lines in the fixed order', () => {
    const out = pick({ query: 'יש לכם חניה?' })
    expect(out.factIds).toEqual([...ids(1, 16), 'k39'])
    expect(out.leftOutIds).toHaveLength(23)
    expect(out.leftOutIds.slice(0, 4)).toEqual(['k17', 'k18', 'k19', 'k20'])
    expect(out.leftOutIds).toContain('k40')
    expect(out.leftOutTitles[0]).toBe('שאלה כללית 17')
    expect(out.text).toHaveLength(5731)
    expect(out.stats).toEqual({
      pick: 'matched', core: 0, sent: 17, leftOut: 23, chars: 5731, coreChars: 0, budget: 6000, queryTokens: 1,
      matched: 1, matchedLeftOut: 0, coreOver: false,
    })
    const lines = out.text.split('\n')
    expect(lines).toHaveLength(17)
    expect(lines).toEqual(out.factIds.map(id => BIG.find(item => item.id === id).line))
  })

  it('when nothing matches, the fixed order fills the budget', () => {
    const out = pick({ query: 'שלום' })
    expect(out.factIds).toEqual(ids(1, 17))
    expect(out.leftOutIds).toHaveLength(23)
    expect(out.leftOutIds[0]).toBe('k18')
    expect(out.leftOutIds).toContain('k39')
    expect(out.leftOutIds).toContain('k40')
    expect(out.stats).toMatchObject({ pick: 'general', chars: 5677, queryTokens: 0 })
  })

  it('a follow-up question picks by the messages before it', () => {
    const out = pick({ query: 'וכמה זה עולה?', context: 'יש לכם חניה?\nיש חניון ציבורי במרחק 100 מטר' })
    expect(out.factIds).toContain('k39')
    expect(out.stats.pick).toBe('matched')
  })

  it('another question picks another item', () => {
    const out = pick({ query: 'אפשר לבוא עם הכלב?' })
    expect(out.factIds.at(-1)).toBe('k40')
    expect(out.factIds).not.toContain('k39')
  })

  it('when everything fits, nothing is scored', () => {
    const few = BIG.slice(0, 5)
    const out = pick({ items: few, query: 'חניה' })
    expect(out.stats).toMatchObject({ pick: 'all', queryTokens: 0 })
    expect(out.leftOutIds).toEqual([])
    expect(out.text).toBe(few.map(item => item.line).join('\n'))
  })

  it('the core lines come first and count in the budget', () => {
    const core = [
      { id: 'profile.displayName', line: '[profile.displayName] name: מסעדה' },
      { id: 'profile.hours', line: '[profile.hours] opening hours: א-ש 12:00-23:00' },
    ]
    const out = pick({ core, query: 'יש לכם חניה?' })
    expect(out.factIds).toEqual(['profile.displayName', 'profile.hours', ...ids(1, 16), 'k39'])
    expect(out.stats).toMatchObject({ core: 2, coreChars: 80, chars: 5812 })
  })

  it('core lines longer than the budget are sent whole and no item is sent', () => {
    const core = [
      { id: 'profile.displayName', line: '[profile.displayName] name: '.padEnd(259, 'y') },
      { id: 'profile.hours', line: '[profile.hours] opening hours: '.padEnd(6100, 'x') },
    ]
    const out = pick({ core, query: 'יש לכם חניה?' })
    expect(out.factIds).toEqual(['profile.displayName', 'profile.hours'])
    expect(out.text).toHaveLength(6360)
    expect(out.leftOutIds).toHaveLength(40)
    expect(out.leftOutIds[0]).toBe('k39')
    expect(out.stats).toMatchObject({ sent: 0, coreOver: true, matchedLeftOut: 1 })
  })

  it('equal scores keep the order the items came in', () => {
    const [a1, b1, c1] = [['a1', 'חניה א'], ['b1', 'חניה ב'], ['c1', 'חניה ג']]
      .map(([id, question]) => entry(id, 'faq', question, 'x'.repeat(2900)))
    const first = pick({ items: [a1, b1, c1], query: 'חניה' })
    expect(first.factIds).toEqual(['a1', 'b1'])
    expect(first.leftOutIds).toEqual(['c1'])
    expect(first.stats.matchedLeftOut).toBe(1)
    const second = pick({ items: [c1, b1, a1], query: 'חניה' })
    expect(second.factIds).toEqual(['c1', 'b1'])
    expect(second.leftOutIds).toEqual(['a1'])
  })
})

describe('factQueryOf', () => {
  const NOW = Date.parse('2030-01-07T10:00:00+02:00')
  const guest = (text, at = NOW, kind = 'text') => ({ direction: 'in', author: 'guest', kind, text, at })
  const out = (text, at = NOW, kind = 'text') => ({ direction: 'out', author: 'ai', kind, text, at })

  it('the current question, and the two messages before it as context', () => {
    const history = [guest('יש לכם חניה?', NOW - 3000), out('יש חניון ציבורי', NOW - 2000), guest('וכמה זה עולה?')]
    expect(factQueryOf(history)).toEqual({ query: 'וכמה זה עולה?', context: 'יש לכם חניה?\nיש חניון ציבורי' })
  })

  it('reads every guest message since the last outbound one, whatever its age', () => {
    const two = [out('כן', NOW - 3000), guest('חניה', NOW - 2000), guest('כלב')]
    expect(factQueryOf(two).query).toBe('חניה\nכלב')
    expect(factQueryOf([guest('חניה', Date.now() - 2 * 3600000)]).query).toBe('חניה')
  })

  it('a button tap and a template are in neither', () => {
    const history = [
      guest('OK:1', NOW - 3000, 'button'), out('תבנית', NOW - 2000, 'template'),
      guest('OTHER', NOW - 1000, 'button'), guest('כלב'),
    ]
    expect(factQueryOf(history)).toEqual({ query: 'כלב', context: '' })
  })

  it('cuts a long context message', () => {
    const history = [out('א'.repeat(900), NOW - 1000), guest('כלב')]
    expect(factQueryOf(history).context).toHaveLength(500)
  })

  it('has no context without an outbound message, and nothing for an empty history', () => {
    expect(factQueryOf([guest('חניה')])).toEqual({ query: 'חניה', context: '' })
    expect(factQueryOf([])).toEqual({ query: '', context: '' })
  })
})

describe('the dictionary', () => {
  it('names every pick mode and the new step fields', () => {
    const keys = [...FACT_PICK_MODES.map(mode => `asr_factpick_${mode}`), 'asr_f_facts_left_out', 'asr_f_left_out_titles', 'asr_f_fact_pick']
    for (const key of keys) expect(dictionary.general[key], key).toBeTruthy()
  })
})
