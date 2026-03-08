import { Injectable, inject } from '@angular/core';
import {
  BACKUP_ENTITY_TYPES,
  StorageService,
} from './async-storage.service';
import { ProductDataService } from './product-data.service';
import { SupplierDataService } from './supplier-data.service';
import { RecipeDataService } from './recipe-data.service';
import { DishDataService } from './dish-data.service';
import { EquipmentDataService } from './equipment-data.service';
import { VenueDataService } from './venue-data.service';
import { MenuEventDataService } from './menu-event-data.service';
import { MenuSectionCategoriesService } from './menu-section-categories.service';
import { ActivityLogService } from './activity-log.service';
import { UserMsgService } from './user-msg.service';
import { LoggingService } from './logging.service';

export const BACKUP_FILE_VERSION = 1;

export interface BackupExportPayload {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly storage = inject(StorageService);
  private readonly productData = inject(ProductDataService);
  private readonly supplierData = inject(SupplierDataService);
  private readonly recipeData = inject(RecipeDataService);
  private readonly dishData = inject(DishDataService);
  private readonly equipmentData = inject(EquipmentDataService);
  private readonly venueData = inject(VenueDataService);
  private readonly menuEventData = inject(MenuEventDataService);
  private readonly menuSectionCategories = inject(MenuSectionCategoriesService);
  private readonly activityLog = inject(ActivityLogService);
  private readonly userMsg = inject(UserMsgService);
  private readonly logging = inject(LoggingService);

  /**
   * Export all backup-backed keys to a single JSON file (download).
   */
  async exportAllToFile(): Promise<void> {
    const data: Record<string, unknown> = {};
    for (const key of BACKUP_ENTITY_TYPES) {
      const backupKey = `backup_${key}`;
      const raw = localStorage.getItem(backupKey) ?? localStorage.getItem(key);
      if (raw != null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    }
    const payload: BackupExportPayload = {
      version: BACKUP_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodvibe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.userMsg.onSetSuccessMsg('גיבוי יוצא בהצלחה');
  }

  /**
   * Restore from in-app backup keys (backup_*) into main keys and reload data services.
   */
  async restoreFromBackup(): Promise<void> {
    let restored = 0;
    for (const key of BACKUP_ENTITY_TYPES) {
      const backupKey = `backup_${key}`;
      const raw = localStorage.getItem(backupKey);
      if (raw != null) {
        try {
          const parsed = JSON.parse(raw);
          localStorage.setItem(key, JSON.stringify(parsed));
          restored++;
        } catch {
          // Skip invalid backup entry
        }
      }
    }
    await this.reloadAllDataServices();
    this.userMsg.onSetSuccessMsg(
      restored > 0 ? `שוחזר מגיבוי (${restored} קטגוריות)` : 'לא נמצא גיבוי לשחזור'
    );
  }

  /**
   * Import from a previously exported backup file. Overwrites current data for keys present in the file.
   */
  async importFromFile(file: File): Promise<void> {
    const text = await file.text();
    let payload: BackupExportPayload;
    try {
      payload = JSON.parse(text);
    } catch {
      this.userMsg.onSetErrorMsg('קובץ לא תקין (לא JSON)');
      return;
    }
    if (payload.version !== BACKUP_FILE_VERSION || !payload.data || typeof payload.data !== 'object') {
      this.userMsg.onSetErrorMsg('פורמט גיבוי לא נתמך');
      return;
    }
    const keys = Object.keys(payload.data).filter(k => BACKUP_ENTITY_TYPES.has(k));
    if (keys.length === 0) {
      this.userMsg.onSetErrorMsg('אין נתונים נתמכים בקובץ');
      return;
    }
    for (const key of keys) {
      const value = payload.data[key];
      try {
        localStorage.setItem(key, JSON.stringify(value));
        const backupKey = `backup_${key}`;
        localStorage.setItem(backupKey, JSON.stringify(value));
      } catch (err) {
        this.logging.warn({ event: 'backup.write_failed', message: 'Backup write failed', context: { key, err } });
      }
    }
    await this.reloadAllDataServices();
    this.userMsg.onSetSuccessMsg(`יובא בהצלחה (${keys.length} קטגוריות)`);
  }

  private async reloadAllDataServices(): Promise<void> {
    await Promise.all([
      this.supplierData.reloadFromStorage(),
      this.productData.reloadFromStorage(),
      this.recipeData.reloadFromStorage(),
      this.dishData.reloadFromStorage(),
      this.equipmentData.reloadFromStorage(),
      this.venueData.reloadFromStorage(),
      this.menuEventData.reloadFromStorage(),
      this.menuSectionCategories.reloadFromStorage(),
    ]);
    this.activityLog.syncFromStorage();
  }
}
