import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MENU_BASE_TEMPLATES } from '@schemas/menu-design/menu-base-templates'
import { TranslationService } from '@services/translation.service'
import { BaseTemplatePickerComponent } from './base-template-picker.component'

describe('BaseTemplatePickerComponent', () => {
  let fixture: ComponentFixture<BaseTemplatePickerComponent>

  const picks = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.base-picker__pick')) as HTMLButtonElement[]

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((key: string | undefined) => key ?? '')
    await TestBed.configureTestingModule({
      imports: [BaseTemplatePickerComponent],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(BaseTemplatePickerComponent)
    fixture.detectChanges()
  })

  it('offers the four base looks, each with its own sample menu', () => {
    expect(picks().map((p) => p.dataset['base'])).toEqual([...MENU_BASE_TEMPLATES])
    expect(fixture.nativeElement.querySelectorAll('app-menu-preview iframe[sandbox=""]').length).toBe(4)
  })

  it('explains each choice in a tooltip and an accessible description, not as text on the popup', () => {
    for (const pick of picks()) {
      const base = pick.dataset['base']
      expect(pick.getAttribute('title')).toBe(`menu_design_base_hint_${base}`)
      const hint = fixture.nativeElement.querySelector(`#${pick.getAttribute('aria-describedby')}`) as HTMLElement
      expect(hint.classList).toContain('visually-hidden')
    }
  })

  it('emits the picked base', () => {
    const picked: string[] = []
    fixture.componentInstance.picked.subscribe((id) => picked.push(id))
    picks()[2].click()
    expect(picked).toEqual(['rustic'])
  })

  it('cancel dismisses without a pick', () => {
    let dismissed = 0
    fixture.componentInstance.dismissed.subscribe(() => dismissed++)
    ;(fixture.nativeElement.querySelector('.c-modal-actions button') as HTMLButtonElement).click()
    expect(dismissed).toBe(1)
  })
})
