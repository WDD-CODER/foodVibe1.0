import { inject } from '@angular/core'
import { ResolveFn, Router } from '@angular/router'
import { KitchenStateService } from '../services/kitchen-state.service'
import { UserMsgService } from '../services/user-msg.service'
import { TranslationService } from '../services/translation.service'
import { Product } from '../models/product.model'

export const productResolver: ResolveFn<Product | null> = (route, _state) => {
  const kitchenState = inject(KitchenStateService)
  const router = inject(Router)
  const userMsgService = inject(UserMsgService)
  const translation = inject(TranslationService)

  const id = route.paramMap.get('id')

  // Logic: If there's no ID, we are in 'Add' mode, return null
  if (!id) return null

  // Logic: Find the item in our Single Source of Truth
  const product = kitchenState.products_().find((p) => p._id === id)

  // Error Handling: If an ID was provided but no product exists, redirect safely
  if (!product) {
    userMsgService.onSetErrorMsg(translation.translate('product_not_found'))
    router.navigate(['/inventory/list'])
    return null
  }

  return product
}
