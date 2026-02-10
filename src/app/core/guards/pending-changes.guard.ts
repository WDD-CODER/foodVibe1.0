import { CanDeactivateFn } from '@angular/router';
import { ProductFormComponent } from '@components/inventory/products/product-form/product-form.component';
import { inject } from '@angular/core';
import { UserMsgService } from '@services/user-msg.service';

export const pendingChangesGuard: CanDeactivateFn<ProductFormComponent> = (component) => {
  const userMsgService = inject(UserMsgService);

  const form = component.readProductForm_;
  
  // LOGGING: Check the actual state of the form instance
  console.log("Form Status - Dirty:", form?.dirty);
  console.log("Form Status - Touched:", form?.touched);
  console.log("Is Submitted:", component.isSubmitted);

  // If the form is submitted, let them leave no matter what
  if (component.isSubmitted) return true;

  // If the form is NOT dirty AND NOT touched, it's safe to leave
  if (!form?.dirty && !form?.touched) {
    return true;
  }

  // If we reach here, there are unsaved changes
  userMsgService.onSetErrorMsg('השינויים לא נשמרו - המידע יאבד בעת יציאה');
  return confirm('יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?');
};