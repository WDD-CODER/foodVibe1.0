import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { DateFieldComponent } from './date-field.component'

@Component({
  standalone: true,
  imports: [DateFieldComponent],
  template: `<app-date-field
    inputId="d"
    [(value)]="iso_"
    [(invalid)]="bad_"
    [disabled]="disabled_()"
    (committed)="commits_.push($event)"
  />`
})
class HostComponent {
  readonly iso_ = signal('')
  readonly bad_ = signal(false)
  readonly disabled_ = signal(false)
  readonly commits_: string[] = []
}

describe('DateFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent
  let el: HTMLElement

  const text = () => el.querySelector<HTMLInputElement>('.date-field-text')!
  const picker = () => el.querySelector<HTMLInputElement>('.date-field-picker')!
  const type = (value: string) => {
    text().value = value
    text().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    el = fixture.nativeElement
    fixture.detectChanges()
  })

  it('shows typed digits as day/month/year and emits the ISO date', () => {
    type('25122026')
    expect(text().value).toBe('25/12/2026')
    expect(host.iso_()).toBe('2026-12-25')
    expect(host.bad_()).toBeFalse()
    expect(el.querySelector('.c-field-error')).toBeNull()
  })

  it('emits nothing while the date is incomplete, without an error', () => {
    type('2512')
    expect(text().value).toBe('25/12')
    expect(host.iso_()).toBe('')
    expect(host.bad_()).toBeFalse()
  })

  it('flags a half-typed date once the user leaves the field', () => {
    type('251226')
    expect(text().value).toBe('25/12/26')
    expect(host.bad_()).toBeFalse()
    text().dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(host.iso_()).toBe('')
    expect(host.bad_()).toBeTrue()
    expect(el.querySelector('.c-field-error')?.textContent).toContain('T:date_invalid')
  })

  it('flags an impossible date and emits nothing', () => {
    type('31022026')
    expect(text().value).toBe('31/02/2026')
    expect(host.iso_()).toBe('')
    expect(host.bad_()).toBeTrue()
    expect(el.querySelector('.c-field-error')?.textContent).toContain('T:date_invalid')
    expect(text().classList).toContain('c-input--invalid')
  })

  it('clears the value and the error when the text is edited back to a partial date', () => {
    type('25122026')
    type('2512202')
    expect(host.iso_()).toBe('')
    expect(host.bad_()).toBeFalse()
  })

  it('writes an outside value into the text', async () => {
    host.iso_.set('2027-01-09')
    fixture.detectChanges()
    await fixture.whenStable()
    expect(text().value).toBe('09/01/2027')
  })

  it('fills the same field from the calendar picker', () => {
    picker().value = '2026-03-04'
    picker().dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(host.iso_()).toBe('2026-03-04')
    expect(text().value).toBe('04/03/2026')
  })

  it('opens the picker from the calendar button', () => {
    const spy = spyOn(picker(), 'showPicker' as never)
    el.querySelector<HTMLButtonElement>('.date-field-btn')!.click()
    expect(spy).toHaveBeenCalled()
  })

  it('commits only when the user finishes, not on every key', () => {
    type('2512')
    text().dispatchEvent(new Event('change'))
    type('25122026')
    expect(host.commits_).toEqual([])
    text().dispatchEvent(new Event('change'))
    type('')
    text().dispatchEvent(new Event('change'))
    picker().value = '2026-03-04'
    picker().dispatchEvent(new Event('change'))
    expect(host.commits_).toEqual(['2026-12-25', '', '2026-03-04'])
  })

  it('disables the text and the button', () => {
    host.disabled_.set(true)
    fixture.detectChanges()
    expect(text().disabled).toBeTrue()
    expect(el.querySelector<HTMLButtonElement>('.date-field-btn')!.disabled).toBeTrue()
  })
})
