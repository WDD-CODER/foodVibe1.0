import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { TrashService, type TrashSection, type TrashType } from '@services/trash.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { VersionHistoryPanelComponent } from 'src/app/shared/version-history-panel/version-history-panel.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { normalizeHebrew } from 'src/app/core/utils/recipe-match.util'
import type { VersionEntityType } from '@services/version-history.service'
import { TranslationService } from '@services/translation.service'

@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslatePipe,
    VersionHistoryPanelComponent,
    LoaderComponent,
    FormsModule,
    ListShellComponent,
    EmptyStateComponent,
    ModalShellComponent
  ],
  templateUrl: './trash.page.html',
  styleUrl: './trash.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrashPage implements OnInit {
  private readonly trash = inject(TrashService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly logging = inject(LoggingService)
  private readonly translation_ = inject(TranslationService)

  readonly isLoading = signal(true)
  readonly loadError = signal<string | null>(null)

  /** Plan 620: a type whose module is off has no section (read in the template, so the signal is tracked). */
  get sections(): readonly TrashSection[] {
    return this.trash.sections_()
  }
  readonly items = this.trash.items

  readonly query_ = signal('')
  readonly typeFilter_ = signal<TrashType | 'all'>('all')
  readonly isPanelOpen_: WritableSignal<boolean>
  private readonly togglePanelState_: () => void

  constructor() {
    const panel = useResponsivePanelState('trash')
    this.isPanelOpen_ = panel.isPanelOpen_
    this.togglePanelState_ = panel.togglePanel
  }

  togglePanel(): void {
    this.togglePanelState_()
  }

  /** Sections that hold at least one item (the type filter offers only these). */
  readonly typesWithItems_ = computed(() => this.trash.sections_().filter(({ type }) => this.items()[type].length > 0))

  readonly totalCount_ = computed(() =>
    this.trash.sections_().reduce((sum, { type }) => sum + this.items()[type].length, 0)
  )

  /** One row per deleted item, filtered by the type chip and the name search. */
  readonly rows_ = computed(() => {
    const type = this.typeFilter_()
    const q = normalizeHebrew(this.query_().trim())
    const all = this.items()
    return this.trash
      .sections_()
      .filter((s) => type === 'all' || s.type === type)
      .flatMap((s) => {
        const list = all[s.type].filter((item) => !q || normalizeHebrew(item.name).includes(q))
        return list.map((item) => ({ type: s.type, titleKey: s.titleKey, historyType: s.historyType, item }))
      })
  })

  readonly historyFor_ = signal<{ entityType: VersionEntityType; entityId: string; entityName: string } | null>(null)

  async ngOnInit(): Promise<void> {
    await this.loadTrashInternal()
  }

  async refresh(): Promise<void> {
    this.loadError.set(null)
    await this.loadTrashInternal()
  }

  private async loadTrashInternal(): Promise<void> {
    this.isLoading.set(true)
    this.loadError.set(null)
    try {
      await this.trash.loadTrash()
    } catch (err) {
      this.logging.error({ event: 'trash.load_error', message: 'Trash load error', context: { err } })
      this.loadError.set(err instanceof Error ? err.message : this.translation_.translate('trash_load_error'))
    } finally {
      this.isLoading.set(false)
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
