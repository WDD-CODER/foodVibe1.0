import { inject, Injectable } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'

@Injectable()
export class ProductAiFlowService {
  private readonly metadataRegistry_ = inject(MetadataRegistryService)
  private form_: FormGroup | null = null

  init(form: FormGroup): void {
    this.form_ = form
  }

  async applyDraft(draft: AiProductDraft): Promise<void> {
    if (!this.form_) return

    // Register and apply categories
    const knownCategories = new Set(this.metadataRegistry_.allCategories_())
    for (const category of draft.categories) {
      if (!knownCategories.has(category)) {
        await this.metadataRegistry_.registerCategory(category)
      }
    }
    this.form_.get('categories')?.patchValue(draft.categories)

    // Register and apply allergens
    for (const allergen of draft.allergens) {
      await this.metadataRegistry_.registerAllergen(allergen)
    }
    this.form_.get('allergens')?.patchValue(draft.allergens)

    // Patch scalar fields (productName is the form control name for nameHebrew)
    this.form_.patchValue({
      productName: draft.nameHebrew,
      baseUnit: draft.baseUnit,
      yieldFactor: draft.yieldFactor,
      minStockLevel: draft.minStockLevel,
      expiryDaysDefault: draft.expiryDaysDefault
    })
  }

  async applyPatch(patch: AiProductPatch): Promise<void> {
    if (!this.form_) return

    const current: AiProductDraft = {
      nameHebrew: this.form_.get('productName')?.value ?? '',
      baseUnit: this.form_.get('baseUnit')?.value ?? '',
      categories: this.form_.get('categories')?.value ?? [],
      allergens: this.form_.get('allergens')?.value ?? [],
      yieldFactor: this.form_.get('yieldFactor')?.value ?? 1,
      minStockLevel: this.form_.get('minStockLevel')?.value ?? 0,
      expiryDaysDefault: this.form_.get('expiryDaysDefault')?.value ?? 0
    }

    await this.applyDraft({ ...current, ...patch })
  }
}
