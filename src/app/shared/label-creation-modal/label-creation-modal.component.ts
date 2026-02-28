import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { LabelCreationModalService } from './label-creation-modal.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { LABEL_COLOR_PALETTE } from '@models/label.model';

@Component({
  selector: 'app-label-creation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutSideDirective, TranslatePipe],
  templateUrl: './label-creation-modal.component.html',
  styleUrl: './label-creation-modal.component.scss',
})
export class LabelCreationModalComponent {
  protected readonly modal = inject(LabelCreationModalService);
  private readonly metadataRegistry = inject(MetadataRegistryService);

  protected englishKey_ = signal('');
  protected validationError_ = signal<string | null>(null);

  protected readonly palette = LABEL_COLOR_PALETTE;

  protected triggerOptions_ = computed(() => {
    const categories = this.metadataRegistry.allCategories_().map(c => ({ value: c, type: 'category' as const }));
    const allergens = this.metadataRegistry.allAllergens_().map(a => ({ value: a, type: 'allergen' as const }));
    return [...categories, ...allergens];
  });

  protected isTriggerSelected(value: string): boolean {
    return this.modal.selectedTriggers_().includes(value);
  }

  protected selectColor(color: string): void {
    this.modal.selectedColor_.set(color);
  }

  protected save(): void {
    const key = this.englishKey_().trim().toLowerCase().replace(/\s+/g, '_');
    const hebrew = this.modal.hebrewLabel_().trim();
    if (!key || !hebrew) return;
    const validation = this.modal.validateKey(key);
    if (!validation.valid) {
      this.validationError_.set(validation.error ?? null);
      return;
    }
    this.validationError_.set(null);
    this.modal.save(key, hebrew, this.modal.selectedColor_(), this.modal.selectedTriggers_());
    this.englishKey_.set('');
  }

  protected cancel(): void {
    this.validationError_.set(null);
    this.englishKey_.set('');
    this.modal.cancel();
  }

  protected resetAndClose(): void {
    this.cancel();
  }

  protected toggleTrigger(value: string): void {
    this.modal.toggleTrigger(value);
  }
}
