import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Supplier } from '@models/supplier.model'
import { KitchenStateService } from './kitchen-state.service'
import { AddSupplierFlowService } from './add-supplier-flow.service'
import { AddItemModalService } from './add-item-modal.service'
import { SupplierDataService } from './supplier-data.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { TranslationKeyModalService } from './translation-key-modal.service'

describe('AddSupplierFlowService', () => {
  let service: AddSupplierFlowService
  let addItemModal: jasmine.SpyObj<AddItemModalService>
  let supplierData: jasmine.SpyObj<SupplierDataService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let translation: jasmine.SpyObj<TranslationService>
  const existing = { _id: 'sup-old', nameHebrew: 'ווילד בייקרי' } as Supplier

  beforeEach(() => {
    addItemModal = jasmine.createSpyObj<AddItemModalService>('AddItemModalService', ['open'])
    addItemModal.open.and.returnValue(Promise.resolve(null))
    supplierData = jasmine.createSpyObj<SupplierDataService>('SupplierDataService', ['addSupplier'])
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    translation = jasmine.createSpyObj<TranslationService>('TranslationService', [
      'isHebrewLabelDuplicate',
      'translate'
    ])
    translation.translate.and.callFake((key: string) => `${key}:{name}`)
    TestBed.configureTestingModule({
      providers: [
        AddSupplierFlowService,
        { provide: AddItemModalService, useValue: addItemModal },
        { provide: SupplierDataService, useValue: supplierData },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: translation },
        { provide: KitchenStateService, useValue: { suppliers_: signal([existing]) } },
        { provide: TranslationKeyModalService, useValue: jasmine.createSpyObj('TranslationKeyModalService', ['open']) }
      ]
    })
    service = TestBed.inject(AddSupplierFlowService)
  })

  it('opens the supplier window with the typed name filled in', async () => {
    await service.open('ספק חדש')
    expect(addItemModal.open).toHaveBeenCalledWith(jasmine.objectContaining({ initialValue: 'ספק חדש' }))
  })

  it('opens the window empty when nothing was typed', async () => {
    await service.open()
    expect(addItemModal.open.calls.mostRecent().args[0].initialValue).toBeUndefined()
  })

  it('selects nothing when the window is cancelled', async () => {
    expect(await service.open('ספק חדש')).toBeNull()
  })

  it('a name equal to an existing supplier saves nothing, returns the existing one and says so', async () => {
    addItemModal.open.and.returnValue(Promise.resolve('  ווילד בייקרי '))
    const result = await service.open('ווילד')
    expect(result).toBe(existing)
    expect(supplierData.addSupplier).not.toHaveBeenCalled()
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('supplier_exists_selected:ווילד בייקרי')
  })

  it('a new name is saved as before', async () => {
    addItemModal.open.and.returnValue(Promise.resolve('ספק חדש'))
    translation.isHebrewLabelDuplicate.and.returnValue(true)
    supplierData.addSupplier.and.resolveTo({ _id: 'new', nameHebrew: 'ספק חדש' } as Supplier)
    const result = await service.open()
    expect(supplierData.addSupplier).toHaveBeenCalledTimes(1)
    expect(result?._id).toBe('new')
  })
})
