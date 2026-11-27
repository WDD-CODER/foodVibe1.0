import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { NutritionBadgeComponent } from './nutrition-badge.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'

describe('NutritionBadgeComponent (tap, hover and scroll hints, plan 348)', () => {
  let fixture: ComponentFixture<NutritionBadgeComponent>
  let component: NutritionBadgeComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionBadgeComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [provideHttpClient(), provideHttpClientTesting()]
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
    expect(component.shouldShowTooltip_()).toBeTrue()
    expect(component.isPinned_()).toBeTrue()
    expect(tooltip()!.matches(':popover-open')).toBeTrue()
  })

  it('a second tap closes it', () => {
    wrap().click()
    wrap().click()
    expect(component.shouldShowTooltip_()).toBeFalse()
  })

  it('a tap outside closes it', () => {
    wrap().click()
    document.body.click()
    expect(component.shouldShowTooltip_()).toBeFalse()
  })

  it('touch enter/leave do not open it (only the tap does)', () => {
    wrap().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    expect(component.shouldShowTooltip_()).toBeFalse()
  })

  it('mouse hover opens it unpinned and leaving the leaf closes it', () => {
    wrap().dispatchEvent(mouse('pointerenter'))
    expect(component.shouldShowTooltip_()).toBeTrue()
    expect(component.isPinned_()).toBeFalse()
    wrap().dispatchEvent(mouse('pointerleave'))
    expect(component.shouldShowTooltip_()).toBeFalse()
  })

  it('clicking a hover-opened tooltip pins it, so leaving no longer closes it', () => {
    wrap().dispatchEvent(mouse('pointerenter'))
    wrap().click()
    wrap().dispatchEvent(mouse('pointerleave'))
    expect(component.shouldShowTooltip_()).toBeTrue()
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

  describe('plan 763 — the box opens in the same place every time', () => {
    const GAP = 8
    const MARGIN = 8
    const host = (): HTMLElement => fixture.nativeElement as HTMLElement
    const viewW = (): number => document.documentElement.clientWidth
    const viewH = (): number => document.documentElement.clientHeight

    const putBadgeAt = (top: number, left: number): void => {
      Object.assign(host().style, { position: 'fixed', top: `${top}px`, left: `${left}px` })
    }

    /** Opens the box, reads where it sits against the leaf, and closes it again. */
    const openAndMeasure = () => {
      wrap().click()
      fixture.detectChanges()
      const element = tooltip()!
      const box = element.getBoundingClientRect()
      const badge = host().getBoundingClientRect()
      const below = element.classList.contains('nb-tooltip--below')
      const arrowX = box.left + element.clientLeft + parseFloat(element.style.getPropertyValue('--nb-arrow-x'))
      const scroller = element.querySelector<HTMLElement>('.nb-scroll-body')!
      const measured = {
        below,
        gap: below ? box.top - badge.bottom : badge.top - box.bottom,
        offCentre: box.left + box.width / 2 - (badge.left + badge.width / 2),
        arrowOffLeaf: arrowX - (badge.left + badge.width / 2),
        left: box.left,
        right: box.right,
        width: box.width,
        height: box.height,
        capped: element.style.maxHeight !== '',
        hidden: scroller.scrollHeight - scroller.clientHeight,
        truncated: Array.from(element.querySelectorAll<HTMLElement>('.nb-row-label')).filter(
          (label) => label.scrollWidth > label.clientWidth
        ).length
      }
      wrap().click()
      fixture.detectChanges()
      return measured
    }

    afterEach(() => host().removeAttribute('style'))

    it('near the bottom: above the leaf, the standard gap, centred on it, placed from the final size', () => {
      putBadgeAt(viewH() - 40, viewW() / 2)
      const box = openAndMeasure()
      expect(box.below).toBeFalse()
      expect(Math.abs(box.gap - GAP)).toBeLessThanOrEqual(1)
      expect(Math.abs(box.offCentre)).toBeLessThanOrEqual(1)
      expect(Math.abs(box.arrowOffLeaf)).toBeLessThanOrEqual(1)
      // The height used to place it was the content's final one: header, legend, rows and note are all in it.
      expect(box.height).toBeGreaterThan(80)
      if (!box.capped) expect(box.hidden).toBeLessThanOrEqual(0)
    })

    it('near the top (no room above): below the leaf, the same gap, centred on it', () => {
      putBadgeAt(10, viewW() / 2)
      const box = openAndMeasure()
      expect(box.below).toBeTrue()
      expect(Math.abs(box.gap - GAP)).toBeLessThanOrEqual(1)
      expect(Math.abs(box.offCentre)).toBeLessThanOrEqual(1)
      expect(Math.abs(box.arrowOffLeaf)).toBeLessThanOrEqual(1)
    })

    for (const where of ['top', 'bottom'] as const) {
      it(`opening twice on the same badge near the ${where} gives the same place`, () => {
        putBadgeAt(where === 'top' ? 10 : viewH() - 40, viewW() / 2)
        const first = openAndMeasure()
        const second = openAndMeasure()
        expect(second).toEqual(first)
      })
    }

    for (const edge of ['left', 'right'] as const) {
      it(`at the ${edge} screen edge the box is pushed inside and the arrow stays on the leaf`, () => {
        putBadgeAt(viewH() - 40, edge === 'left' ? 0 : viewW() - 18)
        const box = openAndMeasure()
        expect(box.left).toBeGreaterThanOrEqual(MARGIN - 0.5)
        expect(box.right).toBeLessThanOrEqual(viewW() - MARGIN + 0.5)
        expect(Math.abs(box.gap - GAP)).toBeLessThanOrEqual(1)
        expect(Math.abs(box.arrowOffLeaf)).toBeLessThanOrEqual(1)
      })
    }

    it('is as wide as its text: no label is cut off, and a longer figure makes it wider', () => {
      putBadgeAt(viewH() - 40, viewW() / 2)
      const short = openAndMeasure()
      fixture.componentRef.setInput('nutrition', { energyKcal: 1, proteinG: 123456789012345, fatG: 1 })
      fixture.detectChanges()
      const long = openAndMeasure()
      expect(short.truncated).toBe(0)
      expect(long.truncated).toBe(0)
      expect(long.width).toBeGreaterThan(short.width)
    })
  })
})
