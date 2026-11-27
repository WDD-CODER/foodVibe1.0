import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { CounterComponent } from 'src/app/shared/counter/counter.component'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { ListRowCheckboxComponent } from 'src/app/shared/list-selection/list-row-checkbox.component'
import { ApproveStampComponent } from 'src/app/shared/approve-stamp/approve-stamp.component'
import { RatingStarsComponent } from 'src/app/shared/rating-stars/rating-stars.component'
import { DateFieldComponent } from 'src/app/shared/date-field/date-field.component'
import { mockTooltipMode } from './tooltip-mode.testing'

@Component({
  standalone: true,
  imports: [
    CounterComponent,
    CustomSelectComponent,
    ListRowCheckboxComponent,
    ApproveStampComponent,
    RatingStarsComponent,
    DateFieldComponent
  ],
  template: `
    <app-counter [value]="5" [disabledWhy]="why()" />
    <app-custom-select [options]="options" [disabledWhy]="why()" />
    <app-list-row-checkbox [disabledWhy]="why()" (toggle)="toggles = toggles + 1" />
    <app-approve-stamp [disabledWhy]="why()" (approve)="approvals = approvals + 1" />
    <app-rating-stars [readonly]="false" [disabledWhy]="why()" (ratingChange)="rating = $event" />
    <app-date-field [disabledWhy]="why()" />
  `
})
class HostComponent {
  readonly why = signal<string | null>('no permission')
  readonly options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ]
  toggles = 0
  approvals = 0
  rating = 0
}

// Plan 747 (G6.3): a shared control that is disabled by its caller for a reason hands the reason to its inner control.
describe('disabledWhy on the shared controls (plan 747)', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  const q = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector)
  const all = <T extends HTMLElement = HTMLElement>(selector: string): T[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector))
  const box = (): HTMLElement | null => document.body.querySelector('.c-tooltip')
  const enable = (): void => {
    host.why.set(null)
    fixture.detectChanges()
  }

  beforeEach(async () => {
    // Plan 762: a click shows the reason only on a screen where a tap does.
    mockTooltipMode('no-hover')
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  afterEach(() => {
    fixture.destroy()
    document.body.querySelectorAll('.c-tooltip').forEach((n) => n.remove())
  })

  it('the counter: both buttons say why and are not natively disabled; the value is read-only', () => {
    const buttons = all<HTMLButtonElement>('app-counter .ctrl-btn')
    expect(buttons.length).toBe(2)
    for (const button of buttons) {
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.disabled).toBeFalse()
    }
    expect(q<HTMLInputElement>('app-counter .value-input').readOnly).toBeTrue()
    buttons[1].click()
    expect(box()?.textContent?.trim()).toBe('no permission')
    enable()
    expect(buttons[1].hasAttribute('aria-disabled')).toBeFalse()
    expect(buttons[1].disabled).toBeFalse()
    expect(q<HTMLInputElement>('app-counter .value-input').readOnly).toBeFalse()
  })

  it('the select: a click shows the reason and does not open the list; without a reason it opens', () => {
    const trigger = q<HTMLButtonElement>('app-custom-select .custom-select-trigger')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.disabled).toBeFalse()
    trigger.click()
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(box()?.textContent?.trim()).toBe('no permission')
    enable()
    trigger.click()
    fixture.detectChanges()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('the row checkbox: a click does not toggle with a reason and toggles without', () => {
    const wrap = q('app-list-row-checkbox .list-row-checkbox')
    expect(wrap.getAttribute('aria-disabled')).toBe('true')
    wrap.click()
    expect(box()?.textContent?.trim()).toBe('no permission')
    // A click on the box itself is blocked too (a second click only closes the open tooltip).
    q<HTMLInputElement>('app-list-row-checkbox input').click()
    expect(host.toggles).toBe(0)
    enable()
    wrap.click()
    expect(host.toggles).toBe(1)
  })

  it('the approve stamp: a click does not approve with a reason and approves without', () => {
    const stamp = q<HTMLButtonElement>('app-approve-stamp .approve-stamp')
    expect(stamp.getAttribute('aria-disabled')).toBe('true')
    expect(stamp.disabled).toBeFalse()
    stamp.click()
    expect(host.approvals).toBe(0)
    enable()
    stamp.click()
    expect(host.approvals).toBe(1)
  })

  it('the rating stars: a click does not rate with a reason and rates without', () => {
    const star = q<HTMLButtonElement>('app-rating-stars .rating-stars__star')
    expect(star.getAttribute('aria-disabled')).toBe('true')
    expect(star.disabled).toBeFalse()
    star.click()
    expect(host.rating).toBe(0)
    enable()
    star.click()
    expect(host.rating).toBe(1)
  })

  it('the date field: its text box is read-only and says why; without a reason it can be typed in', () => {
    const text = q<HTMLInputElement>('app-date-field .date-field-text')
    expect(text.readOnly).toBeTrue()
    expect(text.disabled).toBeFalse()
    expect(text.getAttribute('aria-disabled')).toBe('true')
    enable()
    expect(text.hasAttribute('aria-disabled')).toBeFalse()
  })
})
