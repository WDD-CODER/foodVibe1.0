'use strict';
/**
 * Plan 679 (C-AI): the assistant's turn. The model proposes (one JSON answer); the server validates what it
 * collected, runs the rules, writes the request and decides what is sent. Level 0 stores a suggestion, level 1 (and the
 * reserved level 2) answers through `sendOut`. A test conversation (the simulator) is answered as level 1 whatever the
 * business's level (`turnProfile`, plan 733, R-23). A technical failure hands the conversation to a person and sends one
 * holding message per guest message at level 1 or in a test conversation (plan 733, R-22, which supersedes R-04's
 * silence). Logs carry ids, enums, booleans and counts only — never guest text, a name or a phone.
 * Plan 751 (R-24): a date the model left out is filled by `fillWhen` before the rules run.
 * Plan 752: every run is recorded step by step (`frontdesk-runs.js`); the record holds guest text and the AI's answer,
 * the logs still never do.
 * The one model call is `askTurnModel` (routes/ai/frontdesk.js, INV-6); it is required lazily because that file
 * requires this one.
 * Plan 753 (R-26, R-27): `runTurn` holds the conversation's lease (`frontdesk-lease.js`) for a run and its follow-ups;
 * after the model call the turn reads the conversation again and sends and writes nothing when a person stepped in.
 */
const { logger } = require('../logger');
const { publicFacts } = require('./knowledge');
const { buildTurnBody, unansweredTail, todayBlock, HISTORY_WINDOW } = require('./frontdesk-prompt');
const { applyGuardrails, preCheck, isRemoval, TURN_LIMIT, FOLLOW_UP_MAX } = require('./frontdesk-guardrails');
const { fillWhen } = require('./frontdesk-when');
const { sendOut } = require('./outbound');
const { setTurnHandler, nextStep, waitFor, COALESCE_MS } = require('./inbound');
const { loadConversation } = require('./conversations');
const { takeLease, noteWaiting, leaseCheck, endLease } = require('./frontdesk-lease');
const { tablesFor, handleTableIntent, deliver, cleanSuggested, turnProfile } = require('./frontdesk-tables');
const { startRun, NO_RUN } = require('./frontdesk-runs');
const { createRequest, runQualify } = require('../utils/request-create');
const { fixedText, reasonText } = require('../utils/fixed-text');
const { jerusalemDate } = require('../middleware/usage');
const { WANTED_QUESTION_KEYS } = require('../generated/schemas/front-desk-templates');

const FRONTDESK_DAILY_TURNS = 300;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const PLACEHOLDER_CLIENTS = new Set(['__test__', '__walk_in__']);
const NUMBER_KEYS = new Set(['partySize', 'budgetPerGuest']);

const TABLE_INTENTS = new Set(['book', 'change', 'cancel']);
const SHAPE_FAILURES = new Set(['bad_json', 'bad_shape']);
const TABLE_FIELDS = ['date', 'time', 'partySize', 'areaKey'];

/** Plan 680: without table service a `book` answer is a table `request` (the `collected.table` fields mapped to the question keys). */
function bookAsRequest(answer) {
  const { table, ...rest } = answer.collected ?? {};
  const t = table ?? {};
  const mapped = { ...rest };
  if (t.date) mapped.date = String(t.date);
  if (t.time) mapped.time = String(t.time);
  if (t.partySize !== undefined) mapped.party_size = String(t.partySize);
  return { ...answer, intent: 'request', kind: 'table', collected: mapped };
}

const askTurnModel = args => require('../routes/ai/frontdesk').askTurnModel(args);
const colOf = (db, name) => db.collection(name);
const levelOf = profile => (profile.assistant && profile.assistant.level) || 0;
const toneOf = profile => (profile.assistant && profile.assistant.tone === 'formal' ? 'formal' : 'warm');

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
 * What to say and what to write. `{ text, request? }` or `{ handoff: true }`, each with `why` for the run record. Pure.
 * Something missing → the model's reply (it asks); an unfit request → the rule sentences (R-10), no request.
 */
