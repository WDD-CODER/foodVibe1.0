import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserMsgService } from '@services/user-msg.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { TranslationKeyModalService } from '@services/translation-key-modal.service';
import { TranslationService } from '@services/translation.service';
import { AbstractControl } from '@angular/forms';

interface PendingChangesComponent {
  readProductForm_?: AbstractControl;
  recipeForm_?: AbstractControl;
  isSubmitted?: boolean;
  hasUnsavedEdits?: () => boolean;
  /** Optional: return values (e.g. category/label) that are not in the dictionary so we ask for English key in a modal before leaving. */
  getValuesNeedingTranslation?: () => string[];
  /** Optional: remove untranslated values from the form when user chooses "continue without saving". */
  removeValuesNeedingTranslation?: () => void;
  /** Optional: true when current form value differs from initial state when user entered the item (so we show save confirmation last). */
  hasRealChanges?: () => boolean;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = async (component) => {
  const userMsgService = inject(UserMsgService);
  const confirmModal = inject(ConfirmModalService);
  const translationKeyModal = inject(TranslationKeyModalService);
  const translationService = inject(TranslationService);

  const form = component?.readProductForm_ ?? component?.recipeForm_;
  if (component?.isSubmitted) return true;
  if (form?.disabled) return true;

  // 1. Translation check first: if there are keys on the item not in the dictionary, resolve them (or "continue without saving") before any save confirmation.
  const getValues = component?.getValuesNeedingTranslation;
  if (typeof getValues === 'function' && component) {
    const getPending = () => (getValues.call(component) as string[]).filter((v) => v != null && String(v).trim() !== '' && !translationService.hasKey(String(v).trim().toLowerCase()));
    let pending = getPending();
    while (pending.length > 0) {
      const valueToTranslate = pending[0].trim();
      const result = await translationKeyModal.open(valueToTranslate, 'generic');
      if (result && typeof result === 'object' && 'continueWithoutSaving' in result && result.continueWithoutSaving) {
        if (typeof component.removeValuesNeedingTranslation === 'function') {
          component.removeValuesNeedingTranslation.call(component);
        }
        userMsgService.onSetErrorMsg(translationService.translate('value_not_saved_removed_from_item'));
        break;
      }
      if (result && typeof result === 'object' && 'englishKey' in result && 'hebrewLabel' in result && result.englishKey && result.hebrewLabel) {
        translationService.addKeyAndHebrew(result.englishKey, result.hebrewLabel);
        pending = getPending();
      } else {
        return false;
      }
    }
  }

  // 2. Save confirmation last: only after translation is resolved, ask to save or leave without saving (so saving/leaving is the final step).
  const hasRealChanges = typeof component?.hasRealChanges === 'function' ? component.hasRealChanges() : form?.dirty ?? false;
  if (hasRealChanges) {
    const isConfirmed = await confirmModal.open('unsaved_changes_confirm', {
      saveLabel: 'leave_without_saving'
    });
    if (!isConfirmed) {
      return false;
    }
    userMsgService.onSetErrorMsg('השינויים לא נשמרו - המידע יאבד בעת יציאה');
  }

  return true;
};
