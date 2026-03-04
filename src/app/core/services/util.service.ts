import { Injectable } from '@angular/core';
import { Product } from '@models/product.model';

@Injectable({
  providedIn: 'root',
})
export class UtilService {

  makeId(length: number = 6): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  getEmptyProduct(): Product {
    return {
      _id: '',
      name_hebrew: '',
      categories_: [],
      supplierIds_: [],
      buy_price_global_: 0,
      base_unit_: 'gram',
      purchase_options_: [],
      yield_factor_: 1,
      allergens_: [],
      min_stock_level_: 0,
      expiry_days_default_: 0,
      updatedAt: new Date().toISOString()
    };
  }
}
