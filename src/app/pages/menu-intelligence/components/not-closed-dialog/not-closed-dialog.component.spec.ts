import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NotClosedDialogComponent, NotClosedAnswer } from './not-closed-dialog.component'

describe('NotClosedDialogComponent', () => {
  let fixture: ComponentFixture<NotClosedDialogComponent>
  let el: HTMLElement
  let answers: NotClosedAnswer[]
  let cancels: number

  const saveButton = () => el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-primary')!

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotClosedDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()
    fixture = TestBed.createComponent(NotClosedDialogComponent)
    answers = []
    cancels = 0
    fixture.componentInstance.confirmed.subscribe((a) => answers.push(a))
    fixture.componentInstance.cancelled.subscribe(() => cancels++)
    fixture.detectChanges()
    el = fixture.nativeElement
  })

  it('shows the four reasons as radios inside a dialog', () => {
    expect(el.querySelector('[role="dialog"]')).toBeTruthy()
    expect(el.querySelectorAll('input[type="radio"]').length).toBe(4)
  })

  it('keeps save disabled until a reason is chosen', () => {
    expect(saveButton().disabled).toBeTrue()
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click()
    fixture.detectChanges()
    expect(saveButton().disabled).toBeFalse()
  })

  it('emits the chosen reason and the trimmed text on save', () => {
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click()
    fixture.detectChanges()
    const area = el.querySelector<HTMLTextAreaElement>('textarea')!
    area.value = '  יקר  '
    area.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    saveButton().click()
    expect(answers).toEqual([{ reason: 'no_reply', reasonText: 'יקר' }])
  })

  it('cancels on Escape', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancels).toBe(1)
  })

  it('ignores a second click on save while saving and shows the busy state', () => {
    el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click()
    fixture.detectChanges()
    saveButton().click()
    saveButton().click()
    fixture.detectChanges()
    expect(answers.length).toBe(1)
    expect(saveButton().disabled).toBeTrue()
    expect(saveButton().getAttribute('aria-busy')).toBe('true')
  })
})
