import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { DatePipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { AccessService, AccessGrant } from '@services/access.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'

/** Plan 632: the owner sees who has consultant access to his business and removes it. Only the platform admin grants. */
@Component({
  selector: 'app-access-tab',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, TranslatePipe, EmptyStateComponent, LoaderComponent],
  templateUrl: './access-tab.component.html',
  styleUrl: './access-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessTabComponent implements OnInit {
  // 1. INJECTED
  private readonly access = inject(AccessService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly translation = inject(TranslationService)

  // 4. SIGNALS & CONSTANTS
  protected readonly grants_ = this.access.grants_
  protected readonly isLoading_ = this.access.grantsLoading_

  ngOnInit(): void {
    void this.access.loadGrants()
  }

  protected async remove(grant: AccessGrant): Promise<void> {
    const text = this.translation.translate('access_remove_confirm').replace('{name}', grant.name)
    const confirmed = await this.confirmModal.open(text, { variant: 'danger', title: 'remove' })
    if (confirmed) await this.access.removeGrant(grant._id)
  }
}
