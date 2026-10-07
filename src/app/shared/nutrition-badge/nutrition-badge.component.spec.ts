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

  function placeHost(top: number): void {
    spyOn(fixture.nativeElement as HTMLElement, 'getBoundingClientRect').and.returnValue(
      new DOMRect(100, top, 20, 20)
    )
  }

  it('tap opens the tooltip with the same positioning as hover', () => {
    placeHost(window.innerHeight - 40)
    wrap().click()
    fixture.detectChanges()
    expect(component.showTooltip).toBeTrue()
    const style = component.tooltipStyle_()
    expect(style['left']).toBeDefined()
    expect(style['max-height']).toBeDefined()
    expect(fixture.debugElement.query(By.css('.nb-tooltip'))).not.toBeNull()
  })

  it('opens below when there is no room above, capped to the viewport height', () => {
    placeHost(10)
    wrap().click()
    expect(component.isBelow_()).toBeTrue()
    const maxHeight = parseInt(component.tooltipStyle_()['max-height'], 10)
    expect(maxHeight).toBeLessThanOrEqual(window.innerHeight)
  })

  it('a second tap closes it', () => {
    placeHost(300)
    wrap().click()
    wrap().click()
    expect(component.showTooltip).toBeFalse()
  })

  it('a tap outside closes it', () => {
    placeHost(300)
    wrap().click()
    expect(component.showTooltip).toBeTrue()
    document.body.click()
    expect(component.showTooltip).toBeFalse()
  })
})
