import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ModalShellComponent, ModalShellSize } from './modal-shell.component'

@Component({
  standalone: true,
  imports: [ModalShellComponent],
  template: `
    <button id="opener" type="button">opener</button>
    <input id="next" type="text" />
    @if (open_()) {
      <app-modal-shell
        [size]="size_()"
        [titleKey]="'cancel'"
        [dismissible]="dismissible_()"
        [sheet]="sheet_()"
        (dismissed)="onDismissed()"
      >
        <input id="first" type="text" />
        <button id="last" type="button">ok</button>
      </app-modal-shell>
    }
    @if (secondOpen_()) {
      <app-modal-shell (dismissed)="onSecondDismissed()">
        <p>second</p>
      </app-modal-shell>
    }
  `
})
class HostComponent {
  readonly open_ = signal(true)
  readonly secondOpen_ = signal(false)
  readonly size_ = signal<ModalShellSize>('sm')
  readonly dismissible_ = signal(true)
  readonly sheet_ = signal(false)
  readonly dismissed_ = signal(0)
  readonly secondDismissed_ = signal(0)

  onDismissed(): void {
    this.dismissed_.update((n) => n + 1)
  }

  onSecondDismissed(): void {
    this.secondDismissed_.update((n) => n + 1)
  }
}

function pressEscape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('ModalShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  const query = <T extends HTMLElement>(selector: string): T | null =>
    fixture.nativeElement.querySelector(selector) as T | null

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    document.body.appendChild(fixture.nativeElement)
    fixture.detectChanges()
  })

  afterEach(() => {
    host.open_.set(false)
    host.secondOpen_.set(false)
    fixture.detectChanges()
    fixture.nativeElement.remove()
  })

  it('renders the engine overlay and a labelled dialog card', () => {
    const card = query('.c-modal-overlay > .c-modal-card')
    expect(card).not.toBeNull()
    expect(card!.getAttribute('role')).toBe('dialog')
    expect(card!.getAttribute('aria-modal')).toBe('true')
    const heading = query('.c-modal-card h3')
    expect(heading).not.toBeNull()
    expect(card!.getAttribute('aria-labelledby')).toBe(heading!.id)
  })

  it('applies the size class', () => {
    expect(query('.c-modal-card')!.classList.contains('c-modal-card--md')).toBeFalse()
    host.size_.set('md')
    fixture.detectChanges()
    expect(query('.c-modal-card')!.classList.contains('c-modal-card--md')).toBeTrue()
    host.size_.set('fluid')
    fixture.detectChanges()
    expect(query('.c-modal-card')!.classList.contains('c-modal-card--fluid')).toBeTrue()
  })

  it('sheet=true adds the phone bottom-sheet helpers, the default adds neither (plan 487)', () => {
    expect(query('.c-modal-overlay')!.classList.contains('m-sheet')).toBeFalse()
    expect(query('.c-modal-card')!.classList.contains('m-sheet-card')).toBeFalse()
    host.sheet_.set(true)
    fixture.detectChanges()
    expect(query('.c-modal-overlay')!.classList.contains('m-sheet')).toBeTrue()
    expect(query('.c-modal-card')!.classList.contains('m-sheet-card')).toBeTrue()
    expect(query('.c-modal-card')!.classList.contains('c-modal-card')).toBeTrue()
  })

  it('Escape emits dismissed once', () => {
    pressEscape()
    expect(host.dismissed_()).toBe(1)
  })

  it('a backdrop click emits dismissed, a click inside the card does not', () => {
    query('.c-modal-card')!.click()
    expect(host.dismissed_()).toBe(0)
    query('.c-modal-overlay')!.click()
    expect(host.dismissed_()).toBe(1)
  })

  it('does nothing on Escape or backdrop click while not dismissible', () => {
    host.dismissible_.set(false)
    fixture.detectChanges()
    pressEscape()
    query('.c-modal-overlay')!.click()
    expect(host.dismissed_()).toBe(0)
  })

  it('Escape only closes the top-most shell', () => {
    host.secondOpen_.set(true)
    fixture.detectChanges()
    pressEscape()
    expect(host.secondDismissed_()).toBe(1)
    expect(host.dismissed_()).toBe(0)
    host.secondOpen_.set(false)
    fixture.detectChanges()
    pressEscape()
    expect(host.dismissed_()).toBe(1)
  })

  it('moves focus into the card on open and back to the opener on close', async () => {
    host.open_.set(false)
    fixture.detectChanges()
    const opener = query<HTMLButtonElement>('#opener')!
    opener.focus()
    host.open_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    expect(query('.c-modal-card')!.contains(document.activeElement)).toBeTrue()
    host.open_.set(false)
    fixture.detectChanges()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps focus where the caller moved it before the popup closed', async () => {
    host.open_.set(false)
    fixture.detectChanges()
    const opener = query<HTMLButtonElement>('#opener')!
    const next = query<HTMLInputElement>('#next')!
    opener.focus()
    host.open_.set(true)
    fixture.detectChanges()
    await fixture.whenStable()
    next.focus()
    host.open_.set(false)
    fixture.detectChanges()
    expect(document.activeElement).toBe(next)
  })

  it('Tab on the last field wraps to the first, Shift+Tab on the first wraps to the last', () => {
    const first = query<HTMLInputElement>('#first')!
    const last = query<HTMLButtonElement>('#last')!
    spyOnProperty(first, 'offsetParent').and.returnValue(document.body)
    spyOnProperty(last, 'offsetParent').and.returnValue(document.body)
    last.focus()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    last.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBeTrue()
    expect(document.activeElement).toBe(first)
    const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    first.dispatchEvent(shiftTab)
    expect(shiftTab.defaultPrevented).toBeTrue()
    expect(document.activeElement).toBe(last)
  })
})
