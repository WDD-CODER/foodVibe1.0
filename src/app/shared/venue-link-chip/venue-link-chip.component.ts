import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { VenueDataService } from '@services/venue-data.service'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'

/**
 * design-port session 6 — write side of the venue↔menu association (Venues.dc.html's
 * "N תפריטים משויכים" / VenueDetail.dc.html's associated-menus card). `MenuEvent.logistics.
 * venueProfileId` already exists on the model but nothing anywhere sets it; this is the
 * first writer. Self-contained by design: menu-intelligence.page.ts is growth-frozen (never
 * add lines), so this component owns its own data-service injections, its own persistence
 * call, and its own styling — the host page only places one `<app-venue-link-chip>` tag.
 */
@Component({
  selector: 'app-venue-link-chip',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, CustomSelectComponent],
  templateUrl: './venue-link-chip.component.html',
  styleUrl: './venue-link-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VenueLinkChipComponent {
  /** The MenuEvent currently being edited on the host page — null before the first autosave. */
  eventId = input<string | null>(null)

  private readonly menuEventData = inject(MenuEventDataService)
  private readonly venueData = inject(VenueDataService)
  private readonly destroyRef = inject(DestroyRef)

  protected readonly venueControl_ = new FormControl<string | null>(null)

  protected readonly venueOptions_ = computed(() =>
    this.venueData.allVenues_().map((v) => ({ value: v._id, label: v.nameHebrew }))
  )

  private readonly currentEvent_ = computed(
    () => this.menuEventData.allMenuEvents_().find((e) => e._id === this.eventId()) ?? null
  )

  constructor() {
    void this.venueData.ensureLoaded()
    void this.menuEventData.ensureLoaded()

    // Keep the picker in sync when the host page switches to a different event (or loads
    // one already linked to a venue) — emitEvent:false so this never re-triggers a save.
    effect(() => {
      const linkedId = this.currentEvent_()?.logistics?.venueProfileId ?? null
      this.venueControl_.setValue(linkedId, { emitEvent: false })
    })

    this.venueControl_.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((venueId) => {
      void this.onVenueSelected(venueId)
    })
  }

  private async onVenueSelected(venueId: string | null): Promise<void> {
    const event = this.currentEvent_()
    if (!event) return
    const venue = venueId ? this.venueData.allVenues_().find((v) => v._id === venueId) : null
    if (venueId && !venue) return
    await this.menuEventData.updateMenuEvent({
      ...event,
      logistics: {
        environmentType: venue?.environmentType ?? event.logistics?.environmentType ?? 'outdoor_field',
        venueProfileId: venueId ?? undefined,
        resolvedItems: event.logistics?.resolvedItems ?? [],
        manualOverrides: event.logistics?.manualOverrides
      }
    })
  }
}
