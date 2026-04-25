import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiMenuModalService } from './ai-menu-modal.service'
import { GeminiService } from '@services/gemini.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { getGeminiUsage, DAILY_LIMIT, fetchGeminiUsageFromServer } from '../../core/utils/gemini-usage.util'
import { matchRecipeName } from '../../core/utils/recipe-match.util'
import type { AiMenuDraft, MatchedMenu, MatchedSection, MatchedDish } from '@models/ai-menu-draft.model'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'

@Component({
  selector: 'app-ai-menu-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './ai-menu-modal.component.html',
  styleUrl: './ai-menu-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiMenuModalComponent implements OnInit {
  protected readonly modalService = inject(AiMenuModalService)
  private readonly gemini_ = inject(GeminiService)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  // Create mode
  protected readonly prompt_ = signal('')
  protected readonly matched_ = signal<MatchedMenu | null>(null)
  protected readonly userResolutions_ = signal<Map<string, string | 'skip'>>(new Map())

  // Edit mode
  protected readonly instruction_ = signal('')
  protected readonly patch_ = signal<Record<string, unknown> | null>(null)

  // Shared
  protected readonly loading_ = signal(false)
  protected readonly status_ = signal<GenerationStatus>('idle')
  protected readonly errorKey_ = signal('ai_menu_error')
  protected readonly geminiUsage_ = signal(getGeminiUsage())

  protected readonly usageColor_ = computed(() => {
    const pct = this.geminiUsage_().count / DAILY_LIMIT
    if (pct >= 0.9) return 'danger'
    if (pct >= 0.7) return 'warning'
    return 'ok'
  })

  protected readonly patchKeys_ = computed(() => {
    const p = this.patch_()
    return p ? Object.keys(p) : []
  })

  ngOnInit(): void {
    this.refreshUsage_()
  }

  private refreshUsage_(): void {
    this.geminiUsage_.set(getGeminiUsage())
    fetchGeminiUsageFromServer().then((usage) => this.geminiUsage_.set(usage))
  }

  // ─── Create mode ─────────────────────────────────────────────────

  async onGenerate(): Promise<void> {
    const text = this.prompt_().trim()
    if (!text) return
    this.loading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_menu_error')
    try {
      const draft = await this.gemini_.generateMenu(text)
      const matched = this.buildMatchedMenu_(draft)
      this.matched_.set(matched)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage_()
    }
  }

  private buildMatchedMenu_(draft: AiMenuDraft): MatchedMenu {
    const recipes = this.kitchenState_.recipes_()
    const sections: MatchedSection[] = draft.sections_.map((section, si) => {
      const items: MatchedDish[] = section.items.map((dish) => {
        const { bestMatch, candidates, status } = matchRecipeName(dish.name_hebrew, recipes)
        return {
          name_hebrew: dish.name_hebrew,
          status,
          recipeId: status === 'matched' ? (bestMatch?.recipeId ?? null) : null,
          candidates,
          predictedTakeRate: dish.predicted_take_rate_,
          servingPortions: dish.serving_portions,
          sellPrice: dish.sell_price,
        }
      })
      return { category: section.category, items }
    })
    return {
      name_: draft.name_,
      event_type_: draft.event_type_,
      event_date_: draft.event_date_,
      serving_type_: draft.serving_type_,
      guest_count_: draft.guest_count_,
      sections,
    }
  }

  onGenerateAgain(): void {
    this.matched_.set(null)
    this.userResolutions_.set(new Map())
    this.status_.set('idle')
    this.errorKey_.set('ai_menu_error')
  }

  onResolve(dishKey: string, value: string | 'skip'): void {
    const current = new Map(this.userResolutions_())
    current.set(dishKey, value)
    this.userResolutions_.set(current)
  }

  onApply(): void {
    const matched = this.matched_()
    if (!matched) return
    this.modalService.deliverResult(matched, this.userResolutions_())
    this.resetLocalState_()
  }

  // ─── Edit mode ───────────────────────────────────────────────────

  async onEdit(): Promise<void> {
    const currentMenu = this.modalService.getEditContext()
    if (!currentMenu) return
    this.loading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_menu_error')
    try {
      const changes = await this.gemini_.patchMenu(currentMenu, this.instruction_())
      this.patch_.set(changes as Record<string, unknown>)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage_()
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
    this.resetLocalState_()
  }

  private resolveErrorKey_(err: unknown): string {
    if (err instanceof Error && !(err instanceof HttpErrorResponse) && err.message.includes('מגבלת')) {
      return 'ai_menu_daily_limit_reached'
    }
    if (err instanceof HttpErrorResponse) {
      const msg: string = err.error?.error ?? ''
      const status = err.status
      if (status === 429 || msg.includes('daily_limit_reached')) return 'ai_menu_daily_limit_reached'
      if (status === 504 || msg.includes('timed out')) return 'ai_menu_error'
      if (status === 503 && msg.includes('not configured')) return 'ai_menu_error'
    }
    return 'ai_menu_error'
  }

  private resetLocalState_(): void {
    this.prompt_.set('')
    this.matched_.set(null)
    this.userResolutions_.set(new Map())
    this.instruction_.set('')
    this.patch_.set(null)
    this.loading_.set(false)
    this.status_.set('idle')
    this.errorKey_.set('ai_menu_error')
  }
}
