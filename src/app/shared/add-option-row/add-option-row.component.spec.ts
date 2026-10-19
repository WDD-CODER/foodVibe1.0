import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AddOptionRowComponent } from './add-option-row.component'
import { TranslationService } from '@services/translation.service'

describe('AddOptionRowComponent', () => {
  let fixture: ComponentFixture<AddOptionRowComponent>
  const dict: Record<string, string> = { add: 'הוסף', add_new_category: 'הוסף קטגוריה חדשה' }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddOptionRowComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => dict[k] ?? k } }]
    }).compileComponents()
    fixture = TestBed.createComponent(AddOptionRowComponent)
  })

  function text(): string {
    return (fixture.nativeElement as HTMLElement).querySelector('.add-option-row__text')?.textContent?.trim() ?? ''
  }

  it('shows the typed name in quotes', () => {
    fixture.componentRef.setInput('label', { kind: 'typed', text: 'פרווה' })
    fixture.detectChanges()
    expect(text()).toBe('הוסף "פרווה"')
  })

  it('shows the generic key translated, never bare "add"', () => {
    fixture.componentRef.setInput('label', { kind: 'generic', key: 'add_new_category' })
    fixture.detectChanges()
    expect(text()).toBe('הוסף קטגוריה חדשה')
  })
})
