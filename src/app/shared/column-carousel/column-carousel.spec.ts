import { Component, viewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { COLUMN_CAROUSEL, ColumnCarouselGroupDirective } from './index'
import { swipeDirection } from './column-carousel-swipe'

@Component({
  standalone: true,
  imports: [...COLUMN_CAROUSEL],
  template: `
    <div columnCarouselGroup #group="columnCarouselGroup" dir="rtl">
      <app-column-carousel-header>
        <div columnSlide label="a">A</div>
        <div columnSlide label="b">B</div>
        <div columnSlide label="c">C</div>
      </app-column-carousel-header>
      @for (row of rows; track row) {
        <app-column-carousel-cell>
          <div columnSlide label="a">{{ row }}-a</div>
          <div columnSlide label="b">{{ row }}-b</div>
          <div columnSlide label="c">{{ row }}-c</div>
        </app-column-carousel-cell>
      }
    </div>
  `
})
class HostComponent {
  readonly rows = [1, 2]
  readonly group = viewChild.required<ColumnCarouselGroupDirective>('group')
}

describe('Column carousel (plan 349)', () => {
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

  const activeTexts = (): string[] =>
    fixture.debugElement
      .queryAll(By.css('.column-slide--active'))
      .map((d) => (d.nativeElement as HTMLElement).textContent?.trim() ?? '')

  it('header and every cell share one index', () => {
    expect(fixture.componentInstance.group().count()).toBe(3)
    expect(activeTexts()).toEqual(['A', '1-a', '2-a'])
    fixture.componentInstance.group().next()
    fixture.detectChanges()
    expect(activeTexts()).toEqual(['B', '1-b', '2-b'])
  })

  it('next wraps to the first, prev wraps to the last', () => {
    const group = fixture.componentInstance.group()
    group.go(2)
    group.next()
    expect(group.index()).toBe(0)
    group.prev()
    expect(group.index()).toBe(2)
  })

  it('a cell arrow moves the whole list', () => {
    const nextArrow = fixture.debugElement.query(By.css('app-column-carousel-cell .cc-arrow--next'))
      .nativeElement as HTMLElement
    nextArrow.click()
    fixture.detectChanges()
    expect(activeTexts()).toEqual(['B', '1-b', '2-b'])
  })

  it('header shows the active label and one dot per column', () => {
    fixture.componentInstance.group().go(1)
    fixture.detectChanges()
    const label = fixture.debugElement.query(By.css('.cc-header-label')).nativeElement as HTMLElement
    expect(label.textContent?.trim()).toBe('b')
    expect(fixture.debugElement.queryAll(By.css('.cc-dot')).length).toBe(3)
    expect(fixture.debugElement.query(By.css('.cc-dot.is-active'))).not.toBeNull()
  })
})

describe('swipeDirection', () => {
  it('ignores short and mostly-vertical moves', () => {
    expect(swipeDirection({ x: 100, y: 100 }, 120, 100, true)).toBeNull()
    expect(swipeDirection({ x: 100, y: 100 }, 160, 200, true)).toBeNull()
  })

  it('is RTL-aware: dragging right goes next in RTL, previous in LTR', () => {
    expect(swipeDirection({ x: 100, y: 100 }, 160, 105, true)).toBe('next')
    expect(swipeDirection({ x: 100, y: 100 }, 40, 105, true)).toBe('prev')
    expect(swipeDirection({ x: 100, y: 100 }, 160, 105, false)).toBe('prev')
    expect(swipeDirection({ x: 100, y: 100 }, 40, 105, false)).toBe('next')
  })
})
