const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');

const router = Router();

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ---------------------------------------------------------------------------
// Shared daily call counter — stored in MongoDB so all users + the Python
// seeder share a single 1,000 calls/day limit.
//
// Collection: GEMINI_USAGE
// Document:   { _id: "YYYY-MM-DD", count: N }
// ---------------------------------------------------------------------------

const DAILY_LIMIT = 1000;
const USAGE_COLLECTION = 'GEMINI_USAGE';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function usageCol() {
  return mongoose.connection.db.collection(USAGE_COLLECTION);
}

/**
 * Returns today's call count without modifying it.
 */
async function getUsageCount() {
  try {
    const doc = await usageCol().findOne({ _id: todayKey() });
    return doc ? doc.count : 0;
  } catch {
    return 0; // treat DB errors as non-blocking
  }
}

/**
 * Atomically increments today's counter by 1.
 * Returns the new count after increment.
 */
async function incrementUsage() {
  try {
    const result = await usageCol().findOneAndUpdate(
      { _id: todayKey() },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    return result?.count ?? 1;
  } catch {
    return null; // non-blocking — don't crash the AI call
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/ai/usage
// Public endpoint — returns today's call count, limit, and remaining quota.
// Used by the Angular frontend to show a live usage indicator.
// ---------------------------------------------------------------------------
router.get('/usage', async (_req, res) => {
  const count = await getUsageCount();
  res.json({
    date:      todayKey(),
    count,
    limit:     DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
  });
});

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

## כלל 5 — ציוד מטבח (equipment) — אופציונלי
כלול את השדה "equipment" רק אם הטקסט מזכיר כלי בישול ספציפיים (סיר, מחבת, תנור, בלנדר וכד׳).
- כל פריט: { "name": "<שם עברי>", "quantity": <מספר> }
- שמות ציוד תמיד בעברית.
- אם הטקסט לא מזכיר ציוד ספציפי — אל תכלול את השדה כלל.

החזר JSON בלבד, ללא markdown, ללא הסברים:
{
  "name_hebrew": "...",
  "recipe_type": "dish" | "preparation",
  "yield_amount": number,
  "yield_unit": "...",
  "ingredients": [{ "name": "...", "amount": number, "unit": "..." }],
  "steps": ["..."],
  "equipment": [{ "name": "...", "quantity": number }]
}
השדה "equipment" הוא אופציונלי — השמט אותו אם אין ציוד.`;

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

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
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

    await incrementUsage();
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

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
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

    await incrementUsage();
    return res.json({ result });
  } catch (err) {
    console.error('[ai/parse-text]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /patch-recipe
// Accepts { currentRecipe: AiRecipeDraft, instruction: string }.
// Gemini reads the current recipe + user instruction and returns ONLY the
// fields that should change as a sparse patch object.
// Response: { changes: { name_hebrew?, ingredients?, steps?, yield_amount?, yield_unit?, equipment? } }
// Requires a valid JWT.
// ---------------------------------------------------------------------------

const PATCH_SYSTEM_PROMPT = `You are an intelligent recipe editor. You will receive:
1. The CURRENT RECIPE as a JSON object
2. The USER'S INSTRUCTION — a natural-language request (possibly spoken, informal, Hebrew or English)

Your job is to produce a SPARSE PATCH — a JSON object containing ONLY the fields the user asked to change.
Do NOT include fields that were not mentioned or implied by the instruction.

## Rules

### Field keys you may include in the patch:
- "name_hebrew" — string: new recipe name
- "yield_amount" — number: new yield amount
- "yield_unit" — string: canonical unit key (gram | ml | kg | liter | unit | tablespoon | teaspoon | cup | pinch | portion)
- "ingredients" — array: FULL replacement array [ { name, amount, unit } ] — only if user asked to change ingredients
- "steps" — array: FULL replacement string array [ "step text", ... ] — only if user asked to change steps/instructions
- "equipment" — array: FULL replacement array [ { "name": "<Hebrew name>", "quantity": <number> } ] — only if user explicitly mentions tools, equipment, or kitchen gear

### Decision rules:
- If user says "only add steps" / "add preparation steps" / "create the instructions" → include ONLY "steps"
- If user says "change the name to X" → include ONLY "name_hebrew"
- If user pastes a full recipe text → extract all fields and include all of them
- If ambiguous, prefer minimal changes — only include what is clearly requested
- Include "equipment" ONLY when the user explicitly mentions tools, equipment, kitchen gear, or utensils — do not infer equipment from steps

### Ingredient rules (when included):
- unit must be a canonical key: gram | ml | kg | liter | unit | tablespoon | teaspoon | cup | pinch | portion
- name always in Hebrew
- amount is a number

### Step rules (when included):
- Each step is a short active Hebrew sentence
- Do not repeat ingredients as a list — only instructions

### Equipment rules (when included):
- Each item: { "name": "<Hebrew name>", "quantity": <number> }
- Equipment names must be in Hebrew
- quantity is a whole number (how many of that item are needed)

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Raw JSON only.

Format:
{
  "changes": {
    ... only the fields being changed ...
  }
}`;

router.post('/patch-recipe', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
  }

  const { currentRecipe, instruction } = req.body;
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return res.status(400).json({ error: 'instruction is required' });
  }
  if (!currentRecipe || typeof currentRecipe !== 'object') {
    return res.status(400).json({ error: 'currentRecipe is required' });
  }

  const userContent = `CURRENT RECIPE:\n${JSON.stringify(currentRecipe, null, 2)}\n\nUSER INSTRUCTION:\n${instruction.trim()}`;

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PATCH_SYSTEM_PROMPT + '\n\n' + userContent }] }],
      }),
    });

    if (!geminiRes.ok) {
      console.error('[ai/patch-recipe] Gemini API error:', geminiRes.status);
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

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[ai/patch-recipe] JSON parse failed, raw:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    if (!parsed.changes || typeof parsed.changes !== 'object') {
      return res.status(502).json({ error: 'Gemini response missing "changes" key' });
    }

    await incrementUsage();
    return res.json({ changes: parsed.changes });
  } catch (err) {
    console.error('[ai/patch-recipe]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /generate-from-image
// Accepts { imageBase64: string, mimeType: string }.
// Sends the image to Gemini via inline_data alongside the SYSTEM_PROMPT and
// returns { recipe: AiRecipeDraft }.
// Requires a valid JWT.
// ---------------------------------------------------------------------------

router.post('/generate-from-image', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }
  if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
    return res.status(400).json({ error: 'mimeType must be a valid image MIME type' });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        }],
      }),
    });

    if (!geminiRes.ok) {
      console.error('[ai/generate-from-image] Gemini API error:', geminiRes.status);
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

    let recipe;
    try {
      recipe = JSON.parse(cleaned);
    } catch {
      console.error('[ai/generate-from-image] JSON parse failed, raw:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    const validationErrors = validateRecipeDraft(recipe);
    if (validationErrors.length > 0) {
      console.error('[ai/generate-from-image] validation failed:', validationErrors, 'raw:', raw);
      return res.status(502).json({ error: 'Gemini returned a malformed recipe', details: validationErrors });
    }

    return res.json({ recipe });
  } catch (err) {
    console.error('[ai/generate-from-image]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /generate-from-url
// Accepts { url: string }.
// Fetches the URL server-side, extracts recipe text (ld+json first, then
// stripped HTML fallback), sends to Gemini, returns { recipe: AiRecipeDraft }.
// Requires a valid JWT.
// ---------------------------------------------------------------------------

function extractTextFromHtml(html) {
  // 1. Try ld+json Recipe schema first
  const ldJsonPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = ldJsonPattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (entry['@type'] === 'Recipe') {
          return JSON.stringify(entry);
        }
      }
    } catch {
      // malformed ld+json — continue
    }
  }

  // 2. Fallback: strip tags, collapse whitespace, truncate
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return stripped.slice(0, 8000);
}

router.post('/generate-from-url', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!/^https?:\/\//i.test(url.trim())) {
    return res.status(400).json({ error: 'url must start with http:// or https://' });
  }

  let pageText;
  try {
    const pageRes = await fetch(url.trim(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FoodVibeBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) {
      return res.status(502).json({ error: `Failed to fetch URL: ${pageRes.status}` });
    }
    const html = await pageRes.text();
    pageText = extractTextFromHtml(html);
  } catch (err) {
    console.error('[ai/generate-from-url] fetch error:', err);
    return res.status(502).json({ error: 'Could not fetch the provided URL' });
  }

  if (!pageText.trim()) {
    return res.status(422).json({ error: 'No usable text found at the provided URL' });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\nטקסט לניתוח:\n' + pageText }] }],
      }),
    });

    if (!geminiRes.ok) {
      console.error('[ai/generate-from-url] Gemini API error:', geminiRes.status);
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

    let recipe;
    try {
      recipe = JSON.parse(cleaned);
    } catch {
      console.error('[ai/generate-from-url] JSON parse failed, raw:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    const validationErrors = validateRecipeDraft(recipe);
    if (validationErrors.length > 0) {
      console.error('[ai/generate-from-url] validation failed:', validationErrors, 'raw:', raw);
      return res.status(502).json({ error: 'Gemini returned a malformed recipe', details: validationErrors });
    }

    return res.json({ recipe });
  } catch (err) {
    console.error('[ai/generate-from-url]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
