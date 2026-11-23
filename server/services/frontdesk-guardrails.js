'use strict';
/**
 * Plans 679 + 689 (C-AI): the one place where the assistant's blocks live. Pure (no database).
 * `preCheck(ctx)` runs before the model call; `applyGuardrails(answer, ctx)` after it → `{ ok: true, answer }` or
 * `{ ok: false, reason }`. `ctx` is `{ profile, factIds, factsText, history, aiTurns, now, mode, lastTurnLow,
 * replyWillBeSent }`. A blocked reply is never rewritten: the caller turns it into a handoff. The word lists are a
 * second line (`constants/frontdesk-guard-words.js`); the structured answer is checked first.
 */
const { HANDOFF, DEFERRED, COMPLETION, INTERNALS, GREETINGS, REMOVAL_WORDS } = require('../constants/frontdesk-guard-words');
const { hoursCheck } = require('../generated/schemas/front-desk/qualify');
const { jerusalemDateTime } = require('../generated/schemas/front-desk/local-time');

const TURN_LIMIT = 8;
const NIQQUD_RE = /[֑-ׇ]/g;
const PUNCT_RE = /^[\s.,!?;:"'()\-–—…״׳]+|[\s.,!?;:"'()\-–—…״׳]+$/g;
const LINK_RE = /(?:https?:\/\/|www\.)[^\s)<>"'،]+/gi;
const PRICE_RES = [
  /(?:₪|nis)\s*(\d+(?:[.,]\d+)?)/gi,
  /(\d+(?:[.,]\d+)?)\s*(?:₪|ש״ח|ש"ח|שח|שקל|nis)/gi,
];

const norm = text => String(text ?? '').toLowerCase().replace(NIQQUD_RE, '');
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

/** Before the model call: removal, keyword, active hours, turn limit. Skipped in `suggest` mode. */
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
    if (priceBlocked(reply, ctx, usedFacts)) return { ok: false, reason: 'unsupported_price' };
  }
  return { ok: true, answer: { ...out, usedFacts } };
}

module.exports = { applyGuardrails, preCheck, isRemoval, TURN_LIMIT };
