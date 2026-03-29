import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiRecipeModalService } from './ai-recipe-modal.service'
import { GeminiService } from '@services/gemini.service'
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { UserMsgService } from '@services/user-msg.service'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'

@Component({
  selector: 'app-ai-recipe-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './ai-recipe-modal.component.html',
  styleUrl: './ai-recipe-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRecipeModalComponent {
  protected readonly modalService = inject(AiRecipeModalService)
  protected readonly gemini = inject(GeminiService)
  private readonly aiDraft = inject(AiRecipeDraftService)
  private readonly router = inject(Router)
  private readonly userMsg = inject(UserMsgService)

  protected readonly prompt_ = signal('')
  protected readonly loading_ = signal(false)
  protected readonly draft_ = signal<AiRecipeDraft | null>(null)
  protected readonly configuringKey_ = signal(false)
  protected readonly keyInput_ = signal('')
  protected readonly status_ = signal<GenerationStatus>('idle')

  async onGenerate(): Promise<void> {
    if (!this.gemini.hasKey()) {
      this.configuringKey_.set(true)
      return
    }
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
    }
  }

  onSaveKey(): void {
    this.gemini.setApiKey(this.keyInput_())
    this.configuringKey_.set(false)
  }

  onGenerateAgain(): void {
    this.draft_.set(null)
    this.status_.set('idle')
  }

  onOpenInBuilder(): void {
    const draft = this.draft_()
    if (!draft) return
    this.aiDraft.set(draft)
    void this.router.navigate(['/recipe-builder'])
    this.modalService.close()
  }

  onClose(): void {
    this.modalService.close()
    this.draft_.set(null)
    this.prompt_.set('')
    this.loading_.set(false)
    this.status_.set('idle')
    this.configuringKey_.set(false)
  }
}
