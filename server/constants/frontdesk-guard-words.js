'use strict';
/**
 * Plan 689 (C-AI): the word lists the assistant's guardrails read. Frozen arrays of lower-case fragments, matched as
 * substrings of the text after lower-casing and removing Hebrew vowel points (see `frontdesk-guardrails.js`).
 * Data only: a list changes here without touching the checks. A second line, never the only one.
 */
const list = items => Object.freeze([...items]);

/** A guest message with one of these goes to a person at once (complaint, refund, allergy emergency). */
const HANDOFF = list([
  'תלונה', 'להתלונן', 'מתלונן', 'שירות גרוע', 'מנהל', 'complaint',
  'החזר כספי', 'זיכוי', 'refund',
  'הרעלה', 'הרעלת מזון', 'אלרגיה חמורה', 'תגובה אלרגית', 'אפיפן', 'בית חולים', 'אמבולנס',
]);

/** R-05: a promise to come back later. */
const DEFERRED = list([
  'אבדוק ואחזור', 'אברר ואחזור', 'אברר ואעדכן', 'אבדוק ואעדכן', 'נחזור אליך עם', 'אחזור אליך',
  "i'll check", 'get back to you',
]);

/** R-06: a completion claim; the assistant never states one, whatever the facts say. */
const COMPLETION = list([
  'הוזמן', 'הזמנתי לכם', 'ההזמנה אושרה', 'השולחן אושר', 'שריינתי', 'שוריין', 'אישרתי',
  'עודכן בהצלחה', 'בוטל בהצלחה', 'confirmed', 'booked', 'reserved for you',
]);

/** R-20: the assistant's internals stay internal. */
const INTERNALS = list([
  'questionkey', 'party_size', 'usedfacts', 'systeminstruction', 'system prompt', 'ההנחיות שלי', 'הפרומפט',
]);

/** R-18: a greeting is not a request (whole message, punctuation trimmed). */
const GREETINGS = list([
  'היי', 'הי', 'שלום', 'בוקר טוב', 'ערב טוב', 'צהריים טובים', 'מה נשמע', 'אהלן', 'hello', 'hi', 'hey',
]);

/** R-02: a guest asks to be removed (whole phrases; "not now" is not a removal). */
const REMOVAL_WORDS = list([
  'הסירו אותי', 'תסירו אותי', 'אל תכתבו לי', 'להסיר אותי', 'stop',
]);

const GUARD_WORDS = Object.freeze({ HANDOFF, DEFERRED, COMPLETION, INTERNALS, GREETINGS, REMOVAL_WORDS });

module.exports = { GUARD_WORDS, HANDOFF, DEFERRED, COMPLETION, INTERNALS, GREETINGS, REMOVAL_WORDS };
