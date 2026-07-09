import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiRecipeModalService } from './ai-recipe-modal.service'
import { GeminiService } from '@services/gemini.service'
import type { AiRecipePatch } from '@services/gemini.service'
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { getGeminiUsage, DAILY_LIMIT, fetchGeminiUsageFromServer } from '../../core/utils/gemini-usage.util'
import { GeminiShotsService } from '@services/gemini-shots.service'
import { TranslationService } from '@services/translation.service'
import { AiDraftEditorComponent } from './ai-draft-editor/ai-draft-editor.component'
import { ScrollIndicatorsDirective } from '@directives/scroll-indicators.directive'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'
type InputMode = 'text' | 'image' | 'url'

@Component({
  selector: 'app-ai-recipe-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent, AiDraftEditorComponent, ScrollIndicatorsDirective],
  templateUrl: './ai-recipe-modal.component.html',
  styleUrl: './ai-recipe-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRecipeModalComponent implements OnInit {
  protected readonly modalService = inject(AiRecipeModalService)
  protected readonly gemini = inject(GeminiService)
  private readonly aiDraft = inject(AiRecipeDraftService)
  private readonly router = inject(Router)
  private readonly shots = inject(GeminiShotsService)
  private readonly translation = inject(TranslationService)

  // Create mode
  protected readonly inputMode_ = signal<InputMode>('text')
  protected readonly prompt_ = signal('')
  protected readonly imageFile_ = signal<File | null>(null)
  protected readonly imagePreviewUrl_ = signal<string | null>(null)
  protected readonly urlInput_ = signal('')
  protected readonly draft_ = signal<AiRecipeDraft | null>(null)

  // Edit mode
  protected readonly instruction_ = signal('')
  protected readonly patch_ = signal<AiRecipePatch | null>(null)

  // Shot quality warnings
  protected readonly shotWarnings_ = signal<string[]>([])
  protected readonly awaitingWarningConfirm_ = signal(false)
  private readonly pendingApprovedDraft_ = signal<AiRecipeDraft | null>(null)

  // Shared
  protected readonly loading_ = signal(false)
  protected readonly status_ = signal<GenerationStatus>('idle')
  protected readonly errorKey_ = signal('ai_recipe_error')
  protected readonly geminiUsage_ = signal(getGeminiUsage())
  protected readonly usageColor_ = computed(() => {
    const pct = this.geminiUsage_().count / DAILY_LIMIT
    if (pct >= 0.9) return 'danger'
    if (pct >= 0.7) return 'warning'
    return 'ok'
  })

  protected readonly patchSummary_ = computed(() => {
    const p = this.patch_()
    if (!p) return []
    const items: string[] = []
    if (p.name_hebrew !== undefined) items.push(`שם: ${p.name_hebrew}`)
    if (p.ingredients !== undefined) items.push(`מרכיבים: ${p.ingredients.length} פריטים`)
    if (p.steps !== undefined) items.push(`שלבים: ${p.steps.length} שלבים`)
    if (p.yield_amount !== undefined || p.yield_unit !== undefined) {
      items.push(`תפוקה: ${p.yield_amount ?? ''} ${p.yield_unit ?? ''}`.trim())
    }
    if (p.equipment !== undefined) items.push(`ציוד: ${p.equipment.length} פריטים`)
    return items
  })

  ngOnInit(): void {
    this.refreshUsage()
  }

  refreshUsage(): void {
    this.geminiUsage_.set(getGeminiUsage())           // show local cache instantly
    fetchGeminiUsageFromServer().then(usage => {       // then update with real server count
      this.geminiUsage_.set(usage)
    })
  }

  // ─── Create mode ─────────────────────────────────────────────────

  async onGenerate(): Promise<void> {
    this.loading_.set(true)
    this.status_.set('sending')
    try {
      const draft = await this.gemini.generateRecipe(this.prompt_())
      this.draft_.set(draft)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage()
    }
  }

  onGenerateAgain(): void {
    const draft = this.draft_()
    if (draft) {
      this.shots.saveShot(this.prompt_(), draft, 'rejected', this.inputMode_()).subscribe()
    }
    this.draft_.set(null)
    this.shotWarnings_.set([])
    this.awaitingWarningConfirm_.set(false)
    this.status_.set('idle')
    this.errorKey_.set('ai_recipe_error')
    this.imageFile_.set(null)
    this.imagePreviewUrl_.set(null)
    this.urlInput_.set('')
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    this.imageFile_.set(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => this.imagePreviewUrl_.set(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      this.imagePreviewUrl_.set(null)
    }
  }

  async onGenerateFromImage(): Promise<void> {
    const file = this.imageFile_()
    if (!file) return
    this.loading_.set(true)
    this.status_.set('sending')
    try {
      const draft = await this.gemini.generateFromImage(file)
      this.draft_.set(draft)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage()
    }
  }

  async onGenerateFromUrl(): Promise<void> {
    const url = this.urlInput_().trim()
    if (!url) return
    this.loading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_recipe_error')
    try {
      const draft = await this.gemini.generateFromUrl(url)
      this.draft_.set(draft)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage()
    }
  }

  private resolveErrorKey_(err: unknown): string {
    // Local limit check — throws plain Error with Hebrew message
    if (err instanceof Error && !(err instanceof HttpErrorResponse) && err.message.includes('מגבלת')) {
      return 'ai_recipe_daily_limit'
    }
    if (err instanceof HttpErrorResponse) {
      const msg: string = err.error?.error ?? ''
      const status = err.status

      if (status === 429 || msg.includes('daily_limit_reached')) return 'ai_recipe_daily_limit'
      if (status === 504 || msg.includes('timed out')) return 'ai_recipe_timeout'
      if (status === 503 && msg.includes('not configured')) return 'ai_recipe_not_configured'
      if (status === 0) return 'ai_recipe_network_error'

      // URL-fetch specific
      if (msg.includes('not found (404)')) return 'ai_recipe_url_not_found'
      if (msg.includes('access denied') || msg.includes('bot protection')) return 'ai_recipe_url_blocked'
      if (msg.includes('server error')) return 'ai_recipe_url_server_error'
      if (msg.includes('Could not fetch') || msg.includes('resolves to a disallowed')) return 'ai_recipe_url_fetch_failed'
      if (msg.includes('No usable text')) return 'ai_recipe_url_no_content'

      // Gemini response issues
      if (msg.includes('Gemini returned') || msg.includes('Gemini API error')) return 'ai_recipe_invalid_response'
    }
    return 'ai_recipe_error'
  }

  onDraftApproved(draft: AiRecipeDraft): void {
    this.pendingApprovedDraft_.set(draft)
    this.shots.saveShot(this.prompt_(), draft, 'approved', this.inputMode_()).subscribe(result => {
      if (result.warnings?.length) {
        this.shotWarnings_.set(result.warnings)
        this.awaitingWarningConfirm_.set(true)
      } else {
        this.navigateToBuilder_(draft)
      }
    })
  }

  onConfirmWarnings(): void {
    const draft = this.pendingApprovedDraft_()
    if (!draft) return
    this.navigateToBuilder_(draft)
  }

  onBackFromWarnings(): void {
    this.awaitingWarningConfirm_.set(false)
    this.shotWarnings_.set([])
    this.pendingApprovedDraft_.set(null)
  }

  private navigateToBuilder_(draft: AiRecipeDraft): void {
    this.aiDraft.set(draft)
    void this.router.navigate(['/recipe-builder'])
    this.resetLocalState_()
    this.modalService.close()
  }

  onClearDraft(): void {
    const draft = this.draft_()
    if (draft) {
      this.shots.saveShot(this.prompt_(), draft, 'rejected', this.inputMode_()).subscribe()
    }
    this.draft_.set(null)
    this.shotWarnings_.set([])
    this.awaitingWarningConfirm_.set(false)
    this.status_.set('idle')
    this.prompt_.set('')
    this.imageFile_.set(null)
    this.imagePreviewUrl_.set(null)
    this.urlInput_.set('')
  }

  onClearInput(): void {
    this.prompt_.set('')
    this.imageFile_.set(null)
    this.imagePreviewUrl_.set(null)
    this.urlInput_.set('')
  }

  /** Translate a unit key (e.g. 'gram' → 'גרם') for display. */
  translateUnit(unit: string): string {
    return this.translation.translate(unit)
  }

  // ─── Edit mode ───────────────────────────────────────────────────

  async onEdit(): Promise<void> {
    const currentRecipe = this.modalService.getEditContext()
    if (!currentRecipe) return
    this.loading_.set(true)
    this.status_.set('sending')
    try {
      const patch = await this.gemini.patchRecipe(currentRecipe, this.instruction_())
      this.patch_.set(patch)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage()
    }
  }

  onEditAgain(): void {
    this.patch_.set(null)
    this.status_.set('idle')
  }

  onApplyPatch(): void {
    const patch = this.patch_()
    if (!patch) return
    this.modalService.deliverPatch(patch)
    this.patch_.set(null)
    this.instruction_.set('')
    this.status_.set('idle')
  }

  // ─── Shared ──────────────────────────────────────────────────────

  onClose(): void {
    const draft = this.draft_()
    if (draft) {
      this.shots.saveShot(this.prompt_(), draft, 'rejected', this.inputMode_()).subscribe()
    }
    this.modalService.close()
    this.resetLocalState_()
  }

  private resetLocalState_(): void {
    this.draft_.set(null)
    this.patch_.set(null)
    this.shotWarnings_.set([])
    this.awaitingWarningConfirm_.set(false)
    this.pendingApprovedDraft_.set(null)
    this.prompt_.set('')
    this.instruction_.set('')
    this.imageFile_.set(null)
    this.imagePreviewUrl_.set(null)
    this.urlInput_.set('')
    this.inputMode_.set('text')
    this.loading_.set(false)
    this.status_.set('idle')
    this.errorKey_.set('ai_recipe_error')
  }
}