function decide(answer, ctx) {
  const { profile, conversation, now } = ctx;
  const kindConfig = answer.kind ? profile.requestKinds?.[answer.kind] : null;
  if (answer.intent !== 'request' || !kindConfig || !kindConfig.enabled) return { text: answer.reply, why: 'reply' };
  if (conversation.requestId) return { handoff: true, why: 'open_request' };
  const { wanted, answers, missing } = gather(kindConfig, answer.collected);
  if (missing.length) return { text: answer.reply, why: 'missing', missing };
  const verdict = runQualify(profile, answer.kind, wanted, answers, now);
  if (verdict.qualification.verdict === 'unfit') {
    return { text: verdict.qualification.reasons.map(reasonText).join(' '), why: 'unfit' };
  }
  return { text: fixedText('fd_ai_will_confirm'), request: { kind: answer.kind, wanted, answers }, why: 'request' };
}

/** What step 13 stores for a message that was handed to `sendOut`: its id and length, or why it was refused. */
function sentOut(sent, action, author, chars) {
  if (!sent.ok) return { action, ...(author && { author }), refused: sent.reason };
  return { action, ...(author && { author }), messageId: sent.message._id, chars: chars ?? (sent.message.text ?? '').length };
}

/** Step 13 from what left the server (`null` = nothing). A draft and a refused send are notes. */
function recordSend(run, done) {
  const out = done ?? { action: 'none' };
  run.step('send', { status: out.refused || out.action === 'draft' ? 'note' : 'ok', out });
}

/** Runs a helper that sends (or drafts) as step 13 and records what it returned. */
async function sendStep(run, fn) {
  const done = await run.time('send', fn);
  recordSend(run, done);
  return done;
}

/**
 * `keepStatus`: a blocked turn at level 0 only stores the handoff sentence as the suggestion; the status stays.
 * Returns what step 13 records: `{ action: 'none' | 'draft' | 'sent', … }`.
 */
async function handOff(db, conversation, { now, silent = false, profile, mode = 'turn', log = logger, keepStatus = false, assistantFailed }) {
  if (!(keepStatus && levelOf(profile) === 0)) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId: conversation.businessId },
      { $set: { status: 'human', updatedAt: now, ...(assistantFailed && { assistantFailed }) } }
    );
  }
  if (silent || mode !== 'turn') return { action: 'none' };
  const text = handoffSentence(profile);
  if (levelOf(profile) === 0) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId: conversation.businessId }, { $set: { suggestion: text } }
    );
    return { action: 'draft', chars: text.length };
  }
  const sent = await sendOut(db, conversation, { kind: 'text', text }, 'ai', { now });
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
  return sentOut(sent, 'sent', 'ai', text.length);
}

const handoffSentence = profile => (profile.assistant && profile.assistant.handoffText) || fixedText('fd_ai_handoff_default');

/** R-02: the guest asked to be removed. One fixed sentence, the do-not-contact flag, then a person. */
async function removeGuest(db, conversation, { now, log }) {
  const businessId = conversation.businessId;
  const text = fixedText('fd_ai_removed');
  const sent = await sendOut(db, conversation, { kind: 'text', text }, 'server', { now });
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
  return sentOut(sent, 'removal_notice', 'server', text.length);
}

/** A blocked turn: log the reason only, then a person (suggest mode: the sentence is the draft, status unchanged). */
async function blockTurn(db, conversation, base, { reason, stage, detail }) {
  base.log.info({ event: 'frontdesk.turn.blocked', reason, stage, level: levelOf(base.profile), ...(detail ?? {}) });
  base.run.end('handover', reason);
  if (base.mode === 'suggest') {
    return finishSuggestion(db, conversation, handoffSentence(base.profile), base.now, base.run);
  }
  await sendStep(base.run, () => handOff(db, conversation, { ...base, keepStatus: true }));
  return { ok: true, handoff: true };
}

const handOffSilently = (db, conversation, opts) => handOff(db, conversation, { ...opts, silent: true });

/**
 * Plan 733 (R-22): after a technical failure the guest gets one holding message — the business's handoff text, else
 * `fd_ai_holding_default` — until the guest writes again (the newest message must be the guest's). Not in suggest mode
 * and not for a real guest at level 0. Called after the status change, so the staff get the conversation even when the
 * send is refused. Returns what step 13 records, or `null` when nothing was sent. Logs never carry the text.
 */
