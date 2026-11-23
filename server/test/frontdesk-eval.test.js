'use strict';
/**
 * Plan 681: the assistant's eval set. The 30 dialogues are data; each is played through `handleInbound` on the
 * simulator channel with the scripted model (the dialogue's own `script` answers each guest turn) against the
 * in-memory database, and scored from the rows the server wrote. No key, no network.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { clearCapCache } = require('../services/ai-cap');
const { evalDialogueSchema } = require('../eval/frontdesk/dialogue-schema');
const { loadDialogues, runDialogue, scoreDialogue, DIALOGUE_DIR } = require('../scripts/ai-eval-frontdesk');

process.env.GEMINI_API_KEY = 'test-key';
beforeAll(async () => { await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const dialogues = loadDialogues();
const byId = id => dialogues.find(d => d.id === id);
const WRITTEN = ['bookings', 'requests', 'messages', 'conversations', 'tableHolds'];

let network;
beforeEach(() => {
  resetForTests();
  clearCapCache();
  // Any call that is not the runner's scripted model fails the test.
  network = vi.fn(async () => { throw new Error('network call in the eval test'); });
  vi.stubGlobal('fetch', network);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('the dialogue files', () => {
  it('holds exactly 30 valid files: 20 restaurant, 5 catering, 5 private chef', () => {
    const files = fs.readdirSync(DIALOGUE_DIR).filter(f => f.endsWith('.json'));
    expect(files).toHaveLength(30);
    for (const f of files) {
      const parsed = evalDialogueSchema.safeParse(JSON.parse(fs.readFileSync(path.join(DIALOGUE_DIR, f), 'utf8')));
      expect(parsed.success, f).toBe(true);
    }
    const count = type => dialogues.filter(d => d.businessType === type).length;
    expect([count('restaurant'), count('catering'), count('private_chef')]).toEqual([20, 5, 5]);
  });

  it('covers every tag, with at least 12 table dialogues', () => {
    expect(dialogues.filter(d => d.tags.includes('tables')).length).toBeGreaterThanOrEqual(12);
    for (const tag of ['book', 'full_evening', 'change', 'cancel', 'late_cutoff', 'over_limit', 'closed_day', 'question_mid_booking']) {
      expect(dialogues.some(d => d.tags.includes(tag)), tag).toBe(true);
    }
  });

  it('refuses a turn with both a guest line and a button, and an unknown key', () => {
    const d = structuredClone(byId('01'));
    d.turns[0].button = 'OK';
    expect(evalDialogueSchema.safeParse(d).success).toBe(false);
    expect(evalDialogueSchema.safeParse({ ...byId('01'), extra: 1 }).success).toBe(false);
  });

  it('loadDialogues names the bad file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval681-'));
    try {
      fs.writeFileSync(path.join(dir, '01-bad.json'), JSON.stringify({ ...byId('01'), turns: [] }));
      expect(() => loadDialogues(dir)).toThrow(/01-bad\.json/);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe('the scripted run', () => {
  it.each(dialogues.map(d => [d.id, d]))('dialogue %s passes, with one model call per scripted guest turn', async (_id, d) => {
    const calls = [];
    const result = await runDialogue(db(), d, { model: 'scripted', onModelCall: turn => calls.push(turn) });
    const score = scoreDialogue(d, result);
    expect(score.failed, result.error).toEqual([]);
    expect(score.pass).toBe(true);
    expect(result.callsByTurn).toEqual(d.turns.map(t => (t.script ? 1 : 0)));
    expect(calls).toHaveLength(d.turns.filter(t => t.script).length);
    for (const [i, t] of d.turns.entries()) if (t.button) expect(calls).not.toContain(i);
    expect(network).not.toHaveBeenCalled();
  });
});

describe('what the server wrote', () => {
  it('booking: one booking with tableKeys and source ai', async () => {
    const result = await runDialogue(db(), byId('01'), { model: 'scripted' });
    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0]).toMatchObject({ source: 'ai', status: 'confirmed' });
    expect(result.bookings[0].tableKeys.length).toBeGreaterThan(0);
  });

  it('request: one qualified request and no booking', async () => {
    const result = await runDialogue(db(), byId('02'), { model: 'scripted' });
    expect(result.bookings).toHaveLength(0);
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].status).toBe('qualified');
  });

  it('handoff: the conversation is with a person', async () => {
    const result = await runDialogue(db(), byId('13'), { model: 'scripted' });
    expect(result.conversation.status).toBe('human');
  });

  it('a changed expected field fails the score and is named', async () => {
    const d = structuredClone(byId('01'));
    const result = await runDialogue(db(), d, { model: 'scripted' });
    expect(scoreDialogue(d, result).pass).toBe(true);
    d.expected.booking.time = '21:00';
    expect(scoreDialogue(d, result)).toEqual({ pass: false, failed: ['booking.time'] });
    const other = structuredClone(byId('01'));
    other.expected.serverAction = 'request';
    expect(scoreDialogue(other, result).failed).toEqual(['serverAction']);
  });
});

describe('test rows only', () => {
  it('every row the eval writes is test: true, and a real business is never read or changed', async () => {
    await seedBusiness(db(), { businessId: 'real1' });
    await db().collection('businesses').updateOne({ _id: 'real1' }, { $set: { modules: ['frontdesk', 'tables'] } });
    await seedConversation(db(), { businessId: 'real1', waId: '972541230681' });
    await db().collection('requests').insertOne({ _id: 'real_rq', businessId: 'real1', status: 'qualified', kind: 'table' });
    const snapshot = async () => {
      const out = {};
      for (const c of [...WRITTEN, 'clients', 'businesses', 'frontDeskProfiles', 'floorPlans', 'knowledgeItems']) {
        out[c] = await db().collection(c).find({ $or: [{ businessId: 'real1' }, { _id: 'real1' }] }).sort({ _id: 1 }).toArray();
      }
      return out;
    };
    const before = await snapshot();

    const ids = [];
    for (const id of ['01', '02', '04', '06', '07', '21']) ids.push((await runDialogue(db(), byId(id), { model: 'scripted' })).businessId);
    for (const c of WRITTEN) {
      const rows = await db().collection(c).find({ businessId: { $in: ids } }).toArray();
      expect(rows.length, c).toBeGreaterThan(0);
      expect(rows.every(r => r.test === true), c).toBe(true);
    }
    const businesses = await db().collection('businesses').find({ _id: { $in: ids } }).toArray();
    expect(businesses.every(b => b.test === true)).toBe(true);
    expect(await snapshot()).toEqual(before);
  });
});
