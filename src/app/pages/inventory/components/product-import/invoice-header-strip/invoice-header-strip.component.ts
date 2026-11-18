import { ChangeDetectionStrategy, Component, input, model } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'

/** Plan 628: supplier, date and number of the invoice the owner is about to save, above the preview table. */
@Component({
  selector: 'app-invoice-header-strip',
  standalone: true,
  imports: [FormsModule, TranslatePipe, CustomSelectComponent, DateFieldComponent, FormFieldComponent],
  templateUrl: './invoice-header-strip.component.html',
  styleUrl: './invoice-header-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceHeaderStripComponent {
  readonly supplierId = model<string>('')
  readonly invoiceDate = model<string>('')
  readonly invoiceNumber = model<string>('')
  readonly supplierOptions = input.required<{ value: string; label: string }[]>()
  /** The supplier name as printed on the invoice. */
  readonly printedSupplierName = input<string | null>(null)
  /** True when the chosen supplier is the one the read picked. */
  readonly isSuggested = input(false)
  readonly taxId = input<string | null>(null)
  readonly vatIncluded = input<boolean | null>(null)
  readonly isSupplierMissing = input(false)
  readonly disabled = input(false)
}
