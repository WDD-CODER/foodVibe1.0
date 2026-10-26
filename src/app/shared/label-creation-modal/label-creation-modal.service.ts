import { Injectable, signal, inject } from '@angular/core'
import { TranslationService } from '@services/translation.service'
import { sanitizeKey } from '../../core/utils/sanitize-key.util'
import { ModalController } from '@services/modal-controller'

interface LabelCreationResult {
  key: string
  hebrewLabel: string
  color: string
  autoTriggers: string[]
}

@Injectable({ providedIn: 'root' })
export class LabelCreationModalService {
  private translationService = inject(TranslationService)
  private controller_ = new ModalController<LabelCreationResult | null>(null)

  readonly isOpen_ = this.controller_.isOpen_
  hebrewLabel_ = signal('')
  englishKey_ = signal('')
  selectedColor_ = signal('#3B82F6')
  selectedTriggers_ = signal<string[]>([])
  /** The key being edited (plan 322 rename flow) — passed as `excludeKey` to validation so
   *  keeping the same key (only fixing color/Hebrew text/triggers) never false-collides with itself. */
  originalKey_ = signal('')

  /** `prefill.englishKey` set (edit mode, plan 322 rename flow) prefills the full form —
   *  key/color/autoTriggers too, not just the Hebrew name — so renaming a label can also
   *  correct its color/triggers in the same action instead of only the display text. */
  open(
    prefillHebrew?: string,
    prefill?: { englishKey: string; color: string; autoTriggers: string[] }
  ): Promise<LabelCreationResult | null> {
    this.hebrewLabel_.set(prefillHebrew ?? '')
    this.englishKey_.set(prefill?.englishKey ?? '')
    this.selectedColor_.set(prefill?.color ?? '#3B82F6')
    this.selectedTriggers_.set(prefill?.autoTriggers ?? [])
    this.originalKey_.set(prefill?.englishKey ?? '')
    return this.controller_.open()
  }

  save(englishKey: string, hebrewLabel: string, color: string, autoTriggers: string[]): void {
    const sanitizedKey = sanitizeKey(englishKey)
    const label = hebrewLabel.trim()
    const validation = this.translationService.validateKeyForHebrew(sanitizedKey, label, this.originalKey_())
    if (!validation.valid) {
      throw new Error(validation.error)
    }
    this.close({
      key: sanitizedKey,
      hebrewLabel: label,
      color: color || '#78716C',
      autoTriggers: autoTriggers ?? []
    })
  }

  cancel(): void {
    this.close(null)
  }

  close(result: LabelCreationResult | null = null): void {
    this.controller_.close(result)
    this.hebrewLabel_.set('')
    this.englishKey_.set('')
    this.selectedColor_.set('#3B82F6')
    this.selectedTriggers_.set([])
    this.originalKey_.set('')
  }

  validateKey(key: string, hebrewLabel: string): { valid: boolean; error?: string } {
    return this.translationService.validateKeyForHebrew(key, hebrewLabel, this.originalKey_())
  }

  toggleTrigger(value: string): void {
    const current = this.selectedTriggers_()
    if (current.includes(value)) {
      this.selectedTriggers_.set(current.filter((t) => t !== value))
    } else {
      this.selectedTriggers_.set([...current, value])
    }
  }
}
