/**
 * Item Ledger model — Atomic layer with ID identity and triple-unit conversion.
 * Why: IDs and three-unit mapping decouple procurement, storage, and recipe usage so
 * adapters and calculations can convert consistently without unit ambiguity.
 */

export type UnitKind = 'purchase' | 'inventory' | 'recipe';

/** Base unit descriptor for one of the three contexts. */
export interface UnitDescriptor {
  /** Symbol/code (e.g. 'kg', 'L', 'ea'). */
  symbol: string;
  /** Human label. */
  label: string;
}

/** Conversion from this unit to the canonical (inventory) base. */
export interface UnitConversion {
  /** Multiplier: quantity_in_this_unit * factor = quantity_in_inventory_base. */
  factorToInventory: number;
  /** Optional inverse for display (inventory_base * inverse = this unit). */
  factorFromInventory?: number;
}

/** Triple-unit definition: how the ingredient is bought, stored, and used in recipes. */
export interface TripleUnitConversion {
  purchase: UnitDescriptor & UnitConversion;
  inventory: UnitDescriptor & UnitConversion;
  recipe: UnitDescriptor & UnitConversion;
}

export interface ItemLedger {
  /** Unique identifier for the ledger entry (opaque, adapter-agnostic). */
  id: string;
  /** Display name. */
  itemName: string;
  /** Triple-unit structure: Purchase, Inventory, Recipe with conversion factors. */
  units: TripleUnitConversion;
  /** Optional external/code reference. */
  code?: string;
  /** Optional allergen identifiers for matrix propagation. */
  allergenIds?: string[];
  /** Custom properties for filtering and categorization. */
  properties?: {
    topCategory: string;
    subCategories?: string[];
    [key: string]: string[]; // Now all other dynamic properties are explicitly string[]
  };
}
