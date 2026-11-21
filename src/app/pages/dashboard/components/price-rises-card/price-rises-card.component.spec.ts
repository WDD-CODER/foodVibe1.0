import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, TrendingUp } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { BusinessService } from '@services/business.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { PriceRise, ProductImportService } from '@services/product-import.service'
import { TranslationService } from '@services/translation.service'
import { PriceRisesCardComponent } from './price-rises-card.component'

const rise = (productId: string, extra: Partial<PriceRise> = {}): PriceRise => ({
  productId,
  supplierId: 'sup1',
  from: 5,
  to: 5.3,
  changePct: 6,
  at: Date.UTC(2026, 10, 10, 12),
  ...extra
})

describe('PriceRisesCardComponent', () => {
  let fixture: ComponentFixture<PriceRisesCardComponent>
  let getPriceRises: jasmine.Spy
  let warn: jasmine.Spy
  let canEdit: boolean

  async function setup(answer: Promise<PriceRise[]>, can = true): Promise<void> {
    canEdit = can
    getPriceRises = jasmine.createSpy('getPriceRises').and.returnValue(answer)
    warn = jasmine.createSpy('warn')
    TestBed.configureTestingModule({
      imports: [PriceRisesCardComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, TrendingUp })],
      providers: [
        provideRouter([]),
        { provide: ProductImportService, useValue: { getPriceRises } },
        { provide: BusinessService, useValue: { business_: signal({ _id: 'b1' }) } },
        { provide: PermissionService, useValue: { can: () => canEdit } },
        { provide: LoggingService, useValue: { warn } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        {
          provide: KitchenStateService,
          useValue: {
            productsById_: signal(
              new Map([
                ['p1', { _id: 'p1', nameHebrew: 'עגבנייה' }],
                ['p2', { _id: 'p2', nameHebrew: 'מלפפון' }]
              ])
            ),
            suppliers_: signal([{ _id: 'sup1', nameHebrew: 'ירקן' }])
          }
        }
      ]
    })
    fixture = TestBed.createComponent(PriceRisesCardComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const card = () => el().querySelector('[data-testid="price-rises-card"]')

  it('renders name, supplier, old and new price and percent', async () => {
    await setup(Promise.resolve([rise('p1')]))
    const text = el().querySelector('[data-testid="price-rise-row"]')?.textContent ?? ''
    expect(text).toContain('עגבנייה')
    expect(text).toContain('ירקן')
    expect(text).toContain('₪5.00')
    expect(text).toContain('₪5.30')
    expect(text).toContain('+6.0%')
    expect(text).toContain('10/11/26')
    expect(getPriceRises).toHaveBeenCalledOnceWith(60)
  })

  it('is hidden with no rows', async () => {
    await setup(Promise.resolve([]))
    expect(card()).toBeNull()
  })

  it('is hidden and makes no request for a member without editMoney', async () => {
    await setup(Promise.resolve([rise('p1')]), false)
    expect(card()).toBeNull()
    expect(getPriceRises).not.toHaveBeenCalled()
  })

  it('skips a row of an unknown product', async () => {
    await setup(Promise.resolve([rise('gone'), rise('p2')]))
    const rows = el().querySelectorAll('[data-testid="price-rise-row"]')
    expect(rows.length).toBe(1)
    expect(rows[0].textContent).toContain('מלפפון')
  })

  it('shows 5 rows and a closing line with the rest', async () => {
    await setup(Promise.resolve(Array.from({ length: 7 }, (_, n) => rise('p1', { supplierId: `s${n}`, at: 1000 + n }))))
    expect(el().querySelectorAll('[data-testid="price-rise-row"]').length).toBe(5)
    expect(el().querySelector('[data-testid="price-rises-more"]')).not.toBeNull()
  })

  it('shows no card and logs a warning when the load fails', async () => {
    await setup(Promise.reject({ status: 500 }))
    expect(card()).toBeNull()
    expect(warn).toHaveBeenCalledWith('Price rises could not be loaded', { status: 500 })
  })
})
