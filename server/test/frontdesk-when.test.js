'use strict';
/** Plan 751 (R-24): `fillWhen` fills the date the model left out. Pure: no database, no model. */
const { fillWhen, currentGuestText, CURRENT_WINDOW_MS } = require('../services/frontdesk-when');

const NOW = Date.parse('2030-01-07T10:00:00+02:00'); // a Monday, Jerusalem
const TOMORROW = '2030-01-08';
const MIN = 60000;
const TEXT = 'אפשר שולחן לארבעה מחר ב-20:00?';
const guest = (text, at = NOW, kind = 'text') => ({ direction: 'in', author: 'guest', kind, text, at });
const out = (at = NOW) => ({ direction: 'out', author: 'ai', kind: 'text', text: 'מחר', at });
const profile = {
  requestKinds: {
    table: { enabled: true, questions: [{ key: 'date' }, { key: 'time' }, { key: 'party_size' }] },
    event: { enabled: true, questions: [{ key: 'party_size' }] },
  },
};
const fill = (answer, history = [guest('מחר')]) => fillWhen(answer, { history, now: NOW, profile });
const book = (table, intent = 'book') => ({ reply: 'x', intent, collected: { table } });
const request = (collected, kind = 'table') => ({ reply: 'x', intent: 'request', kind, collected });

describe('book', () => {
  it('fills a missing date from the guest message and does not mutate the input', () => {
    const answer = book({ time: '20:00', partySize: 4 });
    const before = structuredClone(answer);
    const res = fill(answer, [guest(TEXT)]);
    expect(res.answer.collected.table).toEqual({ date: TOMORROW, time: '20:00', partySize: 4 });
    expect(res).toMatchObject({ dateFrom: 'guest', timeFixed: false });
    expect(answer).toEqual(before);
  });

  it('never replaces a valid date of the model: the very same answer', () => {
    const answer = book({ date: '2030-01-10', time: '20:00', partySize: 4 });
    const res = fill(answer, [guest(TEXT)]);
    expect(res.answer).toBe(answer);
    expect(res.dateFrom).toBeNull();
  });

  it('resolves the model\'s own word first, the guest\'s words second', () => {
    const own = fill(book({ date: 'מחר' }), [guest('בשבת')]);
    expect(own.answer.collected.table.date).toBe(TOMORROW);
    expect(own.dateFrom).toBe('model');
    const said = fill(book({ date: 'someday' }), [guest('בשבת')]);
    expect(said.answer.collected.table.date).toBe('2030-01-12');
    expect(said.dateFrom).toBe('guest');
  });

  it('creates the table object when it is missing', () => {
    const res = fill({ reply: 'x', intent: 'book', collected: {} });
    expect(res.answer.collected.table).toEqual({ date: TOMORROW });
  });
});

describe('which messages are read', () => {
  const dateOf = history => fill(book({ partySize: 4 }), history);

  it('nothing older than the last outbound message', () => {
    const res = dateOf([guest('מחר', NOW - 60000), out(NOW - 50000), guest('לארבעה')]);
    expect(res.answer.collected.table.date).toBeUndefined();
    expect(res.dateFrom).toBeNull();
  });

  it('every guest message after it', () => {
    const res = dateOf([out(NOW - 2 * MIN), guest('שולחן לארבעה', NOW - MIN), guest('מחר בערב')]);
    expect(res.answer.collected.table.date).toBe(TOMORROW);
  });

  it('a message of the same millisecond as the outbound one counts as answered, in either order', () => {
    expect(currentGuestText([out(NOW - MIN), guest('מחר', NOW - MIN), guest('לארבעה')], NOW)).toBe('לארבעה');
  });

  it.each([
    ['older than 30 minutes', [guest('מחר', NOW - 31 * MIN), guest('שולחן')]],
    ['a button tap', [guest('מחר', NOW, 'button')]],
    ['two different dates', [guest('מחר או בשבת')]],
  ])('no date: %s', (_name, history) => {
    const res = dateOf(history);
    expect(res.answer.collected.table.date).toBeUndefined();
    expect(res.dateFrom).toBeNull();
  });

  it('currentGuestText joins the current texts and answers an empty string for none', () => {
    expect(CURRENT_WINDOW_MS).toBe(30 * MIN);
    expect(currentGuestText([guest('א', NOW - 30 * MIN), guest(''), guest('ב')], NOW)).toBe('א\nב');
    expect(currentGuestText([guest('א'), out()], NOW)).toBe('');
    expect(currentGuestText([], NOW)).toBe('');
  });
});

describe('the other intents', () => {
  it('change: the guest\'s words are not read', () => {
    const res = fill(book({ time: '21:00' }, 'change'), [guest('יש לי הזמנה למחר, תזיזו ל-9')]);
    expect(res.answer.collected.table).toEqual({ time: '21:00' });
    expect(res.dateFrom).toBeNull();
  });

  it('change: the model\'s own word is resolved', () => {
    const res = fill(book({ date: 'tomorrow' }, 'change'));
    expect(res.answer.collected.table.date).toBe(TOMORROW);
    expect(res.dateFrom).toBe('model');
  });

  it.each(['cancel', 'question', 'smalltalk', 'other'])('%s: the same answer object', intent => {
    const answer = book({}, intent);
    const res = fill(answer);
    expect(res).toEqual({ answer, dateFrom: null, timeFixed: false });
    expect(res.answer).toBe(answer);
  });

  it('request: the guest\'s words fill the date of a kind that asks for it', () => {
    const res = fill(request({ time: '19:00', party_size: '4' }));
    expect(res.answer.collected).toEqual({ date: TOMORROW, time: '19:00', party_size: '4' });
    expect(res.dateFrom).toBe('guest');
  });

  it('request: a kind without a date question gets no date', () => {
    const answer = request({ party_size: '4' }, 'event');
    const res = fill(answer);
    expect(res.answer).toBe(answer);
    expect(res.dateFrom).toBeNull();
  });

  it('request: the model\'s own word is resolved', () => {
    const res = fill(request({ date: 'tomorrow' }), [guest('שלום')]);
    expect(res.answer.collected.date).toBe(TOMORROW);
    expect(res.dateFrom).toBe('model');
  });
});

describe('times', () => {
  it('book: a clock time gets its HH:mm form', () => {
    const res = fill(book({ date: TOMORROW, time: '8:00' }));
    expect(res.answer.collected.table.time).toBe('08:00');
    expect(res.timeFixed).toBe(true);
  });

  it('book: a time in words stays', () => {
    const answer = book({ date: TOMORROW, time: '8 בערב' });
    const res = fill(answer);
    expect(res.answer).toBe(answer);
    expect(res.timeFixed).toBe(false);
  });

  it('request: a clock time gets its HH:mm form', () => {
    const res = fill(request({ date: TOMORROW, time: '9:30' }));
    expect(res.answer.collected.time).toBe('09:30');
    expect(res.timeFixed).toBe(true);
  });
});
