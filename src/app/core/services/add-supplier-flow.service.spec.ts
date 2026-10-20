import { TestBed } from '@angular/core/testing'
import { AddSupplierFlowService } from './add-supplier-flow.service'
import { AddItemModalService } from './add-item-modal.service'
import { SupplierDataService } from './supplier-data.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { TranslationKeyModalService } from './translation-key-modal.service'

describe('AddSupplierFlowService', () => {
  let service: AddSupplierFlowService
  let addItemModal: jasmine.SpyObj<AddItemModalService>

  beforeEach(() => {
    addItemModal = jasmine.createSpyObj<AddItemModalService>('AddItemModalService', ['open'])
    addItemModal.open.and.returnValue(Promise.resolve(null))
    TestBed.configureTestingModule({
      providers: [
        AddSupplierFlowService,
        { provide: AddItemModalService, useValue: addItemModal },
        { provide: SupplierDataService, useValue: jasmine.createSpyObj('SupplierDataService', ['addSupplier']) },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        },
        {
          provide: TranslationService,
          useValue: jasmine.createSpyObj('TranslationService', ['isHebrewLabelDuplicate'])
        },
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
})
