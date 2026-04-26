import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LoaderComponent } from '../loader/loader.component'
import { AiProductModalService } from './ai-product-modal.service'
import { GeminiService } from '@services/gemini.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { getGeminiUsage, DAILY_LIMIT, fetchGeminiUsageFromServer } from '../../core/utils/gemini-usage.util'
import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'

const CANONICAL_UNITS = ['gram', 'ml', 'kg', 'liter', 'unit', 'tablespoon', 'teaspoon', 'cup', 'pinch', 'portion'] as const

@Component({
  selector: 'app-ai-product-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './ai-product-modal.component.html',
  styleUrl: './ai-product-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiProductModalComponent implements OnInit {
  protected readonly modalService = inject(AiProductModalService)
  private readonly gemini_ = inject(GeminiService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)

  protected readonly CANONICAL_UNITS = CANONICAL_UNITS
  protected readonly newCategory_ = signal('')
  protected readonly newAllergen_ = signal('')

  // Create mode
  protected readonly prompt_ = signal('')
  protected readonly draft_ = signal<AiProductDraft | null>(null)

  // Edit mode
  protected readonly instruction_ = signal('')
  protected readonly patch_ = signal<AiProductPatch | null>(null)

  // Shared
  protected readonly loading_ = signal(false)
  protected readonly status_ = signal<GenerationStatus>('idle')
  protected readonly errorKey_ = signal('ai_product_error')
  protected readonly geminiUsage_ = signal(getGeminiUsage())

  protected readonly usageColor_ = computed(() => {
    const pct = this.geminiUsage_().count / DAILY_LIMIT
    if (pct >= 0.9) return 'danger'
    if (pct >= 0.7) return 'warning'
    return 'ok'
  })

  protected readonly diffEntries_ = computed(() => {
    const patch = this.patch_()
    const current = this.modalService.getEditContext()
    if (!patch || !current) return []
    const entries: { label: string; from: string; to: string }[] = []
    if ('name_hebrew' in patch) entries.push({ label: 'שם', from: current.name_hebrew ?? '—', to: String(patch.name_hebrew ?? '—') })
    if ('base_unit_' in patch) entries.push({ label: 'יחידת בסיס', from: current.base_unit_ ?? '—', to: String(patch.base_unit_ ?? '—') })
    if ('yield_factor_' in patch) entries.push({ label: 'יחידת תפוקה', from: String(current.yield_factor_), to: String(patch.yield_factor_ ?? '—') })
    if ('categories_' in patch) entries.push({ label: 'קטגוריות', from: current.categories_.join(', ') || '—', to: (patch.categories_ ?? []).join(', ') || '—' })
    if ('allergens_' in patch) entries.push({ label: 'אלרגנים', from: current.allergens_.join(', ') || '—', to: (patch.allergens_ ?? []).join(', ') || '—' })
    if ('min_stock_level_' in patch) entries.push({ label: 'מינימום מלאי', from: String(current.min_stock_level_), to: String(patch.min_stock_level_ ?? '—') })
    if ('expiry_days_default_' in patch) entries.push({ label: 'ימי תפוגה', from: String(current.expiry_days_default_), to: String(patch.expiry_days_default_ ?? '—') })
    return entries
  })

  ngOnInit(): void {
    this.refreshUsage_()
  }

  private refreshUsage_(): void {
    this.geminiUsage_.set(getGeminiUsage())
    fetchGeminiUsageFromServer().then((usage) => this.geminiUsage_.set(usage))
  }

  // ─── Draft editing ───────────────────────────────────────────────

  protected setDraftField<K extends keyof AiProductDraft>(key: K, value: AiProductDraft[K]): void {
    this.draft_.update(d => d ? { ...d, [key]: value } : d)
  }

  protected addCategory(): void {
    const cat = this.newCategory_().trim()
    if (!cat) return
    this.draft_.update(d => d && !d.categories_.includes(cat) ? { ...d, categories_: [...d.categories_, cat] } : d)
    this.newCategory_.set('')
  }

  protected removeCategory(cat: string): void {
    this.draft_.update(d => d ? { ...d, categories_: d.categories_.filter(c => c !== cat) } : d)
  }

  protected addAllergen(): void {
    const al = this.newAllergen_().trim()
    if (!al) return
    this.draft_.update(d => d && !d.allergens_.includes(al) ? { ...d, allergens_: [...d.allergens_, al] } : d)
    this.newAllergen_.set('')
  }

  protected removeAllergen(al: string): void {
    this.draft_.update(d => d ? { ...d, allergens_: d.allergens_.filter(a => a !== al) } : d)
  }

  // ─── Create mode ─────────────────────────────────────────────────

  async onGenerate(): Promise<void> {
    const text = this.prompt_().trim()
    if (!text) return
    this.loading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_product_error')
    try {
      const draft = await this.gemini_.generateProduct(text)
      this.draft_.set(draft)
      this.status_.set('done')
    } catch (err) {
      this.errorKey_.set(this.resolveErrorKey_(err))
      this.status_.set('error')
    } finally {
      this.loading_.set(false)
      this.refreshUsage_()
    }
  }

  onGenerateAgain(): void {
    this.draft_.set(null)
    this.status_.set('idle')
    this.errorKey_.set('ai_product_error')
  }

  onApply(): void {
    const draft = this.draft_()
    if (!draft) return
    this.modalService.deliverResult(draft)
    this.resetLocalState_()
  }

  // ─── Edit mode ───────────────────────────────────────────────────

  async onEdit(): Promise<void> {
    const currentProduct = this.modalService.getEditContext()
    if (!currentProduct) return
    this.loading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_product_error')
    try {
      const changes = await this.gemini_.patchProduct(currentProduct, this.instruction_())
      this.patch_.set(changes)
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

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.modalService.isOpen()) this.onClose()
  }

  onClose(): void {
    this.modalService.close()
    this.resetLocalState_()
  }

  private resolveErrorKey_(err: unknown): string {
    if (err instanceof Error && !(err instanceof HttpErrorResponse) && err.message.includes('מגבלת')) {
      return 'ai_product_daily_limit_reached'
    }
    if (err instanceof HttpErrorResponse) {
      const msg: string = err.error?.error ?? ''
      const status = err.status
      if (status === 429 || msg.includes('daily_limit_reached')) return 'ai_product_daily_limit_reached'
    }
    return 'ai_product_error'
  }

  private resetLocalState_(): void {
    this.prompt_.set('')
    this.draft_.set(null)
    this.newCategory_.set('')
    this.newAllergen_.set('')
    this.instruction_.set('')
    this.patch_.set(null)
    this.loading_.set(false)
    this.status_.set('idle')
    this.errorKey_.set('ai_product_error')
  }
}
