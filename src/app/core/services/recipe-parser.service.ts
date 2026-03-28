import { Injectable, inject } from '@angular/core'
import { Observable, catchError, of } from 'rxjs'
import { GeminiService } from './gemini.service'
import type { ParsedResult } from '@models/parsed-result.model'

/** Sentinel result returned when parsing fails — confidence 0 signals the error state to callers. */
const PARSE_ERROR_SENTINEL: ParsedResult = {
  type: 'recipe',
  confidence: 0,
  data: {
    name_hebrew: '',
    serving_portions: null,
    labels: [],
    ingredients: [],
    steps: []
  }
}

@Injectable({ providedIn: 'root' })
export class RecipeParserService {
  private readonly gemini = inject(GeminiService)

  /**
   * Sends raw text to the backend AI parser and returns a ParsedResult.
   * Never throws — on failure returns PARSE_ERROR_SENTINEL (confidence === 0).
   */
  parseText(rawText: string): Observable<ParsedResult> {
    return this.gemini.parseText(rawText).pipe(
      catchError(() => of(PARSE_ERROR_SENTINEL))
    )
  }
}
