import { ComponentFixture, TestBed } from '@angular/core/testing'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { SAMPLE_MENU_DOC } from '@schemas/menu-design/menu-doc'
import { renderMenuDocument } from '@schemas/menu-design/menu-template'
import { TranslationService } from '@services/translation.service'
import { A4_WIDTH_PX, MenuPreviewComponent } from './menu-preview.component'

describe('MenuPreviewComponent', () => {
  let fixture: ComponentFixture<MenuPreviewComponent>

  const frame = (): HTMLIFrameElement => fixture.nativeElement.querySelector('iframe')

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((key: string | undefined) => key ?? '')
    await TestBed.configureTestingModule({
      imports: [MenuPreviewComponent],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(MenuPreviewComponent)
    fixture.componentRef.setInput('design', baseDesign('classic'))
    fixture.detectChanges()
  })

  it('draws the sample menu in a frame that allows nothing (no allow-scripts)', () => {
    expect(frame().getAttribute('sandbox')).toBe('')
    expect(frame().getAttribute('title')).toBe('menu_design_preview_title')
    expect(frame().srcdoc).toBe(
      renderMenuDocument(baseDesign('classic'), SAMPLE_MENU_DOC, { poweredBy: true, fonts: 'link' })
    )
  })

  it('follows a changed design without making a new frame', () => {
    const before = frame()
    const design = baseDesign('modern')
    design.fixedTexts.businessName = 'מסעדת הים'
    fixture.componentRef.setInput('design', design)
    fixture.detectChanges()
    expect(frame()).toBe(before)
    expect(frame().srcdoc).toBe(renderMenuDocument(design, SAMPLE_MENU_DOC, { poweredBy: true, fonts: 'link' }))
    expect(frame().srcdoc).toContain('מסעדת הים')
  })

  it('draws the menu it is given, without the powered-by line when that is off', () => {
    const doc = { title: 'ערב', sections: [{ title: 'פתיחה', dishes: [{ name: 'לחם' }] }] }
    fixture.componentRef.setInput('doc', doc)
    fixture.componentRef.setInput('poweredBy', false)
    fixture.detectChanges()
    expect(frame().srcdoc).toBe(renderMenuDocument(baseDesign('classic'), doc, { poweredBy: false, fonts: 'link' }))
    expect(frame().srcdoc).not.toContain('Powered by')
  })

  it('scales the A4 page to the width of its box', async () => {
    const host: HTMLElement = fixture.nativeElement
    host.style.width = `${A4_WIDTH_PX / 2}px`
    document.body.appendChild(host)
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await new Promise((resolve) => setTimeout(resolve, 50))
    fixture.detectChanges()
    expect(fixture.componentInstance.scale()).toBeCloseTo(0.5, 2)
    expect(frame().style.transform).toContain('scale(0.5')
    host.remove()
  })
})
