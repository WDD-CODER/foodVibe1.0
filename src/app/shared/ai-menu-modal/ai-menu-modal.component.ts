import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { TextareaAutoGrowDirective } from 'src/app/core/directives/textarea-auto-grow.directive'
import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { formatPctInt } from 'src/app/core/engine/rounding'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiMenuModalService } from './ai-menu-modal.service'
import { GeminiService } from '@services/gemini.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { getGeminiUsage, geminiUsageStatus, geminiBudgetUsedPercent } from '../../core/utils/gemini-usage.util'
import { matchMenuDish } from '../../core/utils/recipe-match.util'
import type { AiMenuDraft, MatchedMenu, MatchedSection, MatchedDish } from '@models/ai-menu-draft.model'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'

@Component({
  selector: 'app-ai-menu-modal',
  standalone: true,
  imports: [
    TextareaAutoGrowDirective,
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    LoaderComponent,
    ModalShellComponent
  ],
  templateUrl: './ai-menu-modal.component.html',
  styleUrl: './ai-menu-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiMenuModalComponent implements OnInit {
  /** Percent display goes through the engine rounding rule. */
  protected readonly pctInt = formatPctInt

  protected readonly modalService = inject(AiMenuModalService)
  private readonly gemini_ = inject(GeminiService)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  // Create mode
  protected readonly prompt_ = signal('')
  protected readonly draft_ = signal<AiMenuDraft | null>(null)
  protected readonly matched_ = signal<MatchedMenu | null>(null)
  protected readonly userResolutions_ = signal<Map<string, string | 'skip'>>(new Map())

  // Edit mode
  protected readonly instruction = signal('')
  protected readonly patch_ = signal<Record<string, unknown> | null>(null)

  // Shared
  protected readonly isLoading_ = signal(false)
  protected readonly status_ = signal<GenerationStatus>('idle')
  protected readonly errorKey_ = signal('ai_menu_error')
  protected readonly geminiUsage_ = signal(getGeminiUsage())

  protected readonly usageColor_ = computed(() => geminiUsageStatus(this.geminiUsage_()))
  protected readonly usageFillPercent_ = computed(() => geminiBudgetUsedPercent(this.geminiUsage_()))
  /** Button text for the model switch the server offered ("עבור ל-<model>"); empty when none. */
  protected readonly modelSwitchLabel_ = computed(() => {
    const offer = this.gemini_.modelSwitch()
    return offer ? this.translation_.translate('ai_model_switch_to').replace('{model}', offer.to) : ''
  })
  /** "נותרו N שימושים היום" - calls left today across the model chain (shared by all users). */
  protected readonly usesLeftLabel_ = computed(() =>
    this.translation_.translate('ai_uses_left_today').replace('{n}', String(this.geminiUsage_().remaining))
  )

  private static readonly SERVING_TYPE_LABELS: Record<string, string> = {
    plated_course: 'ai_serving_plated_course',
    buffet: 'ai_serving_buffet',
    finger_food: 'ai_serving_finger_food',
    family_style: 'ai_serving_family_style'
  }

  protected readonly diffEntries_ = computed(() => {
    const patch = this.patch_()
    const current = this.modalService.getEditContext()
    if (!patch || !current) return []
    const entries: { label: string; from: string; to: string }[] = []
    if ('name' in patch)
      entries.push({
        label: this.translation_.translate('name'),
        from: current.name || '—',
        to: String(patch['name'] ?? '—')
      })
    if ('eventType' in patch)
      entries.push({
        label: this.translation_.translate('menu_event_type'),
        from: current.eventType || '—',
        to: String(patch['eventType'] ?? '—')
      })
    if ('guestCount' in patch)
      entries.push({
        label: this.translation_.translate('menu_guests'),
        from: String(current.guestCount),
        to: String(patch['guestCount'] ?? '—')
      })
    if ('servingType' in patch) {
      const fmt = (k: unknown) => {
        const key = AiMenuModalComponent.SERVING_TYPE_LABELS[String(k)]
        return key ? this.translation_.translate(key) : String(k)
      }
      entries.push({
        label: this.translation_.translate('menu_serving_style'),
        from: fmt(current.servingType),
        to: fmt(patch['servingType'])
      })
    }
    if ('eventDate' in patch)
      entries.push({
        label: this.translation_.translate('date_filter'),
        from: current.eventDate ?? '—',
        to: String(patch['eventDate'] ?? '—')
      })
    if ('sections' in patch) {
      const newSections = patch['sections'] as { category: string; items: unknown[] }[] | undefined
      const count = Array.isArray(newSections) ? newSections.length : 0
      entries.push({
        label: this.translation_.translate('ai_patch_sections'),
        from: String(current.sections.length),
        to: String(count)
      })
    }
    return entries
  })

  ngOnInit(): void {
    this.refreshUsage_()
  }

  private refreshUsage_(): void {
    this.geminiUsage_.set(getGeminiUsage())
    this.gemini_.fetchUsage().then((usage) => this.geminiUsage_.set(usage))
  }

  // ─── Create mode ─────────────────────────────────────────────────

  async onGenerate(): Promise<void> {
    const text = this.prompt_().trim()
    if (!text) return
    this.isLoading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_menu_error')
    try {
      const draft = await this.gemini_.generateMenu(text)
      this.draft_.set(draft)
      const matched = this.buildMatchedMenu_(draft)
      this.matched_.set(matched)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.isLoading_.set(false)
      this.refreshUsage_()
    }
  }

  private buildMatchedMenu_(draft: AiMenuDraft): MatchedMenu {
    const recipes = this.kitchenState_.recipes_()
    const sections: MatchedSection[] = draft.sections.map((section, _si) => {
      const items: MatchedDish[] = section.items.map((dish) => {
        const { bestMatch, candidates, status } = matchMenuDish(dish, recipes)
        return {
          nameHebrew: dish.nameHebrew,
          status,
          recipeId: status === 'matched' ? (bestMatch?.recipeId ?? null) : null,
          candidates,
          predictedTakeRate: dish.predictedTakeRate
        }
      })
      return { category: section.category, items }
    })
    return {
      name: draft.name,
      eventType: draft.eventType,
      eventDate: draft.eventDate,
      servingType: draft.servingType,
      guestCount: draft.guestCount,
      sections
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
    const draft = this.draft_()
    if (!matched) return
    this.modalService.deliverResult(matched, this.userResolutions_())
    if (draft) {
      this.gemini_.saveMenuShot(this.prompt_(), draft).catch(() => {
        /* non-blocking */
      })
    }
    this.resetLocalState_()
  }

  // ─── Edit mode ───────────────────────────────────────────────────

  async onEdit(): Promise<void> {
    const currentMenu = this.modalService.getEditContext()
    if (!currentMenu) return
    this.isLoading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_menu_error')
    try {
      const changes = await this.gemini_.patchMenu(currentMenu, this.instruction())
      this.patch_.set(changes as Record<string, unknown>)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.isLoading_.set(false)
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
    this.instruction.set('')
    this.status_.set('idle')
  }

  // ─── Shared ──────────────────────────────────────────────────────

  /** Plan 498: typed input or an unsaved AI draft (Escape / backdrop then ask). */
  protected hasChanges(): boolean {
    return !!this.prompt_().trim() || this.draft_() !== null
  }

  onClose(): void {
    this.modalService.close()
    this.resetLocalState_()
  }

  /** The user's explicit switch to the offered model; they send the request again themselves. */
  onSwitchModel(): void {
    this.gemini_.acceptModelSwitch()
    this.status_.set('idle')
  }

  /** Plan 580: server reason code (`code` on the error body) -> dictionary key. */
  private static readonly ERROR_KEYS: Readonly<Record<string, string>> = {
    no_sections: 'ai_menu_error_no_dishes',
    no_recipes: 'ai_menu_error_no_recipes',
    no_guest_count: 'ai_menu_error_no_guest_count',
    invalid_draft: 'ai_menu_error_unreadable',
    unreadable: 'ai_menu_error_unreadable',
    empty_response: 'ai_menu_error_unreadable',
    invalid_patch: 'ai_menu_error_unreadable',
    timeout: 'ai_menu_error_timeout',
    not_configured: 'ai_menu_error_not_configured',
    ai_error: 'ai_menu_error_busy',
    daily_limit_reached: 'ai_daily_limit_reached_all',
    model_exhausted: 'ai_model_exhausted_prompt'
  }

  private resolveErrorKey_(err: unknown): string {
    if (this.gemini_.offerModelSwitch(err)) return 'ai_model_exhausted_prompt'
    if (err instanceof HttpErrorResponse) {
      const code: unknown = err.error?.code
      if (typeof code === 'string' && AiMenuModalComponent.ERROR_KEYS[code])
        return AiMenuModalComponent.ERROR_KEYS[code]
      if (err.error?.error === 'daily_limit_reached') return 'ai_daily_limit_reached_all'
      if (err.status === 429) return 'ai_limit_reached'
      if (err.status === 504) return 'ai_menu_error_timeout'
      if (err.status === 503) return 'ai_menu_error_not_configured'
    }
    return 'ai_menu_error'
  }

  private resetLocalState_(): void {
    this.prompt_.set('')
    this.draft_.set(null)
    this.matched_.set(null)
    this.userResolutions_.set(new Map())
    this.instruction.set('')
    this.patch_.set(null)
    this.isLoading_.set(false)
    this.status_.set('idle')
    this.errorKey_.set('ai_menu_error')
  }
}
