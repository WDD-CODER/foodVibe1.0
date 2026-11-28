import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { ScrollRailComponent, normalizedScrollStart } from './scroll-rail.component'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  standalone: true,
  imports: [ScrollRailComponent],
  template: `
    <div [attr.dir]="dir()" style="width: 300px">
      <app-scroll-rail>
        @for (i of items(); track i) {
          <span style="display: inline-block; width: 80px; height: 20px">{{ i }}</span>
        }
      </app-scroll-rail>
    </div>
  `
})
class HostComponent {
  readonly items = signal([1, 2])
  readonly dir = signal<'rtl' | 'ltr'>('rtl')
}

describe('ScrollRailComponent', () => {
  let fixture: ComponentFixture<HostComponent>

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
    // The test window may be narrower than a phone; these cases are about the computer layout.
    ;(rail() as unknown as { phone_: { set(v: boolean): void } }).phone_.set(false)
    fixture.detectChanges()
  })

  const rail = (): ScrollRailComponent =>
    fixture.debugElement.query(By.directive(ScrollRailComponent)).componentInstance
  const arrow = (side: 'prev' | 'next'): HTMLElement =>
    fixture.debugElement.query(By.css(`.sr-arrow--${side}`)).nativeElement
  const scroller = (): HTMLElement => fixture.debugElement.query(By.css('.sr-scroller')).nativeElement

  function refresh(): void {
    rail().update()
    fixture.detectChanges()
  }

  it('hides both arrows when the content fits', () => {
    refresh()
    expect(arrow('prev').classList).toContain('is-hidden')
    expect(arrow('next').classList).toContain('is-hidden')
  })

  it('shows only the "next" arrow at the start of overflowing RTL content', () => {
    fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
    fixture.detectChanges()
    refresh()
    expect(arrow('prev').classList).toContain('is-hidden')
    expect(arrow('next').classList).not.toContain('is-hidden')
  })

  it('shows "prev" once scrolled toward the end (RTL negative scrollLeft)', () => {
    fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
    fixture.detectChanges()
    const el = scroller()
    el.scrollLeft = -(el.scrollWidth - el.clientWidth)
    refresh()
    expect(arrow('prev').classList).not.toContain('is-hidden')
    expect(arrow('next').classList).toContain('is-hidden')
  })

  it('works the same in LTR', () => {
    fixture.componentInstance.dir.set('ltr')
    fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
    fixture.detectChanges()
    refresh()
    expect(arrow('next').classList).not.toContain('is-hidden')
    const el = scroller()
    el.scrollLeft = el.scrollWidth
    refresh()
    expect(arrow('prev').classList).not.toContain('is-hidden')
    expect(arrow('next').classList).toContain('is-hidden')
  })

  const host = (): HTMLElement => fixture.debugElement.query(By.directive(ScrollRailComponent)).nativeElement

  it('does not mark the host overflowing when the content fits', () => {
    refresh()
    expect(host().classList).not.toContain('is-overflowing')
  })

  it('marks an overflowing host, draws the frame and keeps the arrows outside it (plan 747)', () => {
    fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
    fixture.detectChanges()
    refresh()
    fixture.detectChanges()
    const frame = fixture.debugElement.query(By.css('.sr-frame')).nativeElement as HTMLElement
    expect(host().classList).toContain('is-overflowing')
    expect(frame.classList).toContain('has-frame')
    expect(parseFloat(getComputedStyle(frame).paddingInlineStart)).toBeGreaterThan(0)
    const f = frame.getBoundingClientRect()
    for (const side of ['prev', 'next'] as const) {
      const a = arrow(side).getBoundingClientRect()
      expect(a.right <= f.left + 1 || a.left >= f.right - 1).toBeTrue()
    }
  })

  it('makes the container as wide as its items while they fit (plan 747)', () => {
    refresh()
    const frame = fixture.debugElement.query(By.css('.sr-frame')).nativeElement as HTMLElement
    expect(frame.getBoundingClientRect().width).toBeLessThan(250)
  })

  describe('grab and drag (plan 743)', () => {
    const ptr = (type: string, x: number, pointerType = 'mouse'): PointerEvent =>
      new PointerEvent(type, { pointerId: 1, pointerType, button: 0, clientX: x, bubbles: true })

    beforeEach(() => {
      fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
      fixture.detectChanges()
      refresh()
    })

    function trackClicks(): { count: number } {
      const seen = { count: 0 }
      ;(scroller().children[0] as HTMLElement).addEventListener('click', () => seen.count++)
      return seen
    }

    it('moves scrollLeft with a 30px mouse drag and swallows the click that ends it', () => {
      const el = scroller()
      const seen = trackClicks()
      const before = el.scrollLeft
      el.dispatchEvent(ptr('pointerdown', 100))
      el.dispatchEvent(ptr('pointermove', 130))
      expect(el.scrollLeft).not.toBe(before)
      fixture.detectChanges()
      expect(host().classList).toContain('is-dragging')
      el.dispatchEvent(ptr('pointerup', 130))
      fixture.detectChanges()
      expect(host().classList).not.toContain('is-dragging')
      ;(el.children[0] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(seen.count).toBe(0)
    })

    it('does not swallow the click after a 2px press', () => {
      const el = scroller()
      const seen = trackClicks()
      el.dispatchEvent(ptr('pointerdown', 100))
      el.dispatchEvent(ptr('pointermove', 102))
      el.dispatchEvent(ptr('pointerup', 102))
      ;(el.children[0] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(seen.count).toBe(1)
    })

    it('does not track a touch pointer', () => {
      const el = scroller()
      const before = el.scrollLeft
      el.dispatchEvent(ptr('pointerdown', 100, 'touch'))
      el.dispatchEvent(ptr('pointermove', 160, 'touch'))
      expect(el.scrollLeft).toBe(before)
      expect(host().classList).not.toContain('is-dragging')
    })
  })

  describe('phone arrows (plan 743)', () => {
    it('does not render the arrow buttons at phone width (plan 747)', () => {
      fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
      fixture.detectChanges()
      refresh()
      const r = rail() as unknown as { phone_: { set(v: boolean): void } }
      r.phone_.set(true)
      fixture.detectChanges()
      expect(fixture.debugElement.query(By.css('.sr-arrow'))).toBeNull()
      r.phone_.set(false)
      fixture.detectChanges()
      expect(arrow('next').getAttribute('tabindex')).toBeNull()
    })
  })

  describe('the sign of more inside the container (plan 747 round two)', () => {
    const more = (side: 'prev' | 'next'): HTMLElement =>
      fixture.debugElement.query(By.css(`.sr-frame .sr-more--${side}`)).nativeElement
    const setPhone = (value: boolean): void => {
      ;(rail() as unknown as { phone_: { set(v: boolean): void } }).phone_.set(value)
      fixture.detectChanges()
    }

    beforeEach(() => {
      fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
      fixture.detectChanges()
      refresh()
    })

    it('shows no sign while the outside arrow buttons are rendered', () => {
      expect(more('prev').classList).not.toContain('is-shown')
      expect(more('next').classList).not.toContain('is-shown')
    })

    it('shows the sign only on the side that has more at phone width, hidden from assistive tech', () => {
      setPhone(true)
      expect(fixture.debugElement.query(By.css('.sr-arrow'))).toBeNull()
      expect(more('next').classList).toContain('is-shown')
      expect(more('prev').classList).not.toContain('is-shown')
      expect(more('next').getAttribute('aria-hidden')).toBe('true')
      expect(getComputedStyle(more('next')).pointerEvents).toBe('none')
      expect(getComputedStyle(more('prev')).visibility).toBe('hidden')

      const el = scroller()
      el.scrollLeft = -(el.scrollWidth - el.clientWidth)
      refresh()
      expect(more('next').classList).not.toContain('is-shown')
      expect(more('prev').classList).toContain('is-shown')
    })

    it('plan 762: only the side with more shows the sign, as a solid round chevron (the stronger look)', () => {
      setPhone(true)
      const shown = fixture.debugElement.queryAll(By.css('.sr-frame .sr-more.is-shown'))
      expect(shown.length).toBe(1)
      const sign = shown[0].nativeElement as HTMLElement
      expect(sign).toBe(more('next'))
      expect(getComputedStyle(sign).visibility).toBe('visible')
      const badge = sign.querySelector<HTMLElement>('.sr-more__badge')!
      expect(badge).not.toBeNull()
      expect(badge.querySelector('lucide-icon')).not.toBeNull()
      const box = badge.getBoundingClientRect()
      expect(Math.round(box.width)).toBe(Math.round(box.height))
      expect(box.width).toBeGreaterThanOrEqual(24)
      expect(parseFloat(getComputedStyle(badge).borderTopLeftRadius)).toBeGreaterThan(0)
    })

    it('shows no sign when the content fits', () => {
      fixture.componentInstance.items.set([1, 2])
      fixture.detectChanges()
      refresh()
      setPhone(true)
      expect(more('prev').classList).not.toContain('is-shown')
      expect(more('next').classList).not.toContain('is-shown')
    })
  })

  describe('centerChild (plan 468)', () => {
    beforeEach(() => {
      fixture.componentInstance.items.set([1, 2, 3, 4, 5, 6, 7, 8])
      fixture.detectChanges()
      refresh()
    })

    it('asks the browser to centre the child horizontally and not move the page vertically', () => {
      const child = scroller().children[7] as HTMLElement
      const spy = spyOn(child, 'scrollIntoView')
      rail().centerChild(child)
      expect(spy).toHaveBeenCalledTimes(1)
      const opts = spy.calls.mostRecent().args[0] as ScrollIntoViewOptions
      expect(opts.inline).toBe('center')
      expect(opts.block).toBe('nearest')
    })

    it('uses behavior auto with instant: true', () => {
      const child = scroller().children[7] as HTMLElement
      const spy = spyOn(child, 'scrollIntoView')
      rail().centerChild(child, { instant: true })
      expect((spy.calls.mostRecent().args[0] as ScrollIntoViewOptions).behavior).toBe('auto')
    })

    it('puts the fifth of eight children in the middle of a 300 px rail', async () => {
      const child = scroller().children[4] as HTMLElement
      rail().centerChild(child)
      const centred = (): boolean => {
        const r = scroller().getBoundingClientRect()
        const c = child.getBoundingClientRect()
        return Math.abs(c.left + c.width / 2 - (r.left + r.width / 2)) <= 2
      }
      for (let i = 0; i < 60 && !centred(); i++) await new Promise((res) => setTimeout(res, 50))
      expect(centred()).toBeTrue()
    })
  })
})

describe('normalizedScrollStart', () => {
  it('maps RTL negative scrollLeft and LTR positive scrollLeft to distance from the start', () => {
    expect(normalizedScrollStart(0, true)).toBe(0)
    expect(normalizedScrollStart(-120, true)).toBe(120)
    expect(normalizedScrollStart(120, false)).toBe(120)
    expect(normalizedScrollStart(-5, false)).toBe(0)
  })
})
