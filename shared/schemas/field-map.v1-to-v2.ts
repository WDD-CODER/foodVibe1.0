/**
 * Explicit v1 → v2 field map (Plan 321 Phase 2a, step 3).
 * Every persisted key must be listed: a string renames it, `null` drops it, and an
 * object renames it and/or transforms it and/or maps nested keys. A key that appears in
 * data but not here is reported as "unmapped" — never silently copied or lost.
 */
export type KeyMap = Record<string, FieldRule>
export type FieldRule = string | null | {
  to: string
  fn?: (value: unknown) => unknown
  /** Nested key map applied to each element when the value is an array. */
  each?: KeyMap
  /** Nested key map applied when the value is a plain object. */
  obj?: KeyMap
}

/** Epoch ms from epoch ms / ISO string / Date; anything else is returned as-is (and caught by validation). */
export function toEpoch(value: unknown): unknown {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? value : ms
  }
  if (value instanceof Date) return value.getTime()
  return value
}

/** v1 called a recipe a "preparation"; v2 vocabulary is recipe / dish. */
function preparationToRecipe(value: unknown): unknown {
  return value === 'preparation' ? 'recipe' : value
}

/**
 * Master/clone + ownership bookkeeping keeps its v1 names through Phase 2b on purpose (Human-visible
 * deviation from D4, decided 2026-10-01): userId, _masterId, _userModified, _userDeleted are used
 * identically by all 24 collections and by the clone/sync/push-to-master machinery that Phase 5
 * deletes. Renaming them for 7 collections now would mean a mixed-name server layer that is thrown
 * away (Phase 5) or redone (Phase 6) later.
 */
const COMMON: KeyMap = {
  _id: '_id',
  userId: 'userId',
  _masterId: '_masterId',
  _userModified: '_userModified',
  _userDeleted: '_userDeleted'
}

const INGREDIENT: KeyMap = {
  _id: '_id',
  referenceId: 'referenceId',
  type: 'type',
  amount_: 'amount',
  unit_: 'unit',
  note_: 'note',
  calculatedCost_: 'calculatedCost',
  nameSnapshot: 'nameSnapshot'
}

const BASELINE_ENTRY: KeyMap = {
  equipment_id_: 'equipmentId',
  quantity_: 'quantity',
  phase_: 'phase',
  is_critical_: 'isCritical',
  notes_: 'notes'
}

const DISH_LOGISTICS: KeyMap = {
  baseline_: { to: 'baseline', each: BASELINE_ENTRY },
  service_overrides_: {
    to: 'serviceOverrides',
    each: { service_style_: 'serviceStyle', equipment_: { to: 'equipment', each: BASELINE_ENTRY } }
  }
}

const EVENT_LOGISTICS: KeyMap = {
  environment_type_: 'environmentType',
  venue_profile_id_: 'venueProfileId',
  resolved_items_: {
    to: 'resolvedItems',
    each: { equipment_id_: 'equipmentId', auto_quantity_: 'autoQuantity', source_: 'source' }
  },
  manual_overrides_: {
    to: 'manualOverrides',
    each: { equipment_id_: 'equipmentId', override_quantity_: 'overrideQuantity' }
  }
}

const PRODUCT: KeyMap = {
  ...COMMON,
  name_hebrew: 'nameHebrew',
  name_english: 'nameEnglish',
  base_unit_: 'baseUnit',
  sources_: { to: 'sources', each: { supplierId: 'supplierId', price: 'price', addedBy: 'addedBy', addedAt: 'addedAt' } },
  purchase_options_: {
    to: 'purchaseOptions',
    each: { unit_symbol_: 'unitSymbol', conversion_rate_: 'conversionRate', price_override_: 'priceOverride', uom: 'uom' }
  },
  categories_: 'categories',
  yield_factor_: 'yieldFactor',
  allergens_: 'allergens',
  min_stock_level_: 'minStockLevel',
  expiry_days_default_: 'expiryDaysDefault',
  addedAt_: { to: 'createdAt', fn: toEpoch },
  updatedAt: { to: 'updatedAt', fn: toEpoch },
  seeded_: 'seeded',
  allergen_source_: 'allergenSource',
  buy_price_global_: null, // deprecated shim — superseded by sources_
  supplierIds_: null, // deprecated shim — superseded by sources_
  _legacyImport: 'legacyImport',
  _legacyProductId: 'legacyProductId',
  name_hebrew_normalized: 'nameHebrewNormalized',
  nutrition_per_100g: {
    to: 'nutritionPer100g',
    obj: {
      energy_kcal: 'energyKcal',
      protein_g: 'proteinG',
      carbs_g: 'carbsG',
      sugars_g: 'sugarsG',
      fat_g: 'fatG',
      fiber_g: 'fiberG',
      sodium_g: 'sodiumG',
      cholesterol_mg: 'cholesterolMg'
    }
  }
}

