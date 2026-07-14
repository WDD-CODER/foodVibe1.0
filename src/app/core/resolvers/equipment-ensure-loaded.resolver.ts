import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { EquipmentDataService } from '../services/equipment-data.service'

/** Ensures EQUIPMENT_LIST is hydrated before equipment / recipe-builder / venues routes render. */
export const equipmentEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const equipmentData = inject(EquipmentDataService)
  return equipmentData.ensureLoaded().then(() => true)
}
