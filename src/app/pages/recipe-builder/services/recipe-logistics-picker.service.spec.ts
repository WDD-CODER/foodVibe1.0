import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { AbstractControl, FormArray } from '@angular/forms'
import type { Equipment } from '@models/equipment.model'
import { EquipmentDataService } from '@services/equipment-data.service'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RecipeLogisticsPickerService } from './recipe-logistics-picker.service'

// The search box, its keyboard and its add row are covered by shared/search-combobox/search-combobox.component.spec.ts.
describe('RecipeLogisticsPickerService', () => {
  const equipment = [
    { _id: 'e1', nameHebrew: 'סיר' },
    { _id: 'e2', nameHebrew: 'סכין' }
  ] as Equipment[]
  let service: RecipeLogisticsPickerService
  let baseline: FormArray
  let modalOpen: jasmine.Spy

  beforeEach(() => {
    modalOpen = jasmine.createSpy('open').and.resolveTo(null)
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RecipeLogisticsPickerService,
        {
          provide: EquipmentDataService,
          useValue: { allEquipment_: signal(equipment), addEquipment: jasmine.createSpy() }
        },
        { provide: AddEquipmentModalService, useValue: { open: modalOpen } }
      ]
    })
    service = TestBed.inject(RecipeLogisticsPickerService)
    baseline = new FormArray<AbstractControl>([])
    service.connect(baseline)
  })

  it('typing lists matching tools; picking one selects it without adding it yet', () => {
    service.onSearchInput('ס')
    expect(service.searchOptions_().map((e) => e._id)).toEqual(['e1', 'e2'])
    service.selectOption(equipment[1])
    expect(service.selectedToolId_()).toBe('e2')
    expect(service.searchQuery_()).toBe('סכין')
    expect(baseline.length).toBe(0)
  })

  it('editing the text after a pick drops the selection', () => {
    service.selectOption(equipment[1])
    service.onSearchInput('סכינ')
    expect(service.selectedToolId_()).toBeNull()
  })

  it('Add puts the selected tool in the baseline and hides it from search', () => {
    service.onSearchInput('ס')
    service.selectOption(equipment[0])
    service.quantity_.set(3)
    service.onAddClick()
    expect(baseline.length).toBe(1)
    expect(baseline.at(0).get('equipmentId')?.value).toBe('e1')
    expect(baseline.at(0).get('quantity')?.value).toBe(3)
    expect(service.searchQuery_()).toBe('')
    service.onSearchInput('ס')
    expect(service.searchOptions_().map((e) => e._id)).toEqual(['e2'])
  })

  it('Add with only typed text opens the add-new-tool modal prefilled with it (rule W)', () => {
    service.onSearchInput('מחבת')
    service.onAddClick()
    expect(modalOpen).toHaveBeenCalledWith('מחבת')
  })

  it('Add with the exact name of an existing tool opens the modal empty (generic add)', () => {
    service.onSearchInput('סיר')
    service.onAddClick()
    expect(modalOpen).toHaveBeenCalledWith(undefined)
  })

  it('removeBaselineRow removes the chip', () => {
    service.selectOption(equipment[0])
    service.onAddClick()
    service.removeBaselineRow(0)
    expect(baseline.length).toBe(0)
  })

  it('the add option opens the modal with the typed name, or empty for the generic add', async () => {
    await service.openAddNewToolModal('ס')
    expect(modalOpen).toHaveBeenCalledWith('ס')
    await service.openAddNewToolModal('')
    expect(modalOpen).toHaveBeenCalledWith(undefined)
  })

  it('a newly added tool lands selected and keeps the chosen quantity', async () => {
    const eqData = TestBed.inject(EquipmentDataService) as unknown as { addEquipment: jasmine.Spy }
    eqData.addEquipment.and.resolveTo({ _id: 'e9', nameHebrew: 'מחבת' })
    modalOpen.and.resolveTo({ name: 'מחבת', category: 'tool' })
    service.quantity_.set(4)
    service.onSearchInput('מחבת')
    await service.openAddNewToolModal('מחבת')
    expect(service.selectedToolId_()).toBe('e9')
    expect(service.quantity_()).toBe(4)
  })
})
