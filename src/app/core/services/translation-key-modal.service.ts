import { Injectable, signal, inject } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { TranslationService } from './translation.service';
import { sanitizeKey } from '../utils/sanitize-key.util';

export type TranslationKeyResult = { englishKey: string; hebrewLabel: string };
export type TranslationKeyModalResult = TranslationKeyResult | null | { continueWithoutSaving: true };

/** Type guard: use after open() to narrow to TranslationKeyResult before using .englishKey / .hebrewLabel */
export function isTranslationKeyResult(r: TranslationKeyModalResult): r is TranslationKeyResult {
  return r != null && typeof r === 'object' && 'englishKey' in r && 'hebrewLabel' in r;
}

@Injectable({ providedIn: 'root' })
export class TranslationKeyModalService {
  private translationService = inject(TranslationService);

  private resultSubject = new Subject<TranslationKeyModalResult>();
  isOpen_ = signal(false);
  hebrewLabel_ = signal('');
  context_ = signal<'category' | 'allergen' | 'supplier' | 'unit' | 'generic'>('generic');

  open(hebrewLabel: string = '', context: 'category' | 'allergen' | 'supplier' | 'unit' | 'generic' = 'generic'): Promise<TranslationKeyModalResult> {
    this.hebrewLabel_.set(hebrewLabel.trim());
    this.context_.set(context);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(englishKey: string, hebrewLabel: string): void {
    const sanitizedKey = sanitizeKey(englishKey);
    const label = hebrewLabel.trim();
    const validation = this.translationService.validateKeyForHebrew(sanitizedKey, label);
    if (!validation.valid) {
      return;
    }
    this.resultSubject.next({ englishKey: sanitizedKey, hebrewLabel: label });
    this.close();
  }

  cancel(): void {
    this.resultSubject.next(null);
    this.close();
  }

  /** For on-leave (generic) context: leave without adding this value to the dictionary; untranslated value will be removed from the item. */
  continueWithoutSaving(): void {
    this.resultSubject.next({ continueWithoutSaving: true });
    this.close();
  }

  close(): void {
    this.isOpen_.set(false);
    this.hebrewLabel_.set('');
    this.context_.set('generic');
  }

  validateKey(key: string): { valid: boolean; error?: string } {
    return this.translationService.validateEnglishKey(key);
  }

  validateKeyForHebrew(key: string, hebrewLabel: string): { valid: boolean; error?: string } {
    return this.translationService.validateKeyForHebrew(key, hebrewLabel);
  }
}
