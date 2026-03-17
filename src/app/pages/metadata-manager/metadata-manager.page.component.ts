import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnitRegistryService, SYSTEM_UNITS } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { ProductDataService } from '@services/product-data.service';
import { DemoLoaderService } from '@services/demo-loader.service';
import { BackupService } from '@services/backup.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MenuEventDataService } from '@services/menu-event-data.service';
import { AddItemModalService } from '@services/add-item-modal.service';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { TranslationService } from '@services/translation.service';
import { UserMsgService } from '@services/user-msg.service';
import { TranslationKeyModalService, isTranslationKeyResult } from '@services/translation-key-modal.service';
import { UserService } from '@services/user.service';
import { AuthModalService } from '@services/auth-modal.service';
import { LoggingService } from '@services/logging.service';
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { ALL_DISH_FIELDS, DEFAULT_DISH_FIELDS, type DishFieldKey, type MenuTypeDefinition } from '@models/menu-event.model';
import { PreparationCategoryManagerComponent } from './components/preparation-category-manager/preparation-category-manager.component';
import { SectionCategoryManagerComponent } from './components/section-category-manager/section-category-manager.component';

type MetadataType = 'category' | 'allergen' | 'unit' | 'label';
@Component({
  selector: 'app-metadata-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, PreparationCategoryManagerComponent, SectionCategoryManagerComponent],
  templateUrl: './metadata-manager.page.component.html',
  styleUrl: './metadata-manager.page.component.scss'
})
export class MetadataManagerComponent {
  private unitRegistry = inject(UnitRegistryService);
  private metadataRegistry = inject(MetadataRegistryService);
  private productData = inject(ProductDataService);
  private demoLoader = inject(DemoLoaderService);
  private backupService = inject(BackupService);
  private confirmModal = inject(ConfirmModalService);
  private translationService = inject(TranslationService);
  private userMsgService = inject(UserMsgService);
  private translationKeyModal = inject(TranslationKeyModalService);
  private labelCreationModal = inject(LabelCreationModalService);
  private kitchenState = inject(KitchenStateService);
  private menuEventData = inject(MenuEventDataService);
  private addItemModal = inject(AddItemModalService);
  protected readonly isLoggedIn = inject(UserService).isLoggedIn;
  private readonly authModal = inject(AuthModalService);
  private readonly logging = inject(LoggingService);

  /** Returns false if not signed in (shows message and opens sign-in modal). */
  private requireSignIn(): boolean {
    if (this.isLoggedIn()) return true;
    this.userMsgService.onSetWarningMsg(this.translationService.translate('sign_in_to_use'));
    this.authModal.open('sign-in');
    return false;
  }

  // SIGNALS
  allUnitKeys_ = this.unitRegistry.allUnitKeys_;
  allAllergens_ = this.metadataRegistry.allAllergens_;
  allCategories_ = this.metadataRegistry.allCategories_;
  allLabels_ = this.metadataRegistry.allLabels_;
  allLabelKeys_ = computed(() => this.allLabels_().map(l => l.key));
  allMenuTypes_ = this.metadataRegistry.allMenuTypes_;
  protected isImporting_ = signal(false);
  protected editingMenuTypeKey_ = signal<string | null>(null);
  protected editingMenuTypeFields_ = signal<DishFieldKey[]>([]);

  readonly ALL_DISH_FIELDS = ALL_DISH_FIELDS;
  readonly DEFAULT_DISH_FIELDS = DEFAULT_DISH_FIELDS;

  protected getLabelColor(key: string): string {
    return this.metadataRegistry.getLabelColor(key);
  }


  isSystemUnit(unitKey: string): boolean {
    return unitKey in SYSTEM_UNITS;
  }

  //CREATE

  // addUnit(name: string): void {
  //   if (!name.trim()) return;
  //   this.unitRegistry.registerUnit(name.trim(), 1);
  // }



  async onAddLabel(): Promise<void> {
    const result = await this.labelCreationModal.open();
    if (!result?.key || !result?.hebrewLabel) return;
    try {
      this.translationService.updateDictionary(result.key, result.hebrewLabel);
      await this.metadataRegistry.registerLabel(result.key, result.color, result.autoTriggers);
      this.userMsgService.onSetSuccessMsg('הנתונים נשמרו בהצלחה');
    } catch (err) {
      this.logging.error({ event: 'metadata.sync_error', message: 'Metadata sync error (add label)', context: { err } });
      this.userMsgService.onSetErrorMsg('שגיאה בסנכרון הנתונים');
    }
  }

