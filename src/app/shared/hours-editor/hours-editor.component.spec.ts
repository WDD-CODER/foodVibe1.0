import { TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { HoursEditorComponent } from './hours-editor.component'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { HoursDraftRow } from 'src/app/core/utils/venue-hours.util'

const blank = (extra: Partial<HoursDraftRow> = {}): HoursDraftRow => ({
  dayIndexes: [],
  open: '',
  close: '',
  openInvalid: false,
  closeInvalid: false,
  ...extra
})

describe('HoursEditorComponent (plan 372)', () => {
  function setup(rows: HoursDraftRow[], showMarks = false) {
    TestBed.configureTestingModule({
      imports: [HoursEditorComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: UserMsgService, useValue: jasmine.createSpyObj('UserMsgService', ['onLineRemoved']) },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
    const fixture = TestBed.createComponent(HoursEditorComponent)
    fixture.componentRef.setInput('rows', rows)
    fixture.componentRef.setInput('showMarks', showMarks)
    fixture.detectChanges()
    return fixture
  }

  it('renders seven day chips per row, Sunday first', () => {
    const fixture = setup([blank()])
    const chips = fixture.nativeElement.querySelectorAll('.c-chip--toggle span')
    expect(Array.from(chips).map((c) => (c as HTMLElement).textContent)).toEqual(['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'])
  })

  it('tapping a chip toggles its day', () => {
    const fixture = setup([blank()])
    const input = fixture.nativeElement.querySelectorAll('.c-chip--toggle input')[4] as HTMLInputElement
    input.click()
    fixture.detectChanges()
    expect(fixture.componentInstance.rows()[0].dayIndexes).toEqual([4])
    input.click()
    expect(fixture.componentInstance.rows()[0].dayIndexes).toEqual([])
  })

  it('add and remove a row', () => {
    const fixture = setup([blank()])
    const buttons = fixture.nativeElement.querySelectorAll('button')
    ;(buttons[0] as HTMLButtonElement).click()
    expect(fixture.componentInstance.rows().length).toBe(2)
    fixture.detectChanges()
    ;(fixture.nativeElement.querySelector('.btn-icon') as HTMLButtonElement).click()
    expect(fixture.componentInstance.rows().length).toBe(1)
    expect(TestBed.inject(UserMsgService).onLineRemoved).toHaveBeenCalled()
  })

  it('shows the +1 marker for an overnight row and no error', () => {
    const fixture = setup([blank({ dayIndexes: [4], open: '18:00', close: '02:00' })], true)
    expect(fixture.nativeElement.querySelector('.hours-next-day')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('.hours-error')).toBeNull()
  })

  it('shows the row message only when marks are on', () => {
    const rows = [blank({ open: '08:00', close: '10:00' })]
    expect(setup(rows, false).nativeElement.querySelector('.hours-error')).toBeNull()
    TestBed.resetTestingModule()
    const marked = setup(rows, true)
    expect(marked.nativeElement.querySelector('.hours-error')?.textContent).toContain('venue_hours_missing_days')
  })
})
