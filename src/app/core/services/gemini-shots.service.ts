import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { environment } from '../../../environments/environment'

/** Grams per one of each canonical unit — mirrors GRAMS_PER_UNIT in server/services/ai-recipe-helpers.js. */
const GRAMS_PER_UNIT: Readonly<Record<string, number>> = {
  gram: 1,
  kg: 1000,
  ml: 1,
  liter: 1000,
  tablespoon: 15,
  teaspoon: 5,
  cup: 240,
  pinch: 0
}
/** "unit" is only weighable for eggs (≈55 g each); other countable items are skipped. */
const EGG_GRAMS = 55
const EGG_NAME_PATTERN = /ביצ|\begg/i
const MIN_GRAMS_PER_PORTION = 60
const MAX_GRAMS_PER_PORTION = 700

/**
 * Rough grams per portion for a dish draft from its weighable ingredients, or null when it
 * can't be estimated. Mirrors `estimateGramsPerPortion` in server/services/ai-recipe-helpers.js (plan 370).
 */
export function estimateGramsPerPortion(draft: AiRecipeDraft): number | null {
  if (draft.recipe_type !== 'dish' || draft.yield_unit !== 'portion' || !(draft.yield_amount > 0)) return null
  let total = 0
  let weighed = 0
  for (const ing of draft.ingredients ?? []) {
    if (!(ing.amount > 0)) continue
    let perUnit: number | undefined = GRAMS_PER_UNIT[ing.unit]
    if (ing.unit === 'unit' && EGG_NAME_PATTERN.test(ing.name ?? '')) perUnit = EGG_GRAMS
    if (perUnit === undefined) continue
    total += ing.amount * perUnit
    weighed++
  }
  return weighed === 0 ? null : total / draft.yield_amount
}

@Injectable({ providedIn: 'root' })
export class GeminiShotsService {
  private readonly http_ = inject(HttpClient)
  private readonly authBase_ = environment.authApiUrl

  /**
   * Computes soft quality warnings for a draft client-side before saving.
   * Mirrors the server-side `computeSoftWarnings` logic in ai.js.
   */
  computeWarnings(draft: AiRecipeDraft): string[] {
    const warnings: string[] = []
    if (draft.ingredients.length < 3) {
      warnings.push('מתכון עם מעט מרכיבים — ייתכן שהבינה הצליחה לחלץ חלקית בלבד')
    }
    if (draft.yield_amount > 20) {
      warnings.push('כמות מנות גבוהה במיוחד — בדוק שהתפוקה הגיונית')
    }
    if (draft.steps.length < 2) {
      warnings.push('מספר שלבים נמוך — ייתכן שחסרות הוראות')
    }
    if (draft.recipe_type === 'dish' && draft.yield_unit === 'unit') {
      warnings.push('יחידת תפוקה לא סבירה למנה')
    }
    const perPortion = estimateGramsPerPortion(draft)
    if (perPortion !== null && (perPortion < MIN_GRAMS_PER_PORTION || perPortion > MAX_GRAMS_PER_PORTION)) {
      warnings.push('כמויות הרכיבים לא סבירות ביחס למספר המנות')
    }
    return warnings
  }

  saveShot(
    prompt: string,
    draft: AiRecipeDraft,
    status: 'approved' | 'rejected',
    source: 'text' | 'image' | 'url'
  ): Observable<{ saved: boolean; warnings: string[] }> {
    return this.http_.post<{ saved: boolean; warnings: string[] }>(
      `${this.authBase_}/api/v1/ai/shots`,
      { prompt, draft, status, source }
    )
  }
}
