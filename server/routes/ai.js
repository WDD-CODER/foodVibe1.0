const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const dns = require('node:dns').promises;

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^::1$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^fe80:/i,
  /^fc/i,
  /^fd/i,
];

async function isSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname;
  if (PRIVATE_IP_RANGES.some(re => re.test(hostname))) return false;
  let addresses;
  try {
    const results = await dns.lookup(hostname, { all: true });
    addresses = results.map(r => r.address);
  } catch { return false; }
  return !addresses.some(addr => PRIVATE_IP_RANGES.some(re => re.test(addr)));
}

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
// GEMINI_SHOTS — shared few-shot pool stored in MongoDB.
// Collection: GEMINI_SHOTS
// Document: { prompt, draft, status, source, warnings, createdAt }
// ---------------------------------------------------------------------------

const SHOTS_COLLECTION = 'GEMINI_SHOTS';

function shotsCol() {
  return mongoose.connection.db.collection(SHOTS_COLLECTION);
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
  return warnings;
}

/**
 * Saves a shot to the GEMINI_SHOTS collection. Non-blocking — never throws.
 * Returns the computed warnings array.
 */
async function saveShot(prompt, draft, status, source) {
  try {
    const warnings = computeSoftWarnings(draft);
    await shotsCol().insertOne({ prompt, draft, status, source, warnings, createdAt: new Date() });
    return warnings;
  } catch {
    return [];
  }
}

/**
 * Returns up to `limit` most-recent approved shots for few-shot injection.
 */
