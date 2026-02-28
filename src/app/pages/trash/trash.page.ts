import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { TrashService } from '@services/trash.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { VersionHistoryPanelComponent } from 'src/app/shared/version-history-panel/version-history-panel.component';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import type { VersionEntityType } from '@services/version-history.service';

@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, VersionHistoryPanelComponent, LoaderComponent],
  templateUrl: './trash.page.html',
  styleUrl: './trash.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrashPage implements OnInit {
  private readonly trash = inject(TrashService);
  private readonly confirmModal = inject(ConfirmModalService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly dishes = this.trash.trashDishes;
  readonly recipes = this.trash.trashRecipes;
  readonly products = this.trash.trashProducts;

  readonly historyFor_ = signal<{ entityType: VersionEntityType; entityId: string; entityName: string } | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadTrashInternal();
  }

  async refresh(): Promise<void> {
    this.loadError.set(null);
    await this.loadTrashInternal();
  }

  private async loadTrashInternal(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      await this.trash.loadTrash();
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'שגיאה בטעינת האשפה');
    } finally {
      this.loading.set(false);
    }
  }

  formatDeletedAt(ts: number): string {
    return new Date(ts).toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  async onRestoreDish(id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover',
      variant: 'warning',
    });
    if (ok) await this.trash.restoreDish(id);
  }

  async onRestoreRecipe(id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover',
      variant: 'warning',
    });
    if (ok) await this.trash.restoreRecipe(id);
  }

  async onRestoreProduct(id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover',
      variant: 'warning',
    });
    if (ok) await this.trash.restoreProduct(id);
  }

  async onDisposeDish(id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose', {
      saveLabel: 'trash_dispose',
      variant: 'danger',
    });
    if (ok) await this.trash.disposeDish(id);
  }

  async onDisposeRecipe(id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose', {
      saveLabel: 'trash_dispose',
      variant: 'danger',
    });
    if (ok) await this.trash.disposeRecipe(id);
  }

  async onDisposeProduct(id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose', {
      saveLabel: 'trash_dispose',
      variant: 'danger',
    });
    if (ok) await this.trash.disposeProduct(id);
  }

  async onRestoreAllDishes(): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover_all',
      variant: 'warning',
    });
    if (ok) await this.trash.restoreAllDishes();
  }

  async onRestoreAllRecipes(): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover_all',
      variant: 'warning',
    });
    if (ok) await this.trash.restoreAllRecipes();
  }

  async onRestoreAllProducts(): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover_all',
      variant: 'warning',
    });
    if (ok) await this.trash.restoreAllProducts();
  }

  async onDisposeAllDishes(): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose_all', {
      saveLabel: 'trash_dispose_all',
      variant: 'danger',
    });
    if (ok) await this.trash.disposeAllDishes();
  }

  async onDisposeAllRecipes(): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose_all', {
      saveLabel: 'trash_dispose_all',
      variant: 'danger',
    });
    if (ok) await this.trash.disposeAllRecipes();
  }

  async onDisposeAllProducts(): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose_all', {
      saveLabel: 'trash_dispose_all',
      variant: 'danger',
    });
    if (ok) await this.trash.disposeAllProducts();
  }

  openHistory(entityType: VersionEntityType, entityId: string, entityName: string): void {
    this.historyFor_.set({ entityType, entityId, entityName });
  }

  closeHistory(): void {
    this.historyFor_.set(null);
  }

  getRecoverBeforeRestore(h: { entityType: VersionEntityType; entityId: string }): () => Promise<void> {
    if (h.entityType === 'dish') return () => this.trash.restoreDish(h.entityId);
    if (h.entityType === 'recipe') return () => this.trash.restoreRecipe(h.entityId);
    return () => this.trash.restoreProduct(h.entityId);
  }
}
