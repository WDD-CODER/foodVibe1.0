import { Component, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { RowActionsMenuComponent } from './row-actions-menu.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  standalone: true,
  imports: [RowActionsMenuComponent],
  template: `
    <button id="anchor" type="button" style="position: fixed; top: 300px; left: 200px; width: 80px; height: 30px">
      chip
    </button>
    <app-row-actions-menu #menu [showTrigger]="false">
      <button type="button" class="action">edit</button>
    </app-row-actions-menu>
  `
})
class HostComponent {
  readonly menu = viewChild.required<RowActionsMenuComponent>('menu')
}

describe('RowActionsMenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
  })

  const popover = (): HTMLElement => fixture.debugElement.query(By.css('.ram-popover')).nativeElement
  const host = (): HTMLElement => fixture.debugElement.query(By.directive(RowActionsMenuComponent)).nativeElement

  it('hides the ⋮ trigger when showTrigger is false', () => {
    expect(fixture.debugElement.query(By.css('.ram-trigger'))).toBeNull()
  })

  it('open(anchor) shows the popover anchored to any element, at any width', () => {
    const anchor = fixture.debugElement.query(By.css('#anchor')).nativeElement as HTMLElement
    fixture.componentInstance.menu().open(anchor)
    fixture.detectChanges()
    expect(fixture.componentInstance.menu().opened()).toBeTrue()
    expect(host().classList).toContain('is-anchored')
    expect(popover().classList).toContain('is-open')
    expect(getComputedStyle(popover()).display).toBe('flex')
    expect(popover().style.left).toBe('240px')
  })

  it('keeps the projected actions hidden while closed (no inline desktop buttons)', () => {
    expect(getComputedStyle(popover()).display).toBe('none')
  })

  it('close() hides it again', () => {
    const anchor = fixture.debugElement.query(By.css('#anchor')).nativeElement as HTMLElement
    const menu = fixture.componentInstance.menu()
    menu.open(anchor)
    fixture.detectChanges()
    menu.close()
    fixture.detectChanges()
    expect(menu.opened()).toBeFalse()
    expect(popover().classList).not.toContain('is-open')
    expect(getComputedStyle(popover()).display).toBe('none')
  })

  it('closes on backdrop click and on Escape', () => {
    const anchor = fixture.debugElement.query(By.css('#anchor')).nativeElement as HTMLElement
    const menu = fixture.componentInstance.menu()
    menu.open(anchor)
    fixture.detectChanges()
    const backdrop = fixture.debugElement.query(By.css('.ram-backdrop')).nativeElement as HTMLElement
    backdrop.click()
    expect(menu.opened()).toBeFalse()

    menu.open(anchor)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(menu.opened()).toBeFalse()
  })
})
