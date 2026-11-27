'use strict'
/**
 * Plan 755 (R-32): which knowledge lines are sent to the model when they do not all fit. A script, no model call. The
 * profile's lines are never cut; an item is sent whole or not at all; what was left out is returned, never dropped
 * silently. Nothing here is logged: the texts are a guest's and an owner's words.
 */
const { norm } = require('../utils/text-norm')
const { currentGuestText } = require('./frontdesk-when')

const FACT_PICK_MODES = ['all', 'matched', 'general']
const QUERY_TOKENS_MAX = 12
const TITLE_MAX = 60
const TEXT_MAX = 4000
const CONTEXT_TEXT_MAX = 500

const FACT_STOP_WORDS = new Set([
  ...('של את עם על אל זה זו זאת הוא היא הם אני אנחנו אתם אתה יש אין לי לך לנו לכם אצלכם מה מי איך איפה כמה מתי למה האם ' +
    'אם או גם רק כל כן לא אבל כי אז עוד שלום היי הי תודה בבקשה אפשר רוצה רוצים צריך').split(' '),
  ...('the an is are do does you your we to of in on at for and or it what when where how can have there hi hello ' +
    'thanks please').split(' '),
])

const QUOTES_RE = /["'׳״’`]/g
const SPLIT_RE = /[^\p{L}\p{N}]+/u
const DIGITS_RE = /^\p{N}+$/u
const HEBREW_START_RE = /^[א-ת]/
const PREFIXES = new Set(['ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ'])

/** The words of a text that can tell one item from another, in the order of first appearance, at most `max`. */
function factTokens(text, max = Infinity) {
  const kept = new Set()
  const pieces = norm(String(text ?? '').slice(0, TEXT_MAX)).replace(QUOTES_RE, '').split(SPLIT_RE)
  for (const piece of pieces) {
    if (kept.size >= max) break
    const word = piece.replace(/י+/g, 'י').replace(/ו+/g, 'ו')
    if (word.length < 2 || DIGITS_RE.test(word) || FACT_STOP_WORDS.has(word)) continue
    if (word.startsWith('ו') && FACT_STOP_WORDS.has(word.slice(1))) continue
    kept.add(word)
  }
  return [...kept]
}

/** A word and the same word without one or two Hebrew prefix letters, when at least three letters remain. */
function formsOf(token) {
  const forms = [token]
  if (PREFIXES.has(token[0]) && token.length >= 4) forms.push(token.slice(1))
  if ((token[0] === 'ו' || token[0] === 'ש') && PREFIXES.has(token[1]) && token.length >= 5) forms.push(token.slice(2))
  return forms
}

function sharedStart(a, b) {
  const length = HEBREW_START_RE.test(a) && HEBREW_START_RE.test(b) ? 3 : 4
  return a.length >= length && b.length >= length && a.slice(0, length) === b.slice(0, length)
}

/** 3 for the same word in some form, 2 for forms that share their first letters, else 0. */
function tokenMatch(a, b) {
  const left = formsOf(a)
  const right = formsOf(b)
  if (left.some(x => right.includes(x))) return 3
  return left.some(x => right.some(y => sharedStart(x, y))) ? 2 : 0
}

const bestMatch = (token, others) => others.reduce((best, other) => Math.max(best, tokenMatch(token, other)), 0)

/** How well an item fits: a word of its question or "also asked" lines counts double, a context word half. */
function scoreItem(item, query, context = []) {
  const title = factTokens([item.question, ...(item.variations ?? [])].join(' '))
  const body = factTokens(item.answer)
  const points = token => Math.max(2 * bestMatch(token, title), bestMatch(token, body))
  const sum = tokens => tokens.reduce((total, token) => total + points(token), 0)
  return 2 * sum(query) + sum(context.filter(token => !query.includes(token)))
}

/** The length of these lines joined by line breaks. */
const joinedLength = lines => lines.reduce((total, entry, i) => total + (i ? 1 : 0) + entry.line.length, 0)

/** The items that fit in what the core lines left of `budget`, taken in ranked order; one that does not fit is skipped. */
function takeFitting(ranked, core, budget) {
  const taken = new Set()
  let used = joinedLength(core)
  for (const { item } of ranked) {
    const next = used + (core.length || taken.size ? 1 : 0) + item.line.length
    if (next > budget) continue
    taken.add(item)
    used = next
  }
  return taken
}

/**
 * The facts block. `core` is `{ id, line }[]` and always sent; `items` is `{ id, line, title, question, answer,
 * variations }[]` in their fixed order. `text` / `factIds` keep the fixed order, `leftOutIds` / `leftOutTitles` are in
 * the ranked order (the most relevant first).
 */
function pickFacts({ core = [], items = [], query = '', context = '', budget }) {
  const coreChars = joinedLength(core)
  const fits = joinedLength([...core, ...items]) <= budget
  const queryTokens = fits ? [] : factTokens(query, QUERY_TOKENS_MAX)
  const contextTokens = fits ? [] : factTokens(context, QUERY_TOKENS_MAX)
  const scored = items.map(item => ({ item, score: fits ? 0 : scoreItem(item, queryTokens, contextTokens) }))
  // The sort is stable: equal scores keep the fixed order.
  const ranked = [...scored].sort((a, b) => b.score - a.score)
  const taken = fits ? new Set(items) : takeFitting(ranked, core, budget)

  const sent = [...core, ...items.filter(item => taken.has(item))]
  const leftOut = ranked.filter(entry => !taken.has(entry.item))
  const text = sent.map(entry => entry.line).join('\n')
  let pick = 'all'
  if (!fits) pick = scored.some(entry => entry.score > 0) ? 'matched' : 'general'
  return {
    text,
    factIds: sent.map(entry => entry.id),
    leftOutIds: leftOut.map(entry => entry.item.id),
    leftOutTitles: leftOut.map(entry => entry.item.title),
    stats: {
      pick,
      core: core.length,
      sent: taken.size,
      leftOut: leftOut.length,
      chars: text.length,
      coreChars,
      budget,
      queryTokens: queryTokens.length,
      matched: ranked.filter(entry => entry.score > 0 && taken.has(entry.item)).length,
      matchedLeftOut: leftOut.filter(entry => entry.score > 0).length,
      coreOver: coreChars > budget,
    },
  }
}

const isReadable = m => !!m && !!m.text && m.kind !== 'button' && m.kind !== 'template'

/**
 * What to pick for. `history` is oldest first. `query`: the guest's text messages since the last outbound message,
 * whatever their age. `context`: that outbound message and the one right before it, older first.
 */
function factQueryOf(history) {
  const list = history ?? []
  const lastOut = list.reduce((found, m, i) => (m && m.direction === 'out' ? i : found), -1)
  const before = lastOut < 0 ? [] : list.slice(Math.max(0, lastOut - 1), lastOut + 1)
  return {
    query: currentGuestText(list, 0, { windowMs: Infinity }),
    context: before.filter(isReadable).map(m => m.text.slice(0, CONTEXT_TEXT_MAX)).join('\n'),
  }
}

module.exports = {
  factTokens,
  formsOf,
  tokenMatch,
  scoreItem,
  pickFacts,
  factQueryOf,
  FACT_STOP_WORDS,
  FACT_PICK_MODES,
  QUERY_TOKENS_MAX,
  TITLE_MAX,
}