async function holdGuest(db, conversation, { now, profile, mode, log = logger }, group) {
  if (mode !== 'turn' || levelOf(profile) < 1) return null;
  const scope = { businessId: conversation.businessId, conversationId: conversation._id };
  const [lastIn] = await colOf(db, 'messages')
    .find({ ...scope, direction: 'in' }).sort({ at: -1, _id: -1 }).limit(1).toArray();
  if (!lastIn) return null;
  // Something already went out at or after the guest's last message (also a holding message sent in the same
  // millisecond): the guest is not left waiting, so no second holding message.
  const answered = await colOf(db, 'messages').countDocuments({ ...scope, direction: 'out', at: { $gte: lastIn.at } });
  if (answered > 0) return null;
  const text = (profile.assistant && profile.assistant.handoffText) || fixedText('fd_ai_holding_default');
  const sent = await sendOut(db, conversation, { kind: 'text', text }, 'server', { now });
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
  log.info({ event: 'frontdesk.turn.holding', conversationId: conversation._id, group, sent: !!sent.ok });
  return sentOut(sent, 'holding', sent.ok ? 'server' : null, text.length);
}

const BUSY_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Plan 701: why the assistant did not answer, in four words the inbox can show: `busy`, `timeout`, `quota`, `other`.
 * `kind` is the failure kind of `callGemini` (or `bad_json`, `bad_shape`, `cap`); `status` the Google HTTP status.
 */
function failureReason(kind, status) {
  if (kind === 'network') return 'busy';
  if (kind === 'gemini_error') return BUSY_STATUSES.has(status) ? 'busy' : 'other';
  if (kind === 'timeout') return 'timeout';
  if (['model_exhausted', 'all_exhausted', 'business_cap', 'cap'].includes(kind)) return 'quota';
  return 'other';
}

/**
 * One turn: `{ result, runId, seen }` (`seen`: the guest messages the turn read). A turn that completes in mode `turn`
 * removes the reason an earlier turn of this conversation failed (plan 701). Plan 752: the run record is started and
 * finished here, also when the turn throws. Plan 753: a follow-up names the run it continues.
 */
async function runOnce(db, conversation, opts) {
  const run = startRun(db, conversation, {
    now: opts.now ?? Date.now(), mode: opts.mode ?? 'turn', feature: opts.feature, inbound: opts.inbound,
  });
  if (opts.followsRunId) {
    run.set({ followsRunId: opts.followsRunId });
    run.step('inbound', { out: { via: 'follow_up' } });
  }
  const track = { seen: [] };
  let result;
  try {
    result = await runTurnInner(db, conversation, { ...opts, run, track });
  } catch (err) {
    run.end('failed', 'error');
    await run.finish({ log: opts.log });
    throw err;
  }
  await run.finish({ log: opts.log });
  // A skipped, dropped or superseded turn has no `ok`: it did not complete.
  if (conversation.assistantFailed && (opts.mode ?? 'turn') === 'turn' && result && result.ok) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId: conversation.businessId }, { $unset: { assistantFailed: '' } }
    );
  }
  return { result, runId: run.id, seen: track.seen };
}

/** The lease of this turn, or what the caller is answered when another run (or a person) has the conversation. */
async function claimTurn(db, conversation, { messageId, log = logger }) {
  let lease = await takeLease(db, conversation, { log });
  if (lease) return { lease };
  const current = await loadConversation(db, conversation.businessId, conversation._id);
  if (!current || current.status !== 'bot') return { skipped: 'not_bot' };
  const noted = await noteWaiting(db, conversation, messageId, Date.now());
  // No live lease took the note: the other run ended in between.
  if (!noted) lease = await takeLease(db, conversation, { log });
  if (lease) return { lease };
  log.info({ event: 'frontdesk.turn.busy', conversationId: conversation._id, noted });
  return { skipped: 'busy' };
}

/**
 * Plan 753: the first run of a held lease and the follow-ups for the messages that arrived meanwhile. Answers with the
 * first run's result. `endLease` gives the lease back when there is nothing left to answer.
 */
