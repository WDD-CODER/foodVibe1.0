'use strict';
/**
 * ai-eval-frontdesk.js — the assistant's eval set (plan 681): 30 Hebrew dialogues played through the real conversation
 * pipeline (`handleInbound` on the simulator channel → `runTurn` → the table dialogue) and scored by what the SERVER
 * wrote (a booking with tables, a request, a handoff), never by the model's text.
 *
 * Two models:
 *   scripted — the global `fetch` answers each guest turn with the dialogue's own `script` (the test suite; no key,
 *              no network; `server/test/frontdesk-eval.test.js`).
 *   live     — the real model chain through `runTurn`, metered as feature `eval`, paced for the free tier.
 *
 * Usage:
 *   node server/scripts/ai-eval-frontdesk.js --dry            validates the files, prints "30 dialogues ok"
 *   node server/scripts/ai-eval-frontdesk.js [--only=1,4] [--model=<id>]
 *
 * The live run needs GEMINI_API_KEY (server/.env or the environment; exit 2 without it), starts an in-memory database
 * (mongodb-memory-server) and never connects to the configured one. It prints one line per dialogue (`ok` /
 * `FAIL: <fields>`) and the score `N/30`; exit 0 at 26 of 30 or more (scaled for --only), 1 below, 3 on the daily
 * quota. Output carries dialogue ids, intents and field names only — never a guest line or a phone.
 * Never run in CI or in an orchestrator run.
 */
const path = require('path');
const fs = require('fs');
const { evalDialogueSchema } = require('../eval/frontdesk/dialogue-schema');

const DIALOGUE_DIR = path.resolve(__dirname, '..', 'eval', 'frontdesk', 'dialogues');
const EVAL_PHONE = '972541230681';
const EVAL_GUEST = 'אורח בדיקה';
const PASS_BAR = 26;
const SET_SIZE = 30;
const TURN_GAP_MS = 60000;
// Free-tier Gemini allows ~15 requests a minute: pace the live calls (as ai-eval-recipes.js does).
const CALL_GAP_MS = 4500;

let runSeq = 0;

