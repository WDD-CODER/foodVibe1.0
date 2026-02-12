import { CanDeactivateFn } from '@angular/router';
import { ProductFormComponent } from 'src/app/pages/inventory/components/product-form/product-form.component';
import { inject } from '@angular/core';
import { UserMsgService } from '@services/user-msg.service';

export const pendingChangesGuard: CanDeactivateFn<ProductFormComponent> = (component) => {
  const userMsgService = inject(UserMsgService);

  const form = component.readProductForm_;
  if (component.isSubmitted) return true;

  if (!form?.dirty && !form?.touched) {
    return true;
  }
  const isConfirmed = confirm('יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?')

  if (isConfirmed) {
    userMsgService.onSetErrorMsg('השינויים לא נשמרו - המידע יאבד בעת יציאה');
    return true;
  } else {
    return false;
  }
};