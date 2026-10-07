import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { NutritionBadgeComponent } from './nutrition-badge.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('NutritionBadgeComponent (tap positioning, plan 348)', () => {
  let fixture: ComponentFixture<NutritionBadgeComponent>
  let component: NutritionBadgeComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionBadgeComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)]
    }).compileComponents()
    fixture = TestBed.createComponent(NutritionBadgeComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('nutrition', { energyKcal: 150, proteinG: 12, carbsG: 1, fatG: 10 })
    fixture.detectChanges()
  })

  const wrap = (): HTMLElement => fixture.debugElement.query(By.css('.nb-wrap')).nativeElement
  const tooltip = (): HTMLElement | null => document.body.querySelector(':scope > .nb-tooltip')

  function placeHost(top: number): void {
    spyOn(fixture.nativeElement as HTMLElement, 'getBoundingClientRect').and.returnValue(new DOMRect(100, top, 20, 20))
  }

  it('tap opens the tooltip as a direct child of <body>, positioned and height-capped', () => {
    placeHost(window.innerHeight - 40)
    wrap().click()
    expect(component.showTooltip_()).toBeTrue()
    const el = tooltip()
    expect(el).not.toBeNull()
    expect(el!.style.left).not.toBe('')
    expect(el!.style.maxHeight).not.toBe('')
  })

  it('opens below when there is no room above, capped to the viewport height', () => {
    placeHost(10)
    wrap().click()
    expect(component.isBelow_()).toBeTrue()
    expect(parseInt(tooltip()!.style.maxHeight, 10)).toBeLessThanOrEqual(window.innerHeight)
  })

  it('a second tap closes it and removes it from <body>', () => {
    placeHost(300)
    wrap().click()
    wrap().click()
    expect(component.showTooltip_()).toBeFalse()
    expect(tooltip()).toBeNull()
  })

  it('a tap outside closes it', () => {
    placeHost(300)
    wrap().click()
    expect(component.showTooltip_()).toBeTrue()
    document.body.click()
    expect(component.showTooltip_()).toBeFalse()
  })

  it('a click on a hover-opened tooltip pins it instead of closing it', () => {
    placeHost(300)
    wrap().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    expect(component.showTooltip_()).toBeTrue()
    wrap().click()
    expect(component.showTooltip_()).toBeTrue()
  })

  it('shows the down hint only when the content overflows', () => {
    placeHost(300)
    wrap().click()
    const el = tooltip()!
    el.style.maxHeight = '80px'
    component.updateScrollHints()
    expect(component.canScrollDown_()).toBeTrue()
    expect(component.canScrollUp_()).toBeFalse()
  })

  it('destroying the component removes an open tooltip from <body>', () => {
    placeHost(300)
    wrap().click()
    fixture.destroy()
    expect(tooltip()).toBeNull()
  })
})
