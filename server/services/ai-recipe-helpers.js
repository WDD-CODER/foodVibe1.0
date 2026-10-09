'use strict';
/**
 * Pure helpers for the Gemini recipe routes in routes/ai.js (plan 370): response parsing,
 * draft validation and unit normalization, soft quality warnings, and few-shot example
 * selection/formatting. No I/O here — everything is unit-testable offline
 * (server/test/ai-recipe-helpers.test.js).
 */

const CANONICAL_UNITS = new Set([
  'gram', 'ml', 'kg', 'liter', 'unit', 'tablespoon', 'teaspoon', 'cup', 'pinch', 'portion',
]);

const RECIPE_TYPES = new Set(['dish', 'preparation']);

// Common non-canonical unit words Gemini sometimes substitutes for a
// count-based ingredient (e.g. "4 cloves of garlic" -> unit: "clove").
// Mapped to "unit" — the canonical key for countable ingredients — instead
// of failing validation and discarding an otherwise-correct recipe.
const UNIT_SYNONYMS = {
  clove: 'unit', cloves: 'unit',
  piece: 'unit', pieces: 'unit',
  slice: 'unit', slices: 'unit',
  leaf: 'unit', leaves: 'unit',
  stalk: 'unit', stalks: 'unit',
  sprig: 'unit', sprigs: 'unit',
  can: 'unit', cans: 'unit',
  bunch: 'unit', bunches: 'unit',
};

/**
 * Rewrites known non-canonical unit synonyms to their canonical key in place.
 */
function normalizeIngredientUnits(recipe) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return;
  for (const ing of recipe.ingredients) {
    if (!ing || typeof ing.unit !== 'string') continue;
    const canonical = UNIT_SYNONYMS[ing.unit.trim().toLowerCase()];
    if (canonical) ing.unit = canonical;
  }
}

/**
 * Extracts a JSON payload from a Gemini text response. Strips markdown code
 * fences first; if a direct parse still fails (e.g. Gemini echoed surrounding
 * prose or a few-shot "prompt:/output:" label instead of returning bare
 * JSON), falls back to slicing the outermost {...} block and retrying.
 * Returns { value } on success or { error: 'empty' | 'invalid' } on failure.
 */
function extractJsonPayload(raw) {
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/i;
  const fenceMatch = fencePattern.exec(raw);
  const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim();
  if (!cleaned) return { error: 'empty' };
  try {
    return { value: JSON.parse(cleaned) };
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return { value: JSON.parse(cleaned.slice(start, end + 1)) };
      } catch {
        return { error: 'invalid' };
      }
    }
    return { error: 'invalid' };
  }
}

/**
 * Validates the shape and unit values of a Gemini-generated AiRecipeDraft.
 * Returns an array of error strings; empty means valid.
 */
function validateRecipeDraft(recipe) {
  const errors = [];
  if (!recipe || typeof recipe !== 'object') return ['recipe must be an object'];
  if (typeof recipe.nameHebrew !== 'string' || !recipe.nameHebrew.trim()) errors.push('nameHebrew is required');
  if (!RECIPE_TYPES.has(recipe.recipe_type)) errors.push(`recipe_type must be "dish" or "preparation", got "${recipe.recipe_type}"`);
  if (typeof recipe.yield_amount !== 'number') errors.push('yield_amount must be a number');
  if (typeof recipe.yield_unit !== 'string' || !recipe.yield_unit.trim()) errors.push('yield_unit is required');
  if (!Array.isArray(recipe.ingredients)) {
    errors.push('ingredients must be an array');
  } else {
    recipe.ingredients.forEach((ing, i) => {
      if (typeof ing.name !== 'string' || !ing.name.trim()) errors.push(`ingredients[${i}].name is required`);
      if (typeof ing.amount !== 'number') errors.push(`ingredients[${i}].amount must be a number`);
      if (!CANONICAL_UNITS.has(ing.unit)) errors.push(`ingredients[${i}].unit "${ing.unit}" is not a canonical key`);
    });
  }
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) errors.push('steps must be a non-empty array');
  return errors;
}

// ---------------------------------------------------------------------------
// Portion-weight plausibility (plan 370)
// ---------------------------------------------------------------------------

/** Grams per one of each canonical unit. Units missing here (portion) are skipped. */
const GRAMS_PER_UNIT = {
  gram: 1,
  kg: 1000,
  ml: 1,
  liter: 1000,
  tablespoon: 15,
  teaspoon: 5,
  cup: 240,
  pinch: 0,
};

/** "unit" is only weighable for eggs (≈55 g each); other countable items are skipped. */
const EGG_GRAMS = 55;
const EGG_NAME_PATTERN = /ביצ|\begg/i;

const MIN_GRAMS_PER_PORTION = 60;
const MAX_GRAMS_PER_PORTION = 700;

const IMPLAUSIBLE_PORTION_WEIGHT_WARNING = 'כמויות הרכיבים לא סבירות ביחס למספר המנות';

