import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, Settings } from 'lucide-angular'
import { FrontdeskSettingsPage } from './frontdesk-settings.page'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { PermissionService } from '@services/permission.service'
import { StorageService } from '@services/async-storage.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { templateFor } from '@schemas/front-desk-templates'
import type { FrontDeskProfile } from '@models/front-desk-profile.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

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
  let data: { createFromTemplate: jasmine.Spy; save: jasmine.Spy }
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

  async function setup(initial: FrontDeskProfile | null, owner = true): Promise<void> {
    profile_ = signal(initial)
    data = {
      createFromTemplate: jasmine.createSpy('create').and.resolveTo(profile()),
      save: jasmine.createSpy('save').and.callFake(async (p: FrontDeskProfile) => p)
    }
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      imports: [FrontdeskSettingsPage, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Settings })],
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
        { provide: PermissionService, useValue: { can: () => owner } },
        { provide: StorageService, useValue: { query: () => Promise.resolve([]) } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        { provide: UserMsgService, useValue: userMsg },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true) } }
      ]
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

  it('a staff member without a profile sees the empty state', async () => {
    await setup(null, false)
    expect(el().querySelector('[data-testid="no-profile-staff"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="type-picker"]')).toBeNull()
  })
})
