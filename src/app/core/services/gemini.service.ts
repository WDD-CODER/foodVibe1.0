import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map } from 'rxjs'
import { firstValueFrom } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http = inject(HttpClient)
  private authBase = environment.authApiUrl

  async generateRecipe(prompt: string): Promise<AiRecipeDraft> {
    const result = await firstValueFrom(
      this.http.post<{ recipe: AiRecipeDraft }>(
        `${this.authBase}/api/v1/ai/generate`,
        { prompt }
      )
    )
    return result.recipe
  }

  parseText(rawText: string): Observable<ParsedResult> {
    return this.http.post<{ result: ParsedResult }>(
      `${this.authBase}/api/v1/ai/parse-text`,
      { rawText }
    ).pipe(map(res => res.result))
  }
}
