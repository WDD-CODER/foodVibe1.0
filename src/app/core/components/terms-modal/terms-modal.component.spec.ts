import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Observable, of, Subject, throwError } from 'rxjs'
import { TermsModalComponent } from './terms-modal.component'
import { Terms, TermsService } from '../../services/terms.service'
import { TranslationService } from '../../services/translation.service'

const TERMS: Terms = {
  version: 'v-test',
  title: 'Terms',
  updated: '2026-11-12',
  sectionsHash: 'x',
  sections: [{ heading: '1. One', paragraphs: ['1.1. text'] }]
}

describe('TermsModalComponent (plan 584)', () => {
  let fixture: ComponentFixture<TermsModalComponent>
  let termsService: jasmine.SpyObj<TermsService>

  const host = (): HTMLElement => fixture.nativeElement
  const acceptBtn = (): HTMLButtonElement => host().querySelector('[data-testid="terms-accept"]') as HTMLButtonElement
  const body = (): HTMLElement => host().querySelector('[data-testid="terms-body"]') as HTMLElement

  async function create(loadResult: Observable<Terms> = of(TERMS)): Promise<void> {
    termsService = jasmine.createSpyObj<TermsService>('TermsService', ['load'])
    termsService.load.and.returnValue(loadResult)
    await TestBed.configureTestingModule({
      imports: [TermsModalComponent],
      providers: [
        { provide: TermsService, useValue: termsService },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(TermsModalComponent)
    fixture.detectChanges()
    await new Promise((r) => setTimeout(r, 10))
    fixture.detectChanges()
  }

  function setBodyHeight(px: number, filler: number): void {
    body().style.maxHeight = `${px}px`
    body().style.overflowY = 'auto'
    const pad = document.createElement('div')
    pad.style.height = `${filler}px`
    pad.setAttribute('data-pad', '')
    body().appendChild(pad)
  }

  it('the confirm button is disabled until the text box is scrolled to its end', async () => {
    const load = new Subject<Terms>()
    await create(load)
    setBodyHeight(60, 600)
    load.next(TERMS)
    await new Promise((r) => setTimeout(r, 10))
    fixture.detectChanges()
    expect(body().scrollHeight).toBeGreaterThan(body().clientHeight + 100)
    expect(acceptBtn().disabled).toBeTrue()
    body().scrollTop = body().scrollHeight
    body().dispatchEvent(new Event('scroll'))
    fixture.detectChanges()
    expect(acceptBtn().disabled).toBeFalse()
  })

  it('is enabled at once when the text fits without scrolling', async () => {
    await create()
    body().style.maxHeight = 'none'
    ;(fixture.componentInstance as unknown as { onScroll: () => void }).onScroll()
    fixture.detectChanges()
    expect(acceptBtn().disabled).toBeFalse()
  })

  it('emits accepted with the version on click', async () => {
    await create()
    const emitted: string[] = []
    fixture.componentInstance.accepted.subscribe((v) => emitted.push(v))
    ;(fixture.componentInstance as unknown as { onScroll: () => void }).onScroll()
    fixture.detectChanges()
    acceptBtn().click()
    expect(emitted).toEqual(['v-test'])
  })

  it('a load error shows the message and keeps the button disabled', async () => {
    await create(throwError(() => new Error('x')))
    expect(host().querySelector('[data-testid="terms-load-error"]')).not.toBeNull()
    expect(acceptBtn().disabled).toBeTrue()
  })

  it('shows the close button only when dismissible', async () => {
    await create()
    expect(host().querySelector('[data-testid="terms-close"]')).not.toBeNull()
    fixture.componentRef.setInput('dismissible', false)
    fixture.detectChanges()
    expect(host().querySelector('[data-testid="terms-close"]')).toBeNull()
  })
})
