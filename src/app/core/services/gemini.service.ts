import { inject, Injectable, signal } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { Observable, map, firstValueFrom } from 'rxjs'
import type { AiRecipeDraft } from './ai-recipe-draft.service'
import { incrementGeminiUsage, type GeminiModelStatus } from '../utils/gemini-usage.util'
import { downscaleImage } from '../utils/downscale-image.util'
import type { ParsedResult } from '@models/parsed-result.model'
import { environment } from '../../../environments/environment'
import type { AiMenuDraft, AiMenuPatch } from '@models/ai-menu-draft.model'
import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'
import { MetadataRegistryService } from './metadata-registry.service'
import { TranslationService } from './translation.service'

/** One model in the admin's AI model chain (plan 395): today's status plus on/off. */
export interface GeminiChainModel extends GeminiModelStatus {
  enabled: boolean
  vision: boolean
}

/** Offered after a request hit the daily quota of `from` (server error 'model_exhausted'). */
export interface GeminiModelSwitch {
  from: string
  to: string
}

export interface AiRecipePatch {
  nameHebrew?: string
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
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }
  throw lastError
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http_ = inject(HttpClient)
  private readonly metadataRegistry_ = inject(MetadataRegistryService)
  private readonly translation_ = inject(TranslationService)
  private readonly authBase_ = environment.authApiUrl

  /** The model the user switched to (plan 395); null = the admin's chain first. */
  private readonly model_ = signal<string | null>(null)
  /** A switch the server suggested and the user hasn't accepted yet. */
  private readonly modelSwitch_ = signal<GeminiModelSwitch | null>(null)
  readonly modelSwitch = this.modelSwitch_.asReadonly()

  // ─── Model switch (plan 395) ─────────────────────────────────────
  // The server never moves to another model by itself: when the model runs out of its daily
  // quota it answers 'model_exhausted' + the next model, and the user decides.

  /** Records the switch the server offers when `err` is a 'model_exhausted' 429. Returns true if it was one. */
  offerModelSwitch(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.error?.error !== 'model_exhausted') return false
    const from: unknown = err.error?.model
    const to: unknown = err.error?.nextModel
    if (typeof from !== 'string' || typeof to !== 'string') return false
    this.modelSwitch_.set({ from, to })
    return true
  }

  /** The user's explicit "switch" — later requests go to the offered model. */
  acceptModelSwitch(): void {
    const offer = this.modelSwitch_()
    if (!offer) return
    this.model_.set(offer.to)
    this.modelSwitch_.set(null)
  }

  /** `{ model }` for request bodies once the user switched; empty otherwise. */
  private modelParam_(): { model?: string } {
    const model = this.model_()
    return model ? { model } : {}
  }

  async generateRecipe(prompt: string): Promise<AiRecipeDraft> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate`, {
          prompt,
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.recipe
  }

  parseText(rawText: string): Observable<ParsedResult> {
    return this.http_
      .post<{ result: ParsedResult }>(`${this.authBase_}/api/v1/ai/parse-text`, { rawText, ...this.modelParam_() })
      .pipe(
        map((res) => {
          incrementGeminiUsage()
          return res.result
        })
      )
  }

  async generateFromImage(file: File): Promise<AiRecipeDraft> {
    const image = await this.encodeImage_(file)
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate-from-image`, {
          ...image,
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.recipe
  }

  async generateFromUrl(url: string): Promise<AiRecipeDraft> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ recipe: AiRecipeDraft }>(`${this.authBase_}/api/v1/ai/generate-from-url`, {
          url,
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.recipe
  }

  async patchRecipe(currentRecipe: AiRecipeDraft, instruction: string): Promise<AiRecipePatch> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ changes: AiRecipePatch }>(`${this.authBase_}/api/v1/ai/patch-recipe`, {
          currentRecipe,
          instruction,
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.changes
  }

  async generateMenu(rawText: string): Promise<AiMenuDraft> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ menu: AiMenuDraft }>(`${this.authBase_}/api/v1/ai/generate-menu`, {
          rawText,
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.menu
  }

  async saveMenuShot(prompt: string, menu: AiMenuDraft): Promise<void> {
    await firstValueFrom(this.http_.post(`${this.authBase_}/api/v1/ai/save-menu-shot`, { prompt, menu }))
  }

  async patchMenu(currentMenu: AiMenuDraft, instruction: string): Promise<AiMenuPatch> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ changes: AiMenuPatch }>(`${this.authBase_}/api/v1/ai/patch-menu`, {
          currentMenu,
          instruction,
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.changes
  }

  async generateProduct(rawText: string): Promise<AiProductDraft> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ product: AiProductDraft }>(`${this.authBase_}/api/v1/ai/generate-product`, {
          rawText,
          ...this.knownMetadata_(),
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.product
  }

  async generateProductFromImage(file: File, hint?: string): Promise<AiProductDraft> {
    const image = await this.encodeImage_(file)
    const trimmedHint = hint?.trim()
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ product: AiProductDraft }>(`${this.authBase_}/api/v1/ai/generate-product-from-image`, {
          ...image,
          ...(trimmedHint ? { hint: trimmedHint } : {}),
          ...this.knownMetadata_(),
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.product
  }

  async patchProduct(currentProduct: AiProductDraft, instruction: string): Promise<AiProductPatch> {
    const data = await withRetry(() =>
      firstValueFrom(
        this.http_.post<{ changes: AiProductPatch }>(`${this.authBase_}/api/v1/ai/patch-product`, {
          currentProduct: {
            ...currentProduct,
            categories: this.toHebrew_(currentProduct.categories),
            allergens: this.toHebrew_(currentProduct.allergens)
          },
          instruction,
          ...this.knownMetadata_(),
          ...this.modelParam_()
        })
      )
    )
    incrementGeminiUsage()
    return data.changes
  }

  /**
   * The user's registered categories and allergens as Hebrew labels, so the model reuses them
   * and answers in Hebrew; the client maps the Hebrew back to registry keys on apply.
   */
  private knownMetadata_(): { knownCategories: string[]; knownAllergens: string[] } {
    return {
      knownCategories: this.toHebrew_(this.metadataRegistry_.allCategories_()),
      knownAllergens: this.toHebrew_(this.metadataRegistry_.allAllergens_())
    }
  }

  private toHebrew_(keys: string[] | undefined): string[] {
    return (keys ?? []).map((key) => this.translation_.translate(key))
  }

  // ─── Admin: model chain (plan 395) ───────────────────────────────

  getModelChain(): Observable<GeminiChainModel[]> {
    return this.http_
      .get<{ models: GeminiChainModel[] }>(`${this.authBase_}/api/v1/ai/models`)
      .pipe(map((res) => res.models))
  }

  saveModelChain(models: Pick<GeminiChainModel, 'name' | 'enabled'>[]): Observable<GeminiChainModel[]> {
    return this.http_
      .put<{ models: GeminiChainModel[] }>(`${this.authBase_}/api/v1/ai/models`, { models })
      .pipe(map((res) => res.models))
  }

  resetModelChain(): Observable<GeminiChainModel[]> {
    return this.http_
      .delete<{ models: GeminiChainModel[] }>(`${this.authBase_}/api/v1/ai/models`)
      .pipe(map((res) => res.models))
  }

  /** Downscales the photo (server body limit is 2MB) and returns it as raw base64 + MIME type. */
  private async encodeImage_(file: File): Promise<{ imageBase64: string; mimeType: string }> {
    const image = await downscaleImage(file)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(image)
    })
    // Strip the data-url prefix (e.g. "data:image/jpeg;base64,")
    return { imageBase64: dataUrl.split(',')[1], mimeType: image.type }
  }
}
