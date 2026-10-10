import { TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import {
  MasterPushService,
  ScopeAction,
  ScopeEntity,
  buildScopeTexts,
  bulkScopeEntity,
  recipeScopeEntity
} from './master-push.service'
import { ConfirmModalService } from './confirm-modal.service'
import { RecipeDataService } from './recipe-data.service'
import { DishDataService } from './dish-data.service'
import { ProductDataService } from './product-data.service'
import { SupplierDataService } from './supplier-data.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { UserService } from './user.service'

const ACTIONS: ScopeAction[] = ['save', 'create', 'delete']
const ENTITIES: ScopeEntity[] = ['recipe', 'dish', 'product', 'metadata', 'supplier']
/** Identity translate with `{n}` kept, so assertions read the keys the service picked. */
const echo = (key: string): string => (key.endsWith('_many') ? `${key}:{n}` : key)

describe('buildScopeTexts', () => {
  it('picks header, message and buttons for every action × entity', () => {
    for (const action of ACTIONS) {
      for (const entity of ENTITIES) {
        const t = buildScopeTexts(action, entity, 1, echo)
        expect(t.headerKey).withContext(`${action}/${entity}`).toBe(`scope_${action}_header`)
        expect(t.message.startsWith(`scope_${action}_${entity}`))
          .withContext(`${action}/${entity}`)
          .toBeTrue()
      }
    }
    expect(buildScopeTexts('save', 'recipe', 1, echo)).toEqual(
      jasmine.objectContaining({ meLabelKey: 'scope_me', everyoneLabelKey: 'scope_everyone_update' })
    )
    expect(buildScopeTexts('create', 'product', 1, echo)).toEqual(
      jasmine.objectContaining({ meLabelKey: 'scope_me', everyoneLabelKey: 'scope_everyone_publish' })
    )
    expect(buildScopeTexts('delete', 'metadata', 1, echo)).toEqual(
      jasmine.objectContaining({ meLabelKey: 'scope_delete_me', everyoneLabelKey: 'scope_delete_everyone' })
    )
  })

  it('uses the plural message with the count substituted when count > 1', () => {
    expect(buildScopeTexts('delete', 'recipe', 3, echo).message).toBe('scope_delete_many:3')
    expect(buildScopeTexts('save', 'dish', 5, echo).message).toBe('scope_save_many:5')
  })

  it('appends the remove-from-all-recipes warning only to product deletes', () => {
    expect(buildScopeTexts('delete', 'product', 1, echo).message).toBe(
      'scope_delete_product scope_delete_product_warning'
    )
    expect(buildScopeTexts('delete', 'product', 2, echo).message).toBe(
      'scope_delete_many:2 scope_delete_product_warning'
    )
    expect(buildScopeTexts('save', 'product', 1, echo).message).not.toContain('warning')
    expect(buildScopeTexts('delete', 'recipe', 1, echo).message).not.toContain('warning')
  })
})

describe('scope entity helpers', () => {
  it('maps recipe type to entity', () => {
    expect(recipeScopeEntity({ recipeType: 'dish' })).toBe('dish')
    expect(recipeScopeEntity({ recipeType: 'preparation' })).toBe('recipe')
    expect(recipeScopeEntity(null)).toBe('recipe')
  })

  it('reads an all-dish selection as dishes, anything else as recipes', () => {
    expect(bulkScopeEntity([{ recipeType: 'dish' }, { recipeType: 'dish' }])).toBe('dish')
    expect(bulkScopeEntity([{ recipeType: 'dish' }, { recipeType: 'preparation' }])).toBe('recipe')
    expect(bulkScopeEntity([])).toBe('recipe')
  })
})

describe('MasterPushService scope prompts', () => {
  let service: MasterPushService
  let confirmModal: jasmine.SpyObj<ConfirmModalService>
  let isAdmin: WritableSignal<boolean>

  beforeEach(() => {
    isAdmin = signal(true)
    confirmModal = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['openTernary'])
    confirmModal.openTernary.and.resolveTo('save')
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      providers: [
        MasterPushService,
        { provide: ConfirmModalService, useValue: confirmModal },
        { provide: TranslationService, useValue: translation },
        { provide: UserService, useValue: { isAdmin_: isAdmin } },
        { provide: RecipeDataService, useValue: {} },
        { provide: DishDataService, useValue: {} },
        { provide: ProductDataService, useValue: {} },
        { provide: SupplierDataService, useValue: {} },
        { provide: UserMsgService, useValue: {} }
      ]
    })
    service = TestBed.inject(MasterPushService)
  })

  it('never prompts a non-admin', async () => {
    isAdmin.set(false)
    expect(await service.askScope({ _masterId: 'm1' }, { entity: 'recipe' })).toBe('me')
    expect(await service.askDeleteScope({ _masterId: 'm1' }, { entity: 'recipe' })).toBe('me')
    expect(service.willAskDeleteScope({ _masterId: 'm1' })).toBeFalse()
    expect(confirmModal.openTernary).not.toHaveBeenCalled()
  })

  it('does not prompt for an unlinked item unless it is new', async () => {
    expect(await service.askScope({}, { entity: 'product' })).toBe('me')
    expect(confirmModal.openTernary).not.toHaveBeenCalled()
    expect(await service.askScope({}, { entity: 'product', isNew: true })).toBe('everyone')
    expect(confirmModal.openTernary.calls.mostRecent().args[1]?.headerKey).toBe('scope_create_header')
  })

  it('words a linked save as an update and a delete as a delete, with the count', async () => {
    await service.askScope({ _masterId: 'm1' }, { entity: 'dish' })
    expect(confirmModal.openTernary.calls.mostRecent().args[0]).toBe('scope_save_dish')
    confirmModal.openTernary.and.resolveTo('confirm')
    expect(await service.askDeleteScope({ _masterId: 'm1' }, { entity: 'recipe', count: 3 })).toBe('me')
    const [message, opts] = confirmModal.openTernary.calls.mostRecent().args
    expect(message).toBe('scope_delete_many')
    expect(opts?.saveButtonLabel).toBe('scope_delete_everyone')
    expect(service.willAskDeleteScope({ _masterId: 'm1' })).toBeTrue()
    expect(service.willAskDeleteScope({})).toBeFalse()
  })

  it('returns cancel when the admin cancels', async () => {
    confirmModal.openTernary.and.resolveTo('cancel')
    expect(await service.askDeleteScope({ _masterId: 'm1' }, { entity: 'product' })).toBe('cancel')
  })
})

