import { Component, viewChild } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { OverlayContainer } from '@angular/cdk/overlay'
import { LucideAngularModule } from 'lucide-angular'
import { RowActionsMenuComponent, ROW_ACTIONS_PANEL_CLASS } from './row-actions-menu.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  standalone: true,
  imports: [RowActionsMenuComponent],
  template: `
    <button id="anchor" type="button" style="position: fixed; top: 300px; left: 200px; width: 80px; height: 30px">
      chip
    </button>
    <!-- Mimics .table-area: backdrop-filter makes this the containing block for position:fixed. -->
    <div class="trap" style="backdrop-filter: blur(2px); overflow: hidden; height: 40px">
      <app-row-actions-menu #menu [showTrigger]="false">
        <button type="button" class="action" (click)="clicks = clicks + 1; $event.stopPropagation()">edit</button>
        <button type="button" class="action-disabled" disabled>delete</button>
      </app-row-actions-menu>
    </div>
  `
})
class HostComponent {
  readonly menu = viewChild.required<RowActionsMenuComponent>('menu')
  clicks = 0
}

describe('RowActionsMenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let overlayEl: HTMLElement

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
    overlayEl = TestBed.inject(OverlayContainer).getContainerElement()
  })

  const host = (): HTMLElement => fixture.debugElement.query(By.directive(RowActionsMenuComponent)).nativeElement
  const popover = (): HTMLElement =>
    (overlayEl.querySelector('.ram-popover') ?? host().querySelector('.ram-popover')) as HTMLElement
  const anchor = (): HTMLElement => fixture.debugElement.query(By.css('#anchor')).nativeElement as HTMLElement
  const backdrop = (): HTMLElement | null => overlayEl.querySelector('.cdk-overlay-backdrop')

  function openMenu(): RowActionsMenuComponent {
    const menu = fixture.componentInstance.menu()
    menu.open(anchor())
    fixture.detectChanges()
    return menu
  }

  it('hides the ⋮ trigger when showTrigger is false', () => {
    expect(fixture.debugElement.query(By.css('.ram-trigger'))).toBeNull()
  })

  it('keeps the projected actions hidden in place while closed (no inline desktop buttons)', () => {
    expect(host().contains(popover())).toBeTrue()
    expect(getComputedStyle(popover()).display).toBe('none')
  })

  it('open(anchor) renders the popover at body level, outside the containing-block trap', () => {
    const menu = openMenu()
    expect(menu.opened()).toBeTrue()
    expect(host().classList).toContain('is-anchored')
    const el = popover()
    expect(host().contains(el)).toBeFalse()
    expect(el.closest(`.${ROW_ACTIONS_PANEL_CLASS}`)).not.toBeNull()
    expect(el.classList).toContain('is-open')
    expect(getComputedStyle(el).display).toBe('flex')
  })

  it('places the popover next to the anchor, inside the viewport', () => {
    openMenu()
    const a = anchor().getBoundingClientRect()
    const p = popover().getBoundingClientRect()
    // Default position: centered above the anchor.
    expect(Math.abs(p.left + p.width / 2 - (a.left + a.width / 2))).toBeLessThan(2)
    expect(Math.abs(p.bottom - a.top)).toBeLessThan(4)
    expect(p.top).toBeGreaterThanOrEqual(0)
    expect(p.left).toBeGreaterThanOrEqual(0)
    expect(p.right).toBeLessThanOrEqual(window.innerWidth)
  })

  it('close() returns the popover to the host and hides it again', () => {
    const menu = openMenu()
    menu.close()
    fixture.detectChanges()
    expect(menu.opened()).toBeFalse()
    expect(host().contains(popover())).toBeTrue()
    expect(popover().classList).not.toContain('is-open')
    expect(getComputedStyle(popover()).display).toBe('none')
    expect(backdrop()).toBeNull()
  })

  it('closes on backdrop click and on Escape', () => {
    const menu = openMenu()
    expect(backdrop()).not.toBeNull()
    backdrop()?.click()
    expect(menu.opened()).toBeFalse()

    openMenu()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(menu.opened()).toBeFalse()
  })

  it('runs the action, then closes, even though the action stops propagation', fakeAsync(() => {
    const menu = openMenu()
    const action = overlayEl.querySelector('.action') as HTMLButtonElement
    action.click()
    expect(fixture.componentInstance.clicks).toBe(1)
    tick()
    expect(menu.opened()).toBeFalse()
  }))

  it('stays open when a disabled action is tapped', fakeAsync(() => {
    const menu = openMenu()
    const disabled = overlayEl.querySelector('.action-disabled') as HTMLButtonElement
    disabled.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    tick()
    expect(menu.opened()).toBeTrue()
    menu.close()
  }))
})
