import { computed, inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { incrementGeminiUsage, isGeminiLimitReached } from '../utils/gemini-usage.util'
import { getGeminiShots } from '../utils/gemini-shots.util'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'

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
}`

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
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const shots = getGeminiShots().slice(0, 2)
    const fewShotBlock = shots.length > 0
      ? '\n\n---\nדוגמאות שאושרו:\n' +
        shots.map(s => `קלט: "${s.prompt}"\nפלט: ${JSON.stringify(s.draft)}`).join('\n\n')
      : ''
    const fullPrompt = SYSTEM_PROMPT + fewShotBlock + '\n\n---\nבקשת המשתמש:\n' + prompt

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    console.log('[Gemini] raw response:', raw)
    const cleaned = raw.replace(/```json|```/g, '').trim()
    console.log('[Gemini] cleaned JSON:', cleaned)
    const draft = JSON.parse(cleaned) as AiRecipeDraft
    incrementGeminiUsage()
    return draft
  }

  parseText(rawText: string): Observable<ParsedResult> {
    return this.http_.post<{ result: ParsedResult }>(
      `${this.authBase_}/api/v1/ai/parse-text`,
      { rawText }
    ).pipe(map(res => res.result))
  }
}
