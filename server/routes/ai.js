const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');

const router = Router();

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CANONICAL_UNITS = new Set([
  'gram', 'ml', 'kg', 'liter', 'unit', 'tablespoon', 'teaspoon', 'cup', 'pinch', 'portion',
]);

const RECIPE_TYPES = new Set(['dish', 'preparation']);

/**
 * Validates the shape and unit values of a Gemini-generated AiRecipeDraft.
 * Returns an array of error strings; empty means valid.
 */
function validateRecipeDraft(recipe) {
  const errors = [];
  if (!recipe || typeof recipe !== 'object') return ['recipe must be an object'];
  if (typeof recipe.name_hebrew !== 'string' || !recipe.name_hebrew.trim()) errors.push('name_hebrew is required');
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
- "dish": yield_unit = "portion" (אלא אם צוין אחרת). yield_amount = מספר מנות משוער.
- "preparation": yield_unit = יחידת משקל/נפח מהרשימה למעלה. yield_amount = כמות.
- אם לא צוין — הערך לפי הכמויות.

## כלל 4 — שלבים
כל שלב — ניסוח פעיל קצר בעברית. לא לחזור על מרכיבים כרשימה — רק הוראות.

החזר JSON בלבד, ללא markdown, ללא הסברים:
{
  "name_hebrew": "...",
  "recipe_type": "dish" | "preparation",
  "yield_amount": number,
  "yield_unit": "...",
  "ingredients": [{ "name": "...", "amount": number, "unit": "..." }],
  "steps": ["..."]
}`;

// ---------------------------------------------------------------------------
// POST /generate
// Accepts { prompt: string }, calls Gemini, returns { recipe: AiRecipeDraft }.
// Requires a valid JWT — prevents unauthenticated use of the API quota.
// ---------------------------------------------------------------------------

router.post('/generate', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + prompt.trim() }] }],
      }),
    });

    if (!geminiRes.ok) {
      console.error('[ai/generate] Gemini API error:', geminiRes.status);
      return res.status(502).json({ error: `Gemini API error: ${geminiRes.status}` });
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip markdown fences if Gemini wraps the JSON
    const fencePattern = /```(?:json)?\s*([\s\S]*?)```/i;
    const fenceMatch = fencePattern.exec(raw);
    const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim();

    if (!cleaned) {
      return res.status(502).json({ error: 'Gemini returned an empty response' });
    }

    let recipe;
    try {
      recipe = JSON.parse(cleaned);
    } catch {
      console.error('[ai/generate] JSON parse failed, raw:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    const validationErrors = validateRecipeDraft(recipe);
    if (validationErrors.length > 0) {
      console.error('[ai/generate] validation failed:', validationErrors, 'raw:', raw);
      return res.status(502).json({ error: 'Gemini returned a malformed recipe', details: validationErrors });
    }

    return res.json({ recipe });
  } catch (err) {
    console.error('[ai/generate]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /parse-text
// Accepts { rawText: string }, classifies as recipe|dish, returns { result: ParsedResult }.
// Requires a valid JWT.
// ---------------------------------------------------------------------------

const TEXT_IMPORT_SYSTEM_PROMPT = `You are a food data extraction assistant for a recipe management application.

Your job is to analyze plain text provided by the user and extract structured data from it.

STEP 1 — CLASSIFY
Decide whether the text describes:
- A "recipe": includes ingredients, quantities, and cooking steps/instructions
- A "dish": a food item or menu item without detailed cooking instructions

Set "type" to either "recipe" or "dish".
Set "confidence" between 0 and 1 to indicate how certain you are.

STEP 2 — EXTRACT
Extract all available fields from the text and populate the correct structure below.
If a field is not present in the text, set it to null.
Do not invent or assume data that is not in the text.
Preserve the original language of the text for all string values.

STEP 3 — RETURN
Return ONLY valid JSON. No explanation, no markdown, no code blocks. Raw JSON only.

If type is "recipe", return:
{
  "type": "recipe",
  "confidence": <number 0-1>,
  "data": {
    "name_hebrew": <string>,
    "serving_portions": <number | null>,
    "labels": <string[]>,
    "ingredients": [
      { "name_hebrew": <string>, "amount_net": <number | null>, "unit": <string | null> }
    ],
    "steps": [
      { "order": <number>, "instruction": <string> }
    ]
  }
}

If type is "dish", return:
{
  "type": "dish",
  "confidence": <number 0-1>,
  "data": {
    "name_hebrew": <string>,
    "serving_portions": <number | null>,
    "labels": <string[]>
  }
}`;

router.post('/parse-text', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { rawText } = req.body;
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required' });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: TEXT_IMPORT_SYSTEM_PROMPT + '\n\nText to analyze:\n' + rawText.trim() }] }],
      }),
    });

    if (!geminiRes.ok) {
      console.error('[ai/parse-text] Gemini API error:', geminiRes.status);
      return res.status(502).json({ error: `Gemini API error: ${geminiRes.status}` });
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const fencePattern = /```(?:json)?\s*([\s\S]*?)```/i;
    const fenceMatch = fencePattern.exec(raw);
    const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim();

    if (!cleaned) {
      return res.status(502).json({ error: 'Gemini returned an empty response' });
    }

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error('[ai/parse-text] JSON parse failed, raw:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    return res.json({ result });
  } catch (err) {
    console.error('[ai/parse-text]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
