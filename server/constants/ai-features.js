'use strict';
/** Closed list of AI feature keys for the usage ledger (plan 566, C-AIUSAGE). */
const AI_FEATURES = Object.freeze([
  'recipe_generate',
  'parse_text',
  'generate_from_url',
  'parse_price_list',
  'product_match',
  'product_from_image',
  'receipt_photo',
  'knowledge_import',
  'frontdesk_turn',
  'frontdesk_suggest',
  'voice_transcribe',
  'knowledge_correction',
  'eval',
  // Plan 566 extension: routes the contract list missed (R-21: every call metered).
  'recipe_patch',
  'menu_generate',
  'menu_patch',
  'product_generate',
  'product_patch',
  'recipe_from_image',
]);

function isAiFeature(key) {
  return typeof key === 'string' && AI_FEATURES.includes(key);
}

module.exports = { AI_FEATURES, isAiFeature };
