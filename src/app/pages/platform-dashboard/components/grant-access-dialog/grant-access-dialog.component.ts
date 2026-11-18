import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core'
import { afterNextRender } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from '@pipes/translation-pipe.pipe'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { AccessService } from '@services/access.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { GrantAccessDialogService } from './grant-access-dialog.service'

/** Plan 632: the platform admin gives a user consultant access to one business by the user's name. */
@Component({
  selector: 'app-grant-access-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalShellComponent, FormFieldComponent],
  templateUrl: './grant-access-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GrantAccessDialogComponent {
  private readonly dialog = inject(GrantAccessDialogService)
  private readonly access = inject(AccessService)
  private readonly translation = inject(TranslationService)
  private readonly userMsg = inject(UserMsgService)

  protected readonly target = this.dialog.current_
  protected readonly username_ = signal('')
  protected readonly isSaving_ = signal(false)
  protected readonly errorKey_ = signal<string | null>(null)
  protected readonly canSave_ = computed(() => this.username_().trim().length > 0 && !this.isSaving_())

  private readonly usernameInput_ = viewChild<ElementRef<HTMLInputElement>>('usernameInput')

  constructor() {
    afterNextRender(() => this.usernameInput_()?.nativeElement.focus())
  }

  protected onInput(value: string): void {
    this.username_.set(value)
    this.errorKey_.set(null)
  }

  protected cancel(): void {
    this.dialog.close(false)
  }

  protected async save(): Promise<void> {
    const t = this.dialog.current_()
    if (!t || !this.canSave_()) return
    this.isSaving_.set(true)
    this.errorKey_.set(null)
    try {
      const result = await this.access.createGrant(t.businessId, this.username_().trim())
      if (result.ok) {
        this.userMsg.onSetSuccessMsg(this.translation.translate('platform_grant_done'))
        this.dialog.close(true)
      } else {
        this.errorKey_.set(result.errorKey)
      }
    } finally {
      this.isSaving_.set(false)
    }
  }
}
