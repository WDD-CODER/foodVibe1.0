'use strict';
/** Plan 464 — a deliberately messy supplier message, the canned model reply for it, and the rows the route must return. */

const FAILING_LINE = 'עגבניה ניסיון 1 קילו 1 עוהל 50 שח';

const MESSY_TEXT = [
  'שלום וברכה, מחירון לשבוע הבא',
  FAILING_LINE,
  '5.9 ₪ לק"ג - מלפפון',
  'קילו בצל 3.5 שקל',
  'שמנת 32% 12 ש"ח ליטר',
  'ארגז 10 ק"ג תפוחי אדמה 45',
  "24 יח' בייגלה בקרטון 150",
].join('\n');

/** What a model that follows the prompt answers for MESSY_TEXT. */
const MODEL_REPLY = JSON.stringify({
  rows: [
    { name: 'עגבניה ניסיון', unit: 'kg', price: 50, pricePer: 'unit', purchaseUnit: null, purchaseQty: null, category: null },
    { name: 'מלפפון', unit: 'kg', price: 5.9, pricePer: 'unit', purchaseUnit: null, purchaseQty: null, category: null },
    { name: 'בצל', unit: 'kg', price: 3.5, pricePer: 'unit', purchaseUnit: null, purchaseQty: null, category: null },
    { name: 'שמנת 32%', unit: 'liter', price: 12, pricePer: 'unit', purchaseUnit: null, purchaseQty: null, category: null },
    { name: 'תפוחי אדמה', unit: 'kg', price: 45, pricePer: 'purchaseUnit', purchaseUnit: 'ארגז', purchaseQty: 10, category: null },
    { name: 'בייגלה', unit: 'unit', price: 150, pricePer: 'purchaseUnit', purchaseUnit: 'קרטון', purchaseQty: 24, category: null },
  ],
});

const row = (name, baseUnit, price, purchaseUnit = null, purchaseQty = null) => ({
  name, baseUnit, price, purchaseUnit, purchaseQty, category: null, needsReview: false, duplicate: false,
});

const EXPECTED_ROWS = [
  row('עגבניה ניסיון', 'kg', 50),
  row('מלפפון', 'kg', 5.9),
  row('בצל', 'kg', 3.5),
  row('שמנת 32%', 'liter', 12),
  row('תפוחי אדמה', 'kg', 4.5, 'ארגז', 10),
  row('בייגלה', 'unit', 6.25, 'קרטון', 24),
];

module.exports = { FAILING_LINE, MESSY_TEXT, MODEL_REPLY, EXPECTED_ROWS };
