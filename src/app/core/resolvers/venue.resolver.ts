import { inject } from '@angular/core'
import { ResolveFn, Router } from '@angular/router'
import { VenueDataService } from '../services/venue-data.service'
import { UserMsgService } from '../services/user-msg.service'
import { TranslationService } from '../services/translation.service'
import { VenueProfile } from '../models/venue.model'

export const venueResolver: ResolveFn<VenueProfile | null> = (route) => {
  const venueDataService = inject(VenueDataService)
  const router = inject(Router)
  const userMsgService = inject(UserMsgService)
  const translationService = inject(TranslationService)
  const id = route.paramMap.get('id')

  if (!id) return null

  return venueDataService
    .ensureLoaded()
    .then(() => venueDataService.getVenueById(id))
    .then(
      (venue) => venue,
      () => {
        userMsgService.onSetErrorMsg(translationService.translate('venue_not_found'))
        router.navigate(['/venues/list'])
        return null
      }
    )
}
