import { ChangeDetectionStrategy, Component, inject, computed, signal, effect, untracked } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { EnglishKeyInputDirective } from '@directives/english-key-input.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LabelCreationModalService } from './label-creation-modal.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { LABEL_COLOR_PALETTE } from '@models/label.model'
import { finalizeEnglishKey } from '@utils/english-key.util'

@Component({
  selector: 'app-label-creation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutSideDirective, EnglishKeyInputDirective, TranslatePipe],
  templateUrl: './label-creation-modal.component.html',
  styleUrl: './label-creation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabelCreationModalComponent {
  protected readonly modal = inject(LabelCreationModalService)
  private readonly metadataRegistry = inject(MetadataRegistryService)

  protected englishKey_ = signal('')
  protected validationError_ = signal<string | null>(null)

  protected readonly palette = LABEL_COLOR_PALETTE

  protected readonly titleKey_ = computed(() => (this.modal.originalKey_() ? 'edit_label' : 'add_new_label'))

  constructor() {
    effect(() => {
      if (this.modal.isOpen_()) {
        this.englishKey_.set(untracked(() => this.modal.englishKey_()))
        this.validationError_.set(null)
      }
    })
  }

  protected triggerOptions_ = computed(() => {
    const categories = this.metadataRegistry.allCategories_().map((c) => ({ value: c, type: 'category' as const }))
    const allergens = this.metadataRegistry.allAllergens_().map((a) => ({ value: a, type: 'allergen' as const }))
    return [...categories, ...allergens]
  })

  protected isTriggerSelected(value: string): boolean {
    return this.modal.selectedTriggers_().includes(value)
  }

  protected selectColor(color: string): void {
    this.modal.selectedColor_.set(color)
  }

  protected save(): void {
    const key = finalizeEnglishKey(this.englishKey_())
    this.englishKey_.set(key)
    const hebrew = this.modal.hebrewLabel_().trim()
    if (!key || !hebrew) return
    const validation = this.modal.validateKey(key, hebrew)
    if (!validation.valid) {
      this.validationError_.set(validation.error ?? null)
      return
    }
    this.validationError_.set(null)
    this.modal.save(key, hebrew, this.modal.selectedColor_(), this.modal.selectedTriggers_())
    this.englishKey_.set('')
  }

  protected cancel(): void {
    this.validationError_.set(null)
    this.englishKey_.set('')
    this.modal.cancel()
  }

  protected resetAndClose(): void {
    this.cancel()
  }

  protected toggleTrigger(value: string): void {
    this.modal.toggleTrigger(value)
  }
}
