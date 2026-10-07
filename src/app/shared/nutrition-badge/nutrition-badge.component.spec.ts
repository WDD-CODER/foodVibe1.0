import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { NutritionBadgeComponent } from './nutrition-badge.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

describe('NutritionBadgeComponent (tap, hover and scroll hints, plan 348)', () => {
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
  const tooltip = (): HTMLElement | null => fixture.nativeElement.querySelector('.nb-tooltip')
  const mouse = (type: string): PointerEvent => new PointerEvent(type, { pointerType: 'mouse' })

  it('a tap opens it pinned, in the top layer', () => {
    wrap().click()
    fixture.detectChanges()
    expect(component.showTooltip_()).toBeTrue()
    expect(component.isPinned_()).toBeTrue()
    expect(tooltip()!.matches(':popover-open')).toBeTrue()
  })

  it('a second tap closes it', () => {
    wrap().click()
    wrap().click()
    expect(component.showTooltip_()).toBeFalse()
  })

  it('a tap outside closes it', () => {
    wrap().click()
    document.body.click()
    expect(component.showTooltip_()).toBeFalse()
  })

  it('touch enter/leave do not open it (only the tap does)', () => {
    wrap().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    expect(component.showTooltip_()).toBeFalse()
  })

  it('mouse hover opens it unpinned and leaving the leaf closes it', () => {
    wrap().dispatchEvent(mouse('pointerenter'))
    expect(component.showTooltip_()).toBeTrue()
    expect(component.isPinned_()).toBeFalse()
    wrap().dispatchEvent(mouse('pointerleave'))
    expect(component.showTooltip_()).toBeFalse()
  })

  it('clicking a hover-opened tooltip pins it, so leaving no longer closes it', () => {
    wrap().dispatchEvent(mouse('pointerenter'))
    wrap().click()
    wrap().dispatchEvent(mouse('pointerleave'))
    expect(component.showTooltip_()).toBeTrue()
    expect(component.isPinned_()).toBeTrue()
  })

  it('shows the down hint only when the content overflows', () => {
    wrap().click()
    fixture.detectChanges()
    tooltip()!.style.maxHeight = '80px'
    component.updateScrollHints()
    expect(component.canScrollDown_()).toBeTrue()
    expect(component.canScrollUp_()).toBeFalse()
  })
})
