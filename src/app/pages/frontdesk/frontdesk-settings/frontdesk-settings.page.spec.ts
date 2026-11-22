import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { Component, signal, WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, QrCode, Settings } from 'lucide-angular'
import { FrontdeskSettingsPage } from './frontdesk-settings.page'
import { DataExportCardComponent } from './components/data-export-card/data-export-card.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { ModuleService } from '@services/module.service'
import { PermissionService } from '@services/permission.service'
import { StorageService } from '@services/async-storage.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { templateFor } from '@schemas/front-desk-templates'
import type { FrontDeskProfile } from '@models/front-desk-profile.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({ selector: 'app-data-export-card', standalone: true, template: '' })
class StubExportCardComponent {}

const profile = (): FrontDeskProfile =>
  ({
    _id: 'p1',
    ...templateFor('catering'),
    slug: 'my-place',
    displayName: 'המקום'
  }) as unknown as FrontDeskProfile

describe('FrontdeskSettingsPage (plan 553)', () => {
  let fixture: ComponentFixture<FrontdeskSettingsPage>
  let profile_: WritableSignal<FrontDeskProfile | null>
  let data: { createFromTemplate: jasmine.Spy; save: jasmine.Spy; setConfirmMode: jasmine.Spy }
  let userMsg: jasmine.SpyObj<UserMsgService>

  type Internals = {
    hasRealChanges: () => boolean
    patch: (c: object) => void
    save: () => Promise<void>
    create: () => Promise<void>
    newType_: WritableSignal<string>
    newName_: WritableSignal<string>
    newSlug_: WritableSignal<string>
    createSlugTaken_: () => boolean
    slugTaken_: () => boolean
    setKind: (k: string, c: unknown) => void
  }
  const cmp = (): Internals => fixture.componentInstance as unknown as Internals
  const el = (): HTMLElement => fixture.nativeElement
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setup(initial: FrontDeskProfile | null, owner = true, tables = false): Promise<void> {
    profile_ = signal(initial)
    data = {
      setConfirmMode: jasmine.createSpy('setConfirmMode').and.resolveTo(true),
      createFromTemplate: jasmine.createSpy('create').and.resolveTo(profile()),
      save: jasmine.createSpy('save').and.callFake(async (p: FrontDeskProfile) => p)
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [FrontdeskSettingsPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Settings, QrCode })],
      providers: [
        provideRouter([]),
        {
          provide: FrontDeskProfileDataService,
          useValue: {
            profile_,
            ensureLoaded: () => Promise.resolve(),
            reloadFromStorage: () => Promise.resolve(),
            ...data
          }
        },
        { provide: ModuleService, useValue: { has: (k: string) => tables || k !== 'tables' } },
        { provide: PermissionService, useValue: { can: () => owner } },
        { provide: StorageService, useValue: { query: () => Promise.resolve([]) } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true) } }
      ]
    })
    TestBed.overrideComponent(FrontdeskSettingsPage, {
      remove: { imports: [DataExportCardComponent] },
      add: { imports: [StubExportCardComponent] }
    })
    fixture = TestBed.createComponent(FrontdeskSettingsPage)
    await settle()
  }

  it('shows the type picker when there is no profile', async () => {
    await setup(null)
    expect(el().querySelector('[data-testid="type-picker"]')).not.toBeNull()
  })

  it('creates the profile from the catering template with the name and slug', async () => {
    await setup(null)
    cmp().newType_.set('catering')
    cmp().newName_.set('הקייטרינג')
    cmp().newSlug_.set('my-catering')
    await cmp().create()
    expect(data.createFromTemplate).toHaveBeenCalledOnceWith('catering', 'my-catering', 'הקייטרינג')
    expect(Object.keys(templateFor('catering').requestKinds).length).toBeGreaterThan(0)
  })

  it('does not create with an invalid slug', async () => {
    await setup(null)
    cmp().newType_.set('catering')
    cmp().newName_.set('x')
    cmp().newSlug_.set('Bad Slug')
    await cmp().create()
    expect(data.createFromTemplate).not.toHaveBeenCalled()
  })

  it('shows the slug-taken error when create answers 409 SLUG_TAKEN', async () => {
    await setup(null)
    data.createFromTemplate.and.rejectWith(
      new HttpErrorResponse({ status: 409, error: { error: 'SLUG_TAKEN', messageKey: 'fd_slug_taken' } })
    )
    cmp().newType_.set('catering')
    cmp().newName_.set('x')
    cmp().newSlug_.set('taken-slug')
    await cmp().create()
    await settle()
    expect(cmp().createSlugTaken_()).toBeTrue()
    expect(el().textContent).toContain('fd_slug_taken')
  })

  it('hasRealChanges is true after an edit and false after a save', async () => {
    await setup(profile())
    expect(cmp().hasRealChanges()).toBeFalse()
    cmp().patch({ displayName: 'שם חדש' })
    expect(cmp().hasRealChanges()).toBeTrue()
    await cmp().save()
    expect(data.save).toHaveBeenCalledTimes(1)
    const body = data.save.calls.mostRecent().args[0]
    expect(body.displayName).toBe('שם חדש')
    expect('status' in body).toBeFalse()
    expect('whatsapp' in body).toBeFalse()
    expect(cmp().hasRealChanges()).toBeFalse()
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('fd_settings_saved')
  })

  it('shows the slug-taken error on the slug field when save answers 409', async () => {
    await setup(profile())
    data.save.and.rejectWith(new HttpErrorResponse({ status: 409, error: { error: 'SLUG_TAKEN' } }))
    cmp().patch({ slug: 'someone-else' })
    await cmp().save()
    await settle()
    expect(cmp().slugTaken_()).toBeTrue()
    expect(cmp().hasRealChanges()).toBeTrue()
  })

  it('blocks the save when the minimum party is above the maximum', async () => {
    await setup(profile())
    const kind = Object.keys(profile().requestKinds)[0]
    const config = profile().requestKinds[kind as 'table']!
    cmp().setKind(kind, { ...config, enabled: true, rules: { minPartySize: 10, maxPartySize: 5 } })
    await cmp().save()
    expect(data.save).not.toHaveBeenCalled()
  })

  it('a staff member sees every control disabled and no save button', async () => {
    await setup(profile(), false)
    expect(el().querySelector('[data-testid="save"]')).toBeNull()
    expect(el().querySelector('[data-testid="owner-only"]')).not.toBeNull()
    expect(el().querySelector('fieldset.fs-fieldset')?.hasAttribute('disabled')).toBeTrue()
  })

  describe('table service (plan 667)', () => {
    const withService = (): FrontDeskProfile =>
      ({ ...profile(), tableService: { confirmMode: 'auto', holdMinutes: 20 } }) as unknown as FrontDeskProfile

    it('without the tables module renders no card and no QR block, and saves no tableService', async () => {
      await setup(profile())
      expect(el().querySelector('[data-testid="table-service-card"]')).toBeNull()
      expect(el().querySelector('[data-testid="booking-qr"]')).toBeNull()
      cmp().patch({ displayName: 'שם חדש' })
      await cmp().save()
      expect('tableService' in data.save.calls.mostRecent().args[0]).toBeFalse()
    })

    it('with the tables module renders the card and the QR block', async () => {
      await setup(profile(), true, true)
      expect(el().querySelector('[data-testid="table-service-card"]')).not.toBeNull()
      expect(el().querySelector('[data-testid="booking-qr"]')).not.toBeNull()
      expect(el().querySelector('[data-testid="print-qr"]')).not.toBeNull()
    })

    it('saves the edited fields with the profile current confirmMode', async () => {
      await setup(withService(), true, true)
      const d = (cmp() as unknown as { draft_: () => { tableService: object } }).draft_()
      cmp().patch({ tableService: { ...d.tableService, bufferMinutes: 10 } })
      await cmp().save()
      const body = data.save.calls.mostRecent().args[0]
      expect(body.tableService.bufferMinutes).toBe(10)
      expect(body.tableService.holdMinutes).toBe(20)
      expect(body.tableService.confirmMode).toBe('auto')
    })

    it('blocks the save on an invalid table setting', async () => {
      await setup(profile(), true, true)
      const d = (cmp() as unknown as { draft_: () => { tableService: object } }).draft_()
      cmp().patch({ tableService: { ...d.tableService, holdMinutes: 4 } })
      await cmp().save()
      expect(data.save).not.toHaveBeenCalled()
    })

    it('the switch is saved by its own call and is not an unsaved change', async () => {
      await setup(profile(), true, true)
      const sw = el().querySelector('[data-testid="confirm-mode-switch"]') as HTMLInputElement
      sw.click()
      await settle()
      expect(data.setConfirmMode).toHaveBeenCalledOnceWith('auto')
      expect(data.save).not.toHaveBeenCalled()
      expect(cmp().hasRealChanges()).toBeFalse()
      expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('fd_ts_mode_saved')
    })

    it('a failed switch shows the error toast', async () => {
      await setup(profile(), true, true)
      data.setConfirmMode.and.resolveTo(false)
      ;(el().querySelector('[data-testid="confirm-mode-switch"]') as HTMLInputElement).click()
      await settle()
      expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('save_failed')
    })

    it('staff see the switch disabled', async () => {
      await setup(profile(), false, true)
      expect((el().querySelector('[data-testid="confirm-mode-switch"]') as HTMLInputElement).disabled).toBeTrue()
    })
  })

  it('a staff member without a profile sees the empty state', async () => {
    await setup(null, false)
    expect(el().querySelector('[data-testid="no-profile-staff"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="type-picker"]')).toBeNull()
  })
})
