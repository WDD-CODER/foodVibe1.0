import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiRecipeModalService } from './ai-recipe-modal.service'
import { GeminiService } from '@services/gemini.service'
import type { AiRecipePatch } from '@services/gemini.service'
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { UserMsgService } from '@services/user-msg.service'
import { getGeminiUsage, DAILY_LIMIT } from '../../core/utils/gemini-usage.util'
import { addGeminiShot } from '../../core/utils/gemini-shots.util'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'

@Component({
  selector: 'app-ai-recipe-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './ai-recipe-modal.component.html',
  styleUrl: './ai-recipe-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRecipeModalComponent implements OnInit {
  protected readonly modalService = inject(AiRecipeModalService)
  protected readonly gemini = inject(GeminiService)
  private readonly aiDraft = inject(AiRecipeDraftService)
  private readonly router = inject(Router)
  private readonly userMsg = inject(UserMsgService)

  // Create mode
  protected readonly prompt_ = signal('')
  protected readonly draft_ = signal<AiRecipeDraft | null>(null)

  // Edit mode
  protected readonly instruction_ = signal('')
  protected readonly patch_ = signal<AiRecipePatch | null>(null)

  // Shared
  protected readonly loading_ = signal(false)
  protected readonly status_ = signal<GenerationStatus>('idle')
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
    return items
  })

  ngOnInit(): void {
    this.refreshUsage()
  }

  refreshUsage(): void {
    this.geminiUsage_.set(getGeminiUsage())
  }

  // ─── Create mode ─────────────────────────────────────────────────

  async onGenerate(): Promise<void> {
    this.loading_.set(true)
    this.status_.set('sending')
    try {
      const draft = await this.gemini.generateRecipe(this.prompt_())
      this.draft_.set(draft)
      this.status_.set('done')
    } catch {
      this.status_.set('error')
      this.userMsg.onSetErrorMsg('ai_recipe_error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage()
    }
  }

  onGenerateAgain(): void {
    this.draft_.set(null)
    this.status_.set('idle')
  }

  onOpenInBuilder(): void {
    const draft = this.draft_()
    if (!draft) return
    addGeminiShot(this.prompt_(), draft)
    this.aiDraft.set(draft)
    void this.router.navigate(['/recipe-builder'])
    this.modalService.close()
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
    } catch {
      this.status_.set('error')
      this.userMsg.onSetErrorMsg('ai_recipe_error')
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
    this.modalService.close()
    this.draft_.set(null)
    this.patch_.set(null)
    this.prompt_.set('')
    this.instruction_.set('')
    this.loading_.set(false)
    this.status_.set('idle')
  }
}
