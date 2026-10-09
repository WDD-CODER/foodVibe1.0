import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core'
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { GeminiService, type GeminiChainModel } from '@services/gemini.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'

/**
 * Admin-only: the Gemini model chain for all users (plan 395). Order decides which model
 * answers first; when one runs out of its free daily quota the next one on the list answers.
 * Reorder by drag & drop (grip handle) or the up/down buttons (keyboard). Edits stay local
 * until Save.
 */
@Component({
  selector: 'app-ai-model-manager',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, LucideAngularModule, TranslatePipe],
  templateUrl: './ai-model-manager.component.html',
  styleUrl: './ai-model-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiModelManagerComponent {
  private readonly gemini_ = inject(GeminiService)
  private readonly userService_ = inject(UserService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  protected readonly isAdmin_ = this.userService_.isAdmin_
  protected readonly isLoading_ = signal(false)
  protected readonly isSaving_ = signal(false)
  /** What the server holds — the baseline for "dirty". */
  private readonly saved_ = signal<GeminiChainModel[]>([])
  /** The admin's working copy. */
  protected readonly models_ = signal<GeminiChainModel[]>([])

  protected readonly isDirty_ = computed(() => this.chainKey_(this.models_()) !== this.chainKey_(this.saved_()))
  protected readonly enabledCount_ = computed(() => this.models_().filter((m) => m.enabled).length)
  /** Answer order among the enabled models (1 = asked first); off models have none. */
  protected readonly ranks_ = computed(() => {
    const ranks = new Map<string, number>()
    for (const m of this.models_()) if (m.enabled) ranks.set(m.name, ranks.size + 1)
    return ranks
  })

  constructor() {
    effect(() => {
      if (this.isAdmin_()) this.loadModels_()
    })
  }

  // ─── Read ────────────────────────────────────────────────────────

  private loadModels_(): void {
    this.isLoading_.set(true)
    this.gemini_.getModelChain().subscribe({
      next: (models) => {
        this.setModels_(models)
        this.isLoading_.set(false)
      },
      error: () => this.isLoading_.set(false)
    })
  }

  protected usageLabel(model: GeminiChainModel): string {
    if (model.dailyBudget === null) return String(model.used)
    return this.translation_
      .translate('ai_model_usage')
      .replace('{used}', String(model.used))
      .replace('{budget}', String(model.dailyBudget))
      .replace('{left}', String(model.remaining ?? 0))
  }

  // ─── Update ──────────────────────────────────────────────────────

  protected onToggle(name: string): void {
    const target = this.models_().find((m) => m.name === name)
    if (target?.enabled && this.enabledCount_() === 1) {
      this.userMsg_.onSetErrorMsg(this.translation_.translate('ai_model_need_one'))
      return
    }
    this.models_.update((list) => list.map((m) => (m.name === name ? { ...m, enabled: !m.enabled } : m)))
  }

  protected onDrop(event: CdkDragDrop<GeminiChainModel[]>): void {
    if (event.previousIndex === event.currentIndex) return
    this.models_.update((list) => {
      const copy = [...list]
      moveItemInArray(copy, event.previousIndex, event.currentIndex)
      return copy
    })
  }

  protected onMove(index: number, delta: -1 | 1): void {
    const next = index + delta
    this.models_.update((list) => {
      if (next < 0 || next >= list.length) return list
      const copy = [...list]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }

  protected onSave(): void {
    this.isSaving_.set(true)
    const payload = this.models_().map(({ name, enabled }) => ({ name, enabled }))
    this.gemini_.saveModelChain(payload).subscribe({
      next: (models) => this.onSaved_(models),
      error: () => this.onSaveFailed_()
    })
  }

  protected onReset(): void {
    this.isSaving_.set(true)
    this.gemini_.resetModelChain().subscribe({
      next: (models) => this.onSaved_(models),
      error: () => this.onSaveFailed_()
    })
  }

  protected onDiscard(): void {
    this.models_.set(this.saved_())
  }

  private onSaved_(models: GeminiChainModel[]): void {
    this.setModels_(models)
    this.isSaving_.set(false)
    this.userMsg_.onSetSuccessMsg(this.translation_.translate('ai_model_saved'))
  }

  private onSaveFailed_(): void {
    this.isSaving_.set(false)
    this.userMsg_.onSetErrorMsg(this.translation_.translate('ai_model_save_failed'))
  }

  private setModels_(models: GeminiChainModel[]): void {
    this.saved_.set(models)
    this.models_.set(models)
  }

  private chainKey_(models: GeminiChainModel[]): string {
    return models.map((m) => `${m.name}:${m.enabled ? 1 : 0}`).join(',')
  }
}
