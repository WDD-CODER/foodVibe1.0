import { signal } from '@angular/core';

/**
 * Composable for async save-state tracking.
 *
 * Usage:
 *   private readonly saving = useSavingState();
 *   protected readonly isSaving_ = this.saving.isSaving_;   // for template
 *
 *   // async/await flows:
 *   await this.saving.withSaving(async () => { ... });
 *
 *   // Observable/Promise flows:
 *   this.saving.setSaving(true);
 *   obs.subscribe({ next: () => this.saving.setSaving(false), error: () => this.saving.setSaving(false) });
 */
export function useSavingState() {
  const saving_ = signal(false);

  async function withSaving<T>(fn: () => Promise<T>): Promise<T> {
    saving_.set(true);
    try {
      return await fn();
    } finally {
      saving_.set(false);
    }
  }

  function setSaving(value: boolean): void {
    saving_.set(value);
  }

  return {
    isSaving_: saving_.asReadonly(),
    withSaving,
    setSaving,
  };
}
