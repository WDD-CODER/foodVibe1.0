import { Component, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiRecipeModalService } from './ai-recipe-modal.service'
import { GeminiService } from '@services/gemini.service'
import { AiRecipeDraftService, type AiRecipeDraft } from '@services/ai-recipe-draft.service'
import { UserMsgService } from '@services/user-msg.service'

@Component({
  selector: 'app-ai-recipe-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './ai-recipe-modal.component.html',
  styleUrl: './ai-recipe-modal.component.scss',
})
export class AiRecipeModalComponent {
  protected readonly modalService = inject(AiRecipeModalService)
  private readonly geminiService = inject(GeminiService)
  private readonly aiDraftService = inject(AiRecipeDraftService)
  private readonly router = inject(Router)
  private readonly userMsg = inject(UserMsgService)

  protected readonly prompt_ = signal('')
  protected readonly loading_ = signal(false)
  protected readonly draft_ = signal<AiRecipeDraft | null>(null)

  async onGenerate(): Promise<void> {
    this.loading_.set(true)
    try {
      const draft = await this.geminiService.generateRecipe(this.prompt_())
      this.draft_.set(draft)
    } catch {
      this.userMsg.onSetErrorMsg('ai_recipe_error')
    } finally {
      this.loading_.set(false)
    }
  }

  onGenerateAgain(): void {
    this.draft_.set(null)
  }

  onOpenInBuilder(): void {
    const draft = this.draft_()
    if (!draft) return
    this.aiDraftService.set(draft)
    void this.router.navigate(['/recipe-builder'])
    this.modalService.close()
  }

}
