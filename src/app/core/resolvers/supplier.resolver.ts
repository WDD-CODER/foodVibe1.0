import { inject } from '@angular/core'
import { ResolveFn, Router } from '@angular/router'
import { SupplierDataService } from '../services/supplier-data.service'
import { UserMsgService } from '../services/user-msg.service'
import { TranslationService } from '../services/translation.service'
import { Supplier } from '../models/supplier.model'

export const supplierResolver: ResolveFn<Supplier | null> = (route) => {
  const supplierDataService = inject(SupplierDataService)
  const router = inject(Router)
  const userMsgService = inject(UserMsgService)
  const translation = inject(TranslationService)
  const id = route.paramMap.get('id')

  if (!id) return null

  return supplierDataService.getSupplierById(id).then(
    (supplier) => supplier,
    () => {
      userMsgService.onSetErrorMsg(translation.translate('supplier_not_found'))
      router.navigate(['/suppliers/list'])
      return null
    }
  )
}