// The model returns 'portion'; the draft editor emits 'dish' (מנה) for an approved dish. Both mean portions.
const PORTION_YIELD_UNITS = new Set(['portion', 'dish']);

/**
 * Rough grams per portion for a dish draft, from the ingredients whose units can be
 * weighed. Returns null when it can't be estimated (not a portioned dish, no portions,
 * or no weighable ingredient).
 */
function estimateGramsPerPortion(draft) {
  if (!draft || draft.recipe_type !== 'dish' || !PORTION_YIELD_UNITS.has(draft.yield_unit)) return null;
  if (typeof draft.yield_amount !== 'number' || draft.yield_amount <= 0) return null;
  if (!Array.isArray(draft.ingredients)) return null;
  let total = 0;
  let weighed = 0;
  for (const ing of draft.ingredients) {
    if (!ing || typeof ing.amount !== 'number' || ing.amount <= 0) continue;
    let perUnit = GRAMS_PER_UNIT[ing.unit];
    if (ing.unit === 'unit' && typeof ing.name === 'string' && EGG_NAME_PATTERN.test(ing.name)) perUnit = EGG_GRAMS;
    if (perUnit === undefined) continue;
    total += ing.amount * perUnit;
    weighed++;
  }
  if (weighed === 0) return null;
  return total / draft.yield_amount;
}

function isImplausiblePortionWeight(draft) {
  const perPortion = estimateGramsPerPortion(draft);
  if (perPortion === null) return false;
  return perPortion < MIN_GRAMS_PER_PORTION || perPortion > MAX_GRAMS_PER_PORTION;
}

/**
 * Computes soft quality warnings for a recipe draft without blocking save.
 */
function computeSoftWarnings(draft) {
  const warnings = [];
  if (Array.isArray(draft.ingredients) && draft.ingredients.length < 3) {
    warnings.push('מתכון עם מעט מרכיבים — ייתכן שהבינה הצליחה לחלץ חלקית בלבד');
  }
  if (typeof draft.yield_amount === 'number' && draft.yield_amount > 20) {
    warnings.push('כמות מנות גבוהה במיוחד — בדוק שהתפוקה הגיונית');
  }
  if (Array.isArray(draft.steps) && draft.steps.length < 2) {
    warnings.push('מספר שלבים נמוך — ייתכן שחסרות הוראות');
  }
  if (draft.recipe_type === 'dish' && draft.yield_unit === 'unit') {
    warnings.push('יחידת תפוקה לא סבירה למנה');
  }
  if (isImplausiblePortionWeight(draft)) {
    warnings.push(IMPLAUSIBLE_PORTION_WEIGHT_WARNING);
  }
  return warnings;
}

