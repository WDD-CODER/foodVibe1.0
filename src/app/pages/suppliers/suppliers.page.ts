import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { filter, map, startWith } from 'rxjs/operators'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  templateUrl: './suppliers.page.html',
  styleUrl: './suppliers.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-form-route]': '!isListRoute_()' }
})
export class SuppliersPage {
  private readonly router = inject(Router)

  readonly navRoutes_ = signal([{ labelKey: 'add_supplier', path: 'add' }])

  protected readonly isListRoute_ = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/suppliers/list')),
      startWith(this.router.url.startsWith('/suppliers/list'))
    )
  )

  goBackToList(): void {
    this.router.navigate(['/suppliers/list'])
  }
}
