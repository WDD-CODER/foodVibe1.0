import { Component, inject, signal, computed } from '@angular/core';
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

  protected isHebrewReadonly_ = computed(() => {
    const label = this.hebrewLabel_();
    const ctx = this.context_();
    return (ctx === 'allergen' || ctx === 'supplier' || ctx === 'unit') && !!label;
  });

  protected updateHebrew(value: string): void {
    this.modalService.hebrewLabel_.set(value);
  }

  protected title_ = computed(() => {
    const ctx = this.context_();
    if (ctx === 'category') return 'add_new_category';
    if (ctx === 'allergen') return 'add_new_allergen';
    if (ctx === 'supplier') return 'add_supplier_translation_key';
    if (ctx === 'unit') return 'add_new_unit';
    return 'הזן מפתח אנגלי';
  });

  protected save(): void {
    const key = this.englishKey_().trim();
    const hebrew = this.hebrewLabel_().trim();
    if (!key || !hebrew) return;

    const validation = this.modalService.validateKey(key);
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

  protected resetAndClose(): void {
    this.cancel();
  }
}
