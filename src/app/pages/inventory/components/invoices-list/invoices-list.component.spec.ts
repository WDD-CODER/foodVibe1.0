import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { FileText, LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { Invoice } from '@schemas/entities'
import { InvoiceDataService } from '@services/invoice-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { InvoicesListComponent } from './invoices-list.component'

const invoice = (id: string, extra: Partial<Invoice> = {}): Invoice =>
  ({
    _id: id,
    supplierName: `ספק ${id}`,
    source: 'pdf',
    lines: [{ printedName: 'a' }, { printedName: 'b' }],
    createdAt: 1_700_000_000_000,
    ...extra
  }) as unknown as Invoice

describe('InvoicesListComponent', () => {
  let fixture: ComponentFixture<InvoicesListComponent>
  let invoices: ReturnType<typeof signal<Invoice[]>>
  let reloadFromStorage: jasmine.Spy
  let openFile: jasmine.Spy
  let onSetErrorMsg: jasmine.Spy
  let isOwner: boolean

  async function setup(list: Invoice[], owner = true): Promise<void> {
    isOwner = owner
    invoices = signal(list)
    reloadFromStorage = jasmine.createSpy('reloadFromStorage').and.resolveTo()
    openFile = jasmine.createSpy('openFile').and.resolveTo(true)
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    TestBed.configureTestingModule({
      imports: [InvoicesListComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FileText })],
      providers: [
        provideRouter([]),
        { provide: InvoiceDataService, useValue: { allInvoices_: invoices, reloadFromStorage, openFile } },
        { provide: PermissionService, useValue: { can: () => isOwner } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: UserMsgService, useValue: { onSetErrorMsg } }
      ]
    })
    fixture = TestBed.createComponent(InvoicesListComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const el = () => fixture.nativeElement as HTMLElement
  const byId = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const all = (id: string) => Array.from(el().querySelectorAll<HTMLElement>(`[data-testid="${id}"]`))

  it('reloads on entry and lists the newest invoice date first, a missing date last', async () => {
    await setup([
      invoice('old', { invoiceDate: '2026-01-05' }),
      invoice('none', { createdAt: 9_000_000_000_000 }),
      invoice('new', { invoiceDate: '2026-03-01' }),
      invoice('same-day-later', { invoiceDate: '2026-01-05', createdAt: 1_800_000_000_000 })
    ])
    expect(reloadFromStorage).toHaveBeenCalledTimes(1)
    const names = all('invoice-row').map((r) => r.querySelector('.c-list-body-cell')?.textContent?.trim())
    expect(names).toEqual(['ספק new', 'ספק same-day-later', 'ספק old', 'ספק none'])
  })

  it('shows the owner the lines count and the file button', async () => {
    await setup([invoice('a', { invoiceNumber: 'INV-1', fileId: 'f1' })])
    expect(byId('invoice-lines')?.textContent?.trim()).toBe('2')
    byId('invoice-open-file')!.click()
    expect(openFile).toHaveBeenCalledOnceWith('f1')
    expect(el().textContent).toContain('INV-1')
  })

  it('shows invoice_no_file when there is no file', async () => {
    await setup([invoice('a')])
    expect(byId('invoice-open-file')).toBeNull()
    expect(byId('invoice-no-file')?.textContent?.trim()).toBe('invoice_no_file')
  })

  it('shows an error message when the file cannot be opened', async () => {
    await setup([invoice('a', { fileId: 'f1' })])
    openFile.and.resolveTo(false)
    byId('invoice-open-file')!.click()
    await fixture.whenStable()
    expect(onSetErrorMsg).toHaveBeenCalledWith('invoice_file_open_failed')
  })

  it('shows staff neither the lines count nor the file column', async () => {
    await setup([invoice('a', { fileId: 'f1' })], false)
    expect(byId('invoice-lines')).toBeNull()
    expect(byId('invoice-open-file')).toBeNull()
    expect(byId('invoice-no-file')).toBeNull()
    expect(byId('invoices-scan')).toBeNull()
  })

  it('shows the empty state with a scan button for the owner', async () => {
    await setup([])
    expect(byId('invoices-empty')?.textContent).toContain('invoices_empty')
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)
    el().querySelector<HTMLButtonElement>('app-empty-state button')!.click()
    expect(navigate).toHaveBeenCalledWith('/inventory/import')
  })

  it('shows the empty state without a button for staff', async () => {
    await setup([], false)
    expect(byId('invoices-empty')).not.toBeNull()
    expect(el().querySelector('app-empty-state button')).toBeNull()
  })
})
