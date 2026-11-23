'use strict';
/**
 * Plan 679 (C-AI): the assistant's turn. The model proposes (one JSON answer); the server validates what it
 * collected, runs the rules, writes the request and decides what is sent. Level 0 stores a suggestion, level 1 (and the
 * reserved level 2) answers through `sendOut`. A failure is always silent (R-04): the conversation goes to a person and
 * nothing is sent. Logs carry ids, enums and booleans only — never guest text, a name or a phone.
 * The one model call is `askTurnModel` (routes/ai/frontdesk.js, INV-6); it is required lazily because that file
 * requires this one.
 */
const { logger } = require('../logger');
const { publicFacts } = require('./knowledge');
const { buildTurnBody, HISTORY_WINDOW } = require('./frontdesk-prompt');
const { applyGuardrails, preCheck, isRemoval } = require('./frontdesk-guardrails');
const { sendOut } = require('./outbound');
const { setTurnHandler } = require('./inbound');
const { createRequest, runQualify } = require('../utils/request-create');
const { fixedText, reasonText } = require('../utils/fixed-text');
const { jerusalemDate } = require('../middleware/usage');
const { WANTED_QUESTION_KEYS } = require('../generated/schemas/front-desk-templates');

const FRONTDESK_DAILY_TURNS = 300;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const PLACEHOLDER_CLIENTS = new Set(['__test__', '__walk_in__']);
const NUMBER_KEYS = new Set(['partySize', 'budgetPerGuest']);

const askTurnModel = args => require('../routes/ai/frontdesk').askTurnModel(args);
const colOf = (db, name) => db.collection(name);
const levelOf = profile => (profile.assistant && profile.assistant.level) || 0;

/** The `wanted` fields and `answers` of a collected record, for one enabled kind; `missing` = required, no value. */
function gather(kindConfig, collected) {
  const wanted = {};
  const answers = [];
  const questions = kindConfig.questions ?? [];
  const byKey = new Map(questions.map(q => [q.key, q]));
  for (const [key, raw] of Object.entries(collected ?? {})) {
    const value = String(raw ?? '').trim();
    if (!value) continue;
    const field = Object.prototype.hasOwnProperty.call(WANTED_QUESTION_KEYS, key) ? WANTED_QUESTION_KEYS[key] : null;
    if (field) {
      if (field === 'date' && !DATE_RE.test(value)) continue;
      if (field === 'time' && !TIME_RE.test(value)) continue;
      if (NUMBER_KEYS.has(field)) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || (field === 'partySize' && (!Number.isInteger(n) || n < 1))) continue;
        wanted[field] = n;
      } else {
        wanted[field] = value;
      }
    } else if (byKey.has(key)) {
      answers.push({ questionKey: key, label: byKey.get(key).label ?? '', value: value.slice(0, 500) });
    }
  }
  const answered = new Set(answers.map(a => a.questionKey));
  const missing = questions.filter(q => {
    if (!q.required) return false;
    const field = Object.prototype.hasOwnProperty.call(WANTED_QUESTION_KEYS, q.key) ? WANTED_QUESTION_KEYS[q.key] : null;
    return field ? wanted[field] === undefined : !answered.has(q.key);
  }).map(q => q.key);
  return { wanted, answers, missing };
}

/**
 * What to say and what to write. `{ text, request? }` or `{ handoff: true }`. Pure.
 * Something missing → the model's reply (it asks); an unfit request → the rule sentences (R-10), no request.
 */
function decide(answer, ctx) {
  const { profile, conversation, now } = ctx;
  const kindConfig = answer.kind ? profile.requestKinds?.[answer.kind] : null;
  if (answer.intent !== 'request' || !kindConfig || !kindConfig.enabled) return { text: answer.reply };
  if (conversation.requestId) return { handoff: true };
  const { wanted, answers, missing } = gather(kindConfig, answer.collected);
  if (missing.length) return { text: answer.reply };
  const verdict = runQualify(profile, answer.kind, wanted, answers, now);
  if (verdict.qualification.verdict === 'unfit') {
    return { text: verdict.qualification.reasons.map(reasonText).join(' ') };
  }
  return { text: fixedText('fd_ai_will_confirm'), request: { kind: answer.kind, wanted, answers } };
}

