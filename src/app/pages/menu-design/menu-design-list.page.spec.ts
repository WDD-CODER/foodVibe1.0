import { computed, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { ImageUp, LucideAngularModule, Palette } from 'lucide-angular'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { BusinessService } from '@services/business.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { LoggingService } from '@services/logging.service'
import { MenuDesignDataService } from '@services/menu-design-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { MenuDesign } from '@models/menu-design.model'
import { MenuDesignListPage } from './menu-design-list.page'

function design(_id: string, name: string, createdBy = 'owner'): MenuDesign {
  return {
    ...baseDesign('classic'),
    _id,
    name,
    schemaVersion: 2,
    businessId: 'b1',
    createdBy,
    createdAt: 1,
    updatedAt: 1
  }
}

describe('MenuDesignListPage', () => {
  let fixture: ComponentFixture<MenuDesignListPage>
  let data: jasmine.SpyObj<MenuDesignDataService>
  let business: jasmine.SpyObj<BusinessService>
  let confirm: jasmine.SpyObj<ConfirmModalService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  const designs = signal<MenuDesign[]>([])
  const loadFailed = signal(false)
  const defaultId = signal('d1')
  const isOwner = signal(true)

  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector)
  const cards = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('article.design-card'))
  const card = (id: string): HTMLElement => el(`article[data-design="${id}"]`)
  const action = (id: string, name: string): HTMLButtonElement | null =>
    card(id).querySelector(`[data-action="${name}"]`)
  const settle = async (): Promise<void> => {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    designs.set([design('d1', 'ערב'), design('d2', 'ערב חתונה', 'staff')])
    loadFailed.set(false)
    defaultId.set('d1')
    isOwner.set(true)

    data = jasmine.createSpyObj<MenuDesignDataService>(
      'MenuDesignDataService',
      ['ensureLoaded', 'duplicateDesign', 'updateDesign', 'deleteDesign'],
      {
        allDesigns_: designs.asReadonly(),
        loadFailed_: loadFailed.asReadonly(),
        defaultDesign_: computed(() => designs().find((d) => d._id === defaultId()) ?? null)
      }
    )
    data.ensureLoaded.and.resolveTo()
    data.duplicateDesign.and.resolveTo(design('d3', 'ערב (עותק)'))
    data.updateDesign.and.callFake((d: MenuDesign) => Promise.resolve(d))
    data.deleteDesign.and.resolveTo()
    business = jasmine.createSpyObj<BusinessService>('BusinessService', ['setMenuDesignDefault'])
    business.setMenuDesignDefault.and.callFake((id: string) => {
      defaultId.set(id)
      return Promise.resolve()
    })
    confirm = jasmine.createSpyObj<ConfirmModalService>('ConfirmModalService', ['open'])
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((key: string | undefined) =>
      key === 'menu_design_delete_confirm' ? 'למחוק את "{name}"?' : (key ?? '')
    )

    await TestBed.configureTestingModule({
      imports: [MenuDesignListPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Palette, ImageUp })],
      providers: [
        provideRouter([]),
        { provide: MenuDesignDataService, useValue: data },
        { provide: BusinessService, useValue: business },
        { provide: ConfirmModalService, useValue: confirm },
        { provide: UserMsgService, useValue: userMsg },
        { provide: TranslationService, useValue: translation },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        { provide: UserService, useValue: { isOwner_: isOwner.asReadonly() } },
        {
          provide: PermissionService,
          useValue: {
            can: (_action: string, ctx: { doc: MenuDesign }) => isOwner() || ctx.doc.createdBy === 'staff'
          }
        }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(MenuDesignListPage)
    fixture.detectChanges()
  })

  it('shows the title, the explanation and one card per design with its colours, title font and default chip', () => {
    expect(el('h1').textContent).toContain('menu_designs')
    expect(el('.designs-intro').textContent?.trim()).toBe('menu_designs_intro')
    expect(cards().length).toBe(2)
    expect(card('d1').querySelector('.design-card__name')?.textContent?.trim()).toBe('ערב')
    expect(card('d1').querySelectorAll('.design-card__dot').length).toBe(6)
    expect(card('d1').querySelector('.design-card__font')?.textContent?.trim()).toBe('Frank Ruhl Libre')
    expect(card('d1').querySelector('.design-card__default')?.textContent?.trim()).toBe('menu_design_default_chip')
    expect(card('d2').querySelector('.design-card__default')).toBeNull()
  })

  it('keeps every card on one line', () => {
    const host: HTMLElement = fixture.nativeElement
    host.style.display = 'block'
    document.body.appendChild(host)
    const middles = Array.from(card('d1').children)
      .map((child) => child.getBoundingClientRect())
      .filter((box) => box.height > 0)
      .map((box) => box.top + box.height / 2)
    expect(Math.max(...middles) - Math.min(...middles)).toBeLessThan(4)
    host.remove()
  })

  it('searches by name', () => {
    const search = el<HTMLInputElement>('#menu-design-search')
    search.value = 'חתונה'
    search.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(cards().map((c) => c.dataset['design'])).toEqual(['d2'])

    search.value = 'אין כזה'
    search.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    expect(cards().length).toBe(0)
    expect(el('app-empty-state').textContent).toContain('menu_designs_no_match')
  })

  it('with no designs says so and offers a new one', () => {
    designs.set([])
    fixture.detectChanges()
    expect(el('app-empty-state').textContent).toContain('menu_designs_empty')
    el('app-empty-state button').click()
    fixture.detectChanges()
    expect(el('app-base-template-picker')).not.toBeNull()
  })

  it('a failed load shows the error with a retry', () => {
    designs.set([])
    loadFailed.set(true)
    fixture.detectChanges()
    expect(el('app-empty-state').textContent).toContain('menu_design_load_failed')
    el('app-empty-state button').click()
    expect(data.ensureLoaded).toHaveBeenCalled()
  })

  it('a picked base opens the new design page', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    el('[data-testid="menu-design-new"]').click()
    fixture.detectChanges()
    el('.base-picker__pick[data-base="modern"]').click()
    fixture.detectChanges()
    expect(navigate).toHaveBeenCalledWith(['/menu-design/new'], { queryParams: { base: 'modern' } })
    expect(el('app-base-template-picker')).toBeNull()
  })

  it('the pencil opens the design', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    action('d2', 'edit')!.click()
    expect(navigate).toHaveBeenCalledWith(['/menu-design', 'd2'])
  })

  it('row actions are icon buttons with no text', () => {
    const buttons = Array.from(card('d2').querySelectorAll<HTMLButtonElement>('.ram-popover button'))
    expect(buttons.map((b) => b.dataset['action'])).toEqual(['edit', 'rename', 'duplicate', 'default', 'delete'])
    for (const button of buttons) {
      expect(button.classList).toContain('c-icon-btn')
      expect(button.textContent?.trim()).toBe('')
      expect(button.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('renames in place', async () => {
    action('d2', 'rename')!.click()
    fixture.detectChanges()
    const field = card('d2').querySelector<HTMLInputElement>('app-inline-rename-field input')!
    field.value = 'ערב קיץ'
    field.dispatchEvent(new Event('input'))
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await settle()
    expect(data.updateDesign).toHaveBeenCalledOnceWith(jasmine.objectContaining({ _id: 'd2', name: 'ערב קיץ' }))
    expect(el('app-inline-rename-field')).toBeNull()
  })

  it('a refused rename keeps the field open and says so', async () => {
    data.updateDesign.and.rejectWith(new Error('no'))
    action('d2', 'rename')!.click()
    fixture.detectChanges()
    const field = card('d2').querySelector<HTMLInputElement>('app-inline-rename-field input')!
    field.value = 'אחר'
    field.dispatchEvent(new Event('input'))
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await settle()
    expect(el('app-inline-rename-field')).not.toBeNull()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
  })

  it('duplicates a design', async () => {
    action('d2', 'duplicate')!.click()
    await settle()
    expect(data.duplicateDesign).toHaveBeenCalledOnceWith('d2')
  })

  it('moves the default chip when the owner sets another default', async () => {
    expect(action('d1', 'default')).toBeNull()
    action('d2', 'default')!.click()
    await settle()
    expect(business.setMenuDesignDefault).toHaveBeenCalledOnceWith('d2')
    expect(card('d2').querySelector('.design-card__default')).not.toBeNull()
    expect(card('d1').querySelector('.design-card__default')).toBeNull()
  })

  it('delete asks first, and cancel changes nothing', async () => {
    confirm.open.and.resolveTo(false)
    action('d2', 'delete')!.click()
    await settle()
    expect(confirm.open).toHaveBeenCalledOnceWith('למחוק את "ערב חתונה"?', {
      variant: 'danger',
      saveLabel: 'menu_design_confirm'
    })
    expect(data.deleteDesign).not.toHaveBeenCalled()
  })

  it('delete removes the design after the yes', async () => {
    confirm.open.and.resolveTo(true)
    action('d2', 'delete')!.click()
    await settle()
    expect(data.deleteDesign).toHaveBeenCalledOnceWith('d2')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('menu_design_deleted')
  })

  it('staff edit and delete only their own designs and never set the default', () => {
    isOwner.set(false)
    // The permission answers are read with the designs list.
    designs.set([...designs()])
    fixture.detectChanges()
    expect(action('d1', 'edit')).toBeNull()
    expect(action('d1', 'rename')).toBeNull()
    expect(action('d1', 'delete')).toBeNull()
    expect(action('d1', 'duplicate')).not.toBeNull()
    expect(action('d2', 'edit')).not.toBeNull()
    expect(action('d2', 'delete')).not.toBeNull()
    expect(action('d2', 'default')).toBeNull()
  })
})
