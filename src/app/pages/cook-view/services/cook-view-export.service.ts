import { Injectable, inject, signal } from '@angular/core'
import { ExportService } from '@services/export.service'
import type { Recipe } from '@models/recipe.model'
import type { ExportPayload } from '../../../core/utils/export.util'

type ExportPreviewType = 'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist'

/**
 * Cook-view export bar + preview-popup flow (recipe info, shopping list,
 * cooking steps, dish checklist — view/export/print). Component-scoped
 * (provided on CookViewPage).
 */
@Injectable()
export class CookViewExportService {
  private readonly exportService = inject(ExportService)

  /** Payload for export preview popup (null = closed). */
  exportPreviewPayload_ = signal<ExportPayload | null>(null)
  /** Which export type is shown in preview (so we know what to run on Export click). */
  private exportPreviewType_: ExportPreviewType | null = null
  /** Floating export bar expanded. */
  exportBarExpanded_ = signal<boolean>(false)

  /** Close export bar and preview so state is clean when user navigates away. */
  closeAllExportOverlays(): void {
    this.exportBarExpanded_.set(false)
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  toggleExportBar(): void {
    this.exportBarExpanded_.update((v: boolean) => !v)
  }

  async onExportInfo(recipe: Recipe | null, qty: number): Promise<void> {
    if (recipe) await this.exportService.exportRecipeInfo(recipe, qty)
  }

  async onExportShoppingList(recipe: Recipe | null, qty: number): Promise<void> {
    if (recipe) await this.exportService.exportShoppingList(recipe, qty)
  }

  onViewRecipeInfo(recipe: Recipe | null, qty: number): void {
    if (!recipe) return
    const payload = this.exportService.getRecipeInfoPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'recipe-info'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  onViewShoppingList(recipe: Recipe | null, qty: number): void {
    if (!recipe) return
    const payload = this.exportService.getShoppingListPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'shopping-list'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  onExportPreviewClose(): void {
    this.exportPreviewPayload_.set(null)
    this.exportPreviewType_ = null
  }

  async onExportFromPreview(recipe: Recipe | null, qty: number): Promise<void> {
    if (!recipe || !this.exportPreviewType_) return
    if (this.exportPreviewType_ === 'recipe-info') {
      await this.exportService.exportRecipeInfo(recipe, qty)
    } else if (this.exportPreviewType_ === 'shopping-list') {
      await this.exportService.exportShoppingList(recipe, qty)
    } else if (this.exportPreviewType_ === 'cooking-steps') {
      await this.exportService.exportCookingSteps(recipe, qty)
    } else if (this.exportPreviewType_ === 'dish-checklist') {
      await this.exportService.exportDishChecklist(recipe, qty)
    }
    this.onExportPreviewClose()
  }

  onPrintFromPreview(): void {
    window.print()
  }

  onViewCookingSteps(recipe: Recipe | null, qty: number): void {
    if (!recipe) return
    const payload = this.exportService.getCookingStepsPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'cooking-steps'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  onViewDishChecklist(recipe: Recipe | null, qty: number): void {
    if (!recipe) return
    const payload = this.exportService.getDishChecklistPreviewPayload(recipe, qty)
    this.exportPreviewType_ = 'dish-checklist'
    this.exportPreviewPayload_.set(payload)
    this.exportBarExpanded_.set(false)
  }

  async onExportCookingSteps(recipe: Recipe | null, qty: number): Promise<void> {
    if (recipe) await this.exportService.exportCookingSteps(recipe, qty)
  }

  async onExportDishChecklist(recipe: Recipe | null, qty: number): Promise<void> {
    if (recipe) await this.exportService.exportDishChecklist(recipe, qty)
  }
}
