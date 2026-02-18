import { Injectable, inject } from '@angular/core';
import { Supplier } from '@models/supplier.model';
import { SupplierDataService } from './supplier-data.service';
import { UserMsgService } from './user-msg.service';
import { TranslationService } from './translation.service';
import { TranslationKeyModalService } from './translation-key-modal.service';
import { AddItemModalService } from './add-item-modal.service';

@Injectable({ providedIn: 'root' })
export class AddSupplierFlowService {
  private supplierDataService = inject(SupplierDataService);
  private userMsgService = inject(UserMsgService);
  private translationService = inject(TranslationService);
  private translationKeyModal = inject(TranslationKeyModalService);
  private addItemModal = inject(AddItemModalService);

  async open(): Promise<Supplier | null> {
    const nameHebrew = await this.addItemModal.open({
      title: 'add_supplier',
      label: 'supplier',
      saveLabel: 'save_supplier'
    });
    if (!nameHebrew?.trim()) return null;

    if (!this.translationService.isHebrewLabelDuplicate(nameHebrew)) {
      const result = await this.translationKeyModal.open(nameHebrew, 'supplier');
      if (!result?.englishKey || !result?.hebrewLabel) return null;
      this.translationService.updateDictionary(result.englishKey, result.hebrewLabel);
    }

    try {
      const saved = await this.supplierDataService.addSupplier({
        name_hebrew: nameHebrew,
        min_order_mov_: 0,
        lead_time_days_: 0,
        delivery_days_: []
      });
      this.userMsgService.onSetSuccessMsg(`הספק "${nameHebrew}" נוסף בהצלחה`);
      return saved;
    } catch {
      this.userMsgService.onSetErrorMsg('שגיאה בהוספת הספק');
      return null;
    }
  }
}
