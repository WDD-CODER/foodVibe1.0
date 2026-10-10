import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import type { Recipe } from '@models/recipe.model'
import { ExportService } from '@services/export.service'
import type { ExportPayload } from '../../../core/utils/export.util'
import { RecipeBuilderExportService } from './recipe-builder-export.service'

describe('RecipeBuilderExportService', () => {
  const recipe = { _id: 'r1' } as Recipe
  const payload = { title: 'x' } as unknown as ExportPayload
  let service: RecipeBuilderExportService
  let exportService: jasmine.SpyObj<ExportService>

  beforeEach(() => {
    exportService = jasmine.createSpyObj<ExportService>('ExportService', [
      'getShoppingListPreviewPayload',
      'exportShoppingList'
    ])
    exportService.getShoppingListPreviewPayload.and.returnValue(payload)
    exportService.exportShoppingList.and.resolveTo()
    TestBed.configureTestingModule({
      providers: [RecipeBuilderExportService, { provide: ExportService, useValue: exportService }]
    })
    service = TestBed.inject(RecipeBuilderExportService)
    service.connect({ recipe: () => recipe, quantity: () => 4 })
  })

  it('opens the toolbar on the next tick and closes it with its dropdown', fakeAsync(() => {
    service.openToolbar()
    expect(service.exportToolbarOpen_()).toBeFalse()
    tick()
    expect(service.exportToolbarOpen_()).toBeTrue()
    service.openViewExportModal('shopping-list')
    expect(service.viewExportModal_()).toBe('shopping-list')
    service.openViewExportModal('shopping-list')
    expect(service.viewExportModal_()).toBeNull()
    service.openViewExportModal('all')
    service.closeToolbar()
    expect(service.exportToolbarOpen_()).toBeFalse()
    expect(service.viewExportModal_()).toBeNull()
  }))

  it('previews from the page source and exports the previewed type', () => {
    service.onViewShoppingList()
    expect(exportService.getShoppingListPreviewPayload).toHaveBeenCalledWith(recipe, 4)
    expect(service.exportPreviewPayload_()).toBe(payload)
    service.onExportFromPreview()
    expect(exportService.exportShoppingList).toHaveBeenCalledWith(recipe, 4)
    expect(service.exportPreviewPayload_()).toBeNull()
  })

  it('closeAllExportOverlays leaves nothing open', () => {
    service.exportToolbarOpen_.set(true)
    service.openViewExportModal('recipe-info')
    service.onViewShoppingList()
    service.closeAllExportOverlays()
    expect(service.exportToolbarOpen_()).toBeFalse()
    expect(service.viewExportModal_()).toBeNull()
    expect(service.exportPreviewPayload_()).toBeNull()
  })
})