  async onAddMetadata(hebrewLabel: string, type: MetadataType, inputElement: HTMLInputElement) {
    if (!this.requireSignIn()) return;
    if (type === 'label') {
      await this.onAddLabel();
      return;
    }
    const sanitizedHebrew = hebrewLabel.trim();
    if (!sanitizedHebrew) return;

    // --- LAYER 1: REGISTRY GUARD ---
    const currentIds = this.getRegistryByType(type);
    const existingLabels = currentIds.map(id => this.translationService.translate(id));

    if (existingLabels.includes(sanitizedHebrew)) {
      this.userMsgService.onSetErrorMsg(`הערך "${sanitizedHebrew}" כבר קיים ברשימה הזו.`);
      return;
    }

    // --- LAYER 2: ENGLISH KEY GUARD ---
    const contextMap = { category: 'category' as const, allergen: 'allergen' as const, unit: 'unit' as const };
    const result = await this.translationKeyModal.open(sanitizedHebrew, contextMap[type]);
    if (!isTranslationKeyResult(result)) return;

    const sanitizedKey = result.englishKey;

    // --- LAYER 3: EXECUTION ---
    try {
      this.translationService.updateDictionary(sanitizedKey, result.hebrewLabel);
      if (type === 'category') {
        await this.metadataRegistry.registerCategory(result.hebrewLabel);
      } else {
        await this.registerInService(sanitizedKey, type);
      }
      inputElement.value = '';
      this.userMsgService.onSetSuccessMsg('הנתונים נשמרו בהצלחה');
    } catch (err) {
      this.logging.error({ event: 'metadata.sync_error', message: 'Metadata sync error (add metadata)', context: { err } });
      this.userMsgService.onSetErrorMsg('שגיאה בסנכרון הנתונים');
    }
  }

  // addAllergen(name: string): void {
  //   if (name.trim()) {
  //     this.metadataRegistry.registerAllergen(name.trim());
  //   }
  // }

  //DELETE
  async onRemoveMetadata(item: string, type: MetadataType) {
  if (!this.requireSignIn()) return;
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
      isUsed = allProducts.some(p => (p.categories_ ?? []).includes(item));
      break;
    case 'label': {
      const recipes = this.kitchenState.recipes_();
      isUsed = recipes.some(r =>
        (r.labels_ ?? []).includes(item) || (r.autoLabels_ ?? []).includes(item)
      );
      break;
    }
  }

  // 2. BLOCK DELETION IF IN USE
  if (isUsed) {
    const typeNames: Record<MetadataType, string> = {
      unit: 'היחידה',
      allergen: 'האלרגן',
      category: 'הקטגוריה',
      label: 'התווית',
    };
    const where = type === 'label' ? 'במתכונים' : 'במלאי';
    this.userMsgService.onSetErrorMsg(
      `לא ניתן למחוק את ${typeNames[type]} "${this.translationService.translate(item)}" - היא נמצאת בשימוש ${where}`
    );
    return;
  }

