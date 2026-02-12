import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { Product } from '@models/product.model';

const LOGGED_IN_USER = 'signed-user'
const SINGED_USERS = 'signed-users-db'


@Injectable({
  providedIn: 'root',
})
export class UtilService {

  LoadUserFromSession() {
    return JSON.parse(sessionStorage.getItem(LOGGED_IN_USER) || 'null')
  }

  saveUserToSession(entity: User | null): void {
    sessionStorage.setItem(LOGGED_IN_USER, JSON.stringify(entity))
  }

  LoadFromStorage() {
    return JSON.parse(localStorage.getItem(SINGED_USERS) || 'null')
  }

  saveToStorage(entity: User[]): void {
    localStorage.setItem(SINGED_USERS, JSON.stringify(entity))
  }


  makeId(length: number = 6): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  // // READ / UTILITY
getEmptyProduct(): Product {
  return {
    _id: '',
    name_hebrew: '',
    category_: '',
    supplierId_: '',
    
    // Updated naming based on your interface
    buy_price_global_: 0,
    base_unit_: 'gram', // Ensure KitchenUnit.GRAM returns a string
    
    // New required array
    purchase_options_: [], 
    
    yield_factor_: 1,
    is_dairy_: false,
    allergens_: [],
    min_stock_level_: 0,
    expiry_days_default_: 0,
    updatedAt: new Date().toISOString()
  };
}

// // TRANSFORMERS
// mapProductToLedger(product: Product): Omit<ItemLedger, "_id"> {
//   return {
//     itemName: product.name_hebrew,
//     allergenIds: product.allergens_,
//     units: {
//       purchase: { 
//         symbol: product.purchase_unit_, 
//         label: product.purchase_unit_, 
//         factorToInventory: product.conversion_factor_ 
//       },
//       inventory: { 
//         symbol: product.base_unit_, 
//         label: product.base_unit_, 
//         factorToInventory: 1 
//       },
//       recipe: { 
//         symbol: product.base_unit_, 
//         label: product.base_unit_, 
//         factorToInventory: 1 
//       }
//     },
//     properties: {
//       topCategory: product.category_,
//       // CRITICAL: We attach these here so the database stores them
//       purchase_price_: product.purchase_price_.toString(),
//       yield_factor_: product.yield_factor_.toString(),
//       min_stock_: product.min_stock_level_.toString()
//     }
//   };
// }
}
