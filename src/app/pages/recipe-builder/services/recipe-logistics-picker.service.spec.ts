import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { AbstractControl, FormArray } from '@angular/forms'
import type { Equipment } from '@models/equipment.model'
import { EquipmentDataService } from '@services/equipment-data.service'
import { AddEquipmentModalService } from '@services/add-equipment-modal.service'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RecipeLogisticsPickerService } from './recipe-logistics-picker.service'

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

  const key = (k: string): KeyboardEvent => new KeyboardEvent('keydown', { key: k, cancelable: true })

  it('arrow keys + Enter select an option without adding it yet', () => {
    service.onSearchInput('ס')
    expect(service.dropdownOpen_()).toBeTrue()
    expect(service.highlightedIndex_()).toBe(0)
    service.onSearchKeydown(key('ArrowDown'))
    expect(service.highlightedIndex_()).toBe(1)
    service.onSearchKeydown(key('Enter'))
    expect(service.selectedToolId_()).toBe('e2')
    expect(service.searchQuery_()).toBe('סכין')
    expect(service.dropdownOpen_()).toBeFalse()
    expect(baseline.length).toBe(0)
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

  it('Add with only typed text opens the add-new-tool modal', async () => {
    service.onSearchInput('מחבת')
    service.onAddClick()
    expect(modalOpen).toHaveBeenCalledWith('מחבת')
  })

  it('removeBaselineRow removes the chip', () => {
    service.selectOption(equipment[0])
    service.onAddClick()
    service.removeBaselineRow(0)
    expect(baseline.length).toBe(0)
  })

  it('stops at the add option (no wrap) and Enter on it opens the modal with the typed name', () => {
    service.onSearchInput('ס')
    for (let i = 0; i < 5; i++) service.onSearchKeydown(key('ArrowDown'))
    expect(service.highlightedIndex_()).toBe(2)
    service.onSearchKeydown(key('ArrowUp'))
    service.onSearchKeydown(key('ArrowUp'))
    service.onSearchKeydown(key('ArrowUp'))
    expect(service.highlightedIndex_()).toBe(0)
    for (let i = 0; i < 5; i++) service.onSearchKeydown(key('ArrowDown'))
    service.onSearchKeydown(key('Enter'))
    expect(modalOpen).toHaveBeenCalledWith('ס')
  })

  it('add label: typed new name vs exact match (generic add_new_tool)', () => {
    service.onSearchInput('מחבת')
    expect(service.addLabel_()).toEqual({ kind: 'typed', text: 'מחבת' })
    service.onSearchInput('סיר')
    expect(service.addLabel_()).toEqual({ kind: 'generic', key: 'add_new_tool' })
  })

  it('Tab closes the list without blocking the browser focus move; Escape closes', () => {
    service.onSearchInput('ס')
    const tab = key('Tab')
    service.onSearchKeydown(tab)
    expect(tab.defaultPrevented).toBeFalse()
    expect(service.dropdownOpen_()).toBeFalse()
    service.onSearchKeydown(key('ArrowDown'))
    expect(service.dropdownOpen_()).toBeTrue()
    service.onSearchKeydown(key('Escape'))
    expect(service.dropdownOpen_()).toBeFalse()
  })

  it('a newly added tool lands selected and keeps the chosen quantity', async () => {
    const eqData = TestBed.inject(EquipmentDataService) as unknown as { addEquipment: jasmine.Spy }
    eqData.addEquipment.and.resolveTo({ _id: 'e9', nameHebrew: 'מחבת' })
    modalOpen.and.resolveTo({ name: 'מחבת', category: 'tool' })
    service.quantity_.set(4)
    service.onSearchInput('מחבת')
    await service.openAddNewToolModal()
    expect(service.selectedToolId_()).toBe('e9')
    expect(service.quantity_()).toBe(4)
  })
})