async function runLeased(db, conversation, lease, opts) {
  const { log = logger } = opts;
  const startedReal = Date.now();
  let conv = conversation;
  let turnOpts = opts;
  let chain = 0;
  let follows;
  let first;
  for (;;) {
    const now = opts.now === undefined || chain === 0 ? opts.now : opts.now + (Date.now() - startedReal);
    const one = await runOnce(db, conv, { ...turnOpts, now, lease, chain, followsRunId: follows });
    if (chain === 0) first = one.result;
    // A superseded run wrote and sent nothing on purpose: its follow-up answers everything.
    const goesOn = !one.result?.skipped || one.result.skipped === 'superseded';
    const next = await endLease(db, conv, lease, {
      seen: one.seen, follow: goesOn && chain <= FOLLOW_UP_MAX, graceMs: COALESCE_MS,
    });
    if (!next.follow) return first;
    const at = next.conversation.lastInboundAt;
    const step = nextStep({ conversation: next.conversation, at, now: Date.now(), waited: false, holder: true });
    const waitStarted = Date.now();
    await waitFor(step.ms);
    const waitedMs = Date.now() - waitStarted;
    conv = await loadConversation(db, next.conversation.businessId, next.conversation._id);
    if (nextStep({ conversation: conv, at, now: Date.now(), waited: true, holder: true }).do !== 'run') {
      await endLease(db, next.conversation, lease, { follow: false });
      return first;
    }
    log.info({ event: 'frontdesk.turn.follow_up', conversationId: conv._id, chain: next.chain, waitMs: waitedMs });
    chain = next.chain;
    follows = one.runId;
    turnOpts = { ...turnOpts, inbound: { at: conv.lastInboundAt, waitedMs }, messageId: undefined };
  }
}

/**
 * Plan 753 (R-26): one run per conversation. A suggestion sends nothing and may be made beside a run, so it takes no
 * lease. A turn that finds a live lease answers `{ skipped: 'busy' }` and notes its message on it.
 */
async function runTurn(db, conversation, opts = {}) {
  if (opts.mode === 'suggest') return (await runOnce(db, conversation, opts)).result;
  if (conversation.status !== 'bot') return { skipped: 'not_bot' };
  const claim = await claimTurn(db, conversation, opts);
  if (!claim.lease) return { skipped: claim.skipped };
  try {
    return await runLeased(db, conversation, claim.lease, opts);
  } catch (err) {
    // The lease is given back on every path; the turn's own error is the one the caller gets.
    await endLease(db, conversation, claim.lease, { follow: false }).catch(() => {});
    throw err;
  }
}

/** Step 2: the settings this turn works with (`profile` may be raised to level 1 for a test conversation). */
function setupFacts(stored, profile) {
  const assistant = profile.assistant ?? {};
  const level = levelOf(profile);
  const storedLevel = levelOf(stored);
  return {
    level,
    storedLevel,
    simulated: level !== storedLevel,
    tone: toneOf(profile),
    kinds: Object.entries(profile.requestKinds ?? {}).filter(([, config]) => config && config.enabled).map(([key]) => key),
    activeHours: !!(assistant.activeHours && assistant.activeHours.length),
    handoffText: !!assistant.handoffText,
  };
}

/** What a run answers: the unanswered guest messages (the newest few), and the newest guest text. */
function triggerOf(history) {
  const newest = history.filter(m => m.author === 'guest').at(-1);
  const text = (newest && (newest.kind === 'button' ? newest.buttonId : newest.text)) || '';
  return { messageIds: unansweredTail(history).map(m => String(m._id)), text };
}

/** Step 13 of a run that stops after the model call: nothing is written and nothing is sent. */
function stopUnsent(run, outcome, reason) {
  run.step('send', { status: 'stopped', out: { action: 'none' } });
  run.end(outcome, reason);
}

/** Plan 753 (R-27): a person stepped in, the conversation closed or the lease is another's. */
function dropTurn(conversation, { reason, run, log }) {
  log.info({ event: 'frontdesk.turn.dropped', conversationId: conversation._id, reason });
  stopUnsent(run, 'dropped', reason);
  return { skipped: 'dropped', reason };
}

/** Plan 753 (R-26): the run was about to write while newer messages wait; the follow-up answers them all. */
function supersedeTurn(conversation, { waiting, run, log }) {
  log.info({ event: 'frontdesk.turn.superseded', conversationId: conversation._id, waiting });
  stopUnsent(run, 'superseded', 'overtaken');
  return { skipped: 'superseded' };
}

