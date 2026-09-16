import { Injectable, inject, signal } from '@angular/core'
import { SwUpdate } from '@angular/service-worker'
import { filter } from 'rxjs/operators'

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate)

  readonly updateAvailable_ = signal(false)

  constructor() {
    if (!this.swUpdate.isEnabled) return

    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateAvailable_.set(true))

    // The SW itself detected it can no longer serve a consistent version (e.g. a chunk
    // referenced by the cached index.html was evicted) — only a hard reload recovers.
    this.swUpdate.unrecoverable.subscribe(() => this.updateAvailable_.set(true))
  }

  reload(): void {
    document.location.reload()
  }
}