/** Every dialogue file of `dir`, validated with `evalDialogueSchema`, sorted by name. Throws on the first bad file. */
function loadDialogues(dir = DIALOGUE_DIR) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  return files.map(file => {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      throw new Error(`${file}: not valid JSON`);
    }
    const parsed = evalDialogueSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`${file}: ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    }
    if (!file.startsWith(parsed.data.id + '-')) throw new Error(`${file}: the file name does not start with its id`);
    return parsed.data;
  });
}

/** The pipeline, required only when a dialogue runs (so `--dry` loads no service and no database code). */
function pipeline() {
  return {
    inbound: require('../services/inbound'),
    turn: require('../services/frontdesk-turn'),
    tables: require('../services/frontdesk-tables'),
    tb: require('../services/table-bookings'),
    channels: require('../services/channels'),
    clients: require('../utils/client-upsert'),
    publicToken: require('../utils/public-token'),
    templates: require('../generated/schemas/front-desk-templates'),
    localTime: require('../generated/schemas/front-desk/local-time'),
    room: require('../eval/frontdesk/room14'),
    gemini: require('../services/gemini-client'),
    helpers: require('../services/ai-recipe-helpers'),
  };
}

const modelResponse = answer => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }),
});

/**
 * The scripted model: a `fetch` that returns the current turn's `script` as the model's answer. `state.script` is set by
 * the runner before each guest turn; a call with no script answers a low-content turn (the count check catches it).
 */
function scriptedFetch(state) {
  return async () => {
    const script = state.script ?? { reply: '', intent: 'other' };
    const answer = { ...script };
    if (Array.isArray(answer.usedFacts)) answer.usedFacts = answer.usedFacts.map(id => (/^f\d+$/.test(id) ? `${state.businessId}_${id}` : id));
    return modelResponse(answer);
  };
}

/** The live model: the real `fetch`, paced; records the daily quota. */
function liveFetch(state, realFetch, p) {
  return async (url, init) => {
    await new Promise(resolve => setTimeout(resolve, CALL_GAP_MS));
    const res = await realFetch(url, init);
    if (res.status === 429) {
      const body = await res.clone().json().catch(() => ({}));
      if (p.gemini.isDailyQuota(body)) state.dailyQuota = true;
    }
    return res;
  };
}

/** Reads the model's structured answer out of a Gemini response body (live mode), or null. */
async function answerOf(res, p) {
  try {
    const body = await res.clone().json();
    const payload = p.helpers.extractJsonPayload(p.gemini.responseText(body));
    return payload.error ? null : payload.value;
  } catch {
    return null;
  }
}

function mergeCollected(answers) {
  const out = {};
  for (const a of answers) {
    const c = (a && a.collected) || {};
    for (const [k, v] of Object.entries(c)) {
      out[k] = k === 'table' && v && typeof v === 'object' ? { ...(out.table ?? {}), ...v } : v;
    }
  }
  return out;
}

/** Creates the dialogue's `test: true` business, its profile, room, facts and existing bookings. */
async function seed(db, dialogue, businessId, start, p) {
  const { setup } = dialogue;
  const modules = setup.modules;
  await db.collection('businesses').insertOne({
    _id: businessId, name: 'Eval ' + dialogue.id, ownerId: 'eval', createdAt: start, modules, test: true,
  });
  const kinds = p.templates.templateFor(dialogue.businessType).requestKinds;
  for (const [kind, over] of Object.entries(setup.rules ?? {})) {
    if (kinds[kind]) kinds[kind] = { ...kinds[kind], rules: { ...kinds[kind].rules, ...over } };
  }
  await db.collection('frontDeskProfiles').insertOne({
    _id: 'p_' + businessId, businessId, status: 'active', schemaVersion: 2, createdAt: start, updatedAt: start,
    createdBy: 'eval', businessType: dialogue.businessType, slug: 'eval-' + businessId.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    displayName: 'Eval ' + dialogue.businessType, hours: p.room.ALL_WEEK_HOURS, requestKinds: kinds,
    assistant: { level: setup.level, tone: 'warm' }, tableService: p.room.tableServiceFor(setup),
    ...(setup.closedDates && { closedDates: setup.closedDates }),
  });
  const withRoom = modules.includes('tables') && (setup.floor ?? 'room14') === 'room14';
  if (withRoom) await db.collection('floorPlans').insertOne(p.room.room14For(businessId, start));
  for (const [i, f] of (setup.facts ?? []).entries()) {
    await db.collection('knowledgeItems').insertOne({
      _id: `${businessId}_f${i + 1}`, businessId, topic: f.topic, question: f.question, answer: f.answer,
      status: 'approved', visibility: 'public', source: 'manual', createdAt: start + i, updatedAt: start, createdBy: 'eval',
    });
  }

  const transport = p.channels.channelFor({ channel: 'sim' });
  const actor = p.channels.defaultActor();
  const guest = (await p.clients.upsertClientByPhone(db, businessId, {
    name: EVAL_GUEST, phone: EVAL_PHONE, source: transport.clientSource, actor,
  })).client;
  await db.collection('clients').updateOne({ _id: guest._id, businessId }, { $set: { tags: ['test'], kinds: ['lead'] } });
  const pre = [];
  if (!setup.bookings || !setup.bookings.length) return pre;
  const other = (await p.clients.upsertClientByPhone(db, businessId, {
    name: 'לקוח אחר', phone: '972541239999', source: transport.clientSource, actor,
  })).client;
  const ctx = await p.tb.loadTableContext(db, businessId);
  for (const [i, b] of setup.bookings.entries()) {
    const client = b.ofGuest ? guest : other;
    const doc = {
      _id: `${businessId}_bk${i + 1}`, schemaVersion: 2, businessId, createdBy: 'eval', createdAt: start, updatedAt: start,
      kind: 'table', status: 'confirmed', source: 'phone', clientId: client._id, guestName: client.name, guestPhone: client.phone,
      statusHistory: [{ status: 'confirmed', at: start, by: 'eval', byName: '', via: 'member' }],
      publicToken: p.publicToken.newPublicToken(), test: true,
    };
    const r = await p.tb.bookTable(db, {
      doc, ctx, date: b.date, time: b.time, partySize: b.partySize, onlineOnly: false, now: start,
      ...(b.tableNumbers && { tableKeys: b.tableNumbers.map(n => p.room.tableKeyOf(n)) }),
    });
    if (!r.ok) throw new Error(`dialogue ${dialogue.id}: existing booking ${i + 1} could not be placed (${r.code ?? 'no table'})`);
    pre.push({ _id: doc._id, date: b.date, time: b.time, partySize: b.partySize });
  }
  return pre;
}

/** The button id the guest taps: `OK` / `ALT:n` / `BK:n` / `OTHER`, looked up in the last outbound message's buttons. */
function resolveButton(spec, lastOut) {
  const ids = ((lastOut && lastOut.buttons) || []).map(b => b.id);
  if (spec === 'OK') return ids.find(id => id.startsWith('OK:'));
  return ids.find(id => id === spec);
}

const lastOutbound = (db, businessId, conversationId) => db.collection('messages')
  .find({ businessId, conversationId, direction: 'out' }).sort({ at: -1, _id: -1 }).limit(1).next();

/**
 * Plays one dialogue. `opts`: `{ model: 'scripted' | 'live', now?: epoch (overrides setup.now), onModelCall?(turnIndex) }`
 * (the global `fetch` is replaced for the run and put back after). Returns what the database holds afterwards.
 */
async function runDialogue(db, dialogue, opts = {}) {
  const p = pipeline();
  const model = opts.model ?? 'scripted';
  const [date, time] = dialogue.setup.now.split('T');
  const start = opts.now ?? p.localTime.jerusalemEpoch(date, time);
  const businessId = `eval${dialogue.id}_${Date.now().toString(36)}${++runSeq}`;
  const state = { businessId, script: null, dailyQuota: false };
  const answers = [];
  const callsByTurn = [];
  let clock = start;
  let currentTurn = -1;

  const realFetch = globalThis.fetch;
  const base = model === 'live' ? liveFetch(state, realFetch, p) : scriptedFetch(state);
  globalThis.fetch = async (url, init) => {
    if (currentTurn >= 0) callsByTurn[currentTurn] = (callsByTurn[currentTurn] ?? 0) + 1;
    if (opts.onModelCall) opts.onModelCall(currentTurn);
    const res = await base(url, init);
    if (model === 'scripted') answers.push(state.script ?? { intent: 'other' });
    else if (res.ok) answers.push(await answerOf(res, p));
    return res;
  };
  p.inbound.setWaitForTest(() => Promise.resolve());
  // Plan 733 (R-23): the simulator answers a test conversation as level 1, so a level-0 dialogue plays its guest turns
  // as a real guest's (`test: false` on the turn only) to keep testing what level 0 does for real guests.
  const asRealGuest = dialogue.setup.level === 0;
  p.inbound.setTurnHandler((d, conversation, o) => p.turn.runTurn(d, asRealGuest ? { ...conversation, test: false } : conversation, {
    ...o, now: clock, ...(model === 'live' && { feature: 'eval' }),
  }));

  let error;
  let pre = [];
  try {
    pre = await seed(db, dialogue, businessId, start, p);
    let conversationId;
    for (const [i, turn] of dialogue.turns.entries()) {
      currentTurn = i;
      callsByTurn[i] = 0;
      clock = start + (i + 1) * TURN_GAP_MS;
      state.script = turn.script ?? null;
      let buttonId;
      if (turn.button) {
        buttonId = resolveButton(turn.button, conversationId && await lastOutbound(db, businessId, conversationId));
        if (!buttonId) { error = `turn ${i + 1}: no button ${turn.button}`; break; }
      }
      const r = await p.inbound.handleInbound(db, {
        businessId, channel: 'sim', waId: EVAL_PHONE, guestName: EVAL_GUEST, text: turn.guest ?? '',
        ...(buttonId && { buttonId }), providerMessageId: `${businessId}_m${i + 1}`, at: clock,
      });
      await r.settled;
      conversationId = r.conversationId;
      if (state.dailyQuota) { error = 'daily quota'; break; }
    }
  } catch (err) {
    error = (err && err.message) || 'error';
  } finally {
    currentTurn = -1;
    globalThis.fetch = realFetch;
    p.inbound.setTurnHandler(p.turn.runTurn);
    p.inbound.setWaitForTest(ms => new Promise(resolve => { setTimeout(resolve, ms).unref(); }));
  }

  const conversation = await db.collection('conversations').find({ businessId }).sort({ createdAt: -1 }).limit(1).next();
  const out = conversation ? await lastOutbound(db, businessId, conversation._id) : null;
  return {
    businessId,
    intents: answers.map(a => (a && a.intent) || null),
    collected: mergeCollected(answers),
    lastOut: out ? { kind: out.kind, ...(out.template && { template: out.template.name }), buttons: (out.buttons ?? []).map(b => b.id) } : null,
    outCount: await db.collection('messages').countDocuments({ businessId, direction: 'out' }),
    bookings: await db.collection('bookings').find({ businessId }).toArray(),
    requests: await db.collection('requests').find({ businessId }).toArray(),
    conversation,
    pre,
    callsByTurn,
    dailyQuota: state.dailyQuota,
    ...(error && { error }),
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What the server did, from the rows (plan 681's order). */
function serverActionOf(result) {
  const preIds = new Set(result.pre.map(b => b._id));
  const made = result.bookings.filter(b => !preIds.has(b._id));
  if (made.some(b => Array.isArray(b.tableKeys) && b.tableKeys.length && b.status === 'confirmed')) return 'booking';
  if (result.requests.some(r => r.status === 'qualified') && !made.length) return 'request';
  const before = new Map(result.pre.map(b => [b._id, b]));
  const existing = result.bookings.filter(b => preIds.has(b._id));
  if (existing.some(b => b.status === 'confirmed' && (b.time !== before.get(b._id).time || b.date !== before.get(b._id).date))) return 'changed';
  if (existing.some(b => b.status === 'cancelled')) return 'cancelled';
  if (result.conversation && result.conversation.status === 'human') return 'handoff';
  const ids = (result.lastOut && result.lastOut.buttons) || [];
  if (ids.some(id => id.startsWith('OK:'))) return 'offer';
  if (ids.some(id => id.startsWith('ALT:'))) return 'alternatives';
  return 'none';
}

/** The booking `expected.booking` is checked against: the new one, else the changed one. */
function bookingOf(result) {
  const preIds = new Set(result.pre.map(b => b._id));
  const made = result.bookings.find(b => !preIds.has(b._id));
  if (made) return made;
  const before = new Map(result.pre.map(b => [b._id, b]));
  return result.bookings.find(b => preIds.has(b._id) && b.time !== before.get(b._id).time) ?? null;
}

/** `{ pass, failed }`: `failed` names each expected field the result does not meet. Pure. */
function scoreDialogue(dialogue, result) {
  const exp = dialogue.expected;
  const failed = [];
  if (result.error) failed.push('run');
  const intents = result.intents.filter(Boolean);
  if (intents[intents.length - 1] !== exp.intent) failed.push('intent');
  for (const [key, want] of Object.entries(exp.collected ?? {})) {
    const got = result.collected[key];
    if (want && typeof want === 'object') {
      for (const [sub, v] of Object.entries(want)) if (!same((got ?? {})[sub], v)) failed.push(`collected.${key}.${sub}`);
    } else if (!same(got, want)) failed.push('collected.' + key);
  }
  if (serverActionOf(result) !== exp.serverAction) failed.push('serverAction');
  if ((result.conversation && result.conversation.status === 'human') !== exp.handoff) failed.push('handoff');
  if (exp.booking) {
    const b = bookingOf(result);
    for (const k of ['date', 'time', 'partySize']) if (!b || b[k] !== exp.booking[k]) failed.push('booking.' + k);
  }
  if (exp.lastOut) {
    const out = result.lastOut;
    if (!out || out.kind !== exp.lastOut.kind) failed.push('lastOut.kind');
    if (exp.lastOut.template !== undefined && (!out || out.template !== exp.lastOut.template)) failed.push('lastOut.template');
    if (exp.lastOut.buttons !== undefined && (!out || out.buttons.length !== exp.lastOut.buttons)) failed.push('lastOut.buttons');
  }
  if (exp.suggestion && !(result.conversation && result.conversation.suggestion && result.outCount === 0)) failed.push('suggestion');
  return { pass: failed.length === 0, failed };
}

const argOf = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1];

async function main() {
  let dialogues;
  try {
    dialogues = loadDialogues();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (process.argv.includes('--dry')) {
    console.log(`${dialogues.length} dialogues ok`);
    process.exit(dialogues.length === SET_SIZE ? 0 : 1);
  }

  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set (server/.env or the environment).');
    process.exit(2);
  }
  const model = argOf('model');
  if (model) process.env.GEMINI_MODELS = model;
  const only = (argOf('only') || '').split(',').filter(Boolean).map(Number);
  const picked = only.length ? dialogues.filter((_, i) => only.includes(i + 1)) : dialogues;

  // Only the in-memory database: the configured one is never connected.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoose = require('mongoose');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('foodvibe_eval'), { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;

  let passed = 0;
  let code = 0;
  try {
    for (const d of picked) {
      const result = await runDialogue(db, d, { model: 'live' });
      if (result.dailyQuota) {
        console.log(`${d.id} stopped: Gemini daily quota used up. Try again tomorrow, or use --only.`);
        code = 3;
        break;
      }
      const score = scoreDialogue(d, result);
      if (score.pass) passed++;
      console.log(`${d.id} ${score.pass ? 'ok' : 'FAIL: ' + score.failed.join(', ')} (intents: ${result.intents.join(' ') || '-'})`);
    }
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
  if (code === 3) process.exit(3);
  const bar = Math.ceil((PASS_BAR / SET_SIZE) * picked.length);
  console.log(`${passed}/${picked.length}`);
  process.exit(passed >= bar ? 0 : 1);
}

if (require.main === module) main();

module.exports = { loadDialogues, runDialogue, scoreDialogue, serverActionOf, scriptedFetch, DIALOGUE_DIR, PASS_BAR };
