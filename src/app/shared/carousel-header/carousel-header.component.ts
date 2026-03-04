import {
  Component,
  Directive,
  ChangeDetectionStrategy,
  input,
  output,
  ContentChildren,
  QueryList,
  signal,
  AfterViewInit,
  effect,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Directive({
  selector: '[carouselHeaderColumn]',
  standalone: true,
})
export class CarouselHeaderColumnDirective {
  readonly label = input<string>('');
}

@Component({
  selector: 'app-carousel-header',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './carousel-header.component.html',
  styleUrl: './carousel-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselHeaderComponent implements AfterViewInit {
  @ContentChildren(CarouselHeaderColumnDirective) columns!: QueryList<CarouselHeaderColumnDirective>;

  readonly activeIndex = input(0);
  readonly activeIndexChange = output<number>();

  protected readonly currentIndex = signal(0);

  constructor() {
    effect(() => {
      this.currentIndex.set(this.activeIndex());
    });
  }

  ngAfterViewInit(): void {
    this.currentIndex.set(this.activeIndex());
  }

  protected getCurrentLabel(): string {
    const list = this.columns?.toArray() ?? [];
    return list[this.currentIndex()]?.label() ?? '';
  }

  protected prev(): void {
    const count = this.columns?.length ?? 0;
    if (count === 0) return;
    const idx = this.currentIndex() - 1;
    this.currentIndex.set(idx < 0 ? count - 1 : idx);
    this.activeIndexChange.emit(this.currentIndex());
  }

  protected next(): void {
    const count = this.columns?.length ?? 0;
    if (count === 0) return;
    this.currentIndex.set((this.currentIndex() + 1) % count);
    this.activeIndexChange.emit(this.currentIndex());
  }
}
