import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { UserService } from '@services/user.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { VenueProfile } from '@models/venue.model'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { formatVenueHours } from 'src/app/core/utils/venue-hours.util'
import { videoSourceKey } from 'src/app/core/utils/video-link.util'
import { CloudinaryService, checkVideoFile } from '@services/cloudinary.service'
import { VenueDataService } from '@services/venue-data.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { isoToLocalEpoch, todayIso } from 'src/app/core/utils/date-input.util'

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent, DisabledWhyDirective],
  templateUrl: './venue-detail.component.html',
  styleUrl: './venue-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VenueDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly equipmentData = inject(EquipmentDataService)
  private readonly cloudinary = inject(CloudinaryService)
  private readonly venueData = inject(VenueDataService)
  private readonly userMsg = inject(UserMsgService)
  private readonly translation = inject(TranslationService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly isLoggedIn = inject(UserService).isLoggedIn

  /** Plan 698: percent of the running video upload; null when none is running. */
  protected readonly uploading_ = signal<number | null>(null)
  protected readonly uploadingLabel_ = computed(() =>
    this.translation.translate('venue_video_uploading').replace('{percent}', String(this.uploading_() ?? 0))
  )
  /** Plan 698: the venue as last saved by the upload (the route data does not refresh). */
  private readonly saved_ = signal<VenueProfile | null>(null)

  private readonly routeData_ = toSignal(this.route.data, { initialValue: this.route.snapshot.data })
  // Reads route.data reactively (not route.snapshot.data) — the resolver re-runs on
  // every navigation to this route, including param-only changes when Angular reuses
  // the component instance across /venues/view/:id -> /venues/view/:otherId.
  protected readonly venue_ = computed(() => {
    const fromRoute = (this.routeData_()['venue'] as VenueProfile | null) ?? null
    const saved = this.saved_()
    return saved && saved._id === fromRoute?._id ? saved : fromRoute
  })

  /** design-port session 6 — reads the (currently unwired-elsewhere) logistics.venueProfileId
   * link; see MenuEvent/EventLogistics models and the new venue-link-chip on menu-intelligence. */
  /** True when at least one hours block has text — empty blocks alone show "—" (plan 371). */
  /** Venue equipment rows split by the equipment's category; unknown equipment counts as 'other'. */
  protected readonly infraGroups_ = computed(() => {
    const all = this.equipmentData.allEquipment_()
    const infra: { name: string; quantity: number }[] = []
    const other: { name: string; quantity: number }[] = []
    for (const row of this.venue_()?.availableInfrastructure ?? []) {
      const eq = all.find((e) => e._id === row.equipmentId)
      const item = { name: eq?.nameHebrew ?? row.equipmentId, quantity: row.availableQuantity }
      ;(eq?.category === 'infrastructure' ? infra : other).push(item)
    }
    return { infra, other }
  })

  protected readonly hasHours_ = computed(() => formatVenueHours(this.venue_()?.operatingHours).first !== '')

  protected readonly associatedMenus_ = computed(() => {
    const venueId = this.venue_()?._id
    if (!venueId) return []
    return this.menuEventData.allMenuEvents_().filter((e) => e.logistics?.venueProfileId === venueId)
  })

  /** Plan 372: every contact with its initials, for the contacts card. */
  protected readonly contacts_ = computed(() =>
    (this.venue_()?.contacts ?? []).map((c) => ({
      ...c,
      initials: c.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
    }))
  )

  /** Plan 373: tour videos, newest visit first (no date last), with the date (he-IL) and the source label key. */
  protected readonly videos_ = computed(() =>
    [...(this.venue_()?.videos ?? [])]
      .sort((a, b) => (b.visitDate ?? -Infinity) - (a.visitDate ?? -Infinity))
      .map((v) => ({
        ...v,
        dateLabel: v.visitDate != null ? new Date(v.visitDate).toLocaleDateString('he-IL') : '',
        sourceKey: videoSourceKey(v.url)
      }))
  )

  /**
   * Plan 373: Google Maps and Waze links — to the saved location when there is one, else to the typed address
   * (Human 2026-11-23, D7); null with neither.
   */
  protected readonly navLinks_ = computed(() => {
    const venue = this.venue_()
    const loc = venue?.location
    if (loc) {
      const ll = `${loc.lat},${loc.lng}`
      return {
        google: `https://www.google.com/maps/search/?api=1&query=${ll}`,
        waze: `https://waze.com/ul?ll=${ll}&navigate=yes`
      }
    }
    const address = venue?.address?.trim()
    if (!address) return null
    const q = encodeURIComponent(address)
    return {
      google: `https://www.google.com/maps/search/?api=1&query=${q}`,
      waze: `https://waze.com/ul?q=${q}&navigate=yes`
    }
  })

  ngOnInit(): void {
    void this.menuEventData.ensureLoaded()
    void this.equipmentData.ensureLoaded()
  }

  protected backToList(): void {
    this.router.navigate(['/venues/list'])
  }

  protected onEdit(): void {
    const id = this.venue_()?._id
    if (id) this.router.navigate(['/venues/edit', id])
  }

  /** Plan 698: uploads the picked video, then saves the venue with it first in the list. */
  protected onVideoPicked(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    const venue = this.venue_()
    if (!file || !venue || this.uploading_() !== null) return
    const refusal = checkVideoFile(file)
    if (refusal) {
      this.userMsg.onSetErrorMsg(this.translation.translate(refusal))
      return
    }
    this.uploading_.set(0)
    this.cloudinary
      .uploadVideo(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          if (ev.kind === 'progress') this.uploading_.set(ev.percent)
          else void this.saveVideo(venue, ev.url)
        },
        error: () => {
          this.uploading_.set(null)
          this.userMsg.onSetErrorMsg(this.translation.translate('venue_video_upload_failed'))
        }
      })
  }

  private async saveVideo(venue: VenueProfile, url: string): Promise<void> {
    const visitDate = isoToLocalEpoch(todayIso())
    try {
      const saved = await this.venueData.updateVenue({
        ...venue,
        videos: [{ url, visitDate }, ...(venue.videos ?? [])]
      })
      this.saved_.set(saved)
      this.userMsg.onSetSuccessMsg(this.translation.translate('venue_video_added'))
    } catch {
      // The venue data service already logged it; the venue stays as it was.
      this.userMsg.onSetErrorMsg(this.translation.translate('venue_video_upload_failed'))
    } finally {
      this.uploading_.set(null)
    }
  }
}
