import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { ImageUp, LucideAngularModule, Palette } from 'lucide-angular'
import type { Business } from '@schemas/entities'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { BusinessService } from '@services/business.service'
import { CloudinaryService } from '@services/cloudinary.service'
import { LoggingService } from '@services/logging.service'
import { MenuDesignDataService } from '@services/menu-design-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { MenuDesign } from '@models/menu-design.model'
import { MenuDesignEditPage } from './menu-design-edit.page'

const saved: MenuDesign = {
  ...baseDesign('rustic'),
  _id: 'd1',
  name: 'ערב',
  schemaVersion: 2,
  businessId: 'b1',
  createdBy: 'u1',
  createdAt: 1,
  updatedAt: 1
}

describe('MenuDesignEditPage', () => {
  let fixture: ComponentFixture<MenuDesignEditPage>
  let page: MenuDesignEditPage
  let data: jasmine.SpyObj<MenuDesignDataService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let navigate: jasmine.Spy
  const designs = signal<MenuDesign[]>([])
  const loadFailed = signal(false)

  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector)
  const saveButton = (): HTMLButtonElement => el<HTMLButtonElement>('[data-testid="menu-design-save"]')
  const type = (selector: string, value: string): void => {
    const input = el<HTMLInputElement>(selector)
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  async function open(params: Record<string, string>, query: Record<string, string> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MenuDesignEditPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Palette, ImageUp })],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } }
        },
        { provide: MenuDesignDataService, useValue: data },
        {
          provide: BusinessService,
          useValue: { business_: signal({ _id: 'b1', name: 'מטבח בדיקה' } as Business).asReadonly() }
        },
        { provide: UserMsgService, useValue: userMsg },
        {
          provide: TranslationService,
          useValue: { translate: (key: string | undefined) => (key === 'menu_design_new' ? 'עיצוב חדש' : (key ?? '')) }
        },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        {
          provide: CloudinaryService,
          useValue: jasmine.createSpyObj<CloudinaryService>('CloudinaryService', ['upload'])
        }
      ]
    }).compileComponents()
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(MenuDesignEditPage)
    page = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    designs.set([saved])
    loadFailed.set(false)
    data = jasmine.createSpyObj<MenuDesignDataService>(
      'MenuDesignDataService',
      ['ensureLoaded', 'addDesign', 'updateDesign'],
      { allDesigns_: designs.asReadonly(), loadFailed_: loadFailed.asReadonly() }
    )
    data.ensureLoaded.and.resolveTo()
    data.addDesign.and.resolveTo(saved)
    data.updateDesign.and.resolveTo(saved)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
  })

  it('a new design starts from the picked base, with the new-design name and the business name', async () => {
    await open({}, { base: 'modern' })
    expect(el('h1').textContent?.trim()).toBe('עיצוב חדש')
    expect(el<HTMLInputElement>('#menu-design-name').value).toBe('עיצוב חדש')
    expect(page.design_()).toEqual({ ...baseDesign('modern'), fixedTexts: { businessName: 'מטבח בדיקה' } })
    expect(page.hasRealChanges()).toBeFalse()
  })

  it('an unknown base falls back to classic', async () => {
    await open({}, { base: 'nope' })
    expect(page.design_().baseTemplate).toBe('classic')
  })

  it('a saved design opens with its name and look', async () => {
    await open({ id: 'd1' })
    expect(el('h1').textContent).toContain('menu_design_edit_title')
    expect(el('h1').textContent).toContain('ערב')
    expect(el<HTMLInputElement>('#menu-design-name').value).toBe('ערב')
    expect(page.design_()).toEqual(baseDesign('rustic'))
    expect(page.hasRealChanges()).toBeFalse()
  })

  it('a change of the look or of the name counts as unsaved, and changing it back does not', async () => {
    await open({ id: 'd1' })
    type('input[id$="-color-page"]', '#000000')
    expect(page.hasRealChanges()).toBeTrue()
    type('input[id$="-color-page"]', baseDesign('rustic').colors.page)
    expect(page.hasRealChanges()).toBeFalse()
    type('#menu-design-name', 'ערב חדש')
    expect(page.hasRealChanges()).toBeTrue()
  })

  it('save creates a new design, says so and goes back to the list', async () => {
    await open({}, { base: 'classic' })
    type('#menu-design-name', '  ערב חתונה  ')
    saveButton().click()
    await fixture.whenStable()
    expect(data.addDesign).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ name: 'ערב חתונה', baseTemplate: 'classic' })
    )
    expect(data.updateDesign).not.toHaveBeenCalled()
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('menu_design_saved')
    expect(navigate).toHaveBeenCalledWith(['/menu-design'])
    expect(page.hasRealChanges()).toBeFalse()
  })

  it('save updates a saved design', async () => {
    await open({ id: 'd1' })
    type('#menu-design-name', 'ערב קיץ')
    saveButton().click()
    await fixture.whenStable()
    expect(data.updateDesign).toHaveBeenCalledOnceWith(jasmine.objectContaining({ _id: 'd1', name: 'ערב קיץ' }))
    expect(data.addDesign).not.toHaveBeenCalled()
  })

  it('an empty name is a field error and nothing is sent', async () => {
    await open({ id: 'd1' })
    type('#menu-design-name', '   ')
    saveButton().click()
    fixture.detectChanges()
    expect(data.updateDesign).not.toHaveBeenCalled()
    expect(el('.c-field-error').textContent?.trim()).toBe('field_required')
  })

  it('a look the shared schema refuses is not sent', async () => {
    await open({ id: 'd1' })
    page.design_.update((d) => ({ ...d, colors: { ...d.colors, page: 'red' } }))
    await page.onSave()
    expect(data.updateDesign).not.toHaveBeenCalled()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
  })

  it('a failed save keeps the draft on the page', async () => {
    await open({ id: 'd1' })
    data.updateDesign.and.rejectWith(new Error('down'))
    type('#menu-design-name', 'ערב קיץ')
    await page.onSave()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
    expect(navigate).not.toHaveBeenCalled()
    expect(page.hasRealChanges()).toBeTrue()
    expect(el<HTMLInputElement>('#menu-design-name').value).toBe('ערב קיץ')
  })

  it('holds the save while a picture is uploading', async () => {
    await open({ id: 'd1' })
    ;(page as unknown as { isUploading_: { set(v: boolean): void } }).isUploading_.set(true)
    fixture.detectChanges()
    expect(saveButton().disabled).toBeTrue()
    await page.onSave()
    expect(data.updateDesign).not.toHaveBeenCalled()
  })

  it('cancel goes back to the list', async () => {
    await open({ id: 'd1' })
    el('[data-testid="menu-design-cancel"]').click()
    expect(navigate).toHaveBeenCalledWith(['/menu-design'])
  })

  it('a failed load shows the error with a retry that fills the page', async () => {
    designs.set([])
    loadFailed.set(true)
    data.ensureLoaded.and.callFake(() => {
      designs.set([saved])
      loadFailed.set(false)
      return Promise.resolve()
    })
    await open({ id: 'd1' })
    expect(el('app-empty-state').textContent).toContain('menu_design_load_failed')
    expect(el('app-menu-designer')).toBeNull()
    el('app-empty-state button').click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(el<HTMLInputElement>('#menu-design-name').value).toBe('ערב')
    expect(el('app-menu-designer')).not.toBeNull()
  })

  it('an id that is not in the list says the design was not found', async () => {
    await open({ id: 'gone' })
    expect(el('app-empty-state').textContent).toContain('menu_design_not_found')
    expect(el('app-menu-designer')).toBeNull()
  })
})
