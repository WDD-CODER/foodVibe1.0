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
    for (const category of draft.categories_) {
      if (!knownCategories.has(category)) {
        await this.metadataRegistry_.registerCategory(category)
      }
    }
    this.form_.get('categories_')?.patchValue(draft.categories_)

    // Register and apply allergens
    for (const allergen of draft.allergens_) {
      await this.metadataRegistry_.registerAllergen(allergen)
    }
    this.form_.get('allergens_')?.patchValue(draft.allergens_)

    // Patch scalar fields (productName is the form control name for name_hebrew)
    this.form_.patchValue({
      productName: draft.name_hebrew,
      base_unit_: draft.base_unit_,
      yield_factor_: draft.yield_factor_,
      min_stock_level_: draft.min_stock_level_,
      expiry_days_default_: draft.expiry_days_default_,
    })
  }

  async applyPatch(patch: AiProductPatch): Promise<void> {
    if (!this.form_) return

    const current: AiProductDraft = {
      name_hebrew: this.form_.get('productName')?.value ?? '',
      base_unit_: this.form_.get('base_unit_')?.value ?? '',
      categories_: this.form_.get('categories_')?.value ?? [],
      allergens_: this.form_.get('allergens_')?.value ?? [],
      yield_factor_: this.form_.get('yield_factor_')?.value ?? 1,
      min_stock_level_: this.form_.get('min_stock_level_')?.value ?? 0,
      expiry_days_default_: this.form_.get('expiry_days_default_')?.value ?? 0,
    }

    await this.applyDraft({ ...current, ...patch })
  }
}
