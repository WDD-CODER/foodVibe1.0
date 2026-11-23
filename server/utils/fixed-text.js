'use strict';
/**
 * Plan 679: a fixed Hebrew sentence leaves the server as text, read from the shipped dictionary (`general`), never
 * written in code. `{name}` placeholders are filled from `params`; a missing parameter becomes an empty string.
 */
const { parseReason } = require('../generated/schemas/front-desk/qualify');

const general = require('../../public/assets/data/dictionary.json').general;

function fixedText(key, params = {}) {
  const raw = general && Object.prototype.hasOwnProperty.call(general, key) ? general[key] : undefined;
  if (typeof raw !== 'string') throw Object.assign(new Error('UNKNOWN_TEXT_KEY'), { code: 'UNKNOWN_TEXT_KEY' });
  return raw.replace(/\{(\w+)\}/g, (_m, name) => String(params[name] ?? ''));
}

/** The sentence of one qualification reason (`key|a=1;b=2`). */
function reasonText(reason) {
  const { key, params } = parseReason(reason);
  return fixedText(key, params);
}

module.exports = { fixedText, reasonText };
