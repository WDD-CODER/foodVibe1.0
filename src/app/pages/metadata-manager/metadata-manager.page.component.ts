import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { ProductDataService } from '@services/product-data.service';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { TranslationService } from '@services/translation.service';
import { UserMsgService } from '@services/user-msg.service';
import { TranslationKeyModalService } from '@services/translation-key-modal.service';

type MetadataType = 'category' | 'allergen' | 'unit';
@Component({
  selector: 'app-metadata-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './metadata-manager.page.component.html',
  styleUrl: './metadata-manager.page.component.scss'
})
export class MetadataManagerComponent implements OnInit {
  //INJECTIONS
  private unitRegistry = inject(UnitRegistryService);
  private metadataRegistry = inject(MetadataRegistryService);
  private productData = inject(ProductDataService);
  private translationService = inject(TranslationService);
  private userMsgService = inject(UserMsgService);
  private translationKeyModal = inject(TranslationKeyModalService);

  // SIGNALS
  allUnitKeys_ = this.unitRegistry.allUnitKeys_;
  tempUnitRates = signal<Record<string, number>>({});
  allAllergens_ = this.metadataRegistry.allAllergens_;
  allCategories_ = this.metadataRegistry.allCategories_;


  ngOnInit(): void {
    const initialRates: Record<string, number> = {};
    this.allUnitKeys_().forEach(unit => {
      initialRates[unit] = this.unitRegistry.getConversion(unit);
    });
    this.tempUnitRates.set(initialRates);
  }


  //CREATE

  // addUnit(name: string): void {
  //   if (!name.trim()) return;
  //   this.unitRegistry.registerUnit(name.trim(), 1);
  // }



async onAddMetadata(hebrewLabel: string, type: MetadataType, inputElement: HTMLInputElement) {
  const sanitizedHebrew = hebrewLabel.trim();
  if (!sanitizedHebrew) return;

  // --- LAYER 1: REGISTRY GUARD ---
  const currentIds = this.getRegistryByType(type);
  const existingLabels = currentIds.map(id => this.translationService.translate(id));

  if (existingLabels.includes(sanitizedHebrew)) {
    this.userMsgService.onSetErrorMsg(`הערך "${sanitizedHebrew}" כבר קיים ברשימה הזו.`);
    return; // Input stays
  }

  // --- LAYER 2: ENGLISH KEY GUARD ---
  const contextMap = { category: 'category' as const, allergen: 'allergen' as const, unit: 'unit' as const };
  const result = await this.translationKeyModal.open(sanitizedHebrew, contextMap[type]);
  if (!result?.englishKey || !result?.hebrewLabel) return;

  const sanitizedKey = result.englishKey;

  // --- LAYER 3: EXECUTION ---
  try {
    this.translationService.updateDictionary(sanitizedKey, result.hebrewLabel);

    await this.registerInService(sanitizedKey, type);
    
    inputElement.value = '';
    this.userMsgService.onSetSuccessMsg('הנתונים נשמרו בהצלחה');
    
  } catch (err) {
    this.userMsgService.onSetErrorMsg('שגיאה בסנכרון הנתונים');
  }
}

  // addAllergen(name: string): void {
  //   if (name.trim()) {
  //     this.metadataRegistry.registerAllergen(name.trim());
  //   }
  // }

  //UPDATE
  updateUnitRate(unit: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newRate = parseFloat(input.value);

    if (!isNaN(newRate)) {
      this.unitRegistry.registerUnit(unit, newRate);
      this.tempUnitRates.update(prev => ({ ...prev, [unit]: newRate }));
    }
  }


