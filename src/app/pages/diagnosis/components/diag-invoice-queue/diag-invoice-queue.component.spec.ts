import { Component, input, output } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { ProductImportComponent } from '../../../inventory/components/product-import/product-import.component'
import { DiagnosisService } from '../../services/diagnosis.service'
import { DiagInvoiceQueueComponent } from './diag-invoice-queue.component'

@Component({ selector: 'app-product-import', standalone: true, template: '' })
class ProductImportStubComponent {
  readonly embedded = input(false)
  readonly file = input<File | null>(null)
  readonly applied = output<{ invoiceId: string | null }>()
  hasRealChanges(): boolean {
    return false
  }
}

describe('DiagInvoiceQueueComponent', () => {
  let fixture: ComponentFixture<DiagInvoiceQueueComponent>
  let saveInvoices: jasmine.Spy
  let onSetErrorMsg: jasmine.Spy
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const stub = () =>
    fixture.debugElement.query(By.directive(ProductImportStubComponent))?.componentInstance as
      ProductImportStubComponent | undefined
  const files = (...names: string[]) => names.map((name) => new File(['x'], name, { type: 'image/jpeg' }))
  const statuses = () =>
    Array.from(el().querySelectorAll('[data-testid="diag-queue-item"]')).map((li) =>
      li.textContent?.replace(/\s+/g, ' ').trim()
    )

  async function choose(list: File[]): Promise<void> {
    const input = byId<HTMLInputElement>('diag-queue-input')!
    const transfer = new DataTransfer()
    list.forEach((file) => transfer.items.add(file))
    input.files = transfer.files
    input.dispatchEvent(new Event('change'))
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(invoiceIds: string[] = []): Promise<void> {
    saveInvoices = jasmine.createSpy('saveInvoices').and.resolveTo({})
    onSetErrorMsg = jasmine.createSpy('onSetErrorMsg')
    TestBed.configureTestingModule({
      imports: [DiagInvoiceQueueComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: DiagnosisService, useValue: { saveInvoices } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        { provide: UserMsgService, useValue: { onSetErrorMsg } }
      ]
    })
    TestBed.overrideComponent(DiagInvoiceQueueComponent, {
      remove: { imports: [ProductImportComponent] },
      add: { imports: [ProductImportStubComponent] }
    })
    fixture = TestBed.createComponent(DiagInvoiceQueueComponent)
    fixture.componentRef.setInput('diagnosisId', 'd1')
    fixture.componentRef.setInput('invoiceIds', invoiceIds)
    fixture.detectChanges()
  }

  it('three files: only the first is handed to the preview', async () => {
    await setup()
    const [a, b, c] = files('a.jpg', 'b.jpg', 'c.jpg')
    await choose([a, b, c])
    expect(statuses().length).toBe(3)
    expect(stub()!.file()).toBe(a)
    expect(stub()!.embedded()).toBeTrue()
    expect(el().querySelectorAll('app-product-import').length).toBe(1)
  })

  it('the second file is handed only after the first is applied, and its id is saved to the diagnosis', async () => {
    await setup(['old'])
    const [a, b] = files('a.jpg', 'b.jpg')
    await choose([a, b])
    stub()!.applied.emit({ invoiceId: 'inv1' })
    await fixture.whenStable()
    fixture.detectChanges()
    expect(saveInvoices).toHaveBeenCalledWith('d1', ['old', 'inv1'])
    expect(fixture.componentInstance.invoiceIds()).toEqual(['old', 'inv1'])
    expect(stub()!.file()).toBe(b)
    expect(statuses()[0]).toContain('diag_queue_done')
  })

  it('skip marks the current file skipped and hands over the next one; the last skip leaves no preview', async () => {
    await setup()
    const [a, b] = files('a.jpg', 'b.jpg')
    await choose([a, b])
    byId<HTMLButtonElement>('diag-queue-skip')!.click()
    fixture.detectChanges()
    expect(statuses()[0]).toContain('diag_queue_skipped')
    expect(stub()!.file()).toBe(b)
    expect(saveInvoices).not.toHaveBeenCalled()
    byId<HTMLButtonElement>('diag-queue-skip')!.click()
    fixture.detectChanges()
    expect(stub()).toBeUndefined()
  })

  it('an apply that recorded no invoice marks the file approved and shows diag_queue_no_record', async () => {
    await setup()
    await choose(files('a.jpg'))
    stub()!.applied.emit({ invoiceId: null })
    await fixture.whenStable()
    fixture.detectChanges()
    expect(saveInvoices).not.toHaveBeenCalled()
    expect(onSetErrorMsg).toHaveBeenCalledWith('diag_queue_no_record')
    expect(statuses()[0]).toContain('diag_queue_done')
  })

  it('files beyond the room left under 100 are not added and diag_queue_too_many shows', async () => {
    await setup(Array.from({ length: 98 }, (_, i) => `i${i}`))
    await choose(files('a.jpg', 'b.jpg', 'c.jpg'))
    expect(statuses().length).toBe(2)
    expect(onSetErrorMsg).toHaveBeenCalledWith('diag_queue_too_many')
  })

  it('a done diagnosis shows the locked line and no picker', async () => {
    await setup()
    fixture.componentRef.setInput('locked', true)
    fixture.detectChanges()
    expect(byId('diag-locked')).not.toBeNull()
    expect(byId('diag-queue-pick')).toBeNull()
  })
})
