import type { MetadataRegistryService } from '@services/metadata-registry.service'

export type DraftMetadataResolver = Pick<MetadataRegistryService, 'resolveCategoryKey' | 'resolveAllergenKey'>
export type DraftMetadataRegistry = Pick<
  MetadataRegistryService,
  'registerCategory' | 'registerAllergen' | 'allCategories_' | 'allAllergens_'
>

export interface DraftMetadata {
  categories: string[]
  allergens: string[]
}

/**
 * Maps AI-suggested categories and allergens to canonical keys WITHOUT registering them —
 * registration waits for the product save (registerDraftMetadata), so an AI suggestion the
 * user never saves never lands in Metadata. Values resolve one at a time, so unknown Hebrew
 * values open their translation modals sequentially. Cancelled values (null) are dropped
 * duplicates collapse.
 */
export async function resolveDraftMetadata(
  draft: Partial<DraftMetadata>,
  resolver: DraftMetadataResolver
): Promise<DraftMetadata> {
  return {
    categories: await resolveEach(draft.categories ?? [], (v) => resolver.resolveCategoryKey(v)),
    allergens: await resolveEach(draft.allergens ?? [], (v) => resolver.resolveAllergenKey(v))
  }
}

/**
 * Registers already-resolved keys in Metadata. Call only once the product is saved.
 * Keys already registered are skipped: re-registering would re-sanitize them, turning a
 * stored key like "milk solids" into a new "milk_solids" duplicate.
 */
export async function registerDraftMetadata(keys: DraftMetadata, registry: DraftMetadataRegistry): Promise<void> {
  const knownCategories = registry.allCategories_()
  const knownAllergens = registry.allAllergens_()
  for (const category of keys.categories) {
    if (!knownCategories.includes(category)) await registry.registerCategory(category)
  }
  for (const allergen of keys.allergens) {
    if (!knownAllergens.includes(allergen)) await registry.registerAllergen(allergen)
  }
}

async function resolveEach(values: string[], resolve: (value: string) => Promise<string | null>): Promise<string[]> {
  const keys: string[] = []
  for (const value of values) {
    const key = await resolve(value)
    if (key && !keys.includes(key)) keys.push(key)
  }
  return keys
}
