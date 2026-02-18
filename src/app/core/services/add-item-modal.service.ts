import { Injectable, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';

export interface AddItemConfig {
  title: string;
  label: string;
  placeholder?: string;
  saveLabel: string;
}

@Injectable({ providedIn: 'root' })
export class AddItemModalService {
  private readonly resultSubject = new Subject<string | null>();
  private readonly config_ = signal<AddItemConfig | null>(null);

  readonly isOpen_ = signal(false);
  readonly config = this.config_.asReadonly();

  open(config: AddItemConfig): Promise<string | null> {
    this.config_.set(config);
    this.isOpen_.set(true);
    return firstValueFrom(this.resultSubject);
  }

  save(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    this.resultSubject.next(trimmed);
    this.close();
  }

  cancel(): void {
    this.resultSubject.next(null);
    this.close();
  }

  private close(): void {
    this.isOpen_.set(false);
    this.config_.set(null);
  }
}
