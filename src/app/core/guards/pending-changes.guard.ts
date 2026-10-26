import { CanDeactivateFn } from '@angular/router'
import { inject } from '@angular/core'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { AbstractControl } from '@angular/forms'

/**
 * How a page opts in: add `canDeactivate: [pendingChangesGuard]` to its route and implement this on the
 * page component. A page with a form exposes it as `readProductForm_` / `recipeForm_` (its `dirty` flag is then
 * used). A form-less page implements only `hasRealChanges()` (see `useUnsavedChanges`). Add `saveAndWait()` to get
 * the three-button "save and leave" modal. For reload / tab close, also call `warnBeforeUnload` from
 * `core/utils/leave-warning.util.ts` with the same `hasRealChanges` check.
 */
export interface PendingChangesComponent {
  readProductForm_?: AbstractControl
  recipeForm_?: AbstractControl
  isSubmitted?: boolean
  /** Optional: true when current form value differs from initial state (so we show save confirmation). Pages delegate to `useUnsavedChanges` (core/utils/unsaved-changes.ts). */
  hasRealChanges?: () => boolean
  /** Optional: save the entity and wait for completion. Return true if save succeeded. */
  saveAndWait?: () => Promise<boolean>
  /**
   * Optional (plan 482): the page asks the leave question itself — true = leave, false = stay. Used when the page
   * can also ask without a navigation (a click outside a card) and both must share one popup.
   */
  confirmLeave?: () => Promise<boolean>
}

/**
 * CanDeactivate guard: when the user navigates away, if there are unsaved changes
 * we show a confirmation modal.
 *
 * If the component provides `saveAndWait`, we show a ternary modal:
 *   Cancel (stay) | Save & leave | Leave without saving.
 *
 * Otherwise, we show the legacy binary modal:
 *   Cancel (stay) | Leave without saving.
 */
export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = async (component) => {
  const confirmModal = inject(ConfirmModalService)

  const form = component?.readProductForm_ ?? component?.recipeForm_
  if (component?.isSubmitted) return true
  if (form?.disabled) return true
  if (typeof component?.confirmLeave === 'function') return component.confirmLeave()

  const hasRealChanges =
    typeof component?.hasRealChanges === 'function' ? component.hasRealChanges() : (form?.dirty ?? false)

  if (!hasRealChanges) return true

  // Ternary flow: component supports save-and-wait (recipe-builder)
  if (typeof component?.saveAndWait === 'function') {
    const result = await confirmModal.openTernary('unsaved_changes_confirm', {
      variant: 'warning',
      saveLabel: 'leave_without_saving',
      saveButtonLabel: 'save_and_leave'
    })

    if (result === 'cancel') return false

    if (result === 'save') {
      const saved = await component.saveAndWait()
      if (!saved) return false // save failed — stay on page
      return true
    }

    // result === 'confirm' → leave without saving
    return true
  }

  // Binary flow: no save capability (product form, etc.)
  const isConfirmed = await confirmModal.open('unsaved_changes_confirm', {
    variant: 'warning',
    saveLabel: 'leave_without_saving'
  })

  if (!isConfirmed) return false

  return true
}
