import { Component, inject, signal, computed, effect, viewChild, ElementRef, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { TranslationKeyModalService } from '@services/translation-key-modal.service';

@Component({
  selector: 'translation-key-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutSideDirective, TranslatePipe],
  templateUrl: './translation-key-modal.component.html',
  styleUrl: './translation-key-modal.component.scss'
})
export class TranslationKeyModalComponent {
  protected modalService = inject(TranslationKeyModalService);

  protected isOpen_ = this.modalService.isOpen_;
  protected hebrewLabel_ = this.modalService.hebrewLabel_;
  protected context_ = this.modalService.context_;
  protected englishKey_ = signal('');
  protected validationError_ = signal<string | null>(null);

  private englishKeyInputRef = viewChild<ElementRef<HTMLInputElement>>('englishKeyInput');
  private hebrewInputRef = viewChild<ElementRef<HTMLInputElement>>('hebrewInput');

  constructor() {
    effect(() => {
      if (this.isOpen_()) {
        this.englishKey_.set('');
        this.validationError_.set(null);
      }
    });
    effect(() => {
      if (!this.isOpen_()) return;
      const hebrewEmpty = !untracked(() => this.hebrewLabel_())?.trim();
      setTimeout(() => {
        if (hebrewEmpty) {
          this.hebrewInputRef()?.nativeElement?.focus();
        } else {
          this.englishKeyInputRef()?.nativeElement?.focus();
        }
      }, 0);
    });
  }

  /** Label for the first field: "Value on item" for generic (on-leave), "Hebrew value" otherwise. */
  protected firstFieldLabelKey_ = computed(() => (this.context_() === 'generic' ? 'value_on_item' : 'hebrew_value'));

  protected updateHebrew(value: string): void {
    this.modalService.hebrewLabel_.set(value);
  }

  protected title_ = computed(() => 'translation_modal_title');

  /** Translation key for the save button based on context (e.g. save_category, save_supplier). */
  protected saveLabelKey_ = computed(() => {
    const ctx = this.context_();
    if (ctx === 'category') return 'save_category';
    if (ctx === 'allergen') return 'save_allergen';
    if (ctx === 'supplier') return 'save_supplier';
    if (ctx === 'unit') return 'save_unit';
    return 'save_approve';
  });

  protected save(): void {
    const key = this.englishKey_().trim();
    const hebrew = this.hebrewLabel_().trim();
    if (!key || !hebrew) return;

    const validation = this.modalService.validateKeyForHebrew(key, hebrew);
    if (!validation.valid) {
      this.validationError_.set(validation.error ?? null);
      return;
    }
    this.validationError_.set(null);
    this.modalService.save(key, hebrew);
    this.englishKey_.set('');
  }

  protected cancel(): void {
    this.validationError_.set(null);
    this.englishKey_.set('');
    this.modalService.cancel();
  }

  protected continueWithoutSaving(): void {
    this.validationError_.set(null);
    this.englishKey_.set('');
    this.modalService.continueWithoutSaving();
  }

  protected resetAndClose(): void {
    this.cancel();
  }
}
