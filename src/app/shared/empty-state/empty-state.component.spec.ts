import { importProvidersFrom } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule, icons } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { EmptyStateComponent } from './empty-state.component'

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
      providers: [
        importProvidersFrom(LucideAngularModule.pick({ ...icons })),
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(EmptyStateComponent)
    fixture.componentRef.setInput('messageKey', 'recipes')
    fixture.componentRef.setInput('icon', 'inbox')
  })

  const root = (): HTMLElement => fixture.nativeElement.querySelector('.c-empty-state')
  const iconSize = (): string | null =>
    fixture.nativeElement.querySelector('.c-empty-state__icon svg')?.getAttribute('width') ?? null

  it('is the normal size when compact is false', () => {
    fixture.detectChanges()
    expect(root()).toBeTruthy()
    expect(root().classList.contains('c-empty-state--compact')).toBe(false)
    expect(iconSize()).toBe('48')
  })

  it('adds the compact class and a 24 px icon when compact is true', () => {
    fixture.componentRef.setInput('compact', true)
    fixture.detectChanges()
    expect(root().classList.contains('c-empty-state--compact')).toBe(true)
    expect(iconSize()).toBe('24')
  })

  it('renders one primary button that emits ctaClick', () => {
    fixture.componentRef.setInput('ctaLabelKey', 'save')
    fixture.detectChanges()
    const buttons = fixture.nativeElement.querySelectorAll('.c-btn-primary') as NodeListOf<HTMLButtonElement>
    expect(buttons.length).toBe(1)
    let clicks = 0
    fixture.componentInstance.ctaClick.subscribe(() => clicks++)
    buttons[0].click()
    expect(clicks).toBe(1)
  })
})
