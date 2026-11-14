import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { DayLoadStripComponent } from './day-load-strip.component'

describe('DayLoadStripComponent', () => {
  let fixture: ComponentFixture<DayLoadStripComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayLoadStripComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } }]
    }).compileComponents()
    fixture = TestBed.createComponent(DayLoadStripComponent)
    fixture.componentRef.setInput('load', { coversByHour: { '19': 0 }, bookings: [] })
    fixture.componentRef.setInput('time', '19:00')
    fixture.detectChanges()
  })

  it('shows the translated title and the hour as HH:00', () => {
    const el: HTMLElement = fixture.nativeElement
    expect(el.querySelector('.strip-title')?.textContent?.trim()).toBe('T:rq_day_load_title')
    const hours = el.querySelectorAll('.strip-hour')
    expect(hours.length).toBe(1)
    expect(hours[0].textContent?.trim()).toBe('19:00')
  })
})