describe('MasterPushService.deleteSupplierFromMaster (plan 366)', () => {
  let service: MasterPushService
  let supplierData: jasmine.SpyObj<SupplierDataService>
  let userMsg: jasmine.SpyObj<UserMsgService>

  beforeEach(() => {
    supplierData = jasmine.createSpyObj<SupplierDataService>('SupplierDataService', ['deleteFromMaster'])
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    TestBed.configureTestingModule({
      providers: [
        MasterPushService,
        { provide: ConfirmModalService, useValue: {} },
        { provide: TranslationService, useValue: translation },
        { provide: UserService, useValue: { isAdmin_: signal(true) } },
        { provide: RecipeDataService, useValue: {} },
        { provide: DishDataService, useValue: {} },
        { provide: ProductDataService, useValue: {} },
        { provide: SupplierDataService, useValue: supplierData },
        { provide: UserMsgService, useValue: userMsg }
      ]
    })
    service = TestBed.inject(MasterPushService)
  })

  const supplier = { _id: 's1', _masterId: 'm1', nameHebrew: 'ספק', deliveryDays: [], minOrderMov: 0, leadTimeDays: 0 }

  it('calls the server with the own supplier id', async () => {
    supplierData.deleteFromMaster.and.resolveTo()
    await service.deleteSupplierFromMaster(supplier)
    expect(supplierData.deleteFromMaster).toHaveBeenCalledWith('s1')
    expect(userMsg.onSetErrorMsg).not.toHaveBeenCalled()
  })

  it('shows a message instead of throwing when the server fails', async () => {
    supplierData.deleteFromMaster.and.rejectWith(new Error('500'))
    await expectAsync(service.deleteSupplierFromMaster(supplier)).toBeResolved()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('supplier_delete_from_master_error')
  })
})
