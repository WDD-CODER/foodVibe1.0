import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SupplierModalService } from '@services/supplier-modal.service';
import { SupplierFormComponent } from 'src/app/pages/suppliers/components/supplier-form/supplier-form.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-supplier-modal',
  standalone: true,
  imports: [SupplierFormComponent],
  templateUrl: './supplier-modal.component.html',
  styleUrl: './supplier-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierModalComponent {
  protected readonly modalService = inject(SupplierModalService);

  protected onOverlayClick(): void {
    this.modalService.close();
  }
}