/** `keepStatus`: a blocked turn at level 0 only stores the handoff sentence as the suggestion; the status stays. */
async function handOff(db, conversation, { now, silent = false, profile, mode = 'turn', log = logger, keepStatus = false }) {
  if (!(keepStatus && levelOf(profile) === 0)) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId: conversation.businessId },
      { $set: { status: 'human', updatedAt: now } }
    );
  }
  if (silent || mode !== 'turn') return;
  const text = handoffSentence(profile);
  if (levelOf(profile) === 0) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId: conversation.businessId }, { $set: { suggestion: text } }
    );
    return;
  }
  const sent = await sendOut(db, conversation, { kind: 'text', text }, 'ai', { now });
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
}

const handoffSentence = profile => (profile.assistant && profile.assistant.handoffText) || fixedText('fd_ai_handoff_default');

/** R-02: the guest asked to be removed. One fixed sentence, the do-not-contact flag, then a person. */
async function removeGuest(db, conversation, { now, log }) {
  const businessId = conversation.businessId;
  const sent = await sendOut(db, conversation, { kind: 'text', text: fixedText('fd_ai_removed') }, 'server', { now });
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
  if (conversation.clientId && !PLACEHOLDER_CLIENTS.has(conversation.clientId)) {
    await colOf(db, 'clients').updateOne(
      { _id: conversation.clientId, businessId },
      { $set: { doNotContact: { at: now, reason: 'guest asked in chat', via: 'guest' }, updatedAt: now } }
    );
  }
  await colOf(db, 'conversations').updateOne(
    { _id: conversation._id, businessId }, { $set: { status: 'human', updatedAt: now } }
  );
  log.info({ event: 'frontdesk.turn.removal', conversationId: conversation._id });
}

/** A blocked turn: log the reason only, then a person (suggest mode: the sentence is the draft, status unchanged). */
async function blockTurn(db, conversation, base, { reason, stage }) {
  base.log.info({ event: 'frontdesk.turn.blocked', reason, stage, level: levelOf(base.profile) });
  if (base.mode === 'suggest') return finishSuggestion(db, conversation, handoffSentence(base.profile), base.now);
  await handOff(db, conversation, { ...base, keepStatus: true });
  return { ok: true, handoff: true };
}

const handOffSilently = (db, conversation, opts) => handOff(db, conversation, { ...opts, silent: true });

async function runTurn(db, conversation, { log = logger, mode = 'turn', now = Date.now() } = {}) {
  const businessId = conversation.businessId;
  if (mode === 'turn' && conversation.status !== 'bot') return { skipped: 'not_bot' };
  const profile = await colOf(db, 'frontDeskProfiles').findOne({ businessId, deletedAt: { $exists: false } });
  if (!profile) return { skipped: 'no_profile' };
  const base = { now, profile, mode, log };

  if (mode === 'turn' && !conversation.test) {
    const used = await colOf(db, 'aiUsage').countDocuments({
      businessId, day: jerusalemDate(now), feature: 'frontdesk_turn', userId: { $ne: 'sim' },
    });
    if (used >= FRONTDESK_DAILY_TURNS) {
      log.info({ event: 'frontdesk.turn.cap', conversationId: conversation._id });
      await handOffSilently(db, conversation, base);
      return { ok: false, reason: 'cap' };
    }
  }

  const recent = await colOf(db, 'messages')
    .find({ businessId, conversationId: conversation._id }).sort({ at: -1, _id: -1 }).limit(HISTORY_WINDOW).toArray();
  const history = recent.reverse();
  const aiTurns = await colOf(db, 'messages').countDocuments({ businessId, conversationId: conversation._id, author: 'ai' });

  if (mode === 'suggest' && isRemoval(history)) return { ok: true, handoff: 'removal' };
  const pre = preCheck({ profile, history, aiTurns, now, mode });
  if (!pre.ok) {
    if (pre.reason === 'removal') {
      await removeGuest(db, conversation, base);
      return { ok: true, handoff: 'removal' };
    }
    return blockTurn(db, conversation, base, { reason: pre.reason, stage: 'pre' });
  }

  const facts = await publicFacts(db, businessId);
  const body = buildTurnBody({ profile, facts, history, now });
  const asked = await askTurnModel({
    body,
    usage: {
      businessId,
      feature: mode === 'suggest' ? 'frontdesk_suggest' : 'frontdesk_turn',
      ...(conversation.test && { userId: 'sim' }),
    },
    log,
  });
  if (!asked.ok) {
    log.info({ event: 'frontdesk.turn.failed', reason: asked.reason, mode, conversationId: conversation._id });
    if (mode === 'turn') await handOffSilently(db, conversation, base);
    return { ok: false, reason: asked.reason };
  }

  const guardCtx = {
    profile, factIds: facts.factIds, factsText: facts.text, history, aiTurns, now, mode,
    lastTurnLow: conversation.lowTurns === 1,
  };
  // The reply checks only matter when the model's own reply leaves the server: find out first (decide is pure).
  let verdict = applyGuardrails(asked.answer, { ...guardCtx, replyWillBeSent: false });
  if (verdict.ok && decide(verdict.answer, { profile, conversation, now }).text === verdict.answer.reply) {
    verdict = applyGuardrails(asked.answer, { ...guardCtx, replyWillBeSent: true });
  }
  if (!verdict.ok && verdict.reason !== 'model') {
    return blockTurn(db, conversation, base, { reason: verdict.reason, stage: 'post' });
  }
  if (verdict.ok && mode === 'turn' && (verdict.answer.low || conversation.lowTurns)) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId },
      verdict.answer.low ? { $set: { lowTurns: 1 } } : { $unset: { lowTurns: '' } }
    );
  }
  if (!verdict.ok) {
    log.info({ event: 'frontdesk.turn.done', intent: asked.answer.intent, level: levelOf(profile), mode, handoff: true, requestWritten: false });
    if (mode === 'turn') await handOff(db, conversation, base);
    // A suggestion is still a draft a person can use: the model's own words are kept for the member.
    else return finishSuggestion(db, conversation, asked.answer.reply, now);
    return { ok: true, handoff: true };
  }

  const decision = decide(verdict.answer, { profile, conversation, now });
  if (decision.handoff) {
    log.info({ event: 'frontdesk.turn.done', intent: verdict.answer.intent, level: levelOf(profile), mode, handoff: true, requestWritten: false });
    if (mode === 'turn') await handOff(db, conversation, base);
    else return finishSuggestion(db, conversation, verdict.answer.reply, now);
    return { ok: true, handoff: true };
  }

  const level = levelOf(profile);
  if (level === 0 || mode === 'suggest') {
    log.info({ event: 'frontdesk.turn.done', intent: verdict.answer.intent, level, mode, handoff: false, requestWritten: false });
    return finishSuggestion(db, conversation, decision.text, now);
  }

  let requestWritten = false;
  if (decision.request) {
    const { request } = await createRequest(db, businessId, profile, {
      ...decision.request,
      clientId: conversation.clientId,
      ...(conversation.test && { test: true }),
    }, {
      channel: conversation.channel, actor: 'public:' + conversation.channel, via: 'ai', source: 'whatsapp',
    });
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId }, { $set: { requestId: request._id, updatedAt: now } }
    );
    requestWritten = true;
  }
  const sent = await sendOut(db, conversation, { kind: 'text', text: decision.text }, 'ai', { now });
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
  log.info({ event: 'frontdesk.turn.done', intent: verdict.answer.intent, level, mode, handoff: false, requestWritten });
  return { ok: true, sent: sent.ok };
}

async function finishSuggestion(db, conversation, text, now) {
  const suggestion = String(text ?? '').slice(0, 4000);
  await colOf(db, 'conversations').updateOne(
    { _id: conversation._id, businessId: conversation.businessId }, { $set: { suggestion, updatedAt: now } }
  );
  return { ok: true, suggestion };
}

setTurnHandler(runTurn);

module.exports = { runTurn, decide, FRONTDESK_DAILY_TURNS };
