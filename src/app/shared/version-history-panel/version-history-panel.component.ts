import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { VersionHistoryService, VersionEntry, VersionEntityType } from '@services/version-history.service';
import { RestoreChoiceModalService } from '@services/restore-choice-modal.service';
import { UserMsgService } from '@services/user-msg.service';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';

@Component({
  selector: 'app-version-history-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent],
  templateUrl: './version-history-panel.component.html',
  styleUrl: './version-history-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionHistoryPanelComponent {
  private readonly versionHistory = inject(VersionHistoryService);
  private readonly restoreChoiceModal = inject(RestoreChoiceModalService);
  private readonly userMsg = inject(UserMsgService);
  private readonly router = inject(Router);

  entityType = input.required<VersionEntityType>();
  entityId = input.required<string>();
  entityName = input<string>('');
  /** When set (e.g. from trash), call this before restoreVersion so the entity is back in the main list. */
  recoverBeforeRestore = input<() => Promise<void>>();

  readonly closed = output<void>();
  readonly restored = output<void>();

  readonly versions = signal<VersionEntry[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const type = this.entityType();
      const id = this.entityId();
      if (type && id) this.loadVersions(type, id);
    });
  }

  private async loadVersions(entityType: VersionEntityType, entityId: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const list = await this.versionHistory.getVersions(entityType, entityId);
      this.versions.set(list);
    } catch {
      this.loadError.set('שגיאה בטעינת הגרסאות');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  viewVersion(entry: VersionEntry): void {
    this.closed.emit();
    this.router.navigate(['/recipe-builder'], {
      queryParams: {
        view: 'history',
        entityType: this.entityType(),
        entityId: this.entityId(),
        versionAt: entry.versionAt,
      },
    });
  }

  async restore(entry: VersionEntry): Promise<void> {
    const choice = await this.restoreChoiceModal.open();
    if (choice === null) return;
    try {
      if (choice === 'replace') {
        const recoverFirst = this.recoverBeforeRestore();
        if (recoverFirst) await recoverFirst();
        await this.versionHistory.restoreVersion(
          this.entityType(),
          this.entityId(),
          entry.versionAt
        );
        this.userMsg.onSetSuccessMsg('הגרסה שוחזרה');
      } else {
        await this.versionHistory.addVersionAsNewRecipe(
          this.entityType(),
          this.entityId(),
          entry.versionAt
        );
        this.userMsg.onSetSuccessMsg('נוצר מתכון חדש מהגרסה');
      }
      this.restored.emit();
      this.closed.emit();
    } catch {
      this.userMsg.onSetErrorMsg('שגיאה בשחזור הגרסה');
    }
  }

  close(): void {
    this.closed.emit();
  }
}
