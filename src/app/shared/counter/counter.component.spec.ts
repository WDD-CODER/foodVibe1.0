import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { TranslationService } from '@services/translation.service';

@Component({
  standalone: true,
  imports: [CounterComponent],
  template: '<app-counter [value]="value" [min]="min" [max]="max" (valueChange)="captured = $event" />',
})
class HostComponent {
  value = 5;
  min: number | undefined;
  max: number | undefined;
  captured: number | undefined;
}

describe('CounterComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.value = 5;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('app-counter')).toBeTruthy();
  });

  it('should emit valueChange when plus is pressed (mousedown)', () => {
    const plusBtn = fixture.nativeElement.querySelector('.ctrl-btn:last-of-type') as HTMLButtonElement;
    plusBtn?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(host.captured).toBe(6);
  });

  it('should emit valueChange when minus is pressed (mousedown)', () => {
    const minusBtn = fixture.nativeElement.querySelector('.ctrl-btn:first-of-type') as HTMLButtonElement;
    minusBtn?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();
    expect(host.captured).toBe(4);
  });

  it('should respect min and disable minus when value equals min', () => {
    host.value = 1;
    host.min = 1;
    fixture.detectChanges();
    const minusBtn = fixture.nativeElement.querySelector('.ctrl-btn:first-of-type') as HTMLButtonElement;
    expect(minusBtn.disabled).toBeTrue();
  });

  it('should respect max and disable plus when value equals max', () => {
    host.value = 10;
    host.max = 10;
    fixture.detectChanges();
    const plusBtn = fixture.nativeElement.querySelector('.ctrl-btn:last-of-type') as HTMLButtonElement;
    expect(plusBtn.disabled).toBeTrue();
  });

  it('should clamp emitted value to min when user enters value below min', () => {
    host.value = 5;
    host.min = 0;
    fixture.detectChanges();
    const inputEl = fixture.nativeElement.querySelector('.value-input') as HTMLInputElement;
    inputEl.value = '-10';
    inputEl.dispatchEvent(new Event('input'));
    inputEl.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(host.captured).toBe(0);
  });
});
