'use strict';
/**
 * Plan 751 (R-24): the server fills the date the model left out, from the model's own value or the guest's current
 * message(s). Pure. A valid date of the model always wins.
 */
const { dateFromWords, clockTimeOf } = require('../generated/schemas/front-desk/date-words');

const CURRENT_WINDOW_MS = 30 * 60000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STRICT_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const at = Date.parse(value + 'T00:00:00Z');
  return !Number.isNaN(at) && new Date(at).toISOString().startsWith(value);
}

/**
 * The guest messages this turn answers (R-03): those after the last outbound one, typed (not a button tap) and at most
 * `windowMs` old (30 minutes by default; plan 755: the fact picker reads them whatever their age). `history` is oldest
 * first. A message of the same millisecond as that outbound one counts as answered: the order of the two in `history`
 * is arbitrary.
 */
function currentGuestText(history, now, { windowMs = CURRENT_WINDOW_MS } = {}) {
  const list = history ?? [];
  const lastOut = list.reduce((found, m, i) => (m && m.direction === 'out' ? i : found), -1);
  const answeredAt = lastOut < 0 ? -Infinity : list[lastOut].at;
  return list.slice(lastOut + 1)
    .filter(m => m && m.direction === 'in' && m.author === 'guest' && m.kind !== 'button' && m.text
      && m.at > answeredAt && now - m.at <= windowMs)
    .map(m => m.text)
    .join('\n');
}

/**
 * `{ date, from }` for a value that is not a valid date, else `null`. The model's own value is tried first;
 * `guestText` (`null` = the guest's words are not read) second.
 */
function resolveDate(value, now, guestText) {
  if (validDate(value)) return null;
  const own = dateFromWords(String(value ?? ''), now);
  if (own) return { date: own, from: 'model' };
  const said = guestText === null ? null : dateFromWords(guestText, now);
  return said ? { date: said, from: 'guest' } : null;
}

/** The `date` / `time` keys of `fields` to overwrite; empty when nothing changes. */
function fixesOf(fields, now, guestText) {
  const out = {};
  const found = resolveDate(fields.date, now, guestText);
  if (found) out.date = found.date;
  const time = typeof fields.time === 'string' && !STRICT_TIME_RE.test(fields.time) ? clockTimeOf(fields.time) : null;
  if (time) out.time = time;
  return { changes: out, dateFrom: found ? found.from : null, timeFixed: !!time };
}

/** Does this request kind exist, is it enabled, and does it ask for a date? */
function asksDate(profile, kind) {
  const config = kind ? profile?.requestKinds?.[kind] : null;
  return !!config && !!config.enabled && (config.questions ?? []).some(q => q.key === 'date');
}

/** `{ answer, dateFrom: 'model' | 'guest' | null, timeFixed }`. The input is never mutated. */
function fillWhen(answer, { history, now, profile }) {
  const unchanged = { answer, dateFrom: null, timeFixed: false };
  const { intent } = answer;
  if (intent === 'book' || intent === 'change') {
    // In a change the guest's words usually name the existing booking, so only a `book` reads them.
    const table = answer.collected?.table;
    const guestText = intent === 'book' ? currentGuestText(history, now) : null;
    const { changes, dateFrom, timeFixed } = fixesOf(table ?? {}, now, guestText);
    if (!dateFrom && !timeFixed) return unchanged;
    const collected = { ...answer.collected, table: { ...table, ...changes } };
    return { answer: { ...answer, collected }, dateFrom, timeFixed };
  }
  if (intent === 'request') {
    const guestText = asksDate(profile, answer.kind) ? currentGuestText(history, now) : null;
    const { changes, dateFrom, timeFixed } = fixesOf(answer.collected ?? {}, now, guestText);
    if (!dateFrom && !timeFixed) return unchanged;
    return { answer: { ...answer, collected: { ...answer.collected, ...changes } }, dateFrom, timeFixed };
  }
  return unchanged;
}

module.exports = { fillWhen, currentGuestText, CURRENT_WINDOW_MS };
