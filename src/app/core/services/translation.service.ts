import { Injectable, signal, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { LoggingService } from './logging.service'
import { StorageService } from './async-storage.service'

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private http = inject(HttpClient)
  private logging = inject(LoggingService)
  private storageService = inject(StorageService)

  // --- SIGNALS ---
  private masterDict = signal<Record<string, string>>({})
  /** Hebrew label -> canonical key (for resolving user input to existing key and avoiding duplicates). */
  private reverseMap = signal<Record<string, string>>({})

  constructor() {
    this.loadGlobalDictionary()
  }

  private buildReverseMap(dict: Record<string, string>): Record<string, string> {
    const rev: Record<string, string> = {}
    for (const [key, value] of Object.entries(dict)) {
      const trimmed = (value ?? '').trim()
      if (trimmed) rev[trimmed] = key
    }
    return rev
  }

  //LIST
  public async loadGlobalDictionary(): Promise<void> {
    try {
      const jsonPath = 'assets/data/dictionary.json'
      const baseData = await firstValueFrom(
        this.http.get<{
          units?: Record<string, string>
          categories?: Record<string, string>
          section_categories?: Record<string, string>
          allergens?: Record<string, string>
          actions?: Record<string, string>
          preparation_categories?: Record<string, string>
          export_headers?: Record<string, string>
          general?: Record<string, string>
        }>(jsonPath)
      )

      const baseFlattened = {
        ...(baseData.units ?? {}),
        ...(baseData.categories ?? {}),
        ...(baseData.section_categories ?? {}),
        ...(baseData.allergens ?? {}),
        ...(baseData.actions ?? {}),
        ...(baseData.preparation_categories ?? {}),
        ...(baseData.export_headers ?? {}),
        ...(baseData.general ?? {})
      }

      const localData = localStorage.getItem('DICTIONARY_CACHE')
      const existingCache = localData ? (JSON.parse(localData) as Record<string, string>) : {}

      // Plan 322 M4: server is the source of truth for both override layers — global (admin,
      // reaches every user immediately) and personal (this user only). Unauthenticated or
      // offline requests fail silently here; base + localStorage cache is still a valid dict.
      let globalOverrides: Record<string, string> = {}
      let personalOverrides: Record<string, string> = {}
      try {
        globalOverrides = await this.storageService.getGlobalDictionaryOverrides()
      } catch {
        // not signed in yet (APP_INITIALIZER runs pre-login) or offline — fine, base dict still works
      }
      try {
        const personalDocs = await this.storageService.query<{ items?: Record<string, string> }>('DICTIONARY_OVERRIDES')
        personalOverrides = personalDocs[0]?.items ?? {}
      } catch {
        // same as above
      }

      const finalDict = { ...baseFlattened, ...existingCache, ...globalOverrides, ...personalOverrides }

      const sortedFinalDict = Object.keys(finalDict)
        .sort()
        .reduce(
          (acc, k) => {
            acc[k] = finalDict[k]
            return acc
          },
          {} as Record<string, string>
        )

      this.masterDict.set(sortedFinalDict)
      this.reverseMap.set(this.buildReverseMap(sortedFinalDict))

      try {
        localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(sortedFinalDict))
      } catch (err) {
        this.logging.warn({
          event: 'translation.cache.write_failed',
          message: 'Dictionary cache write failed (quota or access)',
          context: { err }
        })
      }
      this.logging.info({
        event: 'translation.dictionary.loaded',
        message: 'Full hybrid dictionary cached to localStorage'
      })
    } catch (err) {
      this.logging.error({
        event: 'translation.dictionary.load_error',
        message: 'Dictionary load error',
        context: { err }
      })
    }
  }

  //UPDATE

  private updateInternalDictionaries(key: string, label: string): void {
    const normalizedKey = key.trim().toLowerCase()

    this.masterDict.update((prev) => ({
      ...prev,
      [normalizedKey]: label.trim()
    }))

    const rawCache = localStorage.getItem('DICTIONARY_CACHE')
    const cache = rawCache ? JSON.parse(rawCache) : {}
    cache[normalizedKey] = label.trim()
    try {
      localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(cache))
    } catch (err) {
      this.logging.warn({
        event: 'translation.cache.write_failed',
        message: 'Dictionary cache write failed (quota or access)',
        context: { err }
      })
    }
  }

  /** `scope` (plan 322 M4): 'me' (default) persists to this user's own personal override doc
   *  'everyone' persists to the shared global override doc (admin-only server-side — the caller
   *  is responsible for only offering 'everyone' to an admin, same as the registry-rename push).
   *  Either way the in-memory dict + localStorage cache update immediately/optimistically
   *  the server write happens in the background and only logs on failure (same "log only, don't
   *  fail the UI" convention as the async-storage.service.ts backup mirror). */
  updateDictionary(key: string, label: string, scope: 'me' | 'everyone' = 'me'): void {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_')
    const sanitizedLabel = label.trim()

    this.masterDict.update((prev) => {
      const newDict = { ...prev, [normalizedKey]: sanitizedLabel }

      const sortedDict = Object.keys(newDict)
        .sort()
        .reduce(
          (acc, k) => {
            acc[k] = newDict[k]
            return acc
          },
          {} as Record<string, string>
        )

      try {
        localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(sortedDict))
      } catch (err) {
        this.logging.warn({
          event: 'translation.cache.write_failed',
          message: 'Dictionary cache write failed (quota or access)',
          context: { err }
        })
      }
      return sortedDict
    })

    this.persistDictionaryOverride(normalizedKey, sanitizedLabel, scope)
    this.reverseMap.update((prev) => ({ ...prev, [sanitizedLabel]: normalizedKey }))
    this.logging.info({
      event: 'translation.dictionary.updated',
      message: 'Dictionary entry updated',
      context: { key: normalizedKey }
    })
  }

  /** Background server write for updateDictionary's scope — read-modify-write on the user's
   *  own personal doc (mirrors metadata-registry.service.ts's persistRegistry pattern) or a
   *  single PUT to the shared global doc. Never throws — logs and leaves the optimistic
   *  in-memory/localStorage update as the visible result if the write fails. */
  private async persistDictionaryOverride(key: string, label: string, scope: 'me' | 'everyone'): Promise<void> {
    try {
      if (scope === 'everyone') {
        await this.storageService.putGlobalDictionaryOverride(key, label)
        return
      }
      const docs = await this.storageService.query<{ _id: string; items?: Record<string, string> }>(
        'DICTIONARY_OVERRIDES'
      )
      const existing = docs[0]
      const items = { ...(existing?.items ?? {}), [key]: label }
      if (existing?._id) {
        await this.storageService.put('DICTIONARY_OVERRIDES', { ...existing, items })
      } else {
        await this.storageService.post('DICTIONARY_OVERRIDES', { items })
      }
    } catch (err) {
      this.logging.error({
        event: 'translation.dictionary.persist_error',
        message: 'Failed to persist dictionary override to server',
        context: { key, scope, err }
      })
    }
  }

  /** Resolve Hebrew user input to canonical key (units). Returns null if no match so caller can prompt for English key. */
  resolveUnit(input: string): string | null {
    const t = (input ?? '').trim()
    return t ? (this.reverseMap()[t] ?? null) : null
  }

  /** Resolve Hebrew user input to canonical key (categories). Returns null if no match. */
  resolveCategory(input: string): string | null {
    const t = (input ?? '').trim()
    return t ? (this.reverseMap()[t] ?? null) : null
  }

  /** Resolve Hebrew user input to canonical key (allergens). Returns null if no match. */
  resolveAllergen(input: string): string | null {
    const t = (input ?? '').trim()
    return t ? (this.reverseMap()[t] ?? null) : null
  }

  /** Resolve Hebrew user input to canonical key (recipe course/category). Returns null if no match. */
  resolveCourse(input: string): string | null {
    const t = (input ?? '').trim()
    return t ? (this.reverseMap()[t] ?? null) : null
  }

  /** Resolve Hebrew user input to canonical key (section_categories). Returns null if no match. */
  resolveSectionCategory(input: string): string | null {
    const t = (input ?? '').trim()
    return t ? (this.reverseMap()[t] ?? null) : null
  }

  /** Resolve Hebrew user input to canonical key (preparation_categories). Returns null if no match. */
  resolvePreparationCategory(input: string): string | null {
    const t = (input ?? '').trim()
    return t ? (this.reverseMap()[t] ?? null) : null
  }

  translate(key: string | undefined): string {
    if (!key) return ''
    const normalizedKey = key.trim().toLowerCase()
    const translation = this.masterDict()[normalizedKey]

    return translation || key
  }

  /** True when the value exists as a key in the dictionary (so it has a translation / is a known canonical key). */
  hasKey(key: string): boolean {
    if (!key || !String(key).trim()) return false
    const normalizedKey = String(key).trim().toLowerCase()
    return this.masterDict()[normalizedKey] !== undefined
  }

  // --- PRIVATE HELPERS ---

  validateEnglishKey(key: string): { valid: boolean; error?: string } {
    const sanitized = key.trim().toLowerCase().replace(/\s+/g, '_')
    const englishRegex = /^[a-z0-9_]+$/

    if (!englishRegex.test(sanitized)) {
      return { valid: false, error: 'Translation must contain only letters, numbers, and underscores.' }
    }

    if (this.masterDict()[sanitized]) {
      const existing = this.masterDict()[sanitized]
      return { valid: false, error: `The ID "${sanitized}" is already used for "${existing}".` }
    }

    return { valid: true }
  }

  /**
   * Like validateEnglishKey but allows an existing key when it already maps to the given Hebrew
   * (same concept). `excludeKey` (plan 322 rename flow) is the key currently being edited — it is
   * excluded from both the key-collision and the Hebrew-label-collision checks below, since the
   * caller already owns that key and isn't creating a new collision, just updating its own entry.
   * A different key already using the same Hebrew label is still rejected (plan 322 M3.7) — two
   * distinct labels/courses/categories/allergens must not silently share one display name.
   */
  validateKeyForHebrew(key: string, hebrewLabel: string, excludeKey?: string): { valid: boolean; error?: string } {
    const sanitized = key.trim().toLowerCase().replace(/\s+/g, '_')
    const label = (hebrewLabel ?? '').trim()
    const englishRegex = /^[a-z0-9_]+$/

    if (!englishRegex.test(sanitized)) {
      return { valid: false, error: 'Translation must contain only letters, numbers, and underscores.' }
    }

    const dict = this.masterDict()
    const isOwnKey = !!excludeKey && sanitized === excludeKey

    if (!isOwnKey) {
      const existing = dict[sanitized]
      if (existing !== undefined && existing !== label) {
        return { valid: false, error: `המפתח "${sanitized}" כבר בשימוש עבור "${existing}".` }
      }
    }

    const duplicateKey = Object.keys(dict).find((k) => k !== sanitized && k !== excludeKey && dict[k] === label)
    if (label && duplicateKey) {
      return { valid: false, error: `השם "${label}" כבר בשימוש (מפתח "${duplicateKey}").` }
    }

    return { valid: true }
  }

  isHebrewLabelDuplicate(label: string): boolean {
    const sanitized = label.trim()
    return Object.values(this.masterDict()).includes(sanitized)
  }

  private async proposeAndSaveTranslation(hebrewLabel: string): Promise<string | null> {
    const englishKey = prompt(`Enter English ID for "${hebrewLabel}" (e.g., olive_oil):`)

    if (!englishKey || !englishKey.trim()) {
      this.logging.warn({ event: 'translation.add.cancelled', message: 'Translation addition cancelled by user' })
      return null
    }

    const sanitizedKey = englishKey.trim().toLowerCase().replace(/\s+/g, '_')
    this.updateDictionary(sanitizedKey, hebrewLabel)
    this.logging.info({
      event: 'translation.entry.created',
      message: 'Dictionary entry created',
      context: { key: sanitizedKey }
    })
    return sanitizedKey
  }

  /**
   * When Hebrew input has no matching key, use the app's translation-key modal (unified theme) instead of browser prompt.
   * Callers should use TranslationKeyModalService.open(hebrewLabel, context), then on result call
   * translationService.updateDictionary(result.englishKey, result.hebrewLabel) and use result.englishKey.
   */
  addKeyAndHebrew(englishKey: string, hebrewLabel: string): void {
    const key = (englishKey ?? '').trim().toLowerCase().replace(/\s+/g, '_')
    const label = (hebrewLabel ?? '').trim()
    if (!key || !label) return
    this.updateDictionary(key, label)
    this.logging.info({ event: 'translation.entry.created', message: 'Dictionary entry created', context: { key } })
  }

  // --- GETTERS ---
  // getMasterDict() {
  //   return this.masterDict()
  // }
}
