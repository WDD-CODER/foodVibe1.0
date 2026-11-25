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
    <div appColumnCarouselGroup #group="columnCarouselGroup" dir="rtl">
      <app-column-carousel-header>
        <div appColumnSlide label="a">A</div>
        <div appColumnSlide label="b">B</div>
        <div appColumnSlide label="c">C</div>
      </app-column-carousel-header>
      @for (row of rows; track row) {
        <app-column-carousel-cell>
          <div appColumnSlide label="a">{{ row }}-a</div>
          <div appColumnSlide label="b">{{ row }}-b</div>
          <div appColumnSlide label="c">{{ row }}-c</div>
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

  it('a header arrow moves the whole list; rows have no arrows of their own', () => {
    expect(fixture.debugElement.query(By.css('app-column-carousel-cell .cc-arrow'))).toBeNull()
    const nextArrow = fixture.debugElement.query(By.css('app-column-carousel-header .cc-arrow--next'))
      .nativeElement as HTMLElement
    nextArrow.click()
    fixture.detectChanges()
    expect(activeTexts()).toEqual(['B', '1-b', '2-b'])
  })

  it('header names the active column for screen readers and shows one dot per column', () => {
    fixture.componentInstance.group().go(1)
    fixture.detectChanges()
    const header = fixture.debugElement.query(By.css('.cc-header')).nativeElement as HTMLElement
    expect(header.getAttribute('aria-label')).toBe('b')
    expect(fixture.debugElement.query(By.css('.cc-header-label'))).toBeNull()
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

@Component({
  standalone: true,
  imports: [...COLUMN_CAROUSEL],
  template: `
    <div appColumnCarouselGroup #group="columnCarouselGroup" dir="rtl">
      <app-column-carousel-header>
        <div class="h-a" *appFallColumn="'a'; label: 'la'">HA</div>
        <div class="h-b" *appFallColumn="'b'; label: 'lb'">HB</div>
        <div class="h-c" *appFallColumn="'c'; label: 'lc'">HC</div>
      </app-column-carousel-header>
      <app-column-carousel-cell>
        <div class="v-a" *appFallColumn="'a'; label: 'la'">VA</div>
        <div class="v-b" *appFallColumn="'b'; label: 'lb'">VB</div>
        <div class="v-c" *appFallColumn="'c'; label: 'lc'">VC</div>
      </app-column-carousel-cell>
    </div>
  `
})
class MeasuredHostComponent {
  readonly group = viewChild.required<ColumnCarouselGroupDirective>('group')
}

describe('Column carousel — measured mode (plan 745)', () => {
  let fixture: ComponentFixture<MeasuredHostComponent>

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [MeasuredHostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(MeasuredHostComponent)
    fixture.componentInstance.group().collapsed.set([])
    fixture.detectChanges()
  })

  const q = (css: string): HTMLElement | null => fixture.nativeElement.querySelector(css)

  it('nothing collapsed → every column is its own cell, no arrows', () => {
    expect(q('.v-a')).not.toBeNull()
    expect(q('.v-b')).not.toBeNull()
    expect(q('.v-c')).not.toBeNull()
    expect(q('.cc-arrow')).toBeNull()
    expect(q('.cc-box')).toBeNull()
  })

  it('collapsed columns share one switching cell, in list order, and the arrow cycles them', () => {
    const group = fixture.componentInstance.group()
    group.collapsed.set(['c', 'b'])
    fixture.detectChanges()
    expect(q('.v-a')?.closest('.cc-box')).toBeNull()
    expect(q('app-column-carousel-cell .cc-box .v-c')).not.toBeNull()
    expect(q('app-column-carousel-cell .v-b')).toBeNull()
    expect(q('app-column-carousel-cell .cc-cell-label-text')?.textContent?.trim()).toBe('lc')
    expect(q('.cc-header')?.getAttribute('aria-label')).toBe('lc')
    ;(q('.cc-arrow--next') as HTMLElement).click()
    fixture.detectChanges()
    expect(q('app-column-carousel-cell .cc-box .v-b')).not.toBeNull()
    expect(q('.cc-header')?.getAttribute('aria-label')).toBe('lb')
    expect(group.count()).toBe(2)
  })
})
