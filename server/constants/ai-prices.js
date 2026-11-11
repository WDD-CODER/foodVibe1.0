'use strict';
/**
 * USD per 1M tokens, Standard paid tier (text/image/video input; output includes thinking tokens).
 * The free tier is still estimated at these prices: that is the number pricing needs (plan 566).
 */
const PRICES_AS_OF = '2026-11-10';
const PRICES_SOURCE = 'https://ai.google.dev/gemini-api/docs/pricing';

const AI_PRICES = Object.freeze({
  'gemini-3.1-flash-lite': { inputPerMTok: 0.25, outputPerMTok: 1.5 },
  'gemini-3.5-flash-lite': { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  'gemini-2.5-flash-lite': { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  'gemini-2.5-flash': { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  'gemini-3.6-flash': { inputPerMTok: 1.5, outputPerMTok: 7.5 },
  'gemini-3.8-flash': { inputPerMTok: 0.375, outputPerMTok: 1.875 },
  'gemini-3-flash-preview': { inputPerMTok: 0.5, outputPerMTok: 3.0 },
});

module.exports = { AI_PRICES, PRICES_AS_OF, PRICES_SOURCE };
