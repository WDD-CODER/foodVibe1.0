import { Injectable, inject, signal } from '@angular/core'
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router'
import { filter } from 'rxjs'

/**
 * Plan 555: the one root signal for the page frame. `bare_` is true when the deepest active route carries
 * `data: { bare: true }` (the public request pages): the app header, tab chips and quick-add button are not shown.
 */
@Injectable({ providedIn: 'root' })
export class LayoutModeService {
  private readonly router = inject(Router)
  private readonly bare = signal(false)
  readonly bare_ = this.bare.asReadonly()

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.bare.set(this.deepest(this.router.routerState.snapshot.root).data['bare'] === true)
    })
  }

  private deepest(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = route
    while (current.firstChild) current = current.firstChild
    return current
  }
}
