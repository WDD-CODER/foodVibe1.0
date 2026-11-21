import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { InvoiceHeaderStripComponent } from './invoice-header-strip.component'

describe('InvoiceHeaderStripComponent', () => {
  let fixture: ComponentFixture<InvoiceHeaderStripComponent>

  async function setup(inputs: Record<string, unknown> = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [InvoiceHeaderStripComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (key: string) => key } }]
    })
    fixture = TestBed.createComponent(InvoiceHeaderStripComponent)
    fixture.componentRef.setInput('supplierOptions', [
      { value: '', label: 'import_no_supplier' },
      { value: 'sup1', label: 'ירקן' }
    ])
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`)

  it('', async () => {
    await setup({ supplierId: 'sup1', isSuggested: true })
    expect(byId('invoice-supplier')?.querySelector('input')?.value).toBe('ירקן')
    expect(byId('invoice-supplier-suggested')).not.toBeNull()
    expect(byId('invoice-supplier-printed')).toBeNull()
  })

  it('', async () => {
    await setup({ printedSupplierName: 'ירקות בע״מ' })
    expect(byId('invoice-supplier-printed')?.textContent).toContain('ירקות בע״מ')
    expect(byId('invoice-supplier-suggested')).toBeNull()
  })

  it('', async () => {
    await setup({ taxId: '123456789', vatIncluded: true })
    expect(byId('invoice-tax-id')?.textContent).toContain('123456789')
    expect(byId('invoice-vat')?.textContent).toContain('invoice_vat_included')
    fixture.componentRef.setInput('vatIncluded', false)
    fixture.detectChanges()
    expect(byId('invoice-vat')?.textContent).toContain('invoice_vat_excluded')
    fixture.componentRef.setInput('vatIncluded', null)
    fixture.componentRef.setInput('taxId', null)
    fixture.detectChanges()
    expect(byId('invoice-vat')).toBeNull()
    expect(byId('invoice-tax-id')).toBeNull()
  })

  it('', async () => {
    await setup({ isSupplierMissing: true })
    expect(byId('invoice-supplier-required')?.getAttribute('role')).toBe('alert')
  })

  it('', async () => {
    await setup()
    const box = byId('invoice-number') as HTMLInputElement
    box.value = 'INV-7'
    box.dispatchEvent(new Event('input'))
    expect(fixture.componentInstance.invoiceNumber()).toBe('INV-7')
  })

  it('', async () => {
    await setup()
    const box = el().querySelector<HTMLInputElement>('app-date-field input.date-field-text')!
    box.value = '25/12/2026'
    box.dispatchEvent(new Event('input'))
    expect(fixture.componentInstance.invoiceDate()).toBe('2026-12-25')
  })

  it('', async () => {
    await setup({ disabled: true })
    expect((byId('invoice-number') as HTMLInputElement).disabled).toBeTrue()
  })
})
