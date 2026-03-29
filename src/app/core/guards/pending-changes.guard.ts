import { CanDeactivateFn } from '@angular/router'
import { inject } from '@angular/core'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { AbstractControl } from '@angular/forms'

export interface PendingChangesComponent {
  readProductForm_?: AbstractControl
  recipeForm_?: AbstractControl
  isSubmitted?: boolean
  /** Optional: true when current form value differs from initial state (so we show save confirmation). */
  hasRealChanges?: () => boolean
  /** Optional: save the entity and wait for completion. Return true if save succeeded. */
  saveAndWait?: () => Promise<boolean>
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
  const userMsgService = inject(UserMsgService)
  const confirmModal = inject(ConfirmModalService)
  const translationService = inject(TranslationService)

  const form = component?.readProductForm_ ?? component?.recipeForm_
  if (component?.isSubmitted) return true
  if (form?.disabled) return true

  const hasRealChanges =
    typeof component?.hasRealChanges === 'function'
      ? component.hasRealChanges()
      : (form?.dirty ?? false)

  if (!hasRealChanges) return true

  // Ternary flow: component supports save-and-wait (recipe-builder)
  if (typeof component?.saveAndWait === 'function') {
    const result = await confirmModal.openTernary('unsaved_changes_confirm', {
      variant: 'warning',
      saveLabel: 'leave_without_saving',
      saveButtonLabel: 'save_and_leave',
    })

    if (result === 'cancel') return false

    if (result === 'save') {
      const saved = await component.saveAndWait()
      if (!saved) return false // save failed — stay on page
      return true
    }

    // result === 'confirm' → leave without saving
    userMsgService.onSetErrorMsg(translationService.translate('unsaved_changes_confirm'))
    return true
  }

  // Binary flow: no save capability (product form, etc.)
  const isConfirmed = await confirmModal.open('unsaved_changes_confirm', {
    variant: 'warning',
    saveLabel: 'leave_without_saving',
  })

  if (!isConfirmed) return false

  userMsgService.onSetErrorMsg(translationService.translate('unsaved_changes_confirm'))
  return true
}
