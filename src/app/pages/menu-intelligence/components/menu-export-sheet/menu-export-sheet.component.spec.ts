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
})
