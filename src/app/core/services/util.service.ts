import { Injectable } from '@angular/core'
import { Product } from '@models/product.model'

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  getEmptyProduct(): Product {
    return {
      _id: '',
      nameHebrew: '',
      categories: [],
      sources: [],
      baseUnit: 'gram',
      purchaseOptions: [],
      yieldFactor: 1,
      allergens: [],
      minStockLevel: 0,
      expiryDaysDefault: 0,
      updatedAt: Date.now()
    }
  }
}
