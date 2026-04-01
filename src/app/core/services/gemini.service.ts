import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map, firstValueFrom } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { incrementGeminiUsage, isGeminiLimitReached } from '../utils/gemini-usage.util'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http_ = inject(HttpClient)
  private readonly authBase_ = environment.authApiUrl

  async generateRecipe(prompt: string): Promise<AiRecipeDraft> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await firstValueFrom(
      this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate`, { prompt })
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
}
