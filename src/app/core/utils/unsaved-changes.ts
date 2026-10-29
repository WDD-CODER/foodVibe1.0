import { DestroyRef, inject, signal } from '@angular/core'
import type { AbstractControl } from '@angular/forms'
import { warnBeforeUnload } from './leave-warning.util'

export interface UnsavedChangesOptions {
  /** The form to watch. A function because most pages build it in `ngOnInit`. */
  form: () => AbstractControl | null | undefined
  /** Comparable text of the form's current value. Default: `JSON.stringify(form.getRawValue())`. */
  snapshot?: () => string
  /** State outside the form (photo, AI draft, a second recipe copy...). When it returns true the page counts as changed. */
  extra?: () => boolean
  /** True once the page saved and is on its way out: no reload warning then. */
  isSubmitted?: () => boolean
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
 * Called in an injection context (a field initialiser), it also registers `warnBeforeUnload`, so a page that
 * tracks unsaved changes cannot forget the browser's reload / tab-close dialog.
 */
export function useUnsavedChanges(options: UnsavedChangesOptions): UnsavedChanges {
  const saved_ = signal<string | null>(null)

  const current = (): string => {
    if (options.snapshot) return options.snapshot()
    return JSON.stringify(options.form()?.getRawValue() ?? null)
  }

  const hasChanges = (): boolean => {
    if (options.extra?.()) return true
    const form = options.form()
    if (!form) return false
    const saved = saved_()
    return saved === null ? form.dirty : current() !== saved
  }

  if (isInInjectionContext_()) warnBeforeUnload(() => !options.isSubmitted?.() && hasChanges())

  return {
    markSaved: () => saved_.set(current()),
    reset: () => saved_.set(null),
    hasChanges
  }
}

/** Specs call `useUnsavedChanges` outside Angular; there is no page to attach a reload warning to. */
function isInInjectionContext_(): boolean {
  try {
    inject(DestroyRef)
    return true
  } catch {
    return false
  }
}
