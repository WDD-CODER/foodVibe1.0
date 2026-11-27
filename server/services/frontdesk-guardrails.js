'use strict';
/**
 * Plans 679 + 689 (C-AI): the one place where the assistant's blocks live. Pure (no database).
 * `preCheck(ctx)` runs before the model call; `applyGuardrails(answer, ctx)` after it → `{ ok: true, answer }` or
 * `{ ok: false, reason }` (`unsupported_time` adds a `detail` of counts). `ctx` is `{ profile, factIds, factsText,
 * history, aiTurns, chain, now, mode, lastTurnLow, replyWillBeSent }`. A blocked reply is never rewritten: the caller
 * turns it into a handoff. The pre-checks end with the turn limit and the follow-up limit (plan 753). The word lists are a second line (`constants/frontdesk-guard-words.js`); the structured answer is
 * checked first.
 */
const { HANDOFF, DEFERRED, COMPLETION, INTERNALS, GREETINGS, REMOVAL_WORDS } = require('../constants/frontdesk-guard-words');
const { hoursCheck } = require('../generated/schemas/front-desk/qualify');
const { jerusalemDateTime } = require('../generated/schemas/front-desk/local-time');
const { norm } = require('../utils/text-norm');

const TURN_LIMIT = 8;
/** Plan 753 (R-26): how many follow-up runs in a row may call the model. */
const FOLLOW_UP_MAX = 3;
const PUNCT_RE = /^[\s.,!?;:"'()\-–—…״׳]+|[\s.,!?;:"'()\-–—…״׳]+$/g;
const LINK_RE = /(?:https?:\/\/|www\.)[^\s)<>"'،]+/gi;
const PRICE_RES = [
  /(?:₪|nis)\s*(\d+(?:[.,]\d+)?)/gi,
  /(\d+(?:[.,]\d+)?)\s*(?:₪|ש״ח|ש"ח|שח|שקל|nis)/gi,
];

const TIME_IN_TEXT_RE = /(?<!\d)(\d{1,2}):(\d{2})(?!\d)/g;
const TABLE_NUMBER_RE = /(?:שולחן\s*\d+|table\s*\d+)/i;

const hasAny = (text, list) => { const t = norm(text); return list.some(w => t.includes(w)); };
const trimmed = text => norm(text).replace(PUNCT_RE, '').trim();
const guestMessages = history => (history ?? []).filter(m => m && m.author === 'guest');
const lastGuestText = history => { const g = guestMessages(history); return g.length ? g[g.length - 1].text : ''; };

/** R-02: the last guest message is a removal request (a multi-word phrase inside it, or a single word as the whole message). */
function isRemoval(history) {
  const t = trimmed(lastGuestText(history));
  if (!t) return false;
  return REMOVAL_WORDS.some(w => (w.includes(' ') ? t.includes(w) : t === w));
}

/** Before the model call: removal, keyword, active hours, turn limit, follow-up limit. Skipped in `suggest` mode. */
function preCheck(ctx) {
  if (ctx.mode === 'suggest') return { ok: true };
  if (isRemoval(ctx.history)) return { ok: false, reason: 'removal' };
  if (hasAny(lastGuestText(ctx.history), HANDOFF)) return { ok: false, reason: 'keyword' };
  const rows = ctx.profile && ctx.profile.assistant && ctx.profile.assistant.activeHours;
  if (Array.isArray(rows) && rows.length) {
    const { date, time } = jerusalemDateTime(ctx.now ?? Date.now());
    if (!hoursCheck(rows, date, time).ok) return { ok: false, reason: 'outside_hours' };
  }
  if ((ctx.aiTurns ?? 0) >= TURN_LIMIT) return { ok: false, reason: 'turn_limit' };
  if ((ctx.chain ?? 0) > FOLLOW_UP_MAX) return { ok: false, reason: 'follow_up_limit' };
  return { ok: true };
}

const isEmptyCollected = c => !c || Object.keys(c).length === 0;
const isLowContent = a => a.intent === 'other' && isEmptyCollected(a.collected) && !(a.usedFacts && a.usedFacts.length);

function linksBlocked(reply, ctx) {
  const links = String(reply).match(LINK_RE) ?? [];
  const publicLink = ctx.profile && ctx.profile.publicLink;
  return links.some(raw => {
    const link = raw.replace(/[.,;:!?]+$/, '');
    return !(String(ctx.factsText ?? '').includes(link) || link === publicLink);
  });
}

function priceBlocked(reply, ctx, usedFacts) {
  const lines = String(ctx.factsText ?? '').split('\n');
  const usedText = lines.filter(l => usedFacts.some(id => l.startsWith('[' + id + ']'))).join('\n');
  for (const re of PRICE_RES) {
    for (const m of String(reply).matchAll(re)) {
      const n = m[1].replace(',', '.');
      if (!usedText.includes(m[1]) && !usedText.includes(n)) return true;
    }
  }
  return false;
}

/** Every clock time of a text, as HH:mm. */
const timesOf = text => Array.from(
  String(text ?? '').matchAll(TIME_IN_TEXT_RE), m => `${m[1].padStart(2, '0')}:${m[2]}`
);

/**
 * Plans 680 + 751 (R-25): a time in the reply passes when the same time, as HH:mm, stands in any fact line sent to the
 * model or in the open / close of the profile's hours. `{ times, unmatched }`: how many the reply holds, how many fail.
 */
function timeCheck(reply, ctx) {
  const allowed = new Set(timesOf(ctx.factsText));
  const hours = ctx.profile && ctx.profile.hours;
  for (const row of Array.isArray(hours) ? hours : []) {
    for (const t of [...timesOf(row?.open), ...timesOf(row?.close)]) allowed.add(t);
  }
  const times = timesOf(reply);
  return { times: times.length, unmatched: times.filter(t => !allowed.has(t)).length };
}

function applyGuardrails(answer, ctx) {
  if (answer.handoff === true) return { ok: false, reason: 'model' };
  let out = { ...answer };
  const known = new Set(ctx.factIds ?? []);
  const usedFacts = (answer.usedFacts ?? []).filter(id => known.has(id));

  if (isLowContent(answer)) {
    if (ctx.lastTurnLow === true) return { ok: false, reason: 'low_content' };
    out.low = true;
  }
  const guests = guestMessages(ctx.history);
  if (out.intent === 'request' && guests.length && guests.every(m => GREETINGS.includes(trimmed(m.text)))) {
    const { kind: _kind, ...rest } = out;
    out = { ...rest, intent: 'smalltalk', collected: {} };
  }

  if (ctx.replyWillBeSent !== false) {
    const reply = out.reply;
    if (hasAny(reply, INTERNALS)) return { ok: false, reason: 'internals' };
    if (linksBlocked(reply, ctx)) return { ok: false, reason: 'invented_link' };
    if (hasAny(reply, DEFERRED)) return { ok: false, reason: 'deferred' };
    if (hasAny(reply, COMPLETION)) return { ok: false, reason: 'completion_claim' };
    if (ctx.tablesOn) {
      const { times, unmatched } = timeCheck(reply, ctx);
      if (unmatched > 0) {
        const unknownFacts = (answer.usedFacts ?? []).length - usedFacts.length;
        const detail = { times, unmatched, usedFacts: usedFacts.length, unknownFacts };
        return { ok: false, reason: 'unsupported_time', detail };
      }
      if (TABLE_NUMBER_RE.test(reply)) return { ok: false, reason: 'table_number' };
    }
    if (priceBlocked(reply, ctx, usedFacts)) return { ok: false, reason: 'unsupported_price' };
  }
  return { ok: true, answer: { ...out, usedFacts } };
}

module.exports = { applyGuardrails, preCheck, isRemoval, TURN_LIMIT, FOLLOW_UP_MAX };
