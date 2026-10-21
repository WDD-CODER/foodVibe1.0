import { signal } from '@angular/core'
import type { AbstractControl } from '@angular/forms'

export interface UnsavedChangesOptions {
  /** The form to watch. A function because most pages build it in `ngOnInit`. */
  form: () => AbstractControl | null | undefined
  /** Comparable text of the form's current value. Default: `JSON.stringify(form.getRawValue())`. */
  snapshot?: () => string
  /** State outside the form (photo, AI draft, a second recipe copy...). When it returns true the page counts as changed. */
  extra?: () => boolean
}

export interface UnsavedChanges {
  /** Take the current value as "saved" (call after load/hydrate and after a successful save). */
  markSaved(): void
  /** True when `extra()` says so, or the value differs from the saved one (before any `markSaved`: the form's `dirty` flag). */
  hasChanges(): boolean
  /** Forget the saved value (back to the `dirty` fallback). */
  reset(): void
}

/**
 * One "did anything change?" check for entity forms (plan 455). A page keeps
 * `hasRealChanges()` as a one-line `return this.unsaved_.hasChanges()` so `pendingChangesGuard` keeps working.
 */
export function useUnsavedChanges(options: UnsavedChangesOptions): UnsavedChanges {
  const saved_ = signal<string | null>(null)

  const current = (): string => {
    if (options.snapshot) return options.snapshot()
    return JSON.stringify(options.form()?.getRawValue() ?? null)
  }

  return {
    markSaved: () => saved_.set(current()),
    reset: () => saved_.set(null),
    hasChanges: () => {
      if (options.extra?.()) return true
      const form = options.form()
      if (!form) return false
      const saved = saved_()
      return saved === null ? form.dirty : current() !== saved
    }
  }
}
