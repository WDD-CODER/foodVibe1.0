import { inject, Injectable } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { Observable, map, firstValueFrom } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { incrementGeminiUsage, isGeminiLimitReached } from '../utils/gemini-usage.util'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'
import type { AiMenuDraft, AiMenuPatch } from '@models/ai-menu-draft.model'
import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'

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
      // Don't retry on HTTP errors — the server gave a definitive answer (4xx/5xx).
      // Only retry on network-level failures (no response at all).
      if (err instanceof HttpErrorResponse) throw err
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
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')
    return this.http_.post<{ result: ParsedResult }>(
      `${this.authBase_}/api/v1/ai/parse-text`,
      { rawText }
    ).pipe(
      map(res => {
        incrementGeminiUsage()
        return res.result
      })
    )
  }

  async generateFromImage(file: File): Promise<AiRecipeDraft> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the data-url prefix (e.g. "data:image/jpeg;base64,")
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate-from-image`, {
          imageBase64,
          mimeType: file.type,
        })
      )
    )
    incrementGeminiUsage()
    return data.recipe
  }

  async generateFromUrl(url: string): Promise<AiRecipeDraft> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate-from-url`, { url })
      )
    )
    incrementGeminiUsage()
    return data.recipe
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

  async generateMenu(rawText: string): Promise<AiMenuDraft> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ menu: AiMenuDraft }>(`${this.authBase_}/api/v1/ai/generate-menu`, { rawText })
      )
    )
    incrementGeminiUsage()
    return data.menu
  }

  async saveMenuShot(prompt: string, menu: AiMenuDraft): Promise<void> {
    await firstValueFrom(
      this.http_.post(`${this.authBase_}/api/v1/ai/save-menu-shot`, { prompt, menu })
    )
  }

  async patchMenu(currentMenu: AiMenuDraft, instruction: string): Promise<AiMenuPatch> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ changes: AiMenuPatch }>(`${this.authBase_}/api/v1/ai/patch-menu`, { currentMenu, instruction })
      )
    )
    incrementGeminiUsage()
    return data.changes
  }

  async generateProduct(rawText: string): Promise<AiProductDraft> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ product: AiProductDraft }>(`${this.authBase_}/api/v1/ai/generate-product`, { rawText })
      )
    )
    incrementGeminiUsage()
    return data.product
  }

  async patchProduct(currentProduct: AiProductDraft, instruction: string): Promise<AiProductPatch> {
    if (isGeminiLimitReached()) throw new Error('הגעת למגבלת הבקשות היומית (1,000)')

    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ changes: AiProductPatch }>(`${this.authBase_}/api/v1/ai/patch-product`, { currentProduct, instruction })
      )
    )
    incrementGeminiUsage()
    return data.changes
  }
}
