'use strict';
/** Plan 751 (R-24): date words and clock times, in Asia/Jerusalem. Pure; the source is `date-words.ts`. */
const { dateFromWords, clockTimeOf } = require('../generated/schemas/front-desk/date-words');

const at = iso => Date.parse(iso);
const NOW = at('2026-11-26T10:00:00Z'); // Thursday 12:00 in Jerusalem
/** `[text, expected]` rows, all read at `now`. */
const check = (now, rows) => {
  it.each(rows)('"%s" → %s', (text, expected) => {
    expect(dateFromWords(text, now)).toBe(expected);
  });
};
const each = (expected, texts) => texts.map(text => [text, expected]);

describe('dateFromWords: words', () => {
  check(NOW, [
    ['אפשר שולחן לארבעה מחר ב-20:00?', '2026-11-27'],
    ...each('2026-11-26', ['היום בערב', 'שולחן להערב', 'הלילה', 'tonight']),
    ...each('2026-11-28', ['מחרתיים בצהריים', 'the day after tomorrow']),
    ...each('2026-11-27', ['למחר', 'tomorrow at 8', 'ביום שישי', 'שישי הקרוב', 'לשישי בערב', 'next Friday']),
    ['בשבת', '2026-11-28'],
    ...each('2026-11-29', ['יום ראשון', 'on Sunday']),
    ['ביום שני', '2026-11-30'],
    ...each('2026-12-03', ['יום חמישי', 'חמישי הבא', 'Thursday']),
  ]);
});

describe('dateFromWords: numbers', () => {
  check(NOW, [
    ['26/11', '2026-11-26'],
    ['25.11', '2027-11-25'],
    ...each('2026-12-01', ['1/12/26', '01.12.2026']),
    ...each(null, ['25/11/2026', '31/2', 'ב-20.00', 'ב-8.30']),
    ['2026-12-05T20:00', '2026-12-05'],
  ]);
});

describe('dateFromWords: no date, or two', () => {
  check(NOW, [
    ...each(null, ['שולחן לשני אנשים', 'אפשר לשבת בחוץ?', 'ערב שבת', 'שלום', '', 'מחר או בשבת']),
    ['מחר, יום שישי', '2026-11-27'],
  ]);
});

describe('dateFromWords: Thursday 23:59 in Jerusalem', () => {
  check(at('2026-11-26T21:59:00Z'), [['מחר', '2026-11-27'], ['היום', '2026-11-26']]);
});

describe('dateFromWords: Friday 00:01 in Jerusalem', () => {
  check(at('2026-11-26T22:01:00Z'), [
    ['מחר', '2026-11-28'], ['היום', '2026-11-27'], ['שישי', '2026-12-04'], ['שבת', '2026-11-28'],
  ]);
});

describe('dateFromWords: summer time, Wednesday 00:30', () => {
  check(at('2026-06-30T21:30:00Z'), [['מחר', '2026-07-02'], ['היום', '2026-07-01']]);
});

describe('dateFromWords: the week wraps on Saturday', () => {
  check(at('2026-11-28T10:00:00Z'), [
    ...each('2026-11-29', ['מחר', 'ביום ראשון']), ['שבת', '2026-12-05'], ['בשישי', '2026-12-04'],
  ]);
});

describe('dateFromWords: the year wraps', () => {
  check(at('2026-12-31T10:00:00Z'), [...each('2027-01-01', ['מחר', '1/1']), ['31/12', '2026-12-31']]);
});

describe('clockTimeOf', () => {
  it.each([
    ['8:00', '08:00'], ['20:00', '20:00'], ['20:00:00', '20:00'], ['20.30', '20:30'], [' 9:05 ', '09:05'],
    ...each(null, ['24:00', '20:60', '8', '8 בערב', '']),
  ])('"%s" → %s', (value, expected) => {
    expect(clockTimeOf(value)).toBe(expected);
  });
});