  //DELETE
  async onRemoveMetadata(item: string, type: MetadataType) {
  const allProducts = this.productData.allProducts_();
  let isUsed = false;

  // 1. DYNAMIC USAGE CHECK
  switch (type) {
    case 'unit':
      isUsed = allProducts.some(p => 
        p.base_unit_ === item || 
        p.purchase_options_?.some(opt => opt.unit_symbol_ === item)
      );
      break;
    case 'allergen':
      isUsed = allProducts.some(p => p.allergens_?.includes(item));
      break;
    case 'category':
      isUsed = allProducts.some(p => p.category_ === item);
      break;
  }

  // 2. BLOCK DELETION IF IN USE
  if (isUsed) {
    const typeNames = { unit: 'היחידה', allergen: 'האלרגן', category: 'הקטגוריה' };
    this.userMsgService.onSetErrorMsg(
      `לא ניתן למחוק את ${typeNames[type]} "${this.translationService.translate(item)}" - היא נמצאת בשימוש במלאי`
    );
    return;
  }

  // 3. EXECUTION
  try {
    switch (type) {
      case 'unit':
        await this.unitRegistry.deleteUnit(item);
        this.tempUnitRates.update(prev => {
          const updated = { ...prev };
          delete updated[item];
          return updated;
        });
        break;
      case 'allergen':
        await this.metadataRegistry.deleteAllergen(item);
        break;
      case 'category':
        await this.metadataRegistry.deleteCategory(item);
        break;
    }
    this.userMsgService.onSetSuccessMsg('המחיקה בוצעה בהצלחה');
  } catch (err) {
    console.error(`Failed to delete ${type}:`, err);
    this.userMsgService.onSetErrorMsg('שגיאה בביצוע המחיקה מול השרת');
  }
}

  // async removeUnit(unit: string): Promise<void> {
  //   const allProducts = this.productData.allProducts_();
  //   const isUnitInUse = allProducts.some(product => {
  //     const isUsedAsBase = product.base_unit_ === unit;
  //     const isUsedInPurchaseOptions = product.purchase_options_?.some(
  //       opt => opt.unit_symbol_ === unit
  //     );
  //     return isUsedAsBase || isUsedInPurchaseOptions;
  //   });

  //   if (isUnitInUse) {
  //     return this.metadataRegistry['userMsgService'].onSetErrorMsg(
  //       `לא ניתן למחוק את היחידה "${unit}" - היא נמצאת בשימוש במוצרים קיימים במלאי`
  //     );
  //   }
  //   try {
  //     await this.unitRegistry.deleteUnit(unit);
  //     this.tempUnitRates.update(prev => {
  //       const updated = { ...prev };
  //       delete updated[unit];
  //       return updated;
  //     });
  //   } catch (err) {
  //     console.error('Failed to delete unit:', err);
  //   }
  // }

  // removeAllergen(name: string): void {
  //   const isUsed = this.productData.allProducts_().some(p => p.allergens_?.includes(name));
  //   if (isUsed) {
  //     console.error(`Deletion blocked: ${name} is active in inventory.`);
  //     return;
  //   }
  //   this.metadataRegistry.deleteAllergen(name);
  // }

  // removeCategory(name: string): void {
  //   const isUsed = this.productData.allProducts_().some(p => p.category_ === name);
  //   if (isUsed) {
  //     return this.metadataRegistry['userMsgService'].onSetErrorMsg(
  //       `לא ניתן למחוק: הקטגוריה "${name}" נמצאת בשימוש במלאי`
  //     );
  //   }
  //   this.metadataRegistry.deleteCategory(name);
  // }

  //HELPERS
  private async registerInService(key: string, type: MetadataType): Promise<void> {
    switch (type) {
      case 'unit':
        await this.unitRegistry.registerUnit(key, 1);
        break;
      case 'allergen':
        await this.metadataRegistry.registerAllergen(key);
        break;
      case 'category':
        await this.metadataRegistry.registerCategory(key);
        break;
    }
  }

  private getRegistryByType(type: MetadataType): string[] {
    switch (type) {
      case 'unit':
        return this.allUnitKeys_();
      case 'allergen':
        return this.allAllergens_();
      case 'category':
        return this.allCategories_();
      default:
        return [];
    }
  }

}