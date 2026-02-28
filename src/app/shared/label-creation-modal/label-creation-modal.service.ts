import { Injectable, signal, inject } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { TranslationService } from '@services/translation.service';

export interface LabelCreationResult {
  key: string;
  hebrewLabel: string;
  color: string;
  autoTriggers: string[];
}

@Injectable({ providedIn: 'root' })
export class LabelCreationModalService {
  private translationService = inject(TranslationService);
  private resultSubject = new Subject<LabelCreationResult | null>();

  isOpen_ = signal(false);
  hebrewLabel_ = signal('');
  englishKey_ = signal('');
  selectedColor_ = signal('#3B82F6');
  selectedTriggers_ = signal<string[]>([]);

  open(): Promise<LabelCreationResult | null> {
    this.hebrewLabel_.set('');
    this.englishKey_.set('');
    this.selectedColor_.set('#3B82F6');
    this.selectedTriggers_.set([]);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(englishKey: string, hebrewLabel: string, color: string, autoTriggers: string[]): void {
    const sanitizedKey = englishKey.trim().toLowerCase().replace(/\s+/g, '_');
    const validation = this.translationService.validateEnglishKey(sanitizedKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    this.resultSubject.next({
      key: sanitizedKey,
      hebrewLabel: hebrewLabel.trim(),
      color: color || '#78716C',
      autoTriggers: autoTriggers ?? [],
    });
    this.close();
  }

  cancel(): void {
    this.resultSubject.next(null);
    this.close();
  }

  close(): void {
    this.isOpen_.set(false);
    this.hebrewLabel_.set('');
    this.englishKey_.set('');
    this.selectedColor_.set('#3B82F6');
    this.selectedTriggers_.set([]);
  }

  validateKey(key: string): { valid: boolean; error?: string } {
    return this.translationService.validateEnglishKey(key);
  }

  toggleTrigger(value: string): void {
    const current = this.selectedTriggers_();
    if (current.includes(value)) {
      this.selectedTriggers_.set(current.filter(t => t !== value));
    } else {
      this.selectedTriggers_.set([...current, value]);
    }
  }
}
