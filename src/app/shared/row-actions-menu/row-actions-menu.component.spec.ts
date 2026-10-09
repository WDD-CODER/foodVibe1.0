import { Component, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { RowActionsMenuComponent } from './row-actions-menu.component'

@Component({
  standalone: true,
  imports: [RowActionsMenuComponent],
  template: `
    <div dir="rtl">
      <button type="button" class="anchor" style="position: fixed; top: 300px; left: 100px; width: 80px; height: 30px">
        chip
      </button>
      <button type="button" class="edge-anchor" style="position: fixed; top: 2px; left: 2px; width: 10px; height: 20px">
        edge
      </button>
      <app-row-actions-menu [anchored]="anchored">
        <button type="button" class="menu-action" style="width: 120px; height: 30px">act</button>
      </app-row-actions-menu>
    </div>
  `
})
class HostComponent {
  anchored = true
  readonly menu = viewChild.required(RowActionsMenuComponent)
}

describe('RowActionsMenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  const popover = (): HTMLElement => fixture.nativeElement.querySelector('.ram-popover') as HTMLElement
  const anchor = (cls: string): HTMLElement => fixture.nativeElement.querySelector(cls) as HTMLElement

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)]
    }).compileComponents()

    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    // Attaches the view to ApplicationRef so afterNextRender (the anchored placement) runs.
    fixture.autoDetectChanges()
  })

  it('anchored mode renders no ⋮ trigger and starts closed', () => {
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('.ram-trigger')).toBeNull()
    expect(popover().classList).not.toContain('is-open')
  })

  it('non-anchored mode keeps the ⋮ trigger', () => {
    host.anchored = false
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('.ram-trigger')).toBeTruthy()
  })

  it('open(anchor) shows the popover aligned to the anchor inline-start (RTL right edge), above it', async () => {
    fixture.detectChanges()
    const a = anchor('.anchor')
    host.menu().open(a)
    fixture.detectChanges()
    await fixture.whenStable()

    const pop = popover()
    expect(pop.classList).toContain('is-open')
    expect(pop.style.visibility).toBe('')
    const popRect = pop.getBoundingClientRect()
    const aRect = a.getBoundingClientRect()
    expect(Math.round(popRect.right)).toBe(Math.round(aRect.right))
    expect(popRect.bottom).toBeLessThanOrEqual(aRect.top)
  })

  it('open(anchor) clamps inside the viewport and drops below when there is no room above', async () => {
    fixture.detectChanges()
    const a = anchor('.edge-anchor')
    host.menu().open(a)
    fixture.detectChanges()
    await fixture.whenStable()

    const popRect = popover().getBoundingClientRect()
    expect(popRect.left).toBeGreaterThanOrEqual(8)
    expect(popRect.top).toBeGreaterThanOrEqual(a.getBoundingClientRect().bottom)
  })

  it('a click outside closes it; a click on the anchor or inside the popover does not', () => {
    fixture.detectChanges()
    const a = anchor('.anchor')
    host.menu().open(a)
    fixture.detectChanges()

    a.click()
    ;(fixture.nativeElement.querySelector('.menu-action') as HTMLElement).click()
    fixture.detectChanges()
    expect(popover().classList).toContain('is-open')

    anchor('.edge-anchor').click()
    fixture.detectChanges()
    expect(popover().classList).not.toContain('is-open')
  })

  it('row mode: ⋮ opens the popover in the top layer; a click outside closes it', () => {
    host.anchored = false
    fixture.detectChanges()
    ;(fixture.nativeElement.querySelector('.ram-trigger') as HTMLElement).click()
    fixture.detectChanges()
    expect(popover().matches(':popover-open')).toBeTrue()

    anchor('.edge-anchor').click()
    fixture.detectChanges()
    expect(popover().matches(':popover-open')).toBeFalse()
    expect(popover().classList).not.toContain('is-open')
  })

  it('row mode: an action that stops propagation still closes the popover once it has run', async () => {
    host.anchored = false
    fixture.detectChanges()
    ;(fixture.nativeElement.querySelector('.ram-trigger') as HTMLElement).click()
    fixture.detectChanges()

    const action = fixture.nativeElement.querySelector('.menu-action') as HTMLElement
    let ran = false
    action.addEventListener('click', (e) => {
      ran = true
      e.stopPropagation()
    })
    action.click()
    await new Promise((resolve) => setTimeout(resolve))
    fixture.detectChanges()

    expect(ran).toBeTrue()
    expect(popover().matches(':popover-open')).toBeFalse()
  })

  it('row mode: an outside click whose target stops propagation still closes it', () => {
    host.anchored = false
    fixture.detectChanges()
    ;(fixture.nativeElement.querySelector('.ram-trigger') as HTMLElement).click()
    fixture.detectChanges()

    const outside = anchor('.edge-anchor')
    outside.addEventListener('click', (e) => e.stopPropagation())
    outside.click()
    fixture.detectChanges()
    expect(popover().matches(':popover-open')).toBeFalse()
  })

  it('close() and Escape close the popover', async () => {
    fixture.detectChanges()
    host.menu().open(anchor('.anchor'))
    fixture.detectChanges()
    host.menu().close()
    fixture.detectChanges()
    expect(popover().classList).not.toContain('is-open')

    host.menu().open(anchor('.anchor'))
    fixture.detectChanges()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
    expect(popover().classList).not.toContain('is-open')
  })
})

// Plan 362: a list row sits inside .table-area (backdrop-filter + overflow: hidden), which would
// pin and clip a plain position:fixed popover. The ⋮ menu must open in the top layer, placed in
// viewport coordinates next to the trigger, as tall as its row.
@Component({
  standalone: true,
  imports: [RowActionsMenuComponent],
  template: `
    <div
      class="trap"
      style="position: fixed; top: 200px; left: 300px; width: 60px; height: 60px; overflow: hidden; backdrop-filter: blur(4px)"
    >
      <div class="c-list-row" style="height: 40px">
        <app-row-actions-menu>
          <button type="button" class="row-action" style="width: 120px; height: 30px">act</button>
        </app-row-actions-menu>
      </div>
    </div>
  `
})
class TrappedRowHostComponent {}

describe('RowActionsMenuComponent — row inside a containing-block trap (plan 362)', () => {
  let fixture: ComponentFixture<TrappedRowHostComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrappedRowHostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)]
    }).compileComponents()
    fixture = TestBed.createComponent(TrappedRowHostComponent)
    fixture.autoDetectChanges()
  })

  it('⋮ opens the popover in the top layer, placed in viewport px next to the trigger, row-tall', async () => {
    const trigger = fixture.nativeElement.querySelector('.ram-trigger') as HTMLElement
    trigger.click()
    fixture.detectChanges()
    await fixture.whenStable()

    const pop = fixture.nativeElement.querySelector('.ram-popover') as HTMLElement
    expect(pop.matches(':popover-open')).toBeTrue()
    expect(pop.style.visibility).toBe('')
    const top = parseFloat(pop.style.top)
    const left = parseFloat(pop.style.left)
    expect(top).toBeGreaterThanOrEqual(8)
    expect(top).toBeLessThan(window.innerHeight)
    expect(left).toBeGreaterThanOrEqual(8)
    expect(left).toBeLessThan(window.innerWidth)
    expect(pop.style.bottom).toBe('') // no "bottom from the viewport" math left over
    const row = fixture.nativeElement.querySelector('.c-list-row') as HTMLElement
    const rowHeight = row.getBoundingClientRect().height || trigger.getBoundingClientRect().height
    expect(parseFloat(pop.style.minHeight)).toBe(rowHeight + 4) // as tall as its row
  })
})