async function getApprovedShots(limit = 2) {
  try {
    return await shotsCol()
      .find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// buildFewShotBlock — formats an approved shots array into a Hebrew example
// block prepended to the system prompt.
// ---------------------------------------------------------------------------

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
// POST /generate
// Accepts { prompt: string }, calls Gemini with DB-fetched few-shot examples,
// returns { recipe: AiRecipeDraft }.
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

  const shots = await getApprovedShots(2);

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildFewShotBlock(shots) + SYSTEM_PROMPT + prompt.trim() }] }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const geminiMsg = errBody?.error?.message ?? '';
      console.error('[ai/generate] Gemini API error:', geminiRes.status, geminiMsg);
      return res.status(502).json({ error: `Gemini API error: ${geminiRes.status}`, geminiMessage: geminiMsg });
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
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/generate] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
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
      signal: AbortSignal.timeout(30000),
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
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/parse-text] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
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
      signal: AbortSignal.timeout(30000),
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
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/patch-recipe] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
    console.error('[ai/patch-recipe]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GEMINI_MENU_SHOTS — approved menu generation examples for few-shot injection.
// Collection: GEMINI_MENU_SHOTS
// Document: { prompt, menu, createdAt }
// ---------------------------------------------------------------------------

const MENU_SHOTS_COLLECTION = 'GEMINI_MENU_SHOTS';

function menuShotsCol() {
  return mongoose.connection.db.collection(MENU_SHOTS_COLLECTION);
}

async function getApprovedMenuShots(limit = 2) {
  try {
    return await menuShotsCol()
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch {
    return [];
  }
}

function buildMenuFewShotBlock(shots) {
  if (!Array.isArray(shots) || shots.length === 0) return '';
  const examples = shots
    .map(s => `קלט: "${escapeForPrompt(s.prompt)}"\nפלט: ${JSON.stringify(s.menu)}`)
    .join('\n\n');
  return `## דוגמאות מאושרות מהמשתמש\n${examples}\n\n`;
}

// ---------------------------------------------------------------------------
// POST /generate-menu
// Accepts { rawText: string }.
// Gemini reads the natural-language description and returns a structured menu draft.
// Response: { menu: AiMenuDraft }
// Requires a valid JWT.
// ---------------------------------------------------------------------------

const MENU_GENERATE_SYSTEM_PROMPT = `You are a catering menu assistant. You will receive a natural-language description (possibly in Hebrew or English) of a catering event and you must extract ONLY what the user explicitly mentioned into a structured menu draft.

## Critical rule — NO invention

ONLY include dishes the user explicitly named. Do NOT add, suggest, or invent any dish that was not mentioned. If the user said "כבד קצוץ לראשונות", include only כבד קצוץ in ראשונות — do not add salads, bread, or anything else. If the user named exactly one dish per course, the section has exactly one item.

## Output format

Return ONLY valid JSON — no markdown, no explanation, no code blocks. Raw JSON only.

{
  "name_": "<event name in Hebrew>",
  "event_type_": "<type of event in Hebrew, e.g. חתונה, בר מצווה, ימי הולדת>",
  "event_date_": "<ISO 8601 date string, e.g. 2025-12-31, or null if not specified>",
  "serving_type_": "<one of: plated_course | buffet | finger_food | family_style>",
  "guest_count_": <integer number of guests>,
  "sections_": [
    {
      "category": "<section name in Hebrew, e.g. ראשונות, עיקריות, קינוחים>",
      "items": [
        {
          "name_hebrew": "<dish name exactly as the user mentioned it, in Hebrew>",
          "predicted_take_rate_": <number between 0 and 1 representing expected take rate, or null>,
          "serving_portions": <integer number of portions needed, or null>,
          "sell_price": <number in ILS per portion, or null>
        }
      ]
    }
  ]
}

## Rules

- serving_type_ MUST be exactly one of these four English keys: plated_course | buffet | finger_food | family_style — never Hebrew
- Infer serving_type_ from context: מנות אישיות → plated_course, בופה → buffet, פינגר פוד / אצבעות → finger_food, מנות משפחתיות → family_style
- sections_ must be a non-empty array with at least one section
- Each section must have only the items the user mentioned — never more
- All dish names in Hebrew
- predicted_take_rate_ is a fraction 0–1 (e.g. 0.8 means 80% of guests will take this dish)
- guest_count_ must be a positive integer
- If event_date_ is not specified, return null`;

function validateMenuDraft(menu) {
  const errors = [];
  if (!menu || typeof menu !== 'object') { errors.push('menu must be an object'); return errors; }
  if (typeof menu.name_ !== 'string' || !menu.name_.trim()) errors.push('name_ must be a non-empty string');
  const validServingTypes = ['plated_course', 'buffet', 'finger_food', 'family_style'];
  if (!validServingTypes.includes(menu.serving_type_)) errors.push(`serving_type_ must be one of: ${validServingTypes.join(', ')}`);
  if (typeof menu.guest_count_ !== 'number' || menu.guest_count_ <= 0) errors.push('guest_count_ must be a positive number');
  if (!Array.isArray(menu.sections_) || menu.sections_.length === 0) errors.push('sections_ must be a non-empty array');
  return errors;
}

router.post('/generate-menu', verifyToken, async (req, res) => {
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

  const menuShots = await getApprovedMenuShots(2);

  try {
    const userContent = buildMenuFewShotBlock(menuShots) + rawText;
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: MENU_GENERATE_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[ai/generate-menu] Gemini API error:', errBody);
      return res.status(502).json({ error: 'Gemini API error' });
    }

    const geminiData = await geminiRes.json();
    let raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[ai/generate-menu] JSON parse failed:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    const validationErrors = validateMenuDraft(parsed);
    if (validationErrors.length > 0) {
      console.error('[ai/generate-menu] validation failed:', validationErrors);
      return res.status(502).json({ error: 'Gemini returned invalid menu draft', details: validationErrors });
    }

    await incrementUsage();
    return res.json({ menu: parsed });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/generate-menu] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
    console.error('[ai/generate-menu]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /patch-menu
// Accepts { currentMenu: AiMenuDraft, instruction: string }.
// Gemini reads the current menu + user instruction and returns ONLY the
// fields that should change as a sparse patch object.
// Response: { changes: { name_?, event_type_?, event_date_?, serving_type_?, guest_count_?, sections_? } }
// Requires a valid JWT.
// ---------------------------------------------------------------------------

const MENU_PATCH_SYSTEM_PROMPT = `You are an intelligent catering menu editor. You will receive:
1. The CURRENT MENU as a JSON object
2. The USER'S INSTRUCTION — a natural-language request (possibly in Hebrew or English)

Your job is to produce a SPARSE PATCH — a JSON object containing ONLY the fields the user asked to change.
Do NOT include fields that were not mentioned or implied by the instruction.

## Rules

### Field keys you may include in the patch:
- "name_" — string: new event name
- "event_type_" — string: new event type in Hebrew
- "event_date_" — string: ISO 8601 date or null
- "serving_type_" — string: MUST be one of plated_course | buffet | finger_food | family_style (English keys only)
- "guest_count_" — number: new guest count
- "sections_" — array: FULL replacement array of all sections (only include if user explicitly changes dish lineup or sections)

### Decision rules:
- Only include keys that the user clearly wants to change
- If user says "change guest count to 150" → include ONLY "guest_count_"
- If user says "add a dessert section with chocolate cake" → include ONLY "sections_" with the full updated sections array
- If ambiguous, prefer minimal changes

### sections_ format (when included — full replacement):
[
  { "category": "<Hebrew section name>", "items": [{ "name_hebrew": "<Hebrew>", "predicted_take_rate_": <0-1 or null>, "serving_portions": <number or null>, "sell_price": <number or null> }] }
]

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Raw JSON only.

Format:
{
  "changes": {
    ... only the fields being changed ...
  }
}`;

router.post('/patch-menu', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { currentMenu, instruction } = req.body;
  if (!currentMenu || typeof currentMenu !== 'object') {
    return res.status(400).json({ error: 'currentMenu is required' });
  }
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return res.status(400).json({ error: 'instruction is required' });
  }

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
  }

  try {
    const userMessage = `CURRENT MENU:\n${JSON.stringify(currentMenu, null, 2)}\n\nUSER INSTRUCTION:\n${instruction}`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: MENU_PATCH_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[ai/patch-menu] Gemini API error:', errBody);
      return res.status(502).json({ error: 'Gemini API error' });
    }

    const geminiData = await geminiRes.json();
    let raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[ai/patch-menu] JSON parse failed:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    if (!parsed.changes || typeof parsed.changes !== 'object') {
      console.error('[ai/patch-menu] missing changes key:', parsed);
      return res.status(502).json({ error: 'Gemini returned invalid patch format' });
    }

    await incrementUsage();
    return res.json({ changes: parsed.changes });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/patch-menu] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
    console.error('[ai/patch-menu]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /generate-product
// Accepts { rawText: string }.
// Gemini reads the raw text and returns a structured AiProductDraft JSON.
// Response: { product: AiProductDraft }
// Requires a valid JWT.
// ---------------------------------------------------------------------------

const PRODUCT_GENERATE_SYSTEM_PROMPT = `You are an intelligent product catalog assistant for a catering kitchen. Given a text description of a food product or ingredient, you return a fully structured product record as JSON.

## Required output format (JSON only — no markdown, no explanation):
{
  "name_hebrew": "<product name in Hebrew>",
  "base_unit_": "<one of: gram | ml | kg | liter | unit | tablespoon | teaspoon | cup | pinch | portion>",
  "categories_": ["<Hebrew category name>"],
  "allergens_": ["<Hebrew allergen name — from: גלוטן, חלב, ביצים, אגוזים, סויה, שומשום, דגים, סרטנים, בוטנים, סלרי, חרדל, לופין, מולוסקים>"],
  "yield_factor_": <number between 0 and 1>,
  "min_stock_level_": <integer, 0 if unknown>,
  "expiry_days_default_": <integer, 0 if unknown>
}

## Rules
- base_unit_ MUST be one of the 10 canonical English keys listed above — NEVER use Hebrew for base_unit_.
- categories_ should be inferred from the product type (e.g. "חלב" → ["מוצרי חלב"], "עוף שלם" → ["עופות"]).
- allergens_ must list ONLY allergens the product actually contains, inferred from the name and category.
- yield_factor_ is between 0 and 1. Use 1.0 for packaged goods and liquids (no waste). Use 0.75–0.90 for fresh vegetables and fruits.
- Return ONLY valid JSON. No markdown. No code blocks. No explanation.`;

function validateProductDraft(product) {
  const errors = [];
  if (!product.name_hebrew || typeof product.name_hebrew !== 'string' || !product.name_hebrew.trim()) {
    errors.push('name_hebrew is required');
  }
  if (!product.base_unit_ || !CANONICAL_UNITS.has(product.base_unit_)) {
    errors.push('base_unit_ must be one of the canonical units');
  }
  if (!Array.isArray(product.categories_)) {
    errors.push('categories_ must be an array');
  }
  if (!Array.isArray(product.allergens_)) {
    errors.push('allergens_ must be an array');
  }
  if (typeof product.yield_factor_ !== 'number' || product.yield_factor_ < 0 || product.yield_factor_ > 1) {
    errors.push('yield_factor_ must be a number between 0 and 1');
  }
  return errors;
}

router.post('/generate-product', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { rawText } = req.body;
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required' });
  }

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PRODUCT_GENERATE_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: rawText }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[ai/generate-product] Gemini API error:', errBody);
      return res.status(502).json({ error: 'Gemini API error' });
    }

    const geminiData = await geminiRes.json();
    let raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[ai/generate-product] JSON parse failed:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    const validationErrors = validateProductDraft(parsed);
    if (validationErrors.length > 0) {
      console.error('[ai/generate-product] validation failed:', validationErrors, parsed);
      return res.status(502).json({ error: 'Gemini returned invalid product structure', details: validationErrors });
    }

    await incrementUsage();
    return res.json({ product: parsed });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/generate-product] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
    console.error('[ai/generate-product]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /patch-product
// Accepts { currentProduct: AiProductDraft, instruction: string }.
// Gemini reads the current product + user instruction and returns ONLY the
// fields that should change as a sparse patch object.
// Response: { changes: { ...only changed fields... } }
// Requires a valid JWT.
// ---------------------------------------------------------------------------

const PRODUCT_PATCH_SYSTEM_PROMPT = `You are an intelligent product record editor for a catering kitchen. You will receive:
1. The CURRENT PRODUCT as a JSON object
2. The USER'S INSTRUCTION — a natural-language request (possibly in Hebrew or English)

Your job is to produce a SPARSE PATCH — a JSON object containing ONLY the fields the user asked to change.
Do NOT include fields that were not mentioned or implied by the instruction.

## Field keys you may include in the patch:
- "name_hebrew" — string: new product name in Hebrew
- "base_unit_" — string: MUST be one of gram | ml | kg | liter | unit | tablespoon | teaspoon | cup | pinch | portion
- "categories_" — string[]: full replacement array of Hebrew category names
- "allergens_" — string[]: full replacement array of Hebrew allergen names
- "yield_factor_" — number 0–1: new yield factor
- "min_stock_level_" — integer: new minimum stock level
- "expiry_days_default_" — integer: new default expiry days
- "min_stock_level_" — integer: new minimum stock level
- "expiry_days_default_" — integer: new default expiry days

## Decision rules:
- Only include keys the user clearly wants to change
- If user says "change the yield to 0.85" → include ONLY "yield_factor_"
- If ambiguous, prefer minimal changes

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Raw JSON only.

Format:
{
  "changes": {
    ... only the fields being changed ...
  }
}`;

router.post('/patch-product', verifyToken, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI generation is not configured on this server' });
  }

  const { currentProduct, instruction } = req.body;
  if (!currentProduct || typeof currentProduct !== 'object') {
    return res.status(400).json({ error: 'currentProduct is required' });
  }
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return res.status(400).json({ error: 'instruction is required' });
  }

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
  }

  try {
    const userMessage = `CURRENT PRODUCT:\n${JSON.stringify(currentProduct, null, 2)}\n\nUSER INSTRUCTION:\n${instruction}`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PRODUCT_PATCH_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('[ai/patch-product] Gemini API error:', errBody);
      return res.status(502).json({ error: 'Gemini API error' });
    }

    const geminiData = await geminiRes.json();
    let raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[ai/patch-product] JSON parse failed:', raw);
      return res.status(502).json({ error: 'Gemini returned invalid JSON' });
    }

    if (!parsed.changes || typeof parsed.changes !== 'object') {
      console.error('[ai/patch-product] missing changes key:', parsed);
      return res.status(502).json({ error: 'Gemini returned invalid patch format' });
    }

    await incrementUsage();
    return res.json({ changes: parsed.changes });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/patch-product] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
    console.error('[ai/patch-product]', err);
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

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
  }

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }
  if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
    return res.status(400).json({ error: 'mimeType must be a valid image MIME type' });
  }

  const shots = await getApprovedShots(2);

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: buildFewShotBlock(shots) + SYSTEM_PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        }],
      }),
      signal: AbortSignal.timeout(30000),
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

    await incrementUsage();
    return res.json({ recipe });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/generate-from-image] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
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

  const currentCount = await getUsageCount();
  if (currentCount >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'daily_limit_reached', count: currentCount, limit: DAILY_LIMIT });
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!/^https?:\/\//i.test(url.trim())) {
    return res.status(400).json({ error: 'url must start with http:// or https://' });
  }
  const safe = await isSafeUrl(url.trim());
  if (!safe) {
    return res.status(400).json({ error: 'url resolves to a disallowed address' });
  }

  let pageText;
  try {
    const pageRes = await fetch(url.trim(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!pageRes.ok) {
      const urlStatus = pageRes.status;
      let urlError;
      if (urlStatus === 404) urlError = 'URL not found (404)';
      else if (urlStatus === 403 || urlStatus === 401) urlError = `URL access denied (${urlStatus}) — bot protection`;
      else if (urlStatus >= 500) urlError = `URL server error (${urlStatus})`;
      else urlError = `Failed to fetch URL: ${urlStatus}`;
      return res.status(502).json({ error: urlError, urlStatus });
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

  const shots = await getApprovedShots(2);

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildFewShotBlock(shots) + SYSTEM_PROMPT + '\n\nטקסט לניתוח:\n' + pageText }] }],
      }),
      signal: AbortSignal.timeout(30000),
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

    await incrementUsage();
    return res.json({ recipe });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('[ai/generate-from-url] timeout');
      return res.status(504).json({ error: 'Gemini request timed out' });
    }
    console.error('[ai/generate-from-url]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /shots
// Accepts { prompt, draft, status: 'approved'|'rejected', source: 'text'|'image'|'url' }.
// Saves the shot to GEMINI_SHOTS and returns soft quality warnings.
// Requires a valid JWT.
// ---------------------------------------------------------------------------

router.post('/shots', verifyToken, requireAdmin, async (req, res) => {
  const { prompt, draft, status, source } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (!draft || typeof draft !== 'object') {
    return res.status(400).json({ error: 'draft is required' });
  }
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
  }
  if (!['text', 'image', 'url'].includes(source)) {
    return res.status(400).json({ error: 'source must be "text", "image", or "url"' });
  }

  // Hard structural validation — only block approved shots with broken structure
  if (status === 'approved') {
    const errors = validateRecipeDraft(draft);
    if (errors.length > 0) {
      return res.status(400).json({ saved: false, errors });
    }
  }

  const warnings = await saveShot(prompt.trim(), draft, status, source);
  return res.json({ saved: true, warnings });
});

