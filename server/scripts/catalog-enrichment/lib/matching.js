'use strict'
/**
 * Plan 583 A4: pure name helpers that rank chain items against a catalog product name. The score only orders
 * candidates; whether an item is the same product is decided by judgment (A6/A7), never by the score alone.
 */

/** Brand and store words that say nothing about what the product is. */
const BRAND_TOKENS = new Set([
  'תנובה', 'שטראוס', 'אסם', 'עלית', 'טרה', 'יטבתה', 'תלמה', 'סוגת', 'מעדנות', 'שופרסל', 'קרפור', 'יוניליוור',
  'זוגלובק', 'טירת', 'הגליל', 'וילי', 'פוד', 'מותג', 'פרטי', 'נסטלה', 'קנור', 'יכין', 'מיה', 'ויליפוד', 'אחלה',
  'סנפרוסט', 'מאמא', 'שופרסל', 'אוסם', 'פרימור', 'מילומור', 'הנמל'
])

// The unit must end the word, so "3 מלפפונים" keeps "מלפפונים" (only the number goes).
const SIZE = /\d+(?:[.,]\d+)?(?:\s*(?:%|גרם|גר'?|ג'|ק"ג|ק״ג|קג|קילו|מ"ל|מ״ל|מל|ליטר|ל'|יח'?|יחידות|מ"מ|ס"מ|x|X|\*)(?![א-ת]))?/g

/** Niqqud, punctuation, sizes and brand words removed; one space between words. */
function normalizeHebrewName(name, { manufacturer = '' } = {}) {
  const maker = new Set(tokens(String(manufacturer)))
  return tokens(String(name ?? '')
    .replace(/[֑-ׇ]/g, '')
    .replace(/["״׳'`]/g, '')
    .replace(SIZE, ' ')
    .replace(/[^א-תA-Za-z0-9\s]/g, ' '))
    .filter(t => !BRAND_TOKENS.has(t) && !maker.has(t) && !/^\d+$/.test(t))
    .join(' ')
}

function tokens(s) {
  return s.toLowerCase().split(/\s+/).filter(Boolean)
}

/** Hebrew attaches ה / ו / ב / ל / מ / ש / כ to a word; strip one of them when the rest is a known token. */
function sameWord(a, b) {
  if (a === b) return true
  if (a.length >= 3 && b.length === a.length + 1 && 'הובלמשכ'.includes(b[0]) && b.slice(1) === a) return true
  if (b.length >= 3 && a.length === b.length + 1 && 'הובלמשכ'.includes(a[0]) && a.slice(1) === b) return true
  // plural / feminine endings: עגבניה ~ עגבניות, בצל ~ בצלים
  if (a.length < 3 || b.length < 3) return false
  const stems = w => new Set([w, ...['יות', 'ים', 'ות', 'יה', 'ה', 'ת', 'י'].filter(s => w.endsWith(s) && w.length - s.length >= 2).map(s => w.slice(0, -s.length))])
  const sa = stems(a)
  return [...stems(b)].some(s => sa.has(s))
}

/** Words that change what the item is (form, processing, a different product that contains the food). */
const FORM_WORDS = new Set([
  'קפוא', 'קפואה', 'קפואים', 'קפואות', 'מיובש', 'מיובשת', 'מיובשים', 'יבש', 'טחון', 'טחונה', 'כתוש', 'כתושה', 'קצוץ',
  'קצוצה', 'קצוצים', 'משומר', 'משומרים', 'מבושל', 'אבקה', 'אבקת', 'מוחמץ', 'כבוש', 'כבושים', 'תה', 'משקה', 'ממרח',
  'רוטב', 'חטיף', 'חטיפי', 'בטעם', 'סירופ', 'תמצית', 'גלידה', 'שוקולד', 'עוגיות', 'פריכיות', 'מרק', 'תיבול', 'תערובת',
  'פתיתי', 'ציפס', 'במבה', 'ביסלי', 'קרם', 'נקטר', 'מיץ', 'רסק', 'שימורי', 'פרוס', 'פרוסות', 'מגורד', 'מעושן', 'גבישי', 'מוקפא', 'מוקפאת', 'מוקפאים'
])

/**
 * 0..1: how much of the product name the item covers (most weight), and how little the item adds. A word that
 * changes the item's form and is not in the product name costs 0.25; an exact name gets the full score.
 */
function scoreMatch(productName, itemName) {
  const p = tokens(normalizeHebrewName(productName))
  const i = tokens(normalizeHebrewName(itemName))
  if (!p.length || !i.length) return 0
  const hit = p.filter(t => i.some(u => sameWord(t, u))).length
  if (!hit) return 0
  const recall = hit / p.length
  const precision = i.filter(u => p.some(t => sameWord(t, u))).length / i.length
  const firstWord = sameWord(p[0], i[0]) ? 0.1 : 0
  if (recall === 1 && precision === 1) return 1
  const form = i.some(u => FORM_WORDS.has(u) && !p.some(t => sameWord(t, u))) ? 0.25 : 0
  return Math.max(0, Math.min(1, Math.round((0.65 * recall + 0.25 * precision + firstWord - form) * 1000) / 1000))
}

module.exports = { normalizeHebrewName, scoreMatch, tokens, sameWord }
