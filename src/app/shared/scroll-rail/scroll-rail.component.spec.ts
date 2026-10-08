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
  })

  const rail = (): ScrollRailComponent => fixture.debugElement.query(By.directive(ScrollRailComponent)).componentInstance
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
})

describe('normalizedScrollStart', () => {
  it('maps RTL negative scrollLeft and LTR positive scrollLeft to distance from the start', () => {
    expect(normalizedScrollStart(0, true)).toBe(0)
    expect(normalizedScrollStart(-120, true)).toBe(120)
    expect(normalizedScrollStart(120, false)).toBe(120)
    expect(normalizedScrollStart(-5, false)).toBe(0)
  })
})