// ---------------------------------------------------------------------------
// POST /save-menu-shot
// Called automatically when the user clicks Apply in the AI menu modal.
// Saves the (prompt → menu) pair to GEMINI_MENU_SHOTS for future few-shot injection.
// Capped at 50 most recent shots — older ones are pruned on save.
// Requires a valid JWT.
// ---------------------------------------------------------------------------

router.post('/save-menu-shot', verifyToken, async (req, res) => {
  const { prompt, menu } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (!menu || typeof menu !== 'object') {
    return res.status(400).json({ error: 'menu is required' });
  }
  const validationErrors = validateMenuDraft(menu);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: 'invalid menu draft', details: validationErrors });
  }
  try {
    await menuShotsCol().insertOne({ prompt: prompt.trim(), menu, createdAt: new Date() });
    // Prune to most recent 50 shots
    const count = await menuShotsCol().countDocuments();
    if (count > 50) {
      const oldest = await menuShotsCol()
        .find({})
        .sort({ createdAt: 1 })
        .limit(count - 50)
        .toArray();
      const ids = oldest.map(d => d._id);
      if (ids.length > 0) await menuShotsCol().deleteMany({ _id: { $in: ids } });
    }
    return res.json({ saved: true });
  } catch (err) {
    console.error('[ai/save-menu-shot]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
