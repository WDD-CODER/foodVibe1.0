import { signal, untracked } from '@angular/core'

/**
 * One open/close/result controller for every popup service (plan 451).
 *
 * A plain class (not a root service): each modal service creates its own with
 * `new ModalController<Result>(cancelValue)` and keeps its public API as a thin wrapper.
 * Signals only, one stored resolver, no RxJS.
 */
export class ModalController<TResult> {
  private readonly open_ = signal(false)
  private resolve_: ((result: TResult) => void) | null = null

  /** True while the popup is shown. Read-only for callers; use `open()` / `close()`. */
  readonly isOpen_ = this.open_.asReadonly()

  /** `cancelValue` is what `open()` resolves with when the popup is dismissed or replaced. */
  constructor(private readonly cancelValue_: TResult) {}

  /**
   * Shows the popup and resolves when `close()` is called.
   * A second `open()` while open resolves the first promise with the cancel value.
   */
  open(): Promise<TResult> {
    this.resolve_?.(this.cancelValue_)
    this.open_.set(true)
    return new Promise<TResult>((resolve) => {
      this.resolve_ = resolve
    })
  }

  /** Hides the popup and resolves the pending `open()` with `result` (default: the cancel value). */
  close(result: TResult = this.cancelValue_): void {
    const resolve = this.resolve_
    this.resolve_ = null
    this.open_.set(false)
    resolve?.(result)
  }
}

/**
 * Stack of the popup shells that are currently on screen (oldest first).
 * Only the last one reacts to Escape, so a confirm popup over an edit popup closes first.
 */
const shellStack_ = signal<number[]>([])
let nextShellId_ = 0

/** Registers a newly created shell and returns its id. */
export function pushModalShell(): number {
  const id = ++nextShellId_
  untracked(() => shellStack_.update((stack) => [...stack, id]))
  return id
}

/** Removes a shell from the stack when it is destroyed. */
export function popModalShell(id: number): void {
  untracked(() => shellStack_.update((stack) => stack.filter((entry) => entry !== id)))
}

/** True when `id` is the top-most open shell. */
export function isTopModalShell(id: number): boolean {
  const stack = untracked(() => shellStack_())
  return stack.length > 0 && stack[stack.length - 1] === id
}
