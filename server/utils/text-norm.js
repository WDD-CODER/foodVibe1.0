'use strict'
/**
 * Plan 755: lower-case text with the Hebrew vowel points removed. One copy for the guardrails and the fact picker.
 */
const NIQQUD_RE = /[֑-ׇ]/g
const norm = text => String(text ?? '').toLowerCase().replace(NIQQUD_RE, '')

module.exports = { norm, NIQQUD_RE }
