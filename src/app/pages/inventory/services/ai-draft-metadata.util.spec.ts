import { signal } from '@angular/core'
import {
  resolveDraftMetadata,
  registerDraftMetadata,
  DraftMetadataResolver,
  DraftMetadataRegistry
} from './ai-draft-metadata.util'

describe('ai-draft-metadata.util', () => {
  const keyMap: Record<string, string | null> = {
    dairy: 'dairy',
    חלבי: 'dairy',
    gluten: 'gluten',
    גלוטן: 'gluten',
    מבוטל: null
  }

  let resolver: jasmine.SpyObj<DraftMetadataResolver>

  beforeEach(() => {
    resolver = jasmine.createSpyObj<DraftMetadataResolver>('MetadataRegistryService', [
      'resolveCategoryKey',
      'resolveAllergenKey'
    ])
    const resolve = (v: string) => Promise.resolve(v in keyMap ? keyMap[v] : v)
    resolver.resolveCategoryKey.and.callFake(resolve)
    resolver.resolveAllergenKey.and.callFake(resolve)
  })

  describe('resolveDraftMetadata', () => {
    it('should pass known keys through unchanged', async () => {
      const result = await resolveDraftMetadata({ categories: ['dairy'], allergens: ['gluten'] }, resolver)
      expect(result).toEqual({ categories: ['dairy'], allergens: ['gluten'] })
    })

    it('should map Hebrew values to their registry keys', async () => {
      const result = await resolveDraftMetadata({ categories: ['חלבי'], allergens: ['גלוטן'] }, resolver)
      expect(result).toEqual({ categories: ['dairy'], allergens: ['gluten'] })
      expect(resolver.resolveCategoryKey).toHaveBeenCalledWith('חלבי')
      expect(resolver.resolveAllergenKey).toHaveBeenCalledWith('גלוטן')
    })

    it('should drop values whose resolution was cancelled', async () => {
      const result = await resolveDraftMetadata({ categories: ['מבוטל', 'dairy'], allergens: ['מבוטל'] }, resolver)
      expect(result).toEqual({ categories: ['dairy'], allergens: [] })
    })

    it('should dedupe values that resolve to the same key', async () => {
      const result = await resolveDraftMetadata(
        { categories: ['dairy', 'חלבי'], allergens: ['gluten', 'גלוטן', 'gluten'] },
        resolver
      )
      expect(result).toEqual({ categories: ['dairy'], allergens: ['gluten'] })
    })

    it('should treat missing arrays as empty', async () => {
      const result = await resolveDraftMetadata({}, resolver)
      expect(result).toEqual({ categories: [], allergens: [] })
      expect(resolver.resolveCategoryKey).not.toHaveBeenCalled()
    })
  })

  describe('registerDraftMetadata', () => {
    let registry: jasmine.SpyObj<DraftMetadataRegistry>

    beforeEach(() => {
      registry = jasmine.createSpyObj<DraftMetadataRegistry>(
        'MetadataRegistryService',
        ['registerCategory', 'registerAllergen'],
        { allCategories_: signal(['dairy']), allAllergens_: signal(['milk solids']) }
      )
      registry.registerCategory.and.callFake((v: string) => Promise.resolve(v))
      registry.registerAllergen.and.callFake((v: string) => Promise.resolve(v))
    })

    it('should register only keys not yet in Metadata', async () => {
      await registerDraftMetadata({ categories: ['dairy', 'meat'], allergens: ['gluten', 'milk solids'] }, registry)

      expect(registry.registerCategory.calls.allArgs()).toEqual([['meat']])
      expect(registry.registerAllergen.calls.allArgs()).toEqual([['gluten']])
    })
  })
})
