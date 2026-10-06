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
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { resolveDraftMetadata } from 'src/app/pages/inventory/services/ai-draft-metadata.util'
import { getGeminiUsage, DAILY_LIMIT, fetchGeminiUsageFromServer } from '../../core/utils/gemini-usage.util'
import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'

type GenerationStatus = 'idle' | 'sending' | 'done' | 'error'
type InputMode = 'text' | 'image'

const CANONICAL_UNITS = [
  'gram',
  'ml',
  'kg',
  'liter',
  'unit',
  'tablespoon',
  'teaspoon',
  'cup',
  'pinch',
  'portion'
] as const

@Component({
  selector: 'app-ai-product-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './ai-product-modal.component.html',
  styleUrl: './ai-product-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiProductModalComponent implements OnInit {
  protected readonly modalService = inject(AiProductModalService)
  private readonly gemini_ = inject(GeminiService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly translation_ = inject(TranslationService)
  private readonly metadataRegistry_ = inject(MetadataRegistryService)

  protected readonly CANONICAL_UNITS = CANONICAL_UNITS
  protected readonly newCategory_ = signal('')
  protected readonly newAllergen_ = signal('')

  // Create mode
  protected readonly inputMode_ = signal<InputMode>('text')
  protected readonly prompt_ = signal('')
  protected readonly imageFile_ = signal<File | null>(null)
  protected readonly imagePreviewUrl_ = signal<string | null>(null)
  protected readonly imageHint_ = signal('')
  protected readonly draft_ = signal<AiProductDraft | null>(null)

  // Edit mode
  protected readonly instruction = signal('')
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

  protected readonly canGenerate_ = computed(() =>
    this.inputMode_() === 'image' ? !!this.imageFile_() : !!this.prompt_().trim()
  )

  protected readonly diffEntries_ = computed(() => {
    const patch = this.patch_()
    const current = this.modalService.getEditContext()
    if (!patch || !current) return []
    const entries: { label: string; from: string; to: string }[] = []
    if ('nameHebrew' in patch)
      entries.push({ label: 'שם', from: current.nameHebrew ?? '—', to: String(patch.nameHebrew ?? '—') })
    if ('baseUnit' in patch)
      entries.push({ label: 'יחידת בסיס', from: current.baseUnit ?? '—', to: String(patch.baseUnit ?? '—') })
    if ('yieldFactor' in patch)
      entries.push({ label: 'יחידת תפוקה', from: String(current.yieldFactor), to: String(patch.yieldFactor ?? '—') })
    if ('categories' in patch)
      entries.push({
        label: 'קטגוריות',
        from: this.labels_(current.categories),
        to: this.labels_(patch.categories)
      })
    if ('allergens' in patch)
      entries.push({
        label: 'אלרגנים',
        from: this.labels_(current.allergens),
        to: this.labels_(patch.allergens)
      })
    if ('minStockLevel' in patch)
      entries.push({
        label: 'מינימום מלאי',
        from: String(current.minStockLevel),
        to: String(patch.minStockLevel ?? '—')
      })
    if ('expiryDaysDefault' in patch)
      entries.push({
        label: 'ימי תפוגה',
        from: String(current.expiryDaysDefault),
        to: String(patch.expiryDaysDefault ?? '—')
      })
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
    this.draft_.update((d) => (d ? { ...d, [key]: value } : d))
  }

  protected async addCategory(): Promise<void> {
    const raw = this.newCategory_().trim()
    if (!raw) return
    this.newCategory_.set('')
    const [cat] = (await resolveDraftMetadata({ categories: [raw] }, this.metadataRegistry_)).categories
    if (!cat) return
    this.draft_.update((d) => (d && !d.categories.includes(cat) ? { ...d, categories: [...d.categories, cat] } : d))
  }

  protected removeCategory(cat: string): void {
    this.draft_.update((d) => (d ? { ...d, categories: d.categories.filter((c) => c !== cat) } : d))
  }

  protected async addAllergen(): Promise<void> {
    const raw = this.newAllergen_().trim()
    if (!raw) return
    this.newAllergen_.set('')
    const [al] = (await resolveDraftMetadata({ allergens: [raw] }, this.metadataRegistry_)).allergens
    if (!al) return
    this.draft_.update((d) => (d && !d.allergens.includes(al) ? { ...d, allergens: [...d.allergens, al] } : d))
  }

  protected removeAllergen(al: string): void {
    this.draft_.update((d) => (d ? { ...d, allergens: d.allergens.filter((a) => a !== al) } : d))
  }

  // ─── Create mode ─────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    input.value = ''
    this.imageFile_.set(file)
    this.imagePreviewUrl_.set(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => this.imagePreviewUrl_.set(reader.result as string)
    reader.readAsDataURL(file)
  }

  onClearImage(): void {
    this.imageFile_.set(null)
    this.imagePreviewUrl_.set(null)
  }

  async onGenerate(): Promise<void> {
    if (!this.canGenerate_()) return
    const file = this.imageFile_()
    const text = this.prompt_().trim()
    this.loading_.set(true)
    this.status_.set('sending')
    this.errorKey_.set('ai_product_error')
    try {
      const draft =
        this.inputMode_() === 'image' && file
          ? await this.gemini_.generateProductFromImage(file, this.imageHint_())
          : await this.gemini_.generateProduct(text)
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
      const changes = await this.gemini_.patchProduct(currentProduct, this.instruction())
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
    this.instruction.set('')
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

  private labels_(values: string[] | undefined): string {
    return (values ?? []).map((v) => this.translation_.translate(v)).join(', ') || '—'
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
    this.inputMode_.set('text')
    this.prompt_.set('')
    this.imageFile_.set(null)
    this.imagePreviewUrl_.set(null)
    this.imageHint_.set('')
    this.draft_.set(null)
    this.newCategory_.set('')
    this.newAllergen_.set('')
    this.instruction.set('')
    this.patch_.set(null)
    this.loading_.set(false)
    this.status_.set('idle')
    this.errorKey_.set('ai_product_error')
  }
}
