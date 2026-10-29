import { ChangeDetectionStrategy, Component, inject, computed, signal, effect, untracked } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { EnglishKeyInputDirective } from '@directives/english-key-input.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { LabelCreationModalService } from './label-creation-modal.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { LABEL_COLOR_PALETTE } from '@models/label.model'
import { finalizeEnglishKey } from '@utils/english-key.util'
import { ModalShellComponent } from '../modal-shell/modal-shell.component'

@Component({
  selector: 'app-label-creation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, EnglishKeyInputDirective, TranslatePipe, ModalShellComponent],
  templateUrl: './label-creation-modal.component.html',
  styleUrl: './label-creation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabelCreationModalComponent {
  protected readonly modal = inject(LabelCreationModalService)
  private readonly metadataRegistry = inject(MetadataRegistryService)

  protected englishKey_ = signal('')
  /** The form as the popup opened with it, to tell typed edits from the prefill. */
  private readonly openedWith_ = signal('')
  protected validationError_ = signal<string | null>(null)

  protected readonly palette = LABEL_COLOR_PALETTE

  protected readonly titleKey_ = computed(() => (this.modal.originalKey_() ? 'edit_label' : 'add_new_label'))

  constructor() {
    effect(() => {
      if (this.modal.isOpen_()) {
        this.englishKey_.set(untracked(() => this.modal.englishKey_()))
        this.validationError_.set(null)
        this.openedWith_.set(untracked(() => this.snapshot_()))
      }
    })
  }

  private snapshot_(): string {
    return JSON.stringify([
      this.englishKey_(),
      this.modal.hebrewLabel_(),
      this.modal.selectedColor_(),
      this.modal.selectedTriggers_()
    ])
  }

  /** Plan 498: the form differs from what the popup opened with (Escape / backdrop then ask). */
  protected hasChanges(): boolean {
    return this.snapshot_() !== this.openedWith_()
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

  protected toggleTrigger(value: string): void {
    this.modal.toggleTrigger(value)
  }
}
