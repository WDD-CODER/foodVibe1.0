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
