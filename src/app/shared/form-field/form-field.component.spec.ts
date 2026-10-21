import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { TranslationService } from '@services/translation.service'
import { FormFieldComponent } from './form-field.component'

@Component({
  standalone: true,
  imports: [FormFieldComponent],
  template: `
    <app-form-field label="name" forId="x" [error]="error" [hint]="hint" [layout]="layout">
      <input id="x" class="c-input" />
    </app-form-field>
  `
})
class HostComponent {
  error: string | null = null
  hint: string | null = null
  layout: 'default' | 'full' = 'default'
}

describe('FormFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => `T:${k}` } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
  })

  it('links the label to the projected control', () => {
    const label = el().querySelector('label') as HTMLLabelElement
    expect(label.getAttribute('for')).toBe('x')
    expect(el().querySelector('input#x')).not.toBeNull()
  })

  it('shows the error only when one is set', () => {
    expect(el().querySelector('.c-field-error')).toBeNull()
    fixture = TestBed.createComponent(HostComponent)
    fixture.componentInstance.error = 'field_name_required'
    fixture.detectChanges()
    const err = el().querySelector('.c-field-error')
    expect(err?.textContent).toContain('T:field_name_required')
    expect(err?.getAttribute('role')).toBe('alert')
  })

  it('shows a hint and the full layout class', () => {
    fixture = TestBed.createComponent(HostComponent)
    fixture.componentInstance.hint = 'some_hint'
    fixture.componentInstance.layout = 'full'
    fixture.detectChanges()
    expect(el().querySelector('.form-field__hint')).not.toBeNull()
    const host = fixture.debugElement.query(By.directive(FormFieldComponent)).nativeElement as HTMLElement
    expect(host.classList).toContain('form-field--full')
  })
})
