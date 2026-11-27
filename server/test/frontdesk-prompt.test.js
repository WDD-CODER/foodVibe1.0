'use strict';
/** Plan 679 (R-08, R-09, R-11, R-16, R-20): the text of the request to the model. */
const { buildTurnBody, TURN_SYSTEM_PROMPT, TABLE_SYSTEM_PROMPT, todayBlock } = require('../services/frontdesk-prompt');

const NOW = Date.parse('2026-11-22T18:30:00+02:00');
const profile = {
  assistant: { level: 1, tone: 'formal' },
  requestKinds: {
    table: { enabled: true, rules: { minPartySize: 1 }, questions: [{ key: 'date', label: 'תאריך', type: 'date', required: true }] },
    event: { enabled: false, rules: {}, questions: [] },
  },
};
const facts = { text: '[f1] hours: Q: when | A: 9-17', factIds: ['f1'] };
const msg = (i, author) => ({ _id: 'm' + i, author, kind: 'text', text: 'GUESTWORD' + i, at: i });

describe('buildTurnBody', () => {
  it('keeps the rules in systemInstruction only, with no Hebrew and no guest data', () => {
    const history = [msg(1, 'guest')];
    const body = buildTurnBody({ profile, facts, history, now: NOW });
    const sys = body.systemInstruction.parts[0].text;
    expect(sys).toBe(TURN_SYSTEM_PROMPT.replace('{{TONE}}', 'formal'));
    expect(sys).not.toMatch(/[֐-׿]/);
    expect(sys).not.toContain('GUESTWORD');
    expect(sys).not.toContain('[f1]');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('puts the facts, today and the enabled kinds in the leading user part', () => {
    const body = buildTurnBody({ profile, facts, history: [], now: NOW });
    const lead = body.contents[0];
    expect(lead.role).toBe('user');
    expect(lead.parts[0].text).toContain(facts.text);
    expect(lead.parts[0].text).toContain('"table"');
    expect(lead.parts[0].text).not.toContain('"event"');
  });

  it('computes the today block in Jerusalem', () => {
    const t = todayBlock(NOW);
    for (const s of ['Sunday', '2026-11-22', '2026-11-23', '18:30', 'Asia/Jerusalem']) expect(t).toContain(s);
  });

  it('sends the last 12 of 15 messages, oldest first, guest as user and the rest as model', () => {
    const authors = ['guest', 'ai', 'member', 'server'];
    const history = Array.from({ length: 15 }, (_, i) => msg(i + 1, authors[i % 4]));
    const body = buildTurnBody({ profile, facts, history, now: NOW });
    const rest = body.contents.slice(1);
    expect(rest).toHaveLength(12);
    expect(rest[0].parts[0].text).toBe('GUESTWORD4');
    expect(rest[11].parts[0].text).toBe('GUESTWORD15');
    expect(rest.map(c => c.role)).toEqual(history.slice(3).map(m => (m.author === 'guest' ? 'user' : 'model')));
  });

  it('writes a button as its id and a template as its name', () => {
    const history = [
      { author: 'guest', kind: 'button', buttonId: 'CONFIRM:abc', text: '', at: 1 },
      { author: 'server', kind: 'template', template: { name: 'reminder', params: [] }, text: '', at: 2 },
    ];
    const rest = buildTurnBody({ profile, facts, history, now: NOW }).contents.slice(1);
    expect(rest[0].parts[0].text).toBe('CONFIRM:abc');
    expect(rest[1].parts[0].text).toBe('[template:reminder]');
  });
});

describe('table section (plan 680)', () => {
  const areas = [{ key: 'inside', name: 'Inside', order: 0 }, { key: 'bararea', name: 'Bar', order: 2 }];
  it('with tables on: the areas in the data block and the table section in the instruction', () => {
    const body = buildTurnBody({ profile, facts, history: [], now: NOW, tablesOn: true, areas });
    const sys = body.systemInstruction.parts[0].text;
    expect(sys).toContain(TABLE_SYSTEM_PROMPT);
    expect(sys).toContain('collected.table');
    expect(sys).not.toMatch(/[֐-׿]/);
    const lead = body.contents[0].parts[0].text;
    expect(lead).toContain('"key":"inside","name":"Inside"');
    expect(lead).toContain('"key":"bararea","name":"Bar"');
    expect(lead).not.toContain('"order"');
  });
  it('with tables off: neither is there', () => {
    const body = buildTurnBody({ profile, facts, history: [], now: NOW, areas });
    expect(body.systemInstruction.parts[0].text).not.toContain('collected.table');
    expect(body.contents[0].parts[0].text).not.toContain('AREAS');
    expect(body.contents[0].parts[0].text).not.toContain('Inside');
  });
});

describe('plan 753: unanswered guest messages', () => {
  const { unansweredTail } = require('../services/frontdesk-prompt');
  const leadOf = history => buildTurnBody({ profile, facts, history, now: NOW }).contents[0].parts[0].text;
  const guests = (n, from = 1) => Array.from({ length: n }, (_, i) => msg(from + i, 'guest'));

  it('the rules say to answer every one of them', () => {
    expect(TURN_SYSTEM_PROMPT).toContain('answer every one of them in a single reply');
  });

  it('with 0 or 1 guest message at the end there is no block, and the data block is what it was', () => {
    const none = leadOf([msg(1, 'guest'), msg(2, 'ai')]);
    expect(none).not.toContain('UNANSWERED');
    expect(leadOf([...guests(3), msg(4, 'ai'), msg(5, 'guest')])).toBe(none);
    expect(leadOf([])).toBe(none);
  });

  it('with 2 it says 2, with 7 it says 5, before the conversation', () => {
    const two = leadOf([msg(1, 'ai'), ...guests(2, 2)]);
    expect(two).toContain('=== UNANSWERED (data) ===\nGuest messages at the end of the conversation with no answer yet: 2\n=== CONVERSATION FOLLOWS ===');
    expect(leadOf(guests(7))).toContain('no answer yet: 5\n=== CONVERSATION FOLLOWS ===');
  });

  it('unansweredTail gives the messages after the newest one that is not the guest\'s, at most 5, oldest first', () => {
    const ids = history => unansweredTail(history).map(m => m._id);
    expect(ids([])).toEqual([]);
    expect(ids([msg(1, 'guest'), msg(2, 'member')])).toEqual([]);
    expect(ids([msg(1, 'guest'), msg(2, 'server'), msg(3, 'guest'), msg(4, 'guest')])).toEqual(['m3', 'm4']);
    expect(ids(guests(7))).toEqual(['m3', 'm4', 'm5', 'm6', 'm7']);
  });
});

describe('plan 731', () => {
  const { withShapeReminder, SHAPE_RETRY_LINE } = require('../services/frontdesk-prompt');
  it('the rules name a guest who asks to talk to a person as a handoff reason', () => {
    expect(TURN_SYSTEM_PROMPT).toContain('a guest who asks to talk to a person');
  });
  it('withShapeReminder adds the line to a new body and leaves the rest and the input alone', () => {
    const body = buildTurnBody({ profile, facts, history: [msg(1, 'guest')], now: NOW });
    const before = JSON.stringify(body);
    const next = withShapeReminder(body);
    expect(next).not.toBe(body);
    expect(next.systemInstruction.parts[0].text).toBe(body.systemInstruction.parts[0].text + '\n' + SHAPE_RETRY_LINE);
    expect(next.contents).toEqual(body.contents);
    expect(next.generationConfig).toEqual(body.generationConfig);
    expect(JSON.stringify(body)).toBe(before);
  });
});
