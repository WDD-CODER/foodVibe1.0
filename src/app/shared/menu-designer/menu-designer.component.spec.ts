import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ImageUp, LucideAngularModule } from 'lucide-angular'
import { of, throwError } from 'rxjs'
import { menuDesignDraftSchema, type MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { MENU_FONTS } from '@schemas/menu-design/menu-fonts'
import { MENU_TEXTURES } from '@schemas/menu-design/menu-textures'
import { CloudinaryService } from '@services/cloudinary.service'
import { LoggingService } from '@services/logging.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { MenuDesignerComponent } from './menu-designer.component'

const PICTURE = 'https://res.cloudinary.com/demo/image/upload/bg.jpg'

describe('MenuDesignerComponent', () => {
  let fixture: ComponentFixture<MenuDesignerComponent>
  let component: MenuDesignerComponent
  let cloudinary: jasmine.SpyObj<CloudinaryService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let uploading: boolean[]

  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector)
  const all = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector))
  const design = (): MenuDesignDraft => component.design()
  const frame = (): HTMLIFrameElement => el<HTMLIFrameElement>('iframe')

  const click = (selector: string): void => {
    el(selector).click()
    fixture.detectChanges()
  }

  const type = (selector: string, value: string): void => {
    const input = el<HTMLInputElement>(selector)
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  const hexBox = (key: string): string => `[data-group="colors"] input[type="text"][id$="-color-${key}"]`
  const kind = (value: string): string => `[data-picker="kind"] [data-value="${value}"] input`
  const photo = (): File => new File(['x'], 'photo.png', { type: 'image/png' })

  beforeEach(async () => {
    cloudinary = jasmine.createSpyObj<CloudinaryService>('CloudinaryService', ['upload'])
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((key: string | undefined) => key ?? '')

    await TestBed.configureTestingModule({
      imports: [MenuDesignerComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ImageUp })],
      providers: [
        { provide: CloudinaryService, useValue: cloudinary },
        // Without the menu design module: the AI tools have their own spec (ai-panel).
        { provide: ModuleService, useValue: { modules_: () => [] } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: translation },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(MenuDesignerComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('design', baseDesign('classic'))
    uploading = []
    component.uploading.subscribe((value) => uploading.push(value))
    fixture.detectChanges()
  })

  it('shows the seven groups of controls and the sample menu, and no save button', () => {
    expect(all('section[data-group]').map((s) => s.dataset['group'])).toEqual([
      'fonts',
      'colors',
      'background',
      'frame',
      'logo',
      'layout',
      'texts'
    ])
    expect(frame().srcdoc).toContain('תפריט ערב')
    expect(all('button').some((b) => b.textContent?.includes('save'))).toBeFalse()
  })

  it('writes every font chip in its own font and applies a pick to its slot only', () => {
    const chips = all('[data-font-slot="dish"] label')
    expect(chips.length).toBe(MENU_FONTS.length)
    chips.forEach((chip, i) => expect(chip.style.fontFamily).toContain(MENU_FONTS[i].family))

    click('[data-font-slot="dish"] input[value="karantina"]')
    expect(design().fonts).toEqual({ ...baseDesign('classic').fonts, dish: 'karantina' })
    expect(frame().srcdoc).toContain('--md-font-dish: "Karantina", sans-serif')
  })

  it('keeps a picked title and dish font after change detection settles', async () => {
    // In the page, so the three radio groups behave as the browser makes them.
    document.body.appendChild(fixture.nativeElement)
    fixture.autoDetectChanges(true)

    el('[data-font-slot="title"] input[value="suez-one"]').closest('label')!.click()
    el('[data-font-slot="dish"] input[value="amatic-sc"]').closest('label')!.click()
    await fixture.whenStable()

    const picked = { ...baseDesign('classic').fonts, title: 'suez-one', dish: 'amatic-sc' } as const
    expect(design().fonts).toEqual(picked)
    for (const [slot, id] of Object.entries(picked)) {
      expect(el<HTMLInputElement>(`[data-font-slot="${slot}"] input:checked`).value).toBe(id)
    }
    expect(frame().srcdoc).toContain('--md-font-title: "Suez One", sans-serif')
    expect(frame().srcdoc).toContain('--md-font-dish: "Amatic SC", cursive')
    fixture.nativeElement.remove()
  })

  it('loads the curated fonts with one stylesheet link, however many designers open', () => {
    TestBed.createComponent(MenuDesignerComponent).destroy()
    const links = document.head.querySelectorAll<HTMLLinkElement>('link[data-menu-fonts]')
    expect(links.length).toBe(1)
    expect(links[0].href).toContain('https://fonts.googleapis.com/css2?family=Heebo')
  })

  it('takes the block padding off its chip groups, against the global toggle-group rule', () => {
    document.body.appendChild(fixture.nativeElement)
    for (const group of all('.menu-designer__chips')) {
      expect(getComputedStyle(group).paddingTop).toBe('0px')
    }
    fixture.nativeElement.remove()
  })

  it('applies a typed colour at once', () => {
    type(hexBox('page'), '#112233')
    expect(design().colors.page).toBe('#112233')
    expect(frame().srcdoc).toContain('--md-page: #112233')
    expect(el('.c-field-error')).toBeNull()
  })

  it('shows an error under an invalid colour and does not apply it', () => {
    type(hexBox('page'), '#11')
    expect(design().colors.page).toBe(baseDesign('classic').colors.page)
    expect(el('.c-field-error').textContent?.trim()).toBe('menu_design_invalid_hex')
    expect(el<HTMLInputElement>(hexBox('page')).value).toBe('#11')

    const picker = el<HTMLInputElement>('input[data-color="page"]')
    picker.value = '#445566'
    picker.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(design().colors.page).toBe('#445566')
    expect(el<HTMLInputElement>(hexBox('page')).value).toBe('#445566')
    expect(el('.c-field-error')).toBeNull()
  })

  it('draws a swatch for every texture and applies the picked one', () => {
    const swatches = all('.menu-designer__swatch')
    expect(swatches.length).toBe(MENU_TEXTURES.length)
    expect(swatches.every((s) => s.style.background !== '')).toBeTrue()
    click('.menu-designer__texture[data-value="linen"] input')
    expect(design().background.textureId).toBe('linen')
  })

  it('explains every background kind in a tooltip with an accessible description', () => {
    for (const value of ['color', 'texture', 'image']) {
      const input = el(kind(value))
      const hintId = input.getAttribute('aria-describedby')!
      expect(input.closest('label')!.getAttribute('title')).toBe(`menu_design_kind_hint_${value}`)
      expect(el(`[id="${hintId}"]`).classList).toContain('visually-hidden')
    }
  })

  it('keeps the old background while the picked image kind has no picture', () => {
    click(kind('image'))
    expect(design().background.kind).toBe('texture')
    expect(el('input[data-upload="background"]')).not.toBeNull()
    expect(el<HTMLInputElement>(kind('image')).checked).toBeTrue()
  })

  it('uploads a background picture and puts it into the design', async () => {
    cloudinary.upload.and.returnValue(of(PICTURE))
    click(kind('image'))
    await component.uploadImage('background', photo())
    fixture.detectChanges()
    expect(design().background).toEqual(jasmine.objectContaining({ kind: 'image', imageUrl: PICTURE }))
    expect(frame().srcdoc).toContain(PICTURE)
    expect(uploading).toEqual([true, false])
  })

  it('uploads a logo, then removes it', async () => {
    cloudinary.upload.and.returnValue(of(PICTURE))
    await component.uploadImage('logo', photo())
    fixture.detectChanges()
    expect(design().logo.url).toBe(PICTURE)
    expect(frame().srcdoc).toContain('class="md-logo md-logo--m"')

    click('.menu-designer__remove-logo')
    expect(design().logo.url).toBeUndefined()
    expect(el('.menu-designer__remove-logo')).toBeNull()
  })

  it('a failed upload shows a message and keeps the design', async () => {
    cloudinary.upload.and.returnValue(throwError(() => new Error('down')))
    await component.uploadImage('logo', photo())
    expect(design()).toEqual(baseDesign('classic'))
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledOnceWith('image_upload_failed')
    expect(uploading).toEqual([true, false])
  })

  it('sets the veil as a share of one', () => {
    click(kind('image'))
    type('input[type="range"]', '40')
    expect(design().background.veil).toBe(0.4)
  })

  it('sets the frame, divider, logo and layout choices', () => {
    click('[data-group="frame"] [data-value="rounded"] input')
    click('[data-group="frame"] [data-value="wide"] input')
    click('[data-group="frame"] [data-value="dots"] input')
    click('[data-group="logo"] [data-value="l"] input')
    click('[data-group="layout"] [data-value="start"] input')
    click('[data-group="layout"] [data-value="airy"] input')
    expect(design().frame).toEqual({ style: 'rounded', width: 1, inset: 'wide' })
    expect(design().divider).toBe('dots')
    expect(design().logo.size).toBe('l')
    expect(design().layout).toEqual(jasmine.objectContaining({ align: 'start', density: 'airy' }))
  })

  it('shows the typed business name and contact line on the sample menu', () => {
    type('input[id$="-business-name"]', 'מסעדת הים')
    type('input[id$="-contact-line"]', '03-5551234')
    expect(design().fixedTexts).toEqual({ businessName: 'מסעדת הים', contactLine: '03-5551234' })
    expect(frame().srcdoc).toContain('מסעדת הים')
    expect(frame().srcdoc).toContain('03-5551234')
    expect(menuDesignDraftSchema.safeParse(design()).success).toBeTrue()
  })
})
