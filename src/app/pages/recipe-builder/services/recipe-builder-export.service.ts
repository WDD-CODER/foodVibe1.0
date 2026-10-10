import { Injectable, inject, signal } from '@angular/core'
import { ExportService } from '@services/export.service'
import type { Recipe } from '@models/recipe.model'
import type { ExportPayload } from '../../../core/utils/export.util'

export type RecipeBuilderExportView = 'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'all'
type RecipeBuilderExportPreviewType =
  'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'recipe-all'

/** What the page hands over so this service never reads the recipe form itself. */
export interface RecipeBuilderExportSource {
  recipe: () => Recipe
  quantity: () => number
}

/**
 * Recipe-builder export toolbar + view/export dropdowns + preview popup.
 * Component-scoped (provided on RecipeBuilderPage); the page connects a
 * recipe snapshot + export quantity source once.
 */
@Injectable()
export class RecipeBuilderExportService {
  private readonly exportService_ = inject(ExportService)

  private source_: RecipeBuilderExportSource | null = null

  /** Export toolbar overlay (blur header, same pattern as menu-intelligence). */
  readonly exportToolbarOpen_ = signal(false)
  /** Which View/Export dropdown is open in the toolbar. */
  readonly viewExportModal_ = signal<RecipeBuilderExportView | null>(null)
  /** Payload for the export preview popup (null = closed). */
  readonly exportPreviewPayload_ = signal<ExportPayload | null>(null)
  private exportPreviewType_: RecipeBuilderExportPreviewType | null = null

  connect(source: RecipeBuilderExportSource): void {
    this.source_ = source
  }

  openToolbar(): void {
    // Defer to next tick so the opening click is not interpreted as click-outside
    setTimeout(() => this.exportToolbarOpen_.set(true), 0)
  }

  closeToolbar(): void {
    this.exportToolbarOpen_.set(false)
    this.viewExportModal_.set(null)
  }

  openViewExportModal(key: RecipeBuilderExportView): void {
    this.viewExportModal_.update((current) => (current === key ? null : key))
  }

  closeViewExportModal(): void {
    this.viewExportModal_.set(null)
  }

  /** Close export toolbar and preview so state is clean when user navigates away. */
  closeAllExportOverlays(): void {
    this.exportToolbarOpen_.set(false)
    this.viewExportModal_.set(null)
    this.closePreview()
  }

  onViewRecipeInfo(): void {
    this.openPreview_('recipe-info', (r, q) => this.exportService_.getRecipeInfoPreviewPayload(r, q))
  }

  onViewShoppingList(): void {
    this.openPreview_('shopping-list', (r, q) => this.exportService_.getShoppingListPreviewPayload(r, q))
  }

  onViewCookingSteps(): void {
    this.openPreview_('cooking-steps', (r, q) => this.exportService_.getCookingStepsPreviewPayload(r, q))
  }

  onViewDishChecklist(): void {
    this.openPreview_('dish-checklist', (r, q) => this.exportService_.getDishChecklistPreviewPayload(r, q))
  }

  onViewAll(): void {
    this.openPreview_('recipe-all', (r, q) => this.exportService_.getRecipeInfoPreviewPayload(r, q))
    this.closeViewExportModal()
  }

  onExportFromPreview(): void {
    const type = this.exportPreviewType_
    if (!this.exportPreviewPayload_() || !type || !this.source_) return
    const recipe = this.source_.recipe()
    const qty = this.source_.quantity()
    if (type === 'recipe-info') this.exportService_.exportRecipeInfo(recipe, qty)
    else if (type === 'shopping-list') this.exportService_.exportShoppingList(recipe, qty)
    else if (type === 'cooking-steps') this.exportService_.exportCookingSteps(recipe, qty)
    else if (type === 'dish-checklist') this.exportService_.exportDishChecklist(recipe, qty)
    else if (type === 'recipe-all') this.exportService_.exportAllTogetherRecipe(recipe, qty)
    this.closePreview()
  }

  onExportRecipeInfo(): void {
    this.runExport_((r, q) => this.exportService_.exportRecipeInfo(r, q))
  }

  onExportShoppingList(): void {
    this.runExport_((r, q) => this.exportService_.exportShoppingList(r, q))
  }

  onExportCookingSteps(): void {
    this.runExport_((r, q) => this.exportService_.exportCookingSteps(r, q))
  }

  onExportDishChecklist(): void {
    this.runExport_((r, q) => this.exportService_.exportDishChecklist(r, q))
  }

  onExportAllTogether(): void {
    this.runExport_((r, q) => this.exportService_.exportAllTogetherRecipe(r, q))
  }

  print(): void {
    window.print()
  }

  closePreview(): void {
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  private openPreview_(
    type: RecipeBuilderExportPreviewType,
    buildPayload: (recipe: Recipe, qty: number) => ExportPayload
  ): void {
    if (!this.source_) return
    this.exportPreviewPayload_.set(buildPayload(this.source_.recipe(), this.source_.quantity()))
    this.exportPreviewType_ = type
  }

  private runExport_(run: (recipe: Recipe, qty: number) => Promise<void>): void {
    if (!this.source_) return
    run(this.source_.recipe(), this.source_.quantity())
  }
}
