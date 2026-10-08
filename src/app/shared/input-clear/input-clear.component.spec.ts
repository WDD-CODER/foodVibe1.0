import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { InputClearComponent } from './input-clear.component'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('InputClearComponent', () => {
  let fixture: ComponentFixture<InputClearComponent>
  let button: () => HTMLButtonElement

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [InputClearComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(InputClearComponent)
    button = () => fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement
  })

  it('is hidden (and not focusable) when visible=false', () => {
    fixture.componentRef.setInput('visible', false)
    fixture.detectChanges()
    expect(button().classList).not.toContain('is-visible')
    expect(button().getAttribute('aria-hidden')).toBe('true')
    expect(button().getAttribute('tabindex')).toBe('-1')
  })

  it('shows when visible=true and emits clear on click', () => {
    fixture.componentRef.setInput('visible', true)
    fixture.detectChanges()
    const spy = jasmine.createSpy('clear')
    fixture.componentInstance.clear.subscribe(spy)
    expect(button().classList).toContain('is-visible')
    expect(button().getAttribute('aria-label')).toBe('clear_search')
    button().click()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not emit while hidden', () => {
    fixture.componentRef.setInput('visible', false)
    fixture.detectChanges()
    const spy = jasmine.createSpy('clear')
    fixture.componentInstance.clear.subscribe(spy)
    button().click()
    expect(spy).not.toHaveBeenCalled()
  })

  it('prevents mousedown default so the input keeps focus', () => {
    fixture.componentRef.setInput('visible', true)
    fixture.detectChanges()
    const ev = new MouseEvent('mousedown', { cancelable: true, bubbles: true })
    button().dispatchEvent(ev)
    expect(ev.defaultPrevented).toBeTrue()
  })
})
