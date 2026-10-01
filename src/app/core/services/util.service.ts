import { Injectable } from '@angular/core'
import { Product } from '@models/product.model'

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  makeId(length: number = 6): string {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      result += characters.charAt(randomIndex)
    }

    return result
  }

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
