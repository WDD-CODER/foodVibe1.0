import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { TimeFieldComponent } from './time-field.component'

@Component({
  standalone: true,
  imports: [TimeFieldComponent],
  template: `<app-time-field
    inputId="t"
    [(value)]="hm_"
    [(invalid)]="bad_"
    [flagged]="flagged_()"
    [disabled]="disabled_()"
    (committed)="commits_.push($event)"
  />`
})
class HostComponent {
  readonly hm_ = signal('')
  readonly bad_ = signal(false)
  readonly flagged_ = signal(false)
  readonly disabled_ = signal(false)
  readonly commits_: string[] = []
}

describe('TimeFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent
  let el: HTMLElement

  const text = () => el.querySelector<HTMLInputElement>('.time-field-text')!
  const picker = () => el.querySelector<HTMLInputElement>('.time-field-picker')!
  const type = (value: string) => {
    text().value = value
    text().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  const create = async (coarse: boolean) => {
    const fake = (query: string) => ({ matches: coarse && query.includes('coarse'), media: query }) as MediaQueryList
    if (jasmine.isSpy(window.matchMedia)) (window.matchMedia as jasmine.Spy).and.callFake(fake)
    else spyOn(window, 'matchMedia').and.callFake(fake)
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    el = fixture.nativeElement
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await create(false)
  })

  it('shows typed digits as hh:mm and sets the value', () => {
    type('0830')
    expect(text().value).toBe('08:30')
    expect(host.hm_()).toBe('08:30')
    expect(host.bad_()).toBeFalse()
  })

  it('keeps a half-typed time empty without an error until the user leaves', () => {
    type('830')
    expect(text().value).toBe('830')
    expect(host.hm_()).toBe('')
    expect(host.bad_()).toBeFalse()
    text().dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(host.bad_()).toBeTrue()
    expect(el.querySelector('.c-field-error')?.textContent).toContain('T:time_invalid')
  })

  it('flags an impossible time on leaving', () => {
    type('2500')
    text().dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(host.hm_()).toBe('')
    expect(host.bad_()).toBeTrue()
  })

  it('a pick sets the value and clears invalid', () => {
    host.bad_.set(true)
    fixture.detectChanges()
    picker().value = '18:45'
    picker().dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(host.hm_()).toBe('18:45')
    expect(host.bad_()).toBeFalse()
    expect(text().value).toBe('18:45')
    expect(host.commits_).toEqual(['18:45'])
  })

  it('writes an outside value into the text', async () => {
    host.hm_.set('07:05')
    fixture.detectChanges()
    await fixture.whenStable()
    expect(text().value).toBe('07:05')
  })

  it('opens the browser picker on a fine pointer click', () => {
    const spy = spyOn(picker(), 'showPicker' as never)
    text().click()
    expect(spy).toHaveBeenCalled()
  })

  it('flagged marks the field red without the message', () => {
    host.flagged_.set(true)
    fixture.detectChanges()
    expect(text().classList).toContain('c-input--invalid')
    expect(text().getAttribute('aria-invalid')).toBe('true')
    expect(el.querySelector('.c-field-error')).toBeNull()
  })

  it('disables the text and the native picker', () => {
    host.disabled_.set(true)
    fixture.detectChanges()
    expect(text().disabled).toBeTrue()
    expect(picker().disabled).toBeTrue()
  })

  describe('on a coarse pointer (phone)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule()
    })
    beforeEach(async () => {
      await create(true)
    })

    it('covers the field with the native input and makes the text display-only', () => {
      expect(picker().classList).toContain('time-field-picker--touch')
      expect(picker().id).toBe('t')
      expect(text().readOnly).toBeTrue()
    })

    it('does not call showPicker on a tap', () => {
      const spy = spyOn(picker(), 'showPicker' as never)
      text().click()
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
