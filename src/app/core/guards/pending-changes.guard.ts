import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserMsgService } from '@services/user-msg.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { AbstractControl } from '@angular/forms';

interface PendingChangesComponent {
  readProductForm_?: AbstractControl;
  recipeForm_?: AbstractControl;
  isSubmitted?: boolean;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = async (component) => {
  const userMsgService = inject(UserMsgService);
  const confirmModal = inject(ConfirmModalService);

  const form = component?.readProductForm_ ?? component?.recipeForm_;
  if (component?.isSubmitted) return true;

  if (!form?.dirty) {
    return true;
  }

  const isConfirmed = await confirmModal.open('unsaved_changes_confirm', {
    saveLabel: 'leave_without_saving'
  });

  if (isConfirmed) {
    userMsgService.onSetErrorMsg('השינויים לא נשמרו - המידע יאבד בעת יציאה');
    return true;
  }
  return false;
};
