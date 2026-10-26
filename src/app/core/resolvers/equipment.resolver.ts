import { inject } from '@angular/core'
import { ResolveFn, Router } from '@angular/router'
import { EquipmentDataService } from '../services/equipment-data.service'
import { UserMsgService } from '../services/user-msg.service'
import { TranslationService } from '../services/translation.service'
import { Equipment } from '../models/equipment.model'

export const equipmentResolver: ResolveFn<Equipment | null> = (route) => {
  const equipmentDataService = inject(EquipmentDataService)
  const router = inject(Router)
  const userMsgService = inject(UserMsgService)
  const translation = inject(TranslationService)
  const id = route.paramMap.get('id')

  if (!id) return null

  return equipmentDataService
    .ensureLoaded()
    .then(() => equipmentDataService.getEquipmentById(id))
    .then(
      (equipment) => equipment,
      () => {
        userMsgService.onSetErrorMsg(translation.translate('equipment_not_found'))
        router.navigate(['/inventory/equipment'])
        return null
      }
    )
}
