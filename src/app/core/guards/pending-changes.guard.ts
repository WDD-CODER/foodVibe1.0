import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserMsgService } from '@services/user-msg.service';
import { AbstractControl } from '@angular/forms';

interface PendingChangesComponent {
  readProductForm_?: AbstractControl;
  recipeForm_?: AbstractControl;
  isSubmitted?: boolean;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = (component) => {
  const userMsgService = inject(UserMsgService);

  const form = component?.readProductForm_ ?? component?.recipeForm_;
  if (component?.isSubmitted) return true;

  if (!form?.dirty && !form?.touched) {
    return true;
  }
  const isConfirmed = confirm('יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?');

  if (isConfirmed) {
    userMsgService.onSetErrorMsg('השינויים לא נשמרו - המידע יאבד בעת יציאה');
    return true;
  }
  return false;
};