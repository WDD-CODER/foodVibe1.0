import { Component } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing'
import { CounterComponent } from './counter.component'
import { TranslationService } from '@services/translation.service'

@Component({
  standalone: true,
  imports: [CounterComponent],
  template: '<app-counter [value]="value" [min]="min" [max]="max" (valueChange)="onChange($event)" />'
})
class HostComponent {
  value = 5
  min: number | undefined
  max: number | undefined
  captured: number | undefined
  emits: number[] = []
  onChange(v: number): void {
    this.captured = v
    this.emits.push(v)
    this.value = v
  }
}

describe('CounterComponent', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k || '' } }]
    }).compileComponents()

    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    host.value = 5
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('app-counter')).toBeTruthy()
  })

  it('should emit valueChange when plus is pressed (mousedown)', () => {
    const plusBtn = fixture.nativeElement.querySelector('.ctrl-btn:last-of-type') as HTMLButtonElement
    plusBtn?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }))
    fixture.detectChanges()
    expect(host.captured).toBe(6)
  })

  it('should emit valueChange when minus is pressed (mousedown)', () => {
    const minusBtn = fixture.nativeElement.querySelector('.ctrl-btn:first-of-type') as HTMLButtonElement
    minusBtn?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }))
    fixture.detectChanges()
    expect(host.captured).toBe(4)
  })

  it('should respect min and disable minus when value equals min', () => {
    host.value = 1
    host.min = 1
    fixture.detectChanges()
    const minusBtn = fixture.nativeElement.querySelector('.ctrl-btn:first-of-type') as HTMLButtonElement
    expect(minusBtn.disabled).toBeTrue()
  })

  it('should respect max and disable plus when value equals max', () => {
    host.value = 10
    host.max = 10
    fixture.detectChanges()
    const plusBtn = fixture.nativeElement.querySelector('.ctrl-btn:last-of-type') as HTMLButtonElement
    expect(plusBtn.disabled).toBeTrue()
  })

  it('should clamp emitted value to min when user enters value below min', () => {
    host.value = 5
    host.min = 0
    fixture.detectChanges()
    const inputEl = fixture.nativeElement.querySelector('.value-input') as HTMLInputElement
    inputEl.value = '-10'
    inputEl.dispatchEvent(new Event('input'))
    inputEl.dispatchEvent(new FocusEvent('blur'))
    fixture.detectChanges()
    expect(host.captured).toBe(0)
  })

  function btn(which: 'first' | 'last'): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`.ctrl-btn:${which}-of-type`) as HTMLButtonElement
  }
  const ptr = (type: string): PointerEvent =>
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch' })

  it('repeats while a pointer is held and stops on pointerup', fakeAsync(() => {
    btn('last').dispatchEvent(ptr('pointerdown'))
    fixture.detectChanges()
    expect(host.emits.length).toBe(1)
    tick(500 + 80 * 3)
    fixture.detectChanges()
    const held = host.emits.length
    expect(held).toBeGreaterThan(2)
    btn('last').dispatchEvent(ptr('pointerup'))
    tick(1000)
    expect(host.emits.length).toBe(held)
    discardPeriodicTasks()
  }))

  it('stops the repeat on pointerleave and pointercancel', fakeAsync(() => {
    for (const type of ['pointerleave', 'pointercancel']) {
      host.emits = []
      btn('last').dispatchEvent(ptr('pointerdown'))
      fixture.detectChanges()
      btn('last').dispatchEvent(ptr(type))
      tick(1000)
      expect(host.emits.length).toBe(1)
    }
  }))

  it('the minimum stops the repeat and disables the minus button', fakeAsync(() => {
    host.value = 2
    host.min = 0
    fixture.detectChanges()
    btn('first').dispatchEvent(ptr('pointerdown'))
    fixture.detectChanges()
    for (let i = 0; i < 10; i++) {
      tick(500)
      fixture.detectChanges()
    }
    expect(host.value).toBe(0)
    expect(btn('first').disabled).toBeTrue()
    const count = host.emits.length
    tick(1000)
    expect(host.emits.length).toBe(count)
    btn('first').dispatchEvent(ptr('pointerup'))
  }))

  it('arrow up and down step the value', () => {
    const inputEl = fixture.nativeElement.querySelector('.value-input') as HTMLInputElement
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
    expect(host.captured).toBe(6)
    fixture.detectChanges()
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    expect(host.captured).toBe(5)
  })
})
