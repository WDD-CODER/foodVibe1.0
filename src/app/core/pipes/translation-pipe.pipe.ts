import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

// TODO(Phase 2): replace with Transloco pipe — pure: false is intentional
// until TranslatePipe is fully replaced by Transloco. Do not change to pure: true here.
// See design doc: danwe-main-design-20260404-144233.md
@Pipe({
  name: 'translatePipe',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private translationService = inject(TranslationService);

  transform(value: string | undefined): string {
    return this.translationService.translate(value);
  }
}