function escapeForPrompt(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function buildFewShotBlock(shots) {
  if (!Array.isArray(shots) || shots.length === 0) return '';
  const examples = shots
    .map(s => `קלט: "${escapeForPrompt(s.prompt)}"\nפלט: ${JSON.stringify(s.draft)}`)
    .join('\n\n');
  return `## דוגמאות מאושרות מהמשתמש\n${examples}\n\n`;
}

// ---------------------------------------------------------------------------
// Few-shot selection (plan 370) — relevance, not recency
// ---------------------------------------------------------------------------

const NIQQUD_PATTERN = /[֑-ׇ]/g;
const STOP_WORDS = new Set(['של', 'עם', 'את', 'על', 'או', 'גם', 'and', 'with', 'the', 'for']);

/** Lower-cased word tokens (≥ 2 chars) with Hebrew niqqud stripped and stop words dropped. */
function tokenize(text) {
  if (typeof text !== 'string') return new Set();
  const tokens = text
    .replace(NIQQUD_PATTERN, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Picks up to `n` approved shots relevant to the request: scores each by how many request
 * tokens appear in the shot's prompt or recipe name, keeps scores > 0, highest first (ties
 * keep the incoming order, i.e. newest first). No overlap → no shots, so unrelated recent
 * examples don't skew sizes.
 */
function selectShots(shots, prompt, n = 2) {
  if (!Array.isArray(shots) || shots.length === 0 || n <= 0) return [];
  const wanted = tokenize(prompt);
  if (wanted.size === 0) return [];
  return shots
    .map((shot, index) => {
      const have = tokenize(`${shot?.prompt ?? ''} ${shot?.draft?.nameHebrew ?? ''}`);
      let score = 0;
      for (const t of wanted) if (have.has(t)) score++;
      return { shot, score, index };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, n)
    .map(s => s.shot);
}

/** The Gemini model every AI route calls. */
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Lower than the default so portion counts and amounts are steadier between runs (plan 370). */
const RECIPE_GENERATION_CONFIG = { temperature: 0.4 };

/** System prompt for the recipe generate routes (text, image, URL). */
const SYSTEM_PROMPT = `אתה מנתח מתכונים מקצועי. תפקידך: לקבל תיאור חופשי (עברית או אנגלית) ולהחזיר JSON מובנה בלבד.

## כלל 1 — סוג המתכון (recipe_type)
- "dish" — מנה מוכנה לאכילה שמוגשת לסועד: סלט, מרק, פסטה, עוגה, שניצל, קציצות.
- "preparation" — בסיס שמשמש לבניית מנה אחרת: רוטב, ציר, בלילה, מרינדה, קרם, תערובת תבלינים.
כלל הכרעה: מוגש ישירות? → "dish". משמש כמרכיב אחר? → "preparation".

## כלל 2 — חילוץ מרכיבים (חשוב מאוד)
חפש מרכיבים בכל הטקסט — לא רק ברשימה מפורשת:
- בתוך שלבי הכנה: "מבשלים 5 ביצים" → { name: "ביצים", amount: 5, unit: "unit" }
- כמויות מרומזות: "מוסיפים מלח ופלפל" → מלח: amount 1 unit "pinch", פלפל: amount 1 unit "pinch"
- חומרים בלי כמות: הנח כמות סבירה בהתאם למנה
המרת כמויות מילוליות:
"רבע" / "¼" → 0.25 | "שליש" / "⅓" → 0.33 | "חצי" / "½" → 0.5 | "שלושה רבעים" → 0.75
"כף" → amount: 1, unit: "tablespoon" | "כפית" → amount: 1, unit: "teaspoon" | "קורט" → amount: 1, unit: "pinch"
שמות מרכיבים תמיד בעברית.
unit חייב להיות מפתח אנגלי קנוני מהרשימה הזו בלבד:
gram | ml | kg | liter | unit | tablespoon | teaspoon | cup | pinch | portion

## כלל 3 — תפוקה (yield)
- "dish": yield_unit = "portion" (אלא אם צוין אחרת). yield_amount = מספר המנות.
- "preparation": yield_unit = יחידת משקל/נפח מהרשימה למעלה. yield_amount = כמות.
- אם המשתמש ציין מספר מנות — השתמש בו בדיוק.
- אם לא צוין מספר מנות — קבע הגשה ריאלית למנה מהסוג הזה בבית או במסעדה. מנה אישית (כמו חביתה) = 1 מנה.
- אם צוינה רק כמות של מרכיב (למשל "חביתה מ-3 ביצים") — גזור ממנה את מספר המנות, ואל תשנה את הכמות שצוינה.

## כלל 3א — כמויות ביחס למנות (חשוב מאוד)
- כמויות המרכיבים הן עבור כל ה-yield_amount יחד, לא למנה אחת.
- כוון לכמויות ריאליות למנה: מנה עיקרית היא בדרך כלל 150–450 גרם למנה. חביתה — 2–3 ביצים למנה.
- לפני שתחזיר תשובה: חלק את סך הכמויות במספר המנות ובדוק שהתוצאה הגיונית לסועד אחד.

## כלל 4 — שלבים
כל שלב — ניסוח פעיל קצר בעברית. לא לחזור על מרכיבים כרשימה — רק הוראות.
- תמיד לפחות 2 שלבים, גם במתכון פשוט מאוד: פצל להכנה ולבישול/הרכבה/הגשה (למשל חביתה: "טורפים את הביצים עם מלח ופלפל", "מטגנים במחבת משומנת עד שמתייצבת").
- אל תאחד את כל ההוראות לשלב אחד ארוך.

## כלל 5 — ציוד מטבח (equipment) — אופציונלי
כלול את השדה "equipment" רק אם הטקסט מזכיר כלי בישול ספציפיים (סיר, מחבת, תנור, בלנדר וכד׳).
- כל פריט: { "name": "<שם עברי>", "quantity": <מספר> }
- שמות ציוד תמיד בעברית.
- אם הטקסט לא מזכיר ציוד ספציפי — אל תכלול את השדה כלל.

החזר JSON בלבד, ללא markdown, ללא הסברים:
{
  "nameHebrew": "...",
  "recipe_type": "dish" | "preparation",
  "yield_amount": number,
  "yield_unit": "...",
  "ingredients": [{ "name": "...", "amount": number, "unit": "..." }],
  "steps": ["..."],
  "equipment": [{ "name": "...", "quantity": number }]
}
השדה "equipment" הוא אופציונלי — השמט אותו אם אין ציוד.`;

module.exports = {
  GEMINI_MODEL,
  GEMINI_URL,
  RECIPE_GENERATION_CONFIG,
  SYSTEM_PROMPT,
  CANONICAL_UNITS,
  extractJsonPayload,
  validateRecipeDraft,
  normalizeIngredientUnits,
  computeSoftWarnings,
  estimateGramsPerPortion,
  IMPLAUSIBLE_PORTION_WEIGHT_WARNING,
  escapeForPrompt,
  buildFewShotBlock,
  selectShots,
};