const RECIPE: KeyMap = {
  ...COMMON,
  name_hebrew: 'nameHebrew',
  ingredients_: { to: 'ingredients', each: INGREDIENT },
  steps_: {
    to: 'steps',
    each: {
      order_: 'order',
      instruction_: 'instruction',
      labor_time_minutes_: 'laborTimeMinutes',
      cooking_time_secs_: 'cookingTimeSecs',
      cooking_time_minutes_: 'cookingTimeMinutes',
      video_url_: 'videoUrl'
    }
  },
  yield_amount_: 'yieldAmount',
  yield_unit_: 'yieldUnit',
  yield_conversions_: { to: 'yieldConversions', each: { amount: 'amount', unit: 'unit' } },
  default_station_: 'defaultStation',
  is_approved_: 'isApproved',
  recipe_type_: null, // implied by the collection (recipes / dishes) since G1 = keep separate
  version_history_: 'versionHistory',
  prep_items_: {
    to: 'prepItems',
    each: {
      preparation_name: 'preparationName',
      category_name: 'categoryName',
      main_category_name: 'mainCategoryName',
      quantity: 'quantity',
      unit: 'unit'
    }
  },
  prep_categories_: {
    to: 'prepCategories',
    each: {
      category_name: 'categoryName',
      items: {
        to: 'items',
        each: { item_name: 'itemName', unit: 'unit', quantity: 'quantity', category_name: 'categoryName' }
      }
    }
  },
  logistics_: { to: 'logistics', obj: DISH_LOGISTICS },
  labels_: 'labels',
  course_: 'course',
  autoLabels_: 'autoLabels',
  addedAt_: { to: 'createdAt', fn: toEpoch },
  updatedAt_: { to: 'updatedAt', fn: toEpoch },
  createdBy: 'createdBy',
  hiddenBy: 'hiddenBy', // @deprecated — moves to userPrefs in Phase 6
  favoritedBy_: 'favoritedBy', // @deprecated — moves to userPrefs in Phase 6
  imageUrl_: 'imageUrl',
  rating_: 'rating',
  neto_confirmed_: 'netoConfirmed',
  _legacyImport: 'legacyImport',
  _legacyRecipeNo: 'legacyRecipeNo'
}

const EQUIPMENT: KeyMap = {
  ...COMMON,
  name_hebrew: 'nameHebrew',
  category_: 'category',
  owned_quantity_: 'ownedQuantity',
  scaling_rule_: {
    to: 'scalingRule',
    obj: { per_guests_: 'perGuests', min_quantity_: 'minQuantity', max_quantity_: 'maxQuantity' }
  },
  is_consumable_: 'isConsumable',
  tags_: 'tags',
  notes_: 'notes',
  created_at_: { to: 'createdAt', fn: toEpoch },
  updated_at_: { to: 'updatedAt', fn: toEpoch }
}

const SUPPLIER: KeyMap = {
  ...COMMON,
  name_hebrew: 'nameHebrew',
  contact_person_: 'contactPerson',
  phone_: 'phone',
  phone2_: 'phone2',
  delivery_days_: 'deliveryDays',
  min_order_mov_: 'minOrderMov',
  lead_time_days_: 'leadTimeDays',
  supplier_logo_url_: 'supplierLogoUrl',
  last_updated_: { to: 'updatedAt', fn: toEpoch },
  _legacyImport: 'legacyImport',
  _legacySupplierCode: 'legacySupplierCode'
}

const VENUE: KeyMap = {
  ...COMMON,
  name_hebrew: 'nameHebrew',
  environment_type_: 'environmentType',
  available_infrastructure_: {
    to: 'availableInfrastructure',
    each: { equipment_id_: 'equipmentId', available_quantity_: 'availableQuantity' }
  },
  notes_: 'notes',
  created_at_: { to: 'createdAt', fn: toEpoch },
  address_: 'address',
  capacity_: 'capacity',
  contact_name_: 'contactName',
  contact_phone_: 'contactPhone',
  operating_hours_: { to: 'operatingHours', each: { days_: 'days', time_: 'time' } },
  active_: 'active',
  photo_url_: 'photoUrl'
}

const MENU_EVENT: KeyMap = {
  ...COMMON,
  name_: 'name',
  event_type_: 'eventType',
  event_date_: 'eventDate',
  serving_type_: 'servingType',
  guest_count_: 'guestCount',
  pieces_per_person_: 'piecesPerPerson',
  sections_: {
    to: 'sections',
    each: {
      _id: '_id',
      name_: 'name',
      sort_order_: 'sortOrder',
      items_: {
        to: 'items',
        each: {
          recipe_id_: 'recipeId',
          recipe_type_: { to: 'recipeType', fn: preparationToRecipe },
          predicted_take_rate_: 'predictedTakeRate',
          derived_portions_: 'derivedPortions',
          sell_price_: 'sellPrice',
          food_cost_override_: 'foodCostOverride',
          serving_portions_: 'servingPortions'
        }
      }
    }
  },
  financial_targets_: {
    to: 'financialTargets',
    obj: { target_food_cost_pct_: 'targetFoodCostPct', target_revenue_per_guest_: 'targetRevenuePerGuest' }
  },
  performance_tags_: {
    to: 'performanceTags',
    obj: { food_cost_pct_: 'foodCostPct', primary_serving_style_: 'primaryServingStyle' }
  },
  cuisine_tags_: 'cuisineTags',
  created_at_: { to: 'createdAt', fn: toEpoch },
  updated_at_: { to: 'updatedAt', fn: toEpoch },
  created_from_template_id_: 'createdFromTemplateId',
  logistics_: { to: 'logistics', obj: EVENT_LOGISTICS }
}

export const FIELD_MAP_V1_TO_V2: Record<string, KeyMap> = {
  PRODUCT_LIST: PRODUCT,
  RECIPE_LIST: RECIPE,
  DISH_LIST: RECIPE,
  EQUIPMENT_LIST: EQUIPMENT,
  KITCHEN_SUPPLIERS: SUPPLIER,
  VENUE_PROFILES: VENUE,
  MENU_EVENT_LIST: MENU_EVENT
}

/** v1 collection name → v2 collection name (Plan 321 G2). Trash and KITCHEN_* registries keep theirs until Phases 6 / 3. */
export const COLLECTION_RENAMES: Record<string, string> = {
  PRODUCT_LIST: 'products',
  RECIPE_LIST: 'recipes',
  DISH_LIST: 'dishes',
  KITCHEN_SUPPLIERS: 'suppliers',
  EQUIPMENT_LIST: 'equipment',
  VENUE_PROFILES: 'venues',
  MENU_EVENT_LIST: 'menuEvents'
}
