import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TrashService, TRASH_SECTIONS, type TrashType } from '@services/trash.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { VersionHistoryPanelComponent } from 'src/app/shared/version-history-panel/version-history-panel.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { PageHeaderComponent } from 'src/app/shared/page-header/page-header.component'
import type { VersionEntityType } from '@services/version-history.service'

@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    VersionHistoryPanelComponent,
    LoaderComponent,
    PageHeaderComponent
  ],
  templateUrl: './trash.page.html',
  styleUrl: './trash.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrashPage implements OnInit {
  private readonly trash = inject(TrashService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly logging = inject(LoggingService)

  readonly loading = signal(true)
  readonly loadError = signal<string | null>(null)

  readonly sections = TRASH_SECTIONS
  readonly items = this.trash.items

  readonly historyFor_ = signal<{ entityType: VersionEntityType; entityId: string; entityName: string } | null>(null)

  async ngOnInit(): Promise<void> {
    await this.loadTrashInternal()
  }

  async refresh(): Promise<void> {
    this.loadError.set(null)
    await this.loadTrashInternal()
  }

  private async loadTrashInternal(): Promise<void> {
    this.loading.set(true)
    this.loadError.set(null)
    try {
      await this.trash.loadTrash()
    } catch (err) {
      this.logging.error({ event: 'trash.load_error', message: 'Trash load error', context: { err } })
      this.loadError.set(err instanceof Error ? err.message : 'שגיאה בטעינת האשפה')
    } finally {
      this.loading.set(false)
    }
  }

  formatDeletedAt(ts: number): string {
    return new Date(ts).toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  async onRestore(type: TrashType, id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover',
      variant: 'warning'
    })
    if (ok) await this.trash.restore(type, id)
  }

  async onDispose(type: TrashType, id: string): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose', {
      saveLabel: 'trash_dispose',
      variant: 'danger'
    })
    if (ok) await this.trash.dispose(type, id)
  }

  async onRestoreAll(type: TrashType): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_restore', {
      saveLabel: 'trash_recover_all',
      variant: 'warning'
    })
    if (ok) await this.trash.restoreAll(type)
  }

  async onDisposeAll(type: TrashType): Promise<void> {
    const ok = await this.confirmModal.open('trash_confirm_dispose_all', {
      saveLabel: 'trash_dispose_all',
      variant: 'danger'
    })
    if (ok) await this.trash.disposeAll(type)
  }

  openHistory(entityType: VersionEntityType, entityId: string, entityName: string): void {
    this.historyFor_.set({ entityType, entityId, entityName })
  }

  closeHistory(): void {
    this.historyFor_.set(null)
  }

  getRecoverBeforeRestore(h: { entityType: VersionEntityType; entityId: string }): () => Promise<void> {
    return () => this.trash.restoreFor(h.entityType, h.entityId)
  }
}