  // 3. EXECUTION
  try {
    switch (type) {
      case 'unit':
        await this.unitRegistry.deleteUnit(item);
        break;
      case 'allergen':
        await this.metadataRegistry.deleteAllergen(item);
        break;
      case 'category':
        await this.metadataRegistry.deleteCategory(item);
        break;
      case 'label':
        await this.metadataRegistry.deleteLabel(item);
        break;
    }
    this.userMsgService.onSetSuccessMsg('המחיקה בוצעה בהצלחה');
  } catch (err) {
    this.logging.error({ event: 'crud.metadata.delete_error', message: `Failed to delete ${type}`, context: { err } });
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
      case 'label':
        await this.metadataRegistry.registerLabel(key, this.metadataRegistry.getLabelColor(key) || '#78716C', []);
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
      case 'label':
        return this.allLabelKeys_();
      default:
        return [];
    }
  }

  async onLoadDemoData(): Promise<void> {
    if (!this.requireSignIn()) return;
    const message = this.translationService.translate('load_demo_data_confirm');
    const confirmed = await this.confirmModal.open(message, { variant: 'warning', saveLabel: 'load_demo_data' });
    if (!confirmed) return;
    this.isImporting_.set(true);
    try {
      await this.demoLoader.loadDemoData();
    } finally {
      this.isImporting_.set(false);
    }
  }

  async onExportBackup(): Promise<void> {
    if (!this.requireSignIn()) return;
    await this.backupService.exportAllToFile();
  }

  async onRestoreFromBackup(): Promise<void> {
    if (!this.requireSignIn()) return;
    const message = this.translationService.translate('backup_restore_confirm');
    const confirmed = await this.confirmModal.open(message, { variant: 'warning', saveLabel: 'backup_restore_from_backup' });
    if (!confirmed) return;
    this.isImporting_.set(true);
    try {
      await this.backupService.restoreFromBackup();
    } finally {
      this.isImporting_.set(false);
    }
  }

  async onImportBackupFile(event: Event): Promise<void> {
    if (!this.requireSignIn()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const message = this.translationService.translate('backup_import_confirm');
    const confirmed = await this.confirmModal.open(message, { variant: 'warning', saveLabel: 'backup_import' });
    if (!confirmed) {
      input.value = '';
      return;
    }
    this.isImporting_.set(true);
    try {
      await this.backupService.importFromFile(file);
    } finally {
      this.isImporting_.set(false);
      input.value = '';
    }
  }

  // Menu Types
  async onAddMenuType(): Promise<void> {
    if (!this.requireSignIn()) return;
    const result = await this.addItemModal.open({
      title: 'add_new_category',
      label: 'menu_serving_style',
      placeholder: 'menu_serving_style',
      saveLabel: 'save',
    });
    if (result?.trim()) {
      const key = result.trim();
      if (this.allMenuTypes_().some(t => t.key === key)) {
        this.userMsgService.onSetErrorMsg(`סוג תפריט "${key}" כבר קיים`);
        return;
      }
      await this.metadataRegistry.registerMenuType({ key, fields: [...DEFAULT_DISH_FIELDS] });
    }
  }

  onEditMenuType(key: string): void {
    if (!this.requireSignIn()) return;
    this.editingMenuTypeKey_.set(key);
    this.editingMenuTypeFields_.set([...this.metadataRegistry.getMenuTypeFields(key)]);
  }

  toggleMenuTypeField(fieldKey: DishFieldKey): void {
    this.editingMenuTypeFields_.update(fields => {
      const has = fields.includes(fieldKey);
      if (has) return fields.filter(f => f !== fieldKey);
      return [...fields, fieldKey];
    });
  }

  isMenuTypeFieldSelected(fieldKey: DishFieldKey): boolean {
    return this.editingMenuTypeFields_().includes(fieldKey);
  }

  getDishFieldLabelKey(fieldKey: DishFieldKey): string {
    return ALL_DISH_FIELDS.find(f => f.key === fieldKey)?.labelKey ?? fieldKey;
  }

  async onSaveMenuTypeFields(): Promise<void> {
    if (!this.requireSignIn()) return;
    const key = this.editingMenuTypeKey_();
    if (!key) return;
    await this.metadataRegistry.updateMenuType(key, this.editingMenuTypeFields_());
    this.editingMenuTypeKey_.set(null);
    this.editingMenuTypeFields_.set([]);
  }

  onCancelEditMenuType(): void {
    this.editingMenuTypeKey_.set(null);
    this.editingMenuTypeFields_.set([]);
  }

  async onRemoveMenuType(key: string): Promise<void> {
    if (!this.requireSignIn()) return;
    const isUsed = this.menuEventData.allMenuEvents_().some(e => e.serving_type_ === key);
    if (isUsed) {
      this.userMsgService.onSetErrorMsg(`לא ניתן למחוק: סוג התפריט "${key}" בשימוש בתפריטים שמורים`);
      return;
    }
    await this.metadataRegistry.deleteMenuType(key);
  }

  async onMenuTypeNameBlur(oldKey: string, newName: string): Promise<void> {
    if (!this.requireSignIn()) return;
    const trimmed = (newName ?? '').trim();
    if (trimmed === oldKey || !trimmed) return;
    const msg = this.translationService.translate('menu_type_rename_confirm');
    const confirmed = await this.confirmModal.open(msg, { saveLabel: 'save' });
    if (!confirmed) return;
    await this.metadataRegistry.renameMenuType(oldKey, trimmed);
    await this.menuEventData.updateServingTypeForAll(oldKey, trimmed);
  }

  async removeFieldFromMenuType(key: string, fieldKey: DishFieldKey): Promise<void> {
    if (!this.requireSignIn()) return;
    const current = this.metadataRegistry.getMenuTypeFields(key);
    const updated = current.filter(f => f !== fieldKey);
    await this.metadataRegistry.updateMenuType(key, updated);
  }

}