/** Step 8, from the facts `askTurnModel` returns about its calls. A malformed answer is step 9's stop, not this one's. */
function recordModelCall(run, asked, feature) {
  const trace = asked.trace ?? {};
  const { model = null, firstModel = null, attempts = [], raw = '', rawChars = 0, shapeTries = 1 } = trace;
  const shapeFailed = SHAPE_FAILURES.has(asked.reason);
  const retried = (!!model && model !== firstModel) || attempts.length > 1;
  let status = retried ? 'note' : 'ok';
  if (!asked.ok) status = shapeFailed ? 'ok' : 'stopped';
  run.step('ai', { status, in: { feature }, out: { model, firstModel, attempts, raw, rawChars } });
  run.set({ model: model ?? undefined, firstModel: firstModel ?? undefined });
  // Step 9 runs inside the call (step 8): it has no time of its own, and none at all when the call itself failed.
  if (!asked.ok && !shapeFailed) return;
  let shape = shapeTries > 1 ? 'note' : 'ok';
  if (shapeFailed) shape = 'stopped';
  run.step('shape', {
    status: shape, ms: 0, out: { tries: shapeTries, ok: !!asked.ok, ...(shapeFailed && { issue: asked.reason }) },
  });
}

/** Step 11's input: what the model collected about the table (strings and numbers only). */
function tableInput(answer) {
  const table = (answer.collected && answer.collected.table) || {};
  const out = { intent: answer.intent };
  for (const key of TABLE_FIELDS) {
    if (typeof table[key] === 'string' || typeof table[key] === 'number') out[key] = table[key];
  }
  return out;
}

/** Step 11's result: what the table engine did, named from the shape of what it returned. */
function tableOutput(res) {
  let result = 'done';
  if (res.handoff) result = 'handoff';
  else if (res.request) result = 'request';
  else if (res.pending) result = res.outbound && res.outbound.kind === 'button' ? 'offer' : 'ask';
  return { result, outboundKind: res.outbound?.kind, pending: !!res.pending };
}

