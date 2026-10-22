import { TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { PasteIngredientsDialogComponent } from './paste-ingredients-dialog.component'

describe('PasteIngredientsDialogComponent', () => {
  async function setup(): Promise<{ el: HTMLElement; open: (v: boolean) => void }> {
    await TestBed.configureTestingModule({
      imports: [PasteIngredientsDialogComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k } }]
    }).compileComponents()
    const fixture = TestBed.createComponent(PasteIngredientsDialogComponent)
    const open = (v: boolean): void => {
      fixture.componentRef.setInput('open', v)
      fixture.detectChanges()
    }
    open(false)
    return { el: fixture.nativeElement as HTMLElement, open }
  }

  it('shows the overlay in the browser top layer so a filtered ancestor cannot shrink it to its own box', async () => {
    const { el, open } = await setup()
    // A backdrop-filter ancestor, like the recipe page's ingredients card.
    el.style.cssText =
      'position: absolute; top: 200px; left: 50px; width: 300px; height: 100px; backdrop-filter: blur(4px)'
    open(true)
    const overlay = el.querySelector('.c-modal-overlay') as HTMLElement
    expect(overlay.matches(':popover-open')).toBeTrue()
    const rect = overlay.getBoundingClientRect()
    expect(rect.top).toBe(0)
    expect(rect.left).toBe(0)
    expect(rect.width).toBe(document.documentElement.clientWidth)
    expect(rect.height).toBe(document.documentElement.clientHeight)
  })

  it('removes the overlay when closed', async () => {
    const { el, open } = await setup()
    open(true)
    open(false)
    expect(el.querySelector('.c-modal-overlay')).toBeNull()
  })
})
