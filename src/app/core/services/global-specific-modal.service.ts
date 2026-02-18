import { Injectable, signal } from '@angular/core';

export interface GlobalSpecificModalConfig {
  preparationName: string;
  mainCategory: string;
  newCategory: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalSpecificModalService {
  private readonly isOpen_ = signal(false);
  private readonly config_ = signal<GlobalSpecificModalConfig | null>(null);
  private resolve_: ((value: 'global' | 'specific' | null) => void) | null = null;

  readonly isOpen = this.isOpen_.asReadonly();
  readonly config = this.config_.asReadonly();

  open(config: GlobalSpecificModalConfig): Promise<'global' | 'specific' | null> {
    this.config_.set(config);
    this.isOpen_.set(true);
    return new Promise(resolve => {
      this.resolve_ = resolve;
    });
  }

  choose(choice: 'global' | 'specific' | null): void {
    this.resolve_?.(choice);
    this.resolve_ = null;
    this.isOpen_.set(false);
    this.config_.set(null);
  }
}
