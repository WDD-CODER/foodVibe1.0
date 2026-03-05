import {
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  ContentChildren,
  QueryList,
  signal,
  AfterViewInit,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export const CAROUSEL_ACTIVE_CLASS = 'carousel-slide-active';

@Directive({
  selector: '[cellCarouselSlide]',
  standalone: true,
})
export class CellCarouselSlideDirective {
  readonly elementRef = inject(ElementRef);
  readonly label = input<string>('');
}

@Component({
  selector: 'app-cell-carousel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './cell-carousel.component.html',
  styleUrl: './cell-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CellCarouselComponent implements AfterViewInit {
  @ContentChildren(CellCarouselSlideDirective) slides!: QueryList<CellCarouselSlideDirective>;

  /** Two-way: parent controls the active slide; component emits when user changes via prev/next. */
  activeIndex = model<number>(0);

  protected readonly currentIndex = signal(0);

  protected getCurrentLabel(): string {
    const idx = this.currentIndex();
    const list = this.slides?.toArray() ?? [];
    const slide = list[idx];
    return slide?.label() ?? '';
  }

  private updateActiveSlide(): void {
    const list = this.slides?.toArray() ?? [];
    const idx = this.currentIndex();
    list.forEach((slide, i) => {
      const el = slide.elementRef.nativeElement as HTMLElement;
      el.classList.toggle(CAROUSEL_ACTIVE_CLASS, i === idx);
    });
  }

  constructor() {
    effect(() => {
      this.currentIndex();
      this.updateActiveSlide();
    });
    effect(() => {
      const external = this.activeIndex();
      if (external === undefined || external === null) return;
      const list = this.slides?.toArray() ?? [];
      if (list.length === 0) return;
      const max = list.length - 1;
      const clamped = Math.min(max, Math.max(0, external));
      this.currentIndex.set(clamped);
      this.updateActiveSlide();
    });
  }

  ngAfterViewInit(): void {
    this.updateActiveSlide();
    const external = this.activeIndex();
    if (external !== undefined && external !== null) {
      const list = this.slides?.toArray() ?? [];
      const max = Math.max(0, list.length - 1);
      const clamped = Math.min(max, Math.max(0, external));
      this.currentIndex.set(clamped);
      this.updateActiveSlide();
    }
  }

  /** Set active slide by index (e.g. when header "whole column" is used). */
  setActiveIndex(index: number): void {
    const list = this.slides?.toArray() ?? [];
    if (list.length === 0) return;
    const max = list.length - 1;
    const clamped = Math.min(max, Math.max(0, index));
    this.currentIndex.set(clamped);
    this.updateActiveSlide();
  }

  protected next(): void {
    const list = this.slides?.toArray() ?? [];
    if (list.length === 0) return;
    const idx = (this.currentIndex() + 1) % list.length;
    this.currentIndex.set(idx);
    this.activeIndex.set(this.currentIndex());
  }

  protected prev(): void {
    const list = this.slides?.toArray() ?? [];
    if (list.length === 0) return;
    const idx = this.currentIndex() - 1;
    this.currentIndex.set(idx < 0 ? list.length - 1 : idx);
    this.activeIndex.set(this.currentIndex());
  }
}
