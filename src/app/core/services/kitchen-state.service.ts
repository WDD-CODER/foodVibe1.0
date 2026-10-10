import { Injectable, signal, computed, inject } from '@angular/core'
import { from, throwError, of, Observable } from 'rxjs'
import { tap, catchError, switchMap, map } from 'rxjs/operators'
import { Product } from '../models/product.model'
import { Recipe } from '../models/recipe.model'
import { Supplier } from '@models/supplier.model'
import { UserMsgService } from './user-msg.service'
import { UserService } from './user.service'
import { ProductDataService } from './product-data.service'
import { RecipeDataService } from './recipe-data.service'
import { DishDataService } from './dish-data.service'
import { SupplierDataService } from './supplier-data.service'
import { ActivityLogService, ActivityChange } from './activity-log.service'
import { VersionHistoryService } from './version-history.service'
import { LoggingService } from './logging.service'
import { getEffectivePrice, getSupplierIds } from '../utils/product-source.util'

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  private productDataService = inject(ProductDataService)
  private recipeDataService = inject(RecipeDataService)
  private dishDataService = inject(DishDataService)
  private supplierDataService = inject(SupplierDataService)
  private userMsgService = inject(UserMsgService)
  private userService = inject(UserService)
  private activityLogService = inject(ActivityLogService)
  private versionHistoryService = inject(VersionHistoryService)
  private logging = inject(LoggingService)

  // CORE SIGNALS
  products_ = computed(() => this.productDataService.allProducts_())
  /** Combined recipes (preparations) + dishes for ingredient search and lookup. */
  recipes_ = computed(() => [...this.recipeDataService.allRecipes_(), ...this.dishDataService.allDishes_()])
  /** O(1) id lookups for cost/allergen resolution (plan 303 M1) — rebuilt only when products_ changes. */
  productsById_ = computed(() => new Map(this.products_().map((p) => [p._id, p])))
  /** O(1) id lookups for cost/allergen resolution (plan 303 M1) — rebuilt only when recipes_ changes. */
  recipesById_ = computed(() => new Map(this.recipes_().map((r) => [r._id, r])))
  suppliers_ = computed(() => this.supplierDataService.allSuppliers_())
  /** O(1) id lookups for supplier-name resolution — same rationale as productsById_/recipesById_. */
  suppliersById_ = computed(() => new Map(this.suppliers_().map((s) => [s._id, s])))
  selectedProductId_ = signal<string | null>(null)
  isDrawerOpen_ = signal<boolean>(false)

  // COMPUTED SIGNALS
  lowStockProducts_ = computed(() => this.products_().filter((p) => p.minStockLevel > 0))

  saveProduct(product: Product): Observable<Product> {
    const isUpdate = !!(product._id && product._id.trim() !== '')

    const isDuplicate = this.products_().some(
      (p) => p.nameHebrew.trim() === product.nameHebrew.trim() && p._id !== product._id
    )

    if (isDuplicate) {
      this.userMsgService.onSetErrorMsg('כבר קיים חומר גלם בשם זה - לא ניתן לשמור')
      return throwError(() => new Error('Duplicate product name'))
    }

    if (isUpdate) {
      const previous = this.products_().find((p) => p._id === product._id) ?? null
      const changes = previous ? this.buildProductChanges(previous, product) : []

      return from(this.productDataService.updateProduct(product)).pipe(
        tap(() => {
          this.userMsgService.onSetSuccessMsg('המוצר עודכן בהצלחה')
          this.activityLogService.recordActivity({
            action: 'updated',
            entityType: 'product',
            entityId: product._id,
            entityName: product.nameHebrew,
            changes
          })
          if (previous) {
            void this.versionHistoryService
              .addVersion({
                entityType: 'product',
                entityId: previous._id,
                entityName: previous.nameHebrew,
                snapshot: previous,
                changes
              })
              .catch((err) => {
                this.logging.error({
                  event: 'crud.versionHistory.addVersion_fireAndForget_error',
                  message: 'Version history write failed after product save',
                  context: { err }
                })
              })
          }
        }),
        map(() => product),
        catchError((err) => {
          this.userMsgService.onSetErrorMsg('שגיאה בעדכון המוצר')
          return throwError(() => err)
        })
      )
    } else {
      // Create path – use saved product to get the new _id
      return from(this.productDataService.addProduct(product as Omit<Product, '_id'>)).pipe(
        tap((saved) => {
          this.userMsgService.onSetSuccessMsg('חומר גלם נוסף בהצלחה')
          this.activityLogService.recordActivity({
            action: 'created',
            entityType: 'product',
            entityId: saved._id,
            entityName: saved.nameHebrew,
            changes: []
          })
        }),
        map((saved) => saved),
        catchError((err) => {
          this.userMsgService.onSetErrorMsg('שגיאה בהוספת המוצר')
          return throwError(() => err)
        })
      )
    }
  }

  /** Build structured change list between two products for activity log. */
  private buildProductChanges(prev: Product, next: Product): ActivityChange[] {
    const changes: ActivityChange[] = []

    if (prev.nameHebrew !== next.nameHebrew) {
      changes.push({
        field: 'name',
        label: 'activity_field_name',
        from: prev.nameHebrew,
        to: next.nameHebrew
      })
    }
    const prevPrice = getEffectivePrice(prev)
    const nextPrice = getEffectivePrice(next)
    if (prevPrice !== nextPrice) {
      changes.push({
        field: 'price',
        label: 'activity_field_price',
        from: `${prevPrice} ₪`,
        to: `${nextPrice} ₪`
      })
    }
    if (prev.baseUnit !== next.baseUnit) {
      changes.push({
        field: 'unit',
        label: 'activity_field_unit',
        from: prev.baseUnit,
        to: next.baseUnit
      })
    }
    const prevSupp = getSupplierIds(prev).slice().sort().join(',')
    const nextSupp = getSupplierIds(next).slice().sort().join(',')
    if (prevSupp !== nextSupp) {
      changes.push({
        field: 'supplier',
        label: 'activity_field_supplier',
        from: prevSupp || undefined,
        to: nextSupp || undefined
      })
    }
    const prevCat = (prev.categories ?? []).slice().sort().join(',')
    const nextCat = (next.categories ?? []).slice().sort().join(',')
    if (prevCat !== nextCat) {
      changes.push({
        field: 'category',
        label: 'activity_field_category',
        from: prevCat || undefined,
        to: nextCat || undefined
      })
    }
    const prevAll = (prev.allergens ?? []).slice().sort().join(',')
    const nextAll = (next.allergens ?? []).slice().sort().join(',')
    if (prevAll !== nextAll) {
      changes.push({
        field: 'allergens',
        label: 'activity_field_allergens',
        from: prevAll || undefined,
        to: nextAll || undefined
      })
    }
    if ((prev.minStockLevel ?? 0) !== (next.minStockLevel ?? 0)) {
      changes.push({
        field: 'min_stock_level',
        label: 'activity_field_min_stock',
        from: String(prev.minStockLevel ?? 0),
        to: String(next.minStockLevel ?? 0)
      })
    }
    if ((prev.expiryDaysDefault ?? 0) !== (next.expiryDaysDefault ?? 0)) {
      changes.push({
        field: 'expiry_days_default',
        label: 'activity_field_expiry_days',
        from: String(prev.expiryDaysDefault ?? 0),
        to: String(next.expiryDaysDefault ?? 0)
      })
    }
    if (Math.abs((prev.yieldFactor ?? 1) - (next.yieldFactor ?? 1)) > 0.001) {
      changes.push({
        field: 'yield_factor',
        label: 'activity_field_yield_factor',
        from: String(prev.yieldFactor ?? 1),
        to: String(next.yieldFactor ?? 1)
      })
    }
    const prevUnits = (prev.purchaseOptions ?? []).map((o) => o.unitSymbol).join(', ')
    const nextUnits = (next.purchaseOptions ?? []).map((o) => o.unitSymbol).join(', ')
    if (prevUnits !== nextUnits) {
      changes.push({
        field: 'purchase_options',
        label: 'activity_field_purchase_options',
        from: prevUnits || undefined,
        to: nextUnits || undefined
      })
    }
    return changes
  }

  deleteProduct(_id: string): Observable<void> {
    const existing = this.products_().find((p) => p._id === _id)
    const entityName = existing?.nameHebrew ?? _id

    return of(null).pipe(
      switchMap(() => {
        const exists = this.products_().some((p) => p._id === _id)
        if (!exists) return throwError(() => new Error('NOT_FOUND'))

        return from(this.productDataService.deleteProduct(_id))
      }),
      tap(() => {
        this.userMsgService.onSetSuccessMsg('חומר הגלם נמחק בהצלחה')
        this.activityLogService.recordActivity({
          action: 'deleted',
          entityType: 'product',
          entityId: _id,
          entityName
        })
      }),
      catchError((err) => {
        const msg = err.message === 'NOT_FOUND' ? 'הפריט לא נמצא' : 'שגיאה בעת המחיקה'
        this.userMsgService.onSetErrorMsg(msg)
        return throwError(() => err)
      })
    )
  }

  // RECIPE / DISH CRUD
  deleteRecipe(recipe: Recipe): Observable<void> {
    const isDish = recipe.recipeType === 'dish' || !!(recipe.prepItems?.length || recipe.prepCategories?.length)
    const operation$ = isDish
      ? from(this.dishDataService.deleteDish(recipe._id))
      : from(this.recipeDataService.deleteRecipe(recipe._id))

    return operation$.pipe(
      tap(() => {
        const msg = isDish ? 'המנה נמחקה בהצלחה' : 'המתכון נמחק בהצלחה'
        this.userMsgService.onSetSuccessMsg(msg)
        this.activityLogService.recordActivity({
          action: 'deleted',
          entityType: isDish ? 'dish' : 'recipe',
          entityId: recipe._id,
          entityName: recipe.nameHebrew
        })
      }),
      catchError(() => {
        const errorMsg = isDish ? 'שגיאה במחיקת המנה' : 'שגיאה במחיקת המתכון'
        this.userMsgService.onSetErrorMsg(errorMsg)
        return throwError(() => new Error(errorMsg))
      })
    )
  }

  permanentlyDeleteRecipe(recipe: Recipe): Observable<void> {
    const user = this.userService.user_()
    if (!user) return throwError(() => new Error('NOT_AUTHENTICATED'))
    if (user.role !== 'admin') return throwError(() => new Error('NOT_AUTHORIZED'))
    const isDish = recipe.recipeType === 'dish' || !!(recipe.prepItems?.length || recipe.prepCategories?.length)
    const operation$ = isDish
      ? from(this.dishDataService.permanentlyDeleteDish(recipe._id))
      : from(this.recipeDataService.permanentlyDeleteRecipe(recipe._id))
    return operation$.pipe(
      tap(() => {
        this.userMsgService.onSetSuccessMsg(isDish ? 'המנה נמחקה לצמיתות' : 'המתכון נמחק לצמיתות')
        this.activityLogService.recordActivity({
          action: 'deleted',
          entityType: isDish ? 'dish' : 'recipe',
          entityId: recipe._id,
          entityName: recipe.nameHebrew
        })
      }),
      catchError(() => {
        this.userMsgService.onSetErrorMsg('שגיאה במחיקה הקבועה')
        return throwError(() => new Error('permanentDelete failed'))
      })
    )
  }

  saveRecipe(input: Recipe): Observable<Recipe> {
    const recipe = this.withoutNullLogistics(input)
    const isDish = recipe.recipeType === 'dish' || !!(recipe.prepItems?.length || recipe.prepCategories?.length)
    const isUpdate = !!(recipe._id && recipe._id.trim() !== '')
    const previous = isUpdate ? this.recipes_().find((r) => r._id === recipe._id) : null
    const previousIsDish = previous
      ? previous.recipeType === 'dish' || !!(previous.prepItems?.length || previous.prepCategories?.length)
      : false
    const typeChanged = isUpdate && !!previous && previousIsDish !== isDish
    const entityType = isDish ? ('dish' as const) : ('recipe' as const)
    const previousEntityType = previousIsDish ? ('dish' as const) : ('recipe' as const)

    const operation$ = typeChanged
      ? this.deleteRecipe(previous!).pipe(
          switchMap(() => {
            const { _id: _omit, ...payload } = recipe as Recipe & { _id?: string }
            return isDish
              ? from(this.dishDataService.addDish(payload as Omit<Recipe, '_id'>))
              : from(this.recipeDataService.addRecipe(payload as Omit<Recipe, '_id'>))
          })
        )
      : isDish
        ? isUpdate
          ? from(this.dishDataService.updateDish(recipe))
          : from(this.dishDataService.addDish(recipe as Omit<Recipe, '_id'>))
        : isUpdate
          ? from(this.recipeDataService.updateRecipe(recipe))
          : from(this.recipeDataService.addRecipe(recipe as Omit<Recipe, '_id'>))

    const fallbackErrorMsg = isDish
      ? isUpdate
        ? 'שגיאה בעדכון המנה'
        : 'שגיאה בשמירת המנה'
      : isUpdate
        ? 'שגיאה בעדכון המתכון'
        : 'שגיאה בשמירת המתכון'

    return operation$.pipe(
      tap((saved) => {
        const msg = typeChanged
          ? 'המתכון/המנה שונה לסוג החדש ונשמר בהצלחה'
          : isDish
            ? isUpdate
              ? 'המנה עודכנה בהצלחה'
              : 'המנה נשמרה בהצלחה'
            : isUpdate
              ? 'המתכון עודכן בהצלחה'
              : 'המתכון נשמר בהצלחה'
        this.userMsgService.onSetSuccessMsg(msg)
        const changes = isUpdate && previous ? this.buildRecipeChanges(previous, saved) : []
        this.activityLogService.recordActivity({
          action: typeChanged ? 'created' : isUpdate ? 'updated' : 'created',
          entityType: isDish ? 'dish' : 'recipe',
          entityId: saved._id,
          entityName: saved.nameHebrew,
          changes
        })
        if (isUpdate && previous) {
          void this.versionHistoryService
            .addVersion({
              entityType: typeChanged ? previousEntityType : entityType,
              entityId: previous._id,
              entityName: previous.nameHebrew,
              snapshot: previous,
              changes: this.buildRecipeChanges(previous, recipe)
            })
            .catch((err) => {
              this.logging.error({
                event: 'crud.versionHistory.addVersion_fireAndForget_error',
                message: 'Version history write failed after recipe/dish save',
                context: { err }
              })
            })
        }
      }),
      catchError((err: unknown) => {
        const msg =
          (err && typeof err === 'object' && (err as { error?: { message?: string } }).error?.message) ||
          (err instanceof Error ? err.message : null) ||
          fallbackErrorMsg
        this.userMsgService.onSetErrorMsg(String(msg))
        return throwError(() => (err instanceof Error ? err : new Error(String(msg))))
      })
    )
  }

  /** Build structured change list between two recipes/dishes for activity log. */
  private buildRecipeChanges(prev: Recipe, next: Recipe): ActivityChange[] {
    const changes: ActivityChange[] = []

    if (prev.nameHebrew !== next.nameHebrew) {
      changes.push({
        field: 'name',
        label: 'activity_field_name',
        from: prev.nameHebrew,
        to: next.nameHebrew
      })
    }
    if ((prev.ingredients?.length ?? 0) !== (next.ingredients?.length ?? 0)) {
      changes.push({
        field: 'ingredients_count',
        label: 'activity_field_ingredients_count',
        from: String(prev.ingredients?.length ?? 0),
        to: String(next.ingredients?.length ?? 0)
      })
    }
    if ((prev.steps?.length ?? 0) !== (next.steps?.length ?? 0)) {
      changes.push({
        field: 'steps_count',
        label: 'activity_field_steps_count',
        from: String(prev.steps?.length ?? 0),
        to: String(next.steps?.length ?? 0)
      })
    }
    if ((prev.yieldAmount ?? 0) !== (next.yieldAmount ?? 0) || (prev.yieldUnit ?? '') !== (next.yieldUnit ?? '')) {
      changes.push({
        field: 'yield',
        label: 'activity_field_yield',
        from: `${prev.yieldAmount ?? 0} ${prev.yieldUnit ?? ''}`.trim(),
        to: `${next.yieldAmount ?? 0} ${next.yieldUnit ?? ''}`.trim()
      })
    }
    if ((prev.prepItems?.length ?? 0) !== (next.prepItems?.length ?? 0)) {
      changes.push({
        field: 'prep_items',
        label: 'activity_field_prep_items',
        from: String(prev.prepItems?.length ?? 0),
        to: String(next.prepItems?.length ?? 0)
      })
    }
    if ((prev.course ?? '') !== (next.course ?? '')) {
      changes.push({
        field: 'course',
        label: 'activity_field_course',
        from: prev.course || 'no_course',
        to: next.course || 'no_course'
      })
    }
    const prevLabels = [...(prev.labels ?? [])].sort()
    const nextLabels = [...(next.labels ?? [])].sort()
    if (prevLabels.join(',') !== nextLabels.join(',')) {
      changes.push({
        field: 'labels',
        label: 'activity_field_labels',
        from: prevLabels.join(', '),
        to: nextLabels.join(', ')
      })
    }
    return changes
  }

  /** Legacy recipes can carry `logistics: null`, which the schema rejects (a row action like
   *  favorite / rating / approve sends the stored doc back). Send an empty baseline ("no
   *  equipment") instead so the save validates (plans 340, 403). */
  private withoutNullLogistics(recipe: Recipe): Recipe {
    return recipe.logistics === null ? { ...recipe, logistics: { baseline: [] } } : recipe
  }

  /** Shared by cascadeClear*FromAll: applies one doc's update via the raw per-collection
   *  update method (not saveRecipe(), which would fire one toast per affected doc for a bulk
   *  cascade) while still recording activity-log + version-history entries, matching what
   *  saveRecipe does minus the toast. */
  private async applyCascadeUpdate(previous: Recipe, updated: Recipe): Promise<void> {
    const isDish = previous.recipeType === 'dish' || !!(previous.prepItems?.length || previous.prepCategories?.length)
    const toSave = this.withoutNullLogistics(updated)
    const saved = isDish
      ? await this.dishDataService.updateDish(toSave)
      : await this.recipeDataService.updateRecipe(toSave)
    const changes = this.buildRecipeChanges(previous, saved)
    this.activityLogService.recordActivity({
      action: 'updated',
      entityType: isDish ? 'dish' : 'recipe',
      entityId: saved._id,
      entityName: saved.nameHebrew,
      changes
    })
    try {
      await this.versionHistoryService.addVersion({
        entityType: isDish ? 'dish' : 'recipe',
        entityId: previous._id,
        entityName: previous.nameHebrew,
        snapshot: previous,
        changes
      })
    } catch (err) {
      this.logging.error({
        event: 'crud.versionHistory.addVersion_fireAndForget_error',
        message: 'Version history write failed after cascade update',
        context: { err }
      })
    }
  }

  /** Cascade-clear a deleted label key from every recipe/dish that references it — both the
   *  manual labels array and the auto-computed autoLabels array (a label surviving in
   *  autoLabels after its registry entry is gone would reintroduce the orphan-label bug
   *  fixed in plan 320). Returns the number of items updated. */
  async cascadeClearLabelFromAll(labelKey: string): Promise<number> {
    const affected = this.recipes_().filter(
      (r) => (r.labels ?? []).includes(labelKey) || (r.autoLabels ?? []).includes(labelKey)
    )
    for (const recipe of affected) {
      const updated: Recipe = {
        ...recipe,
        labels: (recipe.labels ?? []).filter((l) => l !== labelKey),
        autoLabels: (recipe.autoLabels ?? []).filter((l) => l !== labelKey)
      }
      await this.applyCascadeUpdate(recipe, updated)
    }
    return affected.length
  }

  /** Cascade-clear a deleted course key back to '' (the existing "no course" sentinel) on
   *  every recipe/dish that has it set. Returns the number of items updated. */
  async cascadeClearCourseFromAll(courseKey: string): Promise<number> {
    const affected = this.recipes_().filter((r) => r.course === courseKey)
    for (const recipe of affected) {
      await this.applyCascadeUpdate(recipe, { ...recipe, course: '' })
    }
    return affected.length
  }

  /** Plan 322 M8: cascade-remove a deleted product's ingredient line from every one of the
   *  CURRENT user's own recipes/dishes that reference it. Pulls the row out entirely rather
   *  than nulling its referenceId — a referenceless ingredient row is itself an invalid/
   *  blocking row (see recipe-ingredients-table.component.ts's isBlockingRow), so leaving one
   *  behind would just trade one bug for another. Returns the number of items updated. Only
   *  covers the current user's own data — the cross-user "everyone" sweep is a separate,
   *  server-side operation (ProductDataService.purgeIngredientEverywhere). */
  async cascadeRemoveIngredientForAll(productId: string): Promise<number> {
    const affected = this.recipes_().filter((r) => (r.ingredients ?? []).some((i) => i.referenceId === productId))
    for (const recipe of affected) {
      const updated: Recipe = {
        ...recipe,
        ingredients: (recipe.ingredients ?? []).filter((i) => i.referenceId !== productId)
      }
      await this.applyCascadeUpdate(recipe, updated)
    }
    return affected.length
  }

  // SUPPLIER CRUD
  async addSupplier(supplier: Omit<Supplier, '_id'>): Promise<Supplier> {
    return this.supplierDataService.addSupplier(supplier)
  }
}
