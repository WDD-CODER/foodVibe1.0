import { Injectable, signal } from '@angular/core';

export type ConfirmModalVariant = 'default' | 'danger' | 'warning';

export interface ConfirmModalOptions {
  /** Translation key for the confirm/save button. Derived from title if omitted. */
  saveLabel?: string;
  /** Translation key for context (e.g. add_supplier, approve_category). Used to derive saveLabel. */
  title?: string;
  /** Visual variant: danger (red) for permanent delete, warning (yellow/amber) for restore. */
  variant?: ConfirmModalVariant;
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  private readonly isOpen_ = signal(false);
  private readonly message_ = signal('');
  private readonly saveLabel_ = signal('save');
  private readonly variant_ = signal<ConfirmModalVariant>('default');
  private resolve_: ((value: boolean) => void) | null = null;

  readonly isOpen = this.isOpen_.asReadonly();
  readonly message = this.message_.asReadonly();
  readonly saveLabel = this.saveLabel_.asReadonly();
  readonly variant = this.variant_.asReadonly();

  open(message: string, options?: ConfirmModalOptions): Promise<boolean> {
    this.message_.set(message);
    const label = this.resolveSaveLabel(options);
    this.saveLabel_.set(label);
    this.variant_.set(options?.variant ?? 'default');
    this.isOpen_.set(true);
    return new Promise(resolve => {
      this.resolve_ = resolve;
    });
  }

  choose(confirmed: boolean): void {
    this.resolve_?.(confirmed);
    this.resolve_ = null;
    this.isOpen_.set(false);
    this.message_.set('');
    this.saveLabel_.set('save');
    this.variant_.set('default');
  }

  private resolveSaveLabel(options?: ConfirmModalOptions): string {
    if (options?.saveLabel) return options.saveLabel;
    const title = options?.title;
    if (!title) return 'save';
    if (title.startsWith('approve_')) return `save_approved_${title.slice(8)}`;
    if (title.startsWith('add_')) return `save_${title.slice(4)}`;
    return 'save';
  }
}
