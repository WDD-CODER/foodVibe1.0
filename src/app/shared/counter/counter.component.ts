import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import {
  quantityIncrement,
  quantityDecrement,
  QuantityStepOptions,
} from 'src/app/core/utils/quantity-step.util';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule, SelectOnFocusDirective, TranslatePipe],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.scss',
})
export class CounterComponent implements AfterViewChecked, OnDestroy {
  // INPUTS
  value = input.required<number>();
  min = input<number>(0);
  max = input<number | undefined>(undefined);
  stepOptions = input<QuantityStepOptions | undefined>(undefined);
  disabled = input<boolean>(false);

  // OUTPUTS
  valueChange = output<number>();

  // SIGNALS
  private valueWidth_ = signal(0);
  protected inputValue_ = signal<string>('');

  // COMPUTED
  protected displayValue_ = computed(() => {
    const v = this.value();
    if (!Number.isFinite(v)) return '0';
    const opts = this.stepOptions();
    if (opts?.integerOnly) return String(Math.round(v));
    const s = String(v);
    if (s.includes('.')) return s;
    return String(Number(v));
  });

  protected minVal_ = computed(() => this.min() ?? 0);
  protected maxVal_ = computed(() => this.max());

  protected minusDisabled_ = computed(() => {
    if (this.disabled()) return true;
    const current = this.value();
    const minV = this.minVal_();
    return !(current > minV);
  });

  protected plusDisabled_ = computed(() => {
    if (this.disabled()) return true;
    const maxV = this.maxVal_();
    if (maxV == null) return false;
    return this.value() >= maxV;
  });

  protected valueWidthPx_ = computed(() => {
    const w = this.valueWidth_();
    return w > 0 ? w : undefined;
  });

  @ViewChild('mirrorSpan') mirrorSpan?: ElementRef<HTMLSpanElement>;
  @ViewChild('valueInput') valueInput?: ElementRef<HTMLInputElement>;

  private repeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private repeatIntervalId: ReturnType<typeof setInterval> | null = null;

  private static readonly REPEAT_DELAY_MS = 400;
  private static readonly REPEAT_INTERVAL_MS = 80;

  constructor() {
    effect(() => {
      this.displayValue_();
      this.inputValue_();
      this.value();
    });
  }

  ngAfterViewChecked(): void {
    this.measureValueWidth();
  }

  ngOnDestroy(): void {
    this.stopRepeat();
  }

  protected onPlusMouseDown(): void {
    if (this.plusDisabled_()) return;
    this.stopRepeat();
    this.increment(false);
    this.repeatTimeoutId = setTimeout(() => {
      this.repeatTimeoutId = null;
      this.repeatIntervalId = setInterval(() => this.increment(true), CounterComponent.REPEAT_INTERVAL_MS);
    }, CounterComponent.REPEAT_DELAY_MS);
  }

  protected onMinusMouseDown(): void {
    if (this.minusDisabled_()) return;
    this.stopRepeat();
    this.decrement(false);
    this.repeatTimeoutId = setTimeout(() => {
      this.repeatTimeoutId = null;
      this.repeatIntervalId = setInterval(() => this.decrement(true), CounterComponent.REPEAT_INTERVAL_MS);
    }, CounterComponent.REPEAT_DELAY_MS);
  }

  protected onCtrlMouseUp(): void {
    this.stopRepeat();
  }

  protected onCtrlMouseLeave(): void {
    this.stopRepeat();
  }

  private stopRepeat(): void {
    if (this.repeatTimeoutId != null) {
      clearTimeout(this.repeatTimeoutId);
      this.repeatTimeoutId = null;
    }
    if (this.repeatIntervalId != null) {
      clearInterval(this.repeatIntervalId);
      this.repeatIntervalId = null;
    }
  }

  private measureValueWidth(): void {
    const span = this.mirrorSpan?.nativeElement;
    if (!span) return;
    const w = span.offsetWidth;
    const current = this.valueWidth_();
    const minW = 24;
    const target = Math.max(minW, w + 4);
    if (Math.abs(target - current) > 1) {
      this.valueWidth_.set(target);
    }
  }

  protected onInput(e: Event): void {
    const raw = (e.target as HTMLInputElement).value;
    this.inputValue_.set(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) this.emitValue(parsed);
  }

  protected onBlur(e: FocusEvent): void {
    const raw = (e.target as HTMLInputElement).value;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      this.inputValue_.set(String(this.value()));
      return;
    }
    this.emitValue(parsed);
    this.inputValue_.set('');
  }

  protected onEnterKey(e: Event): void {
    e.preventDefault();
    (e.target as HTMLInputElement)?.blur();
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const current = this.value();
    const minV = this.minVal_();
    const opts = this.stepOptions();
    const next =
      e.key === 'ArrowUp'
        ? quantityIncrement(current, minV, opts)
        : quantityDecrement(current, minV, opts);
    const maxV = this.maxVal_();
    const clamped =
      maxV != null ? Math.min(next, maxV) : Math.max(next, minV);
    this.emitValue(clamped);
  }

  protected decrement(continuousPress = false): void {
    if (this.minusDisabled_()) {
      this.stopRepeat();
      return;
    }
    const current = this.value();
    const minV = this.minVal_();
    const opts = this.stepOptions();
    const merged = continuousPress ? { ...(opts ?? {}), continuousPress: true } : opts;
    const next = quantityDecrement(current, minV, merged);
    this.emitValue(next);
    if (next <= this.minVal_()) this.stopRepeat();
  }

  protected increment(continuousPress = false): void {
    if (this.plusDisabled_()) {
      this.stopRepeat();
      return;
    }
    const current = this.value();
    const minV = this.minVal_();
    const opts = this.stepOptions();
    const merged = continuousPress ? { ...(opts ?? {}), continuousPress: true } : opts;
    let next = quantityIncrement(current, minV, merged);
    const maxV = this.maxVal_();
    if (maxV != null && next > maxV) next = maxV;
    this.emitValue(next);
    if (this.maxVal_() != null && next >= this.maxVal_()!) this.stopRepeat();
  }

  private emitValue(v: number): void {
    const minV = this.minVal_();
    const maxV = this.maxVal_();
    let sanitized = Math.max(minV, v);
    if (maxV != null) sanitized = Math.min(sanitized, maxV);
    this.valueChange.emit(sanitized);
  }
}
