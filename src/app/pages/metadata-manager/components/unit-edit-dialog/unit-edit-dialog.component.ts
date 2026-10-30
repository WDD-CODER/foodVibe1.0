import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { ModalShellComponent } from 'src/app/shared/modal-shell/modal-shell.component'
import { NumberBoxDirective } from '@directives/number-box.directive'

/** What the edit dialog starts from and hands back. */
export interface UnitEditValue {
  key: string
  hebrewLabel: string
  gramRate: number
}

/**
 * Plan 377 — edit one custom unit: Hebrew label, English key and gram conversion. It only
 * collects the values; the metadata manager decides what to save and asks for confirmation.
 */
@Component({
  selector: 'app-unit-edit-dialog',
  standalone: true,
  imports: [NumberBoxDirective, FormsModule, TranslatePipe, SelectOnFocusDirective, ModalShellComponent],
  templateUrl: './unit-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitEditDialogComponent {
  /** Plan 502: the parent sets this while its save runs; the button is disabled and shows the busy label. */
  readonly isSaving_ = input(false, { alias: 'isSaving' })
  //INPUTS
  readonly unit = input.required<UnitEditValue>()

  //OUTPUTS
  readonly saved = output<UnitEditValue>()
  readonly cancelled = output<void>()

  //SIGNALS
  protected readonly hebrewLabel_ = linkedSignal(() => this.unit().hebrewLabel)
  protected readonly key_ = linkedSignal(() => this.unit().key)
  protected readonly gramRate_ = linkedSignal(() => this.unit().gramRate)

  /** Plan 498: a field differs from the unit the dialog opened with (Escape / backdrop then ask). */
  protected hasChanges(): boolean {
    const unit = this.unit()
    return (
      this.hebrewLabel_() !== unit.hebrewLabel || this.key_() !== unit.key || Number(this.gramRate_()) !== unit.gramRate
    )
  }

  protected isValid(): boolean {
    const rate = Number(this.gramRate_())
    return !!this.hebrewLabel_().trim() && !!this.key_().trim() && Number.isFinite(rate) && rate > 0
  }

  protected onSave(): void {
    if (!this.isValid() || this.isSaving_()) return
    this.saved.emit({
      key: this.key_().trim().toLowerCase(),
      hebrewLabel: this.hebrewLabel_().trim(),
      gramRate: Number(this.gramRate_())
    })
  }
}