/** `feature` (plan 681) is only for the hand-run eval: its live turns are metered as `eval`, never as a business's turn. */
async function runTurnInner(db, conversation, opts = {}) {
  const { log = logger, mode = 'turn', now = Date.now(), feature, run = NO_RUN, lease, chain = 0, track } = opts;
  const businessId = conversation.businessId;
  if (mode === 'turn' && conversation.status !== 'bot') {
    run.discard();
    return { skipped: 'not_bot' };
  }
  const stored = await run.time('setup',
    () => colOf(db, 'frontDeskProfiles').findOne({ businessId, deletedAt: { $exists: false } }));
  if (!stored) {
    run.discard();
    return { skipped: 'no_profile' };
  }
  // Plan 733 (R-23): wrapped once; every later use sees level 1 for a test conversation. Never re-read `stored` below.
  const profile = turnProfile(stored, conversation);
  const base = { now, profile, mode, log, run };
  run.step('setup', { out: setupFacts(stored, profile) });
  run.set({ level: levelOf(profile) });

  const limit = { limit: FRONTDESK_DAILY_TURNS };
  if (mode === 'turn' && !conversation.test) {
    const used = await run.time('limit', () => colOf(db, 'aiUsage').countDocuments({
      businessId, day: jerusalemDate(now), feature: 'frontdesk_turn', userId: { $ne: 'sim' },
    }));
    run.step('limit', { in: limit, out: { used } });
    if (used >= FRONTDESK_DAILY_TURNS) {
      run.step('limit', { status: 'stopped' });
      run.end('failed', 'quota');
      log.info({ event: 'frontdesk.turn.cap', conversationId: conversation._id });
      await handOffSilently(db, conversation, { ...base, assistantFailed: { at: now, reason: 'quota' } });
      await sendStep(run, () => holdGuest(db, conversation, base, 'quota'));
      return { ok: false, reason: 'cap', group: 'quota' };
    }
  } else {
    run.step('limit', { status: 'skipped', in: limit, out: { why: conversation.test ? 'test' : 'suggest' } });
  }

  const { history, aiTurns } = await run.time('history', async () => {
    const recent = await colOf(db, 'messages')
      .find({ businessId, conversationId: conversation._id }).sort({ at: -1, _id: -1 }).limit(HISTORY_WINDOW).toArray();
    const count = await colOf(db, 'messages').countDocuments({ businessId, conversationId: conversation._id, author: 'ai' });
    return { history: recent.reverse(), aiTurns: count };
  });
  run.step('history', {
    in: { window: HISTORY_WINDOW }, out: { messages: history.length, messageIds: history.map(m => String(m._id)), aiTurns },
  });
  run.set({ trigger: triggerOf(history) });
  if (track) track.seen = history.filter(m => m.author === 'guest').map(m => m._id);

  const pre = run.timeSync('precheck', () => {
    if (mode === 'suggest' && isRemoval(history)) return { ok: false, reason: 'removal' };
    return preCheck({ profile, history, aiTurns, chain, now, mode });
  });
  const preIn = { aiTurns, turnLimit: TURN_LIMIT };
  if (pre.ok) {
    const skipped = mode === 'suggest';
    run.step('precheck', { status: skipped ? 'skipped' : 'ok', in: preIn, out: skipped ? { why: 'suggest' } : { ok: true } });
  } else {
    run.step('precheck', { status: 'stopped', in: preIn, out: { ok: false, reason: pre.reason } });
    if (pre.reason !== 'removal') return blockTurn(db, conversation, base, { reason: pre.reason, stage: 'pre' });
    if (mode === 'suggest') {
      recordSend(run, null);
      run.end('handover', 'removal');
    } else {
      run.end('removed', 'removal');
      await sendStep(run, () => removeGuest(db, conversation, base));
    }
    return { ok: true, handoff: 'removal' };
  }

  const { facts, tables } = await run.time('facts', async () => ({
    facts: await publicFacts(db, businessId), tables: await tablesFor(db, businessId),
  }));
  run.step('facts', {
    out: {
      factIds: facts.factIds, factsChars: facts.text.length, tablesOn: !!tables,
      areas: tables ? (tables.plan.areas ?? []).length : 0,
    },
  });
  const body = run.timeSync('prompt',
    () => buildTurnBody({ profile, facts, history, now, tablesOn: !!tables, areas: tables ? tables.plan.areas : [] }));
  const lead = body.contents[0].parts[0].text;
  run.step('prompt', {
    out: {
      rulesChars: body.systemInstruction.parts[0].text.length, leadChars: lead.length,
      historyMessages: body.contents.length - 1, today: todayBlock(now),
    },
  });
  run.set({ lead, tone: toneOf(profile), tablesOn: !!tables });

  const usage = {
    businessId,
    feature: feature === 'eval' ? 'eval' : mode === 'suggest' ? 'frontdesk_suggest' : 'frontdesk_turn',
    ...(conversation.test && { userId: 'sim' }),
  };
  const asked = await run.time('ai', () => askTurnModel({ body, usage, log }));
  recordModelCall(run, asked, usage.feature);
  // Plan 753 (R-27): the model call takes seconds; read the conversation again before anything is written or sent.
  let overtaken = 0;
  if (lease) {
    const gate = await leaseCheck(db, conversation, lease, track?.seen);
    if (!gate.ok) return dropTurn(conversation, { reason: gate.reason, run, log });
    overtaken = gate.overtaken;
    if (overtaken > 0) run.step('send', { out: { overtaken } });
  }
  if (!asked.ok) {
    const group = failureReason(asked.reason, asked.status);
    run.end('failed', group);
    log.info({ event: 'frontdesk.turn.failed', reason: asked.reason, group, mode, conversationId: conversation._id });
    if (mode === 'turn') {
      await handOffSilently(db, conversation, { ...base, assistantFailed: { at: now, reason: group } });
      await sendStep(run, () => holdGuest(db, conversation, base, group));
    } else {
      recordSend(run, null);
    }
    return { ok: false, reason: asked.reason, group };
  }

  const when = fillWhen(asked.answer, { history, now, profile });
  if (when.dateFrom || when.timeFixed) {
    const { dateFrom, timeFixed } = when;
    const intent = asked.answer.intent;
    log.info({ event: 'frontdesk.turn.when_filled', conversationId: conversation._id, intent, dateFrom, timeFixed });
  }
  const modelAnswer = !tables && when.answer.intent === 'book' ? bookAsRequest(when.answer) : when.answer;
  const tableTurn = !!tables && TABLE_INTENTS.has(modelAnswer.intent);
  const guardCtx = {
    tablesOn: !!tables, profile, factIds: facts.factIds, factsText: facts.text, history, aiTurns, now, mode,
    lastTurnLow: conversation.lowTurns === 1,
  };
  run.set({ intent: asked.answer.intent });
  // The reply checks only matter when the model's own reply leaves the server: find out first (decide is pure).
  let replyWillBeSent = false;
  const verdict = run.timeSync('guardrails', () => {
    const first = applyGuardrails(modelAnswer, { ...guardCtx, replyWillBeSent: false });
    if (!first.ok || tableTurn || decide(first.answer, { profile, conversation, now }).text !== first.answer.reply) return first;
    replyWillBeSent = true;
    return applyGuardrails(modelAnswer, { ...guardCtx, replyWillBeSent: true });
  });
  const low = !!(verdict.ok && verdict.answer.low);
  const changed = verdict.ok && verdict.answer.intent !== asked.answer.intent;
  run.step('guardrails', {
    status: !verdict.ok ? 'stopped' : low || changed ? 'note' : 'ok',
    in: { replyWillBeSent },
    out: verdict.ok
      ? { ok: true, ...(low && { low: true }), usedFacts: verdict.answer.usedFacts, intentAfter: verdict.answer.intent }
      : { ok: false, reason: verdict.reason },
  });
  if (!verdict.ok && verdict.reason !== 'model') {
    return blockTurn(db, conversation, base, { reason: verdict.reason, stage: 'post', detail: verdict.detail });
  }
  if (verdict.ok && mode === 'turn' && (verdict.answer.low || conversation.lowTurns)) {
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId },
      verdict.answer.low ? { $set: { lowTurns: 1 } } : { $unset: { lowTurns: '' } }
    );
  }
  if (!verdict.ok) {
    run.end('handover', 'model');
    log.info({ event: 'frontdesk.turn.done', intent: asked.answer.intent, level: levelOf(profile), mode, handoff: true, requestWritten: false });
    // A suggestion is still a draft a person can use: the model's own words are kept for the member.
    if (mode !== 'turn') return finishSuggestion(db, conversation, asked.answer.reply, now, run);
    await sendStep(run, () => handOff(db, conversation, base));
    return { ok: true, handoff: true };
  }

  // Plan 680: the model's reply is dropped for the three table intents; the server answers from the engine.
  let answer = verdict.answer;
  // Plan 681: the model's advice for the owner, cleaned once; it changes nothing the guest sees.
  const suggested = cleanSuggested(asked.answer.suggested, now);
  if (!tableTurn) {
    run.step('tables', { status: 'skipped', out: { why: tables ? 'not_a_table_intent' : 'tables_off' } });
  } else {
    const level0 = levelOf(profile) === 0 || mode === 'suggest';
    if (overtaken > 0 && !level0 && (answer.intent === 'change' || answer.intent === 'cancel')) {
      return supersedeTurn(conversation, { waiting: overtaken, run, log });
    }
    const tableIn = tableInput(answer);
    const res = await run.time('tables',
      () => handleTableIntent(db, conversation, answer, { tables, now, write: !level0, log, suggested }));
    run.step('tables', { status: res.handoff ? 'stopped' : 'ok', in: tableIn, out: tableOutput(res) });
    if (res.request) {
      // No plan to assign from: the plan 679 request path, with a reply that is checked because it may be sent.
      answer = bookAsRequest(answer);
      const again = applyGuardrails(answer, { ...guardCtx, replyWillBeSent: true });
      if (!again.ok) {
        run.step('guardrails', { status: 'stopped', in: { replyWillBeSent: true }, out: { ok: false, reason: again.reason } });
        return blockTurn(db, conversation, base, { reason: again.reason, stage: 'post', detail: again.detail });
      }
      answer = again.answer;
    } else if (res.handoff) {
      run.step('decide', { out: { why: 'table_engine' } });
      run.end('handover', 'table_engine');
      log.info({ event: 'frontdesk.turn.done', intent: answer.intent, level: levelOf(profile), mode, handoff: true, requestWritten: false });
      if (mode !== 'turn') return finishSuggestion(db, conversation, answer.reply, now, run);
      await sendStep(run, () => handOff(db, conversation, base));
      return { ok: true, handoff: true };
    } else {
      run.step('decide', { out: { why: 'table_engine' } });
      log.info({ event: 'frontdesk.turn.done', intent: answer.intent, level: levelOf(profile), mode, handoff: false, requestWritten: false });
      if (level0) {
        run.end('draft');
        return finishSuggestion(db, conversation, res.outbound.text, now, run);
      }
      const sent = await run.time('send', () => deliver(db, conversation, res, { now, log, profile }));
      recordSend(run, sentOut(sent, 'sent', 'server'));
      if (!sent.ok) run.end('failed', 'send_refused');
      else run.end(res.pending ? 'asked' : 'answered');
      return { ok: true, sent: sent.ok };
    }
  }

  const decision = run.timeSync('decide', () => decide(answer, { profile, conversation, now }));
  run.step('decide', {
    status: decision.handoff ? 'stopped' : 'ok',
    in: { intent: answer.intent, kind: answer.kind },
    out: { why: decision.why, missing: decision.missing, requestWritten: false },
  });
  if (decision.handoff) {
    run.end('handover', 'open_request');
    log.info({ event: 'frontdesk.turn.done', intent: verdict.answer.intent, level: levelOf(profile), mode, handoff: true, requestWritten: false });
    if (mode !== 'turn') return finishSuggestion(db, conversation, verdict.answer.reply, now, run);
    await sendStep(run, () => handOff(db, conversation, base));
    return { ok: true, handoff: true };
  }

  const level = levelOf(profile);
  if (level === 0 || mode === 'suggest') {
    run.end('draft');
    log.info({ event: 'frontdesk.turn.done', intent: verdict.answer.intent, level, mode, handoff: false, requestWritten: false });
    return finishSuggestion(db, conversation, decision.text, now, run);
  }

  let requestWritten = false;
  if (decision.request && overtaken > 0) return supersedeTurn(conversation, { waiting: overtaken, run, log });
  if (decision.request) {
    const { request } = await createRequest(db, businessId, profile, {
      ...decision.request,
      clientId: conversation.clientId,
      ...(conversation.test && { test: true }),
    }, {
      channel: conversation.channel, actor: 'public:' + conversation.channel, via: 'ai', source: 'whatsapp',
    });
    if (suggested) await colOf(db, 'requests').updateOne({ _id: request._id, businessId }, { $set: { suggested } });
    await colOf(db, 'conversations').updateOne(
      { _id: conversation._id, businessId }, { $set: { requestId: request._id, updatedAt: now } }
    );
    requestWritten = true;
    run.step('decide', { out: { requestWritten } });
  }
  const sent = await run.time('send',
    () => sendOut(db, conversation, { kind: 'text', text: decision.text }, 'ai', { now }));
  recordSend(run, sentOut(sent, 'sent', 'ai', decision.text.length));
  if (!sent.ok) run.end('failed', 'send_refused');
  else run.end(decision.why === 'missing' ? 'asked' : 'answered');
  if (!sent.ok) log.info({ event: 'frontdesk.turn.send_refused', reason: sent.reason, conversationId: conversation._id });
  log.info({ event: 'frontdesk.turn.done', intent: verdict.answer.intent, level, mode, handoff: false, requestWritten });
  return { ok: true, sent: sent.ok };
}

/** Stores `text` as the conversation's draft; step 13 of the run says so. */
async function finishSuggestion(db, conversation, text, now, run = NO_RUN) {
  const suggestion = String(text ?? '').slice(0, 4000);
  await run.time('send', () => colOf(db, 'conversations').updateOne(
    { _id: conversation._id, businessId: conversation.businessId }, { $set: { suggestion, updatedAt: now } }
  ));
  recordSend(run, { action: 'draft', chars: suggestion.length });
  return { ok: true, suggestion };
}

setTurnHandler(runTurn);

module.exports = { runTurn, decide, failureReason, FRONTDESK_DAILY_TURNS };
