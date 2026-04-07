import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { environment } from '../../../environments/environment'

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
