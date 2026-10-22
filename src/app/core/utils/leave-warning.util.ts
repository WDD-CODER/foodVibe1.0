import { DestroyRef, inject } from '@angular/core'

/**
 * Warns before the browser reloads or closes the tab while a page holds unsaved work.
 * Call it once in an injection context (a component constructor or field initialiser) with the same
 * "has real changes" check the page gives `pendingChangesGuard`. The listener is removed with the component.
 *
 * It covers reload and tab close only; moving to another route inside the app is `pendingChangesGuard`'s job,
 * and a tab switch inside one route is not a navigation, so the page must ask for confirmation itself.
 */
export function warnBeforeUnload(isDirty: () => boolean): void {
  const destroyRef = inject(DestroyRef)
  const onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!isDirty()) return
    event.preventDefault()
    // Older browsers only show the prompt when returnValue is set.
    event.returnValue = ''
  }
  window.addEventListener('beforeunload', onBeforeUnload)
  destroyRef.onDestroy(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
