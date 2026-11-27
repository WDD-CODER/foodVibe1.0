'use strict';
/**
 * Plan 756: the words of the assistant page's two tabs. Every step has its two sentences, with no typed number (the
 * engine's numbers come from the setup read), and every setting has its name.
 */
const fs = require('node:fs');
const path = require('node:path');
const { RUN_STEP_KEYS } = require('../generated/schemas/entities');

const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
const general = JSON.parse(read('public/assets/data/dictionary.json')).general;

/** The ids of `SETTING_ROWS`, read from the browser's source so the two cannot drift apart. */
const settingIds = () => {
  const source = read('src/app/pages/frontdesk/assistant/assistant-settings.data.ts');
  const rows = source.slice(source.indexOf('export const SETTING_ROWS'));
  return [...rows.matchAll(/(?:\bid: |fixedNumber\(\s*)'([a-z_]+)'/g)].map(m => m[1]);
};

describe('plan 756: the dictionary of the assistant page', () => {
  it('has what each of the 13 steps does and reads, with no number in the text', () => {
    const keys = RUN_STEP_KEYS.flatMap(key => ['asr_flow_what_' + key, 'asr_flow_reads_' + key]);
    expect(keys).toHaveLength(26);
    for (const key of keys) {
      expect(general[key], key).toEqual(expect.any(String));
      expect(general[key], key).not.toMatch(/[0-9]/);
    }
  });

  it('names every one of the 26 settings', () => {
    const ids = settingIds();
    expect(new Set(ids).size).toBe(26);
    for (const id of ids) expect(general['asr_set_' + id], id).toEqual(expect.any(String));
  });

  it('has every key in lower case, as the translation looks it up', () => {
    const keys = Object.keys(general).filter(key => key.startsWith('asr_'));
    expect(keys.filter(key => key !== key.toLowerCase())).toEqual([]);
  });

  it('types no wait of 1.5 into any text of the page', () => {
    const texts = Object.entries(general).filter(([key]) => key.startsWith('asr_'));
    expect(texts.length).toBeGreaterThan(100);
    for (const [key, text] of texts) expect(text, key).not.toContain('1.5');
  });
});
