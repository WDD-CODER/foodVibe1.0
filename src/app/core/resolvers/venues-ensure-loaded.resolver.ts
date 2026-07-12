import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { VenueDataService } from '../services/venue-data.service'

/** Ensures VENUE_PROFILES is hydrated before venues list/form routes render. */
export const venuesEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const venueData = inject(VenueDataService)
  return venueData.ensureLoaded().then(() => true)
}
