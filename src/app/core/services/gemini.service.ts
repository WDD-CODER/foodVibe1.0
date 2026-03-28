import { Injectable, signal } from '@angular/core'
import type { AiRecipeDraft } from './ai-recipe-draft.service'

const SYSTEM_PROMPT = `You are a professional recipe assistant for a Hebrew-language kitchen management app called FoodVibe.
The user will describe a recipe. Return ONLY a valid JSON object with this exact shape:
{
  "name_hebrew": "<recipe name in Hebrew>",
  "recipe_type": "dish" | "preparation",
  "yield_amount": <number>,
  "yield_unit": "<unit in Hebrew, e.g. מנות/ק\\"ג/ליטר>",
  "ingredients": [{ "name": "<ingredient name in Hebrew>", "amount": <number>, "unit": "<unit in Hebrew>" }],
  "steps": ["<step 1 in Hebrew>", "<step 2 in Hebrew>", ...]
}
Do not include any text before or after the JSON. No markdown, no explanation.
Recipe description:
`

@Injectable({ providedIn: 'root' })
export class GeminiService {
  readonly apiKey_ = signal<string>(localStorage.getItem('FV_GEMINI_API_KEY') ?? '')

  setApiKey(key: string): void {
    localStorage.setItem('FV_GEMINI_API_KEY', key)
    this.apiKey_.set(key)
  }

  async generateRecipe(prompt: string): Promise<AiRecipeDraft> {
    const key = this.apiKey_()
    if (!key) {
      throw new Error('מפתח Gemini API לא מוגדר')
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
    const body = {
      contents: [{ parts: [{ text: SYSTEM_PROMPT + prompt }] }]
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`שגיאת Gemini API: ${response.status}`)
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Strip fences anywhere in the string — Gemini sometimes adds preamble text
    const fencePattern = /```(?:json)?\s*([\s\S]*?)```/i
    const fenceMatch = fencePattern.exec(raw)
    const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim()

    if (!cleaned) {
      throw new Error('Gemini החזיר תשובה ריקה')
    }

    try {
      return JSON.parse(cleaned) as AiRecipeDraft
    } catch {
      console.error('[GeminiService] parse failed, raw response:', raw)
      throw new Error('Gemini החזיר JSON לא תקין — נסה שוב')
    }
  }
}
