import { Injectable, signal } from '@angular/core';

export type RestoreChoice = 'replace' | 'add-new';

@Injectable({ providedIn: 'root' })
export class RestoreChoiceModalService {
  private readonly isOpen_ = signal(false);
  private resolve_: ((value: RestoreChoice | null) => void) | null = null;

  readonly isOpen = this.isOpen_.asReadonly();

  open(): Promise<RestoreChoice | null> {
    this.isOpen_.set(true);
    return new Promise(resolve => {
      this.resolve_ = resolve;
    });
  }

  choose(choice: RestoreChoice | null): void {
    this.resolve_?.(choice);
    this.resolve_ = null;
    this.isOpen_.set(false);
  }
}
