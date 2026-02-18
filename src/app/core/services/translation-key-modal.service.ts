import { Injectable, signal, inject } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { TranslationService } from './translation.service';

export type TranslationKeyResult = { englishKey: string; hebrewLabel: string };

@Injectable({ providedIn: 'root' })
export class TranslationKeyModalService {
  private translationService = inject(TranslationService);

  private resultSubject = new Subject<TranslationKeyResult | null>();
  isOpen_ = signal(false);
  hebrewLabel_ = signal('');
  context_ = signal<'category' | 'allergen' | 'supplier' | 'unit' | 'generic'>('generic');

  open(hebrewLabel: string = '', context: 'category' | 'allergen' | 'supplier' | 'unit' | 'generic' = 'generic'): Promise<TranslationKeyResult | null> {
    this.hebrewLabel_.set(hebrewLabel.trim());
    this.context_.set(context);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(englishKey: string, hebrewLabel: string): void {
    const sanitizedKey = englishKey.trim().toLowerCase().replace(/\s+/g, '_');
    const validation = this.translationService.validateEnglishKey(sanitizedKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    this.resultSubject.next({ englishKey: sanitizedKey, hebrewLabel: hebrewLabel.trim() });
    this.close();
  }

  cancel(): void {
    this.resultSubject.next(null);
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
}
