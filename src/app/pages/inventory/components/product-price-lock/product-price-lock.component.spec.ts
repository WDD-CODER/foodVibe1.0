import { ComponentFixture, TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { FormArray, FormBuilder, FormGroup } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { UserService } from '@services/user.service'
import { TranslationService } from '@services/translation.service'
import type { User } from '@models/user.model'
import { ProductPriceLockComponent } from './product-price-lock.component'

const OWNER: User = { _id: 'o1', name: 'owner', email: 'o@x', businessId: 'b1', businessRole: 'owner' }
const STAFF: User = { _id: 's1', name: 'cook', email: 's@x', businessId: 'b1', businessRole: 'staff' }

describe('ProductPriceLockComponent', () => {
  let fixture: ComponentFixture<ProductPriceLockComponent>
  let form: FormGroup
  const fb = new FormBuilder()
  const user_ = signal<User | null>(null)

  const row = (price: number) =>
    fb.group({ unitSymbol: ['box'], conversionRate: [1], show_special_price_: [price > 0], priceOverride: [price] })
  const rows = () => form.get('purchaseOptions') as FormArray

  function setup(user: User, product: object | null): void {
    user_.set(user)
    form = fb.group({ productName: ['milk'], buy_price_global_: [12], purchaseOptions: fb.array([row(7)]) })
    TestBed.configureTestingModule({
      imports: [ProductPriceLockComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: UserService, useValue: { user_, isOwner_: computed(() => user_()?.businessRole === 'owner') } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: product ? { product } : {} } } }
      ]
    })
    fixture = TestBed.createComponent(ProductPriceLockComponent)
    fixture.componentRef.setInput('form', form)
    fixture.detectChanges()
  }

  it('owner: nothing is disabled and no note is shown', () => {
    setup(OWNER, { _id: 'p1', createdBy: 'o1' })
    expect(form.get('buy_price_global_')!.disabled).toBeFalse()
    expect(rows().at(0).get('priceOverride')!.disabled).toBeFalse()
    expect(fixture.nativeElement.querySelector('p')).toBeNull()
  })

  it('staff on his own product: prices disabled, the rest editable, note shown', () => {
    setup(STAFF, { _id: 'p1', createdBy: 's1' })
    expect(form.get('buy_price_global_')!.disabled).toBeTrue()
    expect(rows().at(0).get('priceOverride')!.disabled).toBeTrue()
    expect(rows().at(0).get('show_special_price_')!.disabled).toBeTrue()
    expect(form.get('productName')!.enabled).toBeTrue()
    expect(fixture.nativeElement.querySelector('[data-testid="product-prices-locked-note"]')).not.toBeNull()
  })

  it('staff: a row added after init is locked too', () => {
    setup(STAFF, null)
    rows().push(row(0))
    const added = rows().at(1)
    expect(added.get('priceOverride')!.disabled).toBeTrue()
    expect(added.get('show_special_price_')!.disabled).toBeTrue()
  })

  it('staff: a programmatic setValue on a locked price snaps back to the loaded value', () => {
    setup(STAFF, { _id: 'p1', createdBy: 's1' })
    form.get('buy_price_global_')!.setValue(99)
    expect(form.get('buy_price_global_')!.value).toBe(12)
    rows().at(0).get('priceOverride')!.setValue(50)
    expect(rows().at(0).get('priceOverride')!.value).toBe(7)
    expect(form.getRawValue().buy_price_global_).toBe(12)
  })

  it('staff: a silent priceOverride write on conversion-rate change is put back', () => {
    setup(STAFF, { _id: 'p1', createdBy: 's1' })
    const r = rows().at(0)
    // Mirrors the product form: the conversion-rate subscriber writes priceOverride with emitEvent false.
    r.get('conversionRate')!.valueChanges.subscribe(() => r.get('priceOverride')!.setValue(99, { emitEvent: false }))
    r.get('conversionRate')!.setValue(5)
    expect(r.getRawValue().priceOverride).toBe(7)
    expect(r.getRawValue().show_special_price_).toBeTrue()
  })

  it("staff on another member's product: the whole form is read-only with both notes", () => {
    setup(STAFF, { _id: 'p1', createdBy: 'o1' })
    expect(form.disabled).toBeTrue()
    expect(fixture.nativeElement.querySelector('[data-testid="product-view-only-note"]')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('[data-testid="product-prices-locked-note"]')).not.toBeNull()
  })
})
