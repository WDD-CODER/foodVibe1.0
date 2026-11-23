'use strict';
/** Plan 679: fixedText reads the shipped dictionary and fills placeholders. */
const { fixedText, reasonText } = require('../utils/fixed-text');
const dictionary = require('../../public/assets/data/dictionary.json');

describe('fixedText', () => {
  it('fills a placeholder with the value', () => {
    const out = fixedText('fd_reason_closed_day', { days: 'א, ב' });
    expect(out).toBe(dictionary.general.fd_reason_closed_day.replace('{days}', 'א, ב'));
    expect(out).not.toContain('{');
  });

  it('throws UNKNOWN_TEXT_KEY for a missing key', () => {
    expect(() => fixedText('no_such_key_679')).toThrow(expect.objectContaining({ code: 'UNKNOWN_TEXT_KEY' }));
    expect(() => fixedText('toString')).toThrow(expect.objectContaining({ code: 'UNKNOWN_TEXT_KEY' }));
  });

  it('leaves no {…} when a parameter is missing', () => {
    const out = fixedText('fd_reason_closed_day');
    expect(out).not.toMatch(/\{|\}/);
  });

  it('has the two assistant sentences', () => {
    expect(fixedText('fd_ai_will_confirm')).toContain('קיבלנו');
    expect(fixedText('fd_ai_handoff_default')).toBeTruthy();
  });

  it('reasonText renders a reason key with its params', () => {
    expect(reasonText('fd_reason_closed_day|days=א;x=1')).toBe(fixedText('fd_reason_closed_day', { days: 'א' }));
  });
});
