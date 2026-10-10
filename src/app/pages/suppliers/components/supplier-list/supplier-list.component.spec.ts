import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { SupplierListComponent } from './supplier-list.component'
import { SupplierDataService } from '@services/supplier-data.service'
import { ProductDataService } from '@services/product-data.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { MasterPushService, SaveScope } from '@services/master-push.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { LoggingService } from '@services/logging.service'
import { HeroFabService } from '@services/hero-fab.service'
import { Supplier } from '@models/supplier.model'
import { Product } from '@models/product.model'

/** Exposes the protected bulk handler to the spec. */
class TestableSupplierList extends SupplierListComponent {
  bulkDelete(ids: string[]): Promise<void> {
    return this.onBulkDeleteSelected(ids)
  }
}

const supplier = (_id: string, _masterId?: string): Supplier => ({
  _id,
  nameHebrew: _id,
  deliveryDays: [],
  minOrderMov: 0,
  leadTimeDays: 0,
  ...(_masterId && { _masterId })
})
const product = (_id: string, supplierIds: string[]): Product =>
  ({ _id, nameHebrew: _id, sources: supplierIds.map((supplierId) => ({ supplierId, price: 1 })) }) as Product

describe('SupplierListComponent delete flow (plan 366)', () => {
  let component: TestableSupplierList
  let supplierData: jasmine.SpyObj<SupplierDataService>
  let productData: jasmine.SpyObj<ProductDataService>
  let masterPush: jasmine.SpyObj<MasterPushService>
  let confirmModal: jasmine.SpyObj<ConfirmModalService>
  let calls: string[]

  function setup(opts: { suppliers: Supplier[]; products: Product[]; admin: boolean; scope?: SaveScope }): void {
    calls = []
    supplierData = jasmine.createSpyObj<SupplierDataService>('SupplierDataService', ['removeSupplier'], {
      allSuppliers_: signal(opts.suppliers)
    })
    supplierData.removeSupplier.and.callFake(async (id: string) => {
      calls.push(`remove:${id}`)
    })
    productData = jasmine.createSpyObj<ProductDataService>('ProductDataService', ['unlinkSuppliersLocally'])
    productData.unlinkSuppliersLocally.and.callFake((ids: string[]) => {
      calls.push(`unlink:${ids.join(',')}`)
    })
    masterPush = jasmine.createSpyObj<MasterPushService>('MasterPushService', [
      'willAskDeleteScope',
      'askDeleteScope',
      'deleteSupplierFromMaster'
    ])
    masterPush.willAskDeleteScope.and.callFake((item) => opts.admin && !!item?._masterId)
    masterPush.askDeleteScope.and.callFake(async (item) =>
      opts.admin && item?._masterId ? (opts.scope ?? 'everyone') : 'me'
    )
    masterPush.deleteSupplierFromMaster.and.callFake(async (s: Supplier) => {
      calls.push(`master:${s._id}`)
    })
    confirmModal = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    confirmModal.open.and.resolveTo(true)
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    const router = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'], { events: of() })

    TestBed.configureTestingModule({
      providers: [
        TestableSupplierList,
        { provide: SupplierDataService, useValue: supplierData },
        { provide: ProductDataService, useValue: productData },
        { provide: KitchenStateService, useValue: { products_: signal(opts.products) } },
        { provide: MasterPushService, useValue: masterPush },
        { provide: ConfirmModalService, useValue: confirmModal },
        { provide: TranslationService, useValue: translation },
        { provide: UserService, useValue: { isLoggedIn: signal(true) } },
        { provide: RequireAuthService, useValue: { requireAuth: () => true } },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'info']) },
        {
          provide: HeroFabService,
          useValue: jasmine.createSpyObj('HeroFabService', ['setPageActions', 'clearPageActions'])
        },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} }, queryParams: of({}) } }
      ]
    })
    component = TestBed.inject(TestableSupplierList)
  }

  it('warns with the linked-product count, then deletes and unlinks locally', async () => {
    setup({ suppliers: [supplier('s1')], products: [product('p1', ['s1']), product('p2', ['s1', 's2'])], admin: false })
    await component.onDelete(supplier('s1'))
    expect(confirmModal.open).toHaveBeenCalledOnceWith('supplier_delete_in_use_warning', { variant: 'warning' })
    expect(masterPush.deleteSupplierFromMaster).not.toHaveBeenCalled()
    expect(calls).toEqual(['remove:s1', 'unlink:s1'])
  })

  it('does nothing when the warning is cancelled', async () => {
    setup({ suppliers: [supplier('s1')], products: [product('p1', ['s1'])], admin: false })
    confirmModal.open.and.resolveTo(false)
    await component.onDelete(supplier('s1'))
    expect(masterPush.askDeleteScope).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it('an unused supplier gets the plain confirm key', async () => {
    setup({ suppliers: [supplier('s1')], products: [], admin: false })
    await component.onDelete(supplier('s1'))
    expect(confirmModal.open).toHaveBeenCalledOnceWith('confirm_delete_supplier', { variant: 'danger' })
  })

  it('admin "everyone" removes the master copy before the own copy', async () => {
    setup({ suppliers: [supplier('s1', 'm1')], products: [product('p1', ['s1'])], admin: true })
    await component.onDelete(supplier('s1', 'm1'))
    expect(masterPush.askDeleteScope).toHaveBeenCalledWith(jasmine.objectContaining({ _id: 's1' }), {
      entity: 'supplier'
    })
    expect(calls).toEqual(['master:s1', 'remove:s1', 'unlink:s1'])
  })

  it('admin "only me" keeps the master copy', async () => {
    setup({ suppliers: [supplier('s1', 'm1')], products: [], admin: true, scope: 'me' })
    await component.onDelete(supplier('s1', 'm1'))
    expect(confirmModal.open).not.toHaveBeenCalled()
    expect(calls).toEqual(['remove:s1', 'unlink:s1'])
  })

  it('bulk delete warns with the total linked count and passes the count to the scope prompt', async () => {
    setup({
      suppliers: [supplier('s1', 'm1'), supplier('s2')],
      products: [product('p1', ['s1']), product('p2', ['s2']), product('p3', ['s3'])],
      admin: true
    })
    await component.bulkDelete(['s1', 's2'])
    expect(confirmModal.open).toHaveBeenCalledOnceWith('supplier_delete_in_use_warning', { variant: 'warning' })
    expect(masterPush.askDeleteScope).toHaveBeenCalledWith(jasmine.objectContaining({ _id: 's1' }), {
      entity: 'supplier',
      count: 2
    })
    expect(calls).toEqual(['master:s1', 'remove:s1', 'unlink:s1', 'remove:s2', 'unlink:s2'])
  })
})
