import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { MenuExportSheetComponent } from './menu-export-sheet.component'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('MenuExportSheetComponent', () => {
  let fixture: ComponentFixture<MenuExportSheetComponent>
  let component: MenuExportSheetComponent

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [MenuExportSheetComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(MenuExportSheetComponent)
    component = fixture.componentInstance
  })

  function open(): void {
    fixture.componentRef.setInput('open', true)
    fixture.detectChanges()
  }

  it('is hidden while closed and shown when open', () => {
    fixture.detectChanges()
    const sheet = fixture.debugElement.query(By.css('.mes-sheet')).nativeElement as HTMLElement
    expect(sheet.classList).not.toContain('is-open')
    open()
    expect(sheet.classList).toContain('is-open')
  })

  it('emits close on backdrop click', () => {
    open()
    const spy = jasmine.createSpy('close')
    component.close.subscribe(spy)
    const backdrop = fixture.debugElement.query(By.css('.mes-backdrop')).nativeElement as HTMLElement
    backdrop.click()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('emits close on Escape only while open', () => {
    const spy = jasmine.createSpy('close')
    component.close.subscribe(spy)
    fixture.detectChanges()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(spy).not.toHaveBeenCalled()
    open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('closes first, then emits the chosen action', () => {
    open()
    const calls: string[] = []
    component.close.subscribe(() => calls.push('close'))
    component.viewChecklist.subscribe((mode) => calls.push(`checklist:${mode}`))
    component.print.subscribe(() => calls.push('print'))
    const actions = fixture.debugElement.queryAll(By.css('.mes-action'))
    const viewByDish = actions[0].nativeElement as HTMLElement
    const print = actions[actions.length - 1].nativeElement as HTMLElement
    viewByDish.click()
    print.click()
    expect(calls).toEqual(['close', 'checklist:by_dish', 'close', 'print'])
  })

  it('closes first, then emits openSupplierOrders', () => {
    open()
    const calls: string[] = []
    component.close.subscribe(() => calls.push('close'))
    component.openSupplierOrders.subscribe(() => calls.push('orders'))
    const actions = fixture.debugElement.queryAll(By.css('.mes-action'))
    const orders = actions[actions.length - 2].nativeElement as HTMLElement
    expect(orders.textContent).toContain('supplier_orders')
    orders.click()
    expect(calls).toEqual(['close', 'orders'])
  })

  it('titles the group "prep_sheets" and offers four views but only three exports', () => {
    open()
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('.mes-group-title')?.textContent).toContain('prep_sheets')
    const rows = el.querySelectorAll('.mes-group:first-of-type .mes-row')
    expect(rows.length).toBe(4)
    expect(rows[3].textContent).toContain('prep_sheets_by_supplier')
    expect(rows[3].querySelectorAll('.mes-action').length).toBe(1)
    expect(rows[0].querySelectorAll('.mes-action').length).toBe(2)
  })

  it('emits viewChecklist by_supplier and never an export for it', () => {
    open()
    const calls: string[] = []
    component.viewChecklist.subscribe((mode) => calls.push(`view:${mode}`))
    component.exportChecklist.subscribe((mode) => calls.push(`export:${mode}`))
    const rows = fixture.nativeElement.querySelectorAll('.mes-group:first-of-type .mes-row')
    ;(rows[3].querySelector('.mes-action') as HTMLElement).click()
    ;(component as unknown as { onExportChecklist(m: string): void }).onExportChecklist('by_supplier')
    expect(calls).toEqual(['view:by_supplier'])
  })
})
