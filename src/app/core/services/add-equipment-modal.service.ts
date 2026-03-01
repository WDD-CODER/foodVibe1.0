import { Injectable, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { EquipmentCategory } from '../models/equipment.model';

export interface AddEquipmentResult {
  name: string;
  category: EquipmentCategory;
}

@Injectable({ providedIn: 'root' })
export class AddEquipmentModalService {
  private readonly resultSubject = new Subject<AddEquipmentResult | null>();

  private readonly initialName_ = signal('');
  readonly isOpen_ = signal(false);
  /** Initial name to pre-fill when opening (e.g. from logistics search). */
  readonly initialName = this.initialName_.asReadonly();

  open(initialName?: string): Promise<AddEquipmentResult | null> {
    this.initialName_.set(initialName?.trim() ?? '');
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(result: AddEquipmentResult): void {
    this.resultSubject.next(result);
    this.close();
  }

  cancel(): void {
    this.resultSubject.next(null);
    this.close();
  }

  private close(): void {
    this.isOpen_.set(false);
    this.initialName_.set('');
  }
}
