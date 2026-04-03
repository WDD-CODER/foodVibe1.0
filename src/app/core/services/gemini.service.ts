import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map, firstValueFrom } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { incrementGeminiUsage, isGeminiLimitReached } from '../utils/gemini-usage.util'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'

export interface AiRecipePatch {
  name_hebrew?: string
  yield_amount?: number
  yield_unit?: string
  ingredients?: { name: string; amount: number; unit: string }[]
  steps?: string[]
  equipment?: { name: string; quantity: number }[]
}

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 800

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }
  throw lastError
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http_ = inject(HttpClient)
  private readonly authBase_ = environment.authApiUrl

  async generateRecipe(prompt: string): Promise<AiRecipeDraft> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate`, { prompt })
      )
    )
    incrementGeminiUsage()
    return data.recipe
  }

  parseText(rawText: string): Observable<ParsedResult> {
    return this.http_.post<{ result: ParsedResult }>(
      `${this.authBase_}/api/v1/ai/parse-text`,
      { rawText }
    ).pipe(map(res => res.result))
  }

  async patchRecipe(currentRecipe: AiRecipeDraft, instruction: string): Promise<AiRecipePatch> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ changes: AiRecipePatch }>(`${this.authBase_}/api/v1/ai/patch-recipe`, { currentRecipe, instruction })
      )
    )
    incrementGeminiUsage()
    return data.changes
  }
}
