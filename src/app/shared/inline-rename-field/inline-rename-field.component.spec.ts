import { ComponentFixture, TestBed } from '@angular/core/testing'
import { InlineRenameFieldComponent } from './inline-rename-field.component'
import { TranslationService } from '@services/translation.service'

describe('InlineRenameFieldComponent', () => {
  let fixture: ComponentFixture<InlineRenameFieldComponent>
  let saved: string[]
  let cancelled: number

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input')
  const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('button'))

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineRenameFieldComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k } }]
    }).compileComponents()
    fixture = TestBed.createComponent(InlineRenameFieldComponent)
    fixture.componentRef.setInput('value', 'old')
    saved = []
    cancelled = 0
    fixture.componentInstance.saved.subscribe((v) => saved.push(v))
    fixture.componentInstance.cancelled.subscribe(() => cancelled++)
    fixture.detectChanges()
  })

  it('opens with the value and two buttons: save and cancel', () => {
    expect(input().value).toBe('old')
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['save', 'cancel'])
  })

  it('emits the trimmed text on Save', () => {
    input().value = '  new  '
    buttons()[0].click()
    expect(saved).toEqual(['new'])
    expect(cancelled).toBe(0)
  })

  it('emits the trimmed text on Enter', () => {
    input().value = ' x '
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(saved).toEqual(['x'])
  })

  it('emits cancelled on Cancel and on Escape, and no text', () => {
    buttons()[1].click()
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancelled).toBe(2)
    expect(saved).toEqual([])
  })

  it('emits nothing when it loses focus', () => {
    input().value = 'changed'
    input().dispatchEvent(new FocusEvent('blur'))
    input().dispatchEvent(new FocusEvent('focusout'))
    expect(saved).toEqual([])
    expect(cancelled).toBe(0)
  })
})
