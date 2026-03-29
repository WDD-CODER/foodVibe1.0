import { computed, inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'

const SYSTEM_PROMPT = `אתה שף מקצועי ועוזר AI. המשתמש יתאר מתכון בעברית או בשפה אחרת.
עליך להחזיר JSON בלבד (ללא הסברים, ללא markdown), בפורמט הבא:
{
  "name_hebrew": "שם המתכון בעברית",
  "recipe_type": "dish" | "preparation",
  "yield_amount": מספר,
  "yield_unit": "יחידת תפוקה (גרם/מ\\"ל/מנה וכו')",
  "ingredients": [
    { "name": "שם המרכיב בעברית", "amount": מספר, "unit": "יחידה" }
  ],
  "steps": ["שלב 1", "שלב 2", ...]
}
השתמש ב-"dish" כאשר המתכון הוא מנה מוכנה לאכילה, ו-"preparation" כאשר הוא בסיס/רוטב/תבלין.
`

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http_ = inject(HttpClient)
  private readonly authBase_ = environment.authApiUrl

  readonly apiKey_ = signal<string>(localStorage.getItem('FV_GEMINI_API_KEY') ?? '')
  readonly hasKey = computed(() => this.apiKey_().length > 0)

  setApiKey(key: string): void {
    localStorage.setItem('FV_GEMINI_API_KEY', key)
    this.apiKey_.set(key)
  }

  async generateRecipe(prompt: string): Promise<AiRecipeDraft> {
    const key = this.apiKey_()
    if (!key) throw new Error('Gemini API key is not set')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + prompt }] }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    return JSON.parse(cleaned) as AiRecipeDraft
  }

  parseText(rawText: string): Observable<ParsedResult> {
    return this.http_.post<{ result: ParsedResult }>(
      `${this.authBase_}/api/v1/ai/parse-text`,
      { rawText }
    ).pipe(map(res => res.result))
  }
}
