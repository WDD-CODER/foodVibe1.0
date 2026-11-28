import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ImageUp, LucideAngularModule } from 'lucide-angular'
import type { MenuDesignAiResult } from '@schemas/ai-menu-design.schema'
import type { MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import type { ModuleKey } from '@schemas/modules-pure'
import { CloudinaryService } from '@services/cloudinary.service'
import { LoggingService } from '@services/logging.service'
import { MenuDesignAiService, MenuDesignImageTooLargeError } from '@services/menu-design-ai.service'
import { ModuleService } from '@services/module.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { MenuDesignerComponent } from '../menu-designer.component'

const LOGO = 'https://res.cloudinary.com/demo/image/upload/logo.png'

const variant = (title: string, fallback = false): MenuDesignAiResult => ({
  design: { ...baseDesign('modern'), colors: { ...baseDesign('modern').colors, title }, origin: 'ai' },
  fallback
})
const VARIANTS = [variant('#111111'), variant('#aa0000'), variant('#222222', true)]

/** The chef's draft: its logo and texts stay through a pick. */
const mine = (): MenuDesignDraft => ({
  ...baseDesign('classic'),
  logo: { url: LOGO, size: 'l', placement: 'top' },
  fixedTexts: { businessName: 'מסעדת הים' }
})

/** The panel and the change box, inside the designer that hosts them and holds the way back. */
describe('MenuDesignAiPanelComponent in the designer', () => {
  let fixture: ComponentFixture<MenuDesignerComponent>
  let ai: jasmine.SpyObj<MenuDesignAiService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  const modules = signal<readonly ModuleKey[]>([])

  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector)
  const all = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector))
  const design = (): MenuDesignDraft => fixture.componentInstance.design()
  const preview = (): string => el<HTMLIFrameElement>('.menu-designer__preview iframe').srcdoc
  const suggest = (): HTMLButtonElement => el<HTMLButtonElement>('[data-testid="menu-design-ai-suggest"]')
  const apply = (): HTMLButtonElement => el<HTMLButtonElement>('[data-testid="menu-design-ai-apply"]')
  const undo = (): HTMLButtonElement => el<HTMLButtonElement>('[data-testid="menu-design-ai-undo"]')
  const textBox = (): string => 'app-menu-design-ai-panel textarea'
  const refineBox = (): string => 'app-menu-design-ai-refine textarea'
  const cards = (): HTMLElement[] => all('[data-testid="menu-design-ai-variant"]')

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve))
    fixture.detectChanges()
  }
  const click = async (element: HTMLElement): Promise<void> => {
    element.click()
    await settle()
  }
  const type = (selector: string, value: string): void => {
    const input = el<HTMLInputElement>(selector)
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const pickKind = (kind: string): Promise<void> => click(el(`[data-picker="reference"] [data-value="${kind}"] input`))
  const describeIt = async (text = 'כהה ואלגנטי'): Promise<void> => {
    await pickKind('text')
    type(textBox(), text)
  }

  function create(): void {
    fixture = TestBed.createComponent(MenuDesignerComponent)
    fixture.componentRef.setInput('design', mine())
    fixture.detectChanges()
  }

  beforeEach(async () => {
    modules.set(['events', 'menu_design'])
    ai = jasmine.createSpyObj<MenuDesignAiService>('MenuDesignAiService', ['variants', 'refine'])
    ai.variants.and.resolveTo(VARIANTS)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
    await TestBed.configureTestingModule({
      imports: [MenuDesignerComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, ImageUp })],
      providers: [
        { provide: MenuDesignAiService, useValue: ai },
        { provide: ModuleService, useValue: { modules_: modules } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: { translate: (key: string | undefined) => key ?? '' } },
        { provide: CloudinaryService, useValue: jasmine.createSpyObj<CloudinaryService>('Cloudinary', ['upload']) },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error']) }
      ]
    }).compileComponents()
  })

  it('shows nothing of the AI to a business without the menu design module', () => {
    modules.set(['events'])
    create()
    expect(el('app-menu-design-ai-panel')).toBeNull()
    expect(el('app-menu-design-ai-refine')).toBeNull()
  })

  it('offers three reference kinds, each explained in a tooltip with an accessible description', () => {
    create()
    for (const kind of ['image', 'url', 'text']) {
      const input = el(`[data-picker="reference"] [data-value="${kind}"] input`)
      const hintId = input.getAttribute('aria-describedby')!
      expect(input.closest('label')!.getAttribute('title')).toBe(`menu_design_ai_ref_${kind}_hint`)
      expect(el(`[id="${hintId}"]`).classList).toContain('visually-hidden')
    }
  })

  it('says the reference gives a style and not a copy, and sends nothing while the reference is empty', async () => {
    create()
    expect(el('.ai-panel__note').textContent?.trim()).toBe('menu_design_ai_style_not_copy')
    for (const kind of ['image', 'url', 'text']) {
      await pickKind(kind)
      expect(suggest().disabled).withContext(kind).toBeTrue()
    }
    expect(ai.variants).not.toHaveBeenCalled()
  })

  it('sends the picked picture with its note, and a link', async () => {
    create()
    const file = new File(['x'], 'menu.png', { type: 'image/png' })
    const picker = el<HTMLInputElement>('input[data-upload="reference"]')
    const transfer = new DataTransfer()
    transfer.items.add(file)
    picker.files = transfer.files
    picker.dispatchEvent(new Event('change'))
    type('input[data-field="note"]', ' הצבעים ')
    await click(suggest())
    expect(ai.variants).toHaveBeenCalledWith({ kind: 'image', file, note: 'הצבעים' })
    await click(el('[data-testid="menu-design-ai-close"]'))

    await pickKind('url')
    expect(el('input[type="url"]').getAttribute('dir')).toBe('ltr')
    type('input[type="url"]', ' https://example.com ')
    await click(suggest())
    expect(ai.variants).toHaveBeenCalledWith({ kind: 'url', url: 'https://example.com' })
  })

  it('shows three sample menus, marks a base one, and closing them keeps the design', async () => {
    create()
    await describeIt()
    await click(suggest())
    expect(ai.variants).toHaveBeenCalledOnceWith({ kind: 'text', text: 'כהה ואלגנטי' })
    expect(cards().length).toBe(3)
    expect(cards().map((card) => card.querySelector('iframe')!.srcdoc.includes('תפריט ערב'))).toEqual([
      true,
      true,
      true
    ])
    expect(cards().map((card) => card.textContent!.includes('menu_design_ai_fallback'))).toEqual([false, false, true])

    await click(el('[data-testid="menu-design-ai-close"]'))
    expect(cards().length).toBe(0)
    expect(design()).toEqual(mine())
  })

  it('puts the picked design into the designer, keeping the logo and the texts, and can undo it', async () => {
    create()
    await describeIt()
    await click(suggest())
    expect(undo()).toBeNull()
    await click(cards()[1].querySelector('button')!)

    expect(cards().length).toBe(0)
    expect(design()).toEqual({
      ...VARIANTS[1].design,
      logo: mine().logo,
      fixedTexts: mine().fixedTexts,
      origin: 'ai'
    })
    expect(preview()).toContain('--md-title: #aa0000')

    await click(undo())
    expect(design()).toEqual(mine())
    expect(undo()).toBeNull()
  })

  it('shows a loader and takes no second request while the AI is working', async () => {
    let answer: (value: MenuDesignAiResult[]) => void = () => undefined
    ai.variants.and.returnValue(new Promise((resolve) => (answer = resolve)))
    create()
    await describeIt()
    await click(suggest())
    expect(suggest().disabled).toBeTrue()
    expect(suggest().querySelector('app-loader')).not.toBeNull()
    answer(VARIANTS)
    await settle()
    expect(suggest().disabled).toBeFalse()
    expect(suggest().querySelector('app-loader')).toBeNull()
  })

  it('shows a failure with a retry and keeps the design', async () => {
    ai.variants.and.rejectWith(new HttpErrorResponse({ status: 0 }))
    create()
    await describeIt()
    await click(suggest())
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledOnceWith('menu_design_ai_failed')
    const alert = el('app-menu-design-ai-panel [role="alert"]')
    expect(alert.textContent).toContain('menu_design_ai_failed')
    expect(design()).toEqual(mine())

    ai.variants.and.resolveTo(VARIANTS)
    await click(alert.querySelector('button')!)
    expect(cards().length).toBe(3)
    expect(el('app-menu-design-ai-panel [role="alert"]')).toBeNull()
  })

  const refusals: [string, unknown][] = [
    ['ai_monthly_cap_reached', new HttpErrorResponse({ status: 429, error: { error: 'ai_monthly_cap_reached' } })],
    ['menu_design_ai_url_not_allowed', new HttpErrorResponse({ status: 400, error: { error: 'URL_NOT_ALLOWED' } })],
    ['menu_design_ai_url_failed', new HttpErrorResponse({ status: 502, error: { error: 'URL_CAPTURE_FAILED' } })],
    ['menu_design_ai_image_too_large', new MenuDesignImageTooLargeError()],
    ['menu_design_ai_image_too_large', new HttpErrorResponse({ status: 400, error: { error: 'IMAGE_TOO_LARGE' } })]
  ]
  refusals.forEach(([key, error]) => {
    it(`says why: ${key}`, async () => {
      ai.variants.and.rejectWith(error)
      create()
      await describeIt()
      await click(suggest())
      expect(userMsg.onSetErrorMsg).toHaveBeenCalledOnceWith(key)
    })
  })

  it('changes the design in words and undoes one step only', async () => {
    const darker: MenuDesignDraft = { ...mine(), colors: { ...mine().colors, page: '#000000' }, origin: 'ai' }
    const bigger: MenuDesignDraft = { ...darker, layout: { ...darker.layout, dishSize: 'l' } }
    ai.refine.and.returnValues(
      Promise.resolve({ design: darker, fallback: false }),
      Promise.resolve({ design: bigger, fallback: false })
    )
    create()
    expect(apply().disabled).toBeTrue()
    type(refineBox(), ' יותר כהה ')
    await click(apply())
    expect(ai.refine).toHaveBeenCalledWith(mine(), 'יותר כהה')
    expect(design()).toEqual(darker)
    expect(preview()).toContain('--md-page: #000000')

    type(refineBox(), 'שמות מנות גדולים יותר')
    await click(apply())
    expect(design()).toEqual(bigger)
    await click(undo())
    expect(design()).toEqual(darker)
    expect(undo()).toBeNull()
  })

  it('drops a half typed colour when the AI changes the design', async () => {
    ai.refine.and.resolveTo({ design: { ...mine(), origin: 'ai' }, fallback: false })
    create()
    type('input[type="text"][id$="-color-page"]', '#11')
    type(refineBox(), 'יותר כהה')
    await click(apply())
    expect(el<HTMLInputElement>('input[type="text"][id$="-color-page"]').value).toBe(mine().colors.page)
    expect(el('.c-field-error')).toBeNull()
  })

  it('keeps the design and offers a retry when the words could not be applied', async () => {
    ai.refine.and.resolveTo({ design: mine(), fallback: true })
    create()
    type(refineBox(), 'יותר כהה')
    await click(apply())
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledOnceWith('menu_design_ai_refine_failed')
    expect(design()).toEqual(mine())
    expect(undo()).toBeNull()

    ai.refine.and.rejectWith(new HttpErrorResponse({ status: 500 }))
    await click(el('app-menu-design-ai-refine [role="alert"] button'))
    expect(ai.refine).toHaveBeenCalledTimes(2)
    expect(el('app-menu-design-ai-refine [role="alert"]').textContent).toContain('menu_design_ai_refine_failed')
  })
})
