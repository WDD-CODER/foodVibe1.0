const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');

const router = Router();

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a professional recipe assistant for a Hebrew-language kitchen management app called FoodVibe.
The user will describe a recipe. Return ONLY a valid JSON object with this exact shape:
{
  "name_hebrew": "<recipe name in Hebrew>",
  "recipe_type": "dish" | "preparation",
  "yield_amount": <number>,
  "yield_unit": "<unit in Hebrew, e.g. מנות/ק\"ג/ליטר>",
  "ingredients": [{ "name": "<ingredient name in Hebrew>", "amount": <number>, "unit": "<unit in Hebrew>" }],
  "steps": ["<step 1 in Hebrew>", "<step 2 in Hebrew>", ...]
}
Do not include any text before or after the JSON. No markdown, no explanation.
Recipe description:
`;

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
