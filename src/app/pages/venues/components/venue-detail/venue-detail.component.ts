import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { UserService } from '@services/user.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { VenueProfile } from '@models/venue.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent],
  templateUrl: './venue-detail.component.html',
  styleUrl: './venue-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VenueDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly menuEventData = inject(MenuEventDataService)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn

  private readonly routeData_ = toSignal(this.route.data, { initialValue: this.route.snapshot.data })
  // Reads route.data reactively (not route.snapshot.data) — the resolver re-runs on
  // every navigation to this route, including param-only changes when Angular reuses
  // the component instance across /venues/view/:id -> /venues/view/:otherId.
  protected readonly venue_ = computed(() => (this.routeData_()['venue'] as VenueProfile | null) ?? null)

  /** design-port session 6 — reads the (currently unwired-elsewhere) logistics_.venue_profile_id_
   * link; see MenuEvent/EventLogistics models and the new venue-link-chip on menu-intelligence. */
  protected readonly associatedMenus_ = computed(() => {
    const venueId = this.venue_()?._id
    if (!venueId) return []
    return this.menuEventData.allMenuEvents_().filter((e) => e.logistics_?.venue_profile_id_ === venueId)
  })

  protected readonly contactInitials_ = computed(() => {
    const name = this.venue_()?.contact_name_?.trim()
    if (!name) return ''
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
  })

  ngOnInit(): void {
    void this.menuEventData.ensureLoaded()
  }

  protected backToList(): void {
    this.router.navigate(['/venues/list'])
  }

  protected onEdit(): void {
    const id = this.venue_()?._id
    if (id) this.router.navigate(['/venues/edit', id])
  }
}
