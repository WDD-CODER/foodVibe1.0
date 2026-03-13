import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserMsgService } from '@services/user-msg.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { TranslationService } from '@services/translation.service';
import { AbstractControl } from '@angular/forms';

export interface PendingChangesComponent {
  readProductForm_?: AbstractControl;
  recipeForm_?: AbstractControl;
  isSubmitted?: boolean;
  /** Optional: true when current form value differs from initial state (so we show save confirmation). */
  hasRealChanges?: () => boolean;
}

/**
 * CanDeactivate guard: when the user navigates away, if there are unsaved changes
 * we show a confirmation modal (save or leave without saving). No translation flow.
 */
export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = async (component) => {
  const userMsgService = inject(UserMsgService);
  const confirmModal = inject(ConfirmModalService);
  const translationService = inject(TranslationService);

  const form = component?.readProductForm_ ?? component?.recipeForm_;
  if (component?.isSubmitted) return true;
  if (form?.disabled) return true;

  const hasRealChanges =
    typeof component?.hasRealChanges === 'function'
      ? component.hasRealChanges()
      : (form?.dirty ?? false);

  if (hasRealChanges) {
    const isConfirmed = await confirmModal.open('unsaved_changes_confirm', {
      variant: 'warning',
      saveLabel: 'leave_without_saving',
    });
    if (!isConfirmed) {
      return false;
    }
    userMsgService.onSetErrorMsg(translationService.translate('unsaved_changes_confirm'));
  }

  return true;
};
