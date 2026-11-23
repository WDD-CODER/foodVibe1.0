import { HttpErrorResponse } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { VenueFormComponent } from './venue-form.component'
import { VenueDataService } from '@services/venue-data.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { CloudinaryService } from '@services/cloudinary.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { VenueProfile } from '@models/venue.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const VENUE: VenueProfile = {
  _id: 'v1',
  nameHebrew: 'אולם',
  environmentType: 'professional_kitchen',
  availableInfrastructure: [],
  createdAt: 1,
  operatingHours: [{ days: 'א׳–ה׳', time: '08:00–23:00', dayIndexes: [0, 1, 2, 3, 4], open: '08:00', close: '23:00' }]
}

/** The protected form, reached the same way the template does. */
type FormAccess = { venueForm_: { get: (k: string) => { setValue: (v: unknown) => void; value: unknown } } }

describe('VenueFormComponent (pending-changes guard contract)', () => {
  let fixture: ComponentFixture<VenueFormComponent>
  let component: VenueFormComponent
  let venueData: {
    ensureLoaded: jasmine.Spy
    allVenues_: ReturnType<typeof signal>
    addVenue: jasmine.Spy
    updateVenue: jasmine.Spy
    reverseGeocode: jasmine.Spy
  }
  let router: jasmine.SpyObj<Router>

  function setName(value: string): void {
    const access = component as unknown as FormAccess
    access.venueForm_.get('nameHebrew').setValue(value)
  }

  async function setup(venue: VenueProfile | null, equipment: unknown[] = []): Promise<void> {
    venueData = {
      ensureLoaded: jasmine.createSpy('ensureLoaded').and.resolveTo(),
      allVenues_: signal<VenueProfile[]>([]),
      addVenue: jasmine.createSpy('addVenue').and.resolveTo(),
      updateVenue: jasmine.createSpy('updateVenue').and.resolveTo(),
      reverseGeocode: jasmine.createSpy('reverseGeocode').and.resolveTo(null)
    }
    router = jasmine.createSpyObj<Router>('Router', ['navigate'])
    router.navigate.and.resolveTo(true)
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [VenueFormComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: VenueDataService, useValue: venueData },
        {
          provide: EquipmentDataService,
          useValue: { ensureLoaded: () => Promise.resolve(), allEquipment_: signal(equipment) }
        },
        { provide: ActivatedRoute, useValue: { data: of({ venue }), snapshot: { data: { venue } } } },
        { provide: Router, useValue: router },
        { provide: RequireAuthService, useValue: { requireAuth: () => true } },
        { provide: CloudinaryService, useValue: {} },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg', 'onLineRemoved'])
        },
        { provide: TranslationService, useValue: translation }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(VenueFormComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('has no real changes right after loading an existing venue', async () => {
    await setup(VENUE)
    expect(component.hasRealChanges()).toBeFalse()
    expect(component.isSubmitted).toBeFalse()
  })

  it('reports real changes once a field is edited', async () => {
    await setup(VENUE)
    setName('אולם חדש')
    expect(component.hasRealChanges()).toBeTrue()
  })

  it('saveAndWait saves, marks submitted and does not navigate', async () => {
    await setup(VENUE)
    setName('אולם חדש')
    const ok = await component.saveAndWait()
    expect(ok).toBeTrue()
    expect(component.isSubmitted).toBeTrue()
    expect(venueData.updateVenue).toHaveBeenCalled()
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('saveAndWait resolves false and stays unsubmitted when validation fails', async () => {
    await setup(null)
    const ok = await component.saveAndWait()
    expect(ok).toBeFalse()
    expect(component.isSubmitted).toBeFalse()
    expect(venueData.addVenue).not.toHaveBeenCalled()
  })

  it('plan 540: a 400 too_big on nameHebrew marks the name and adds no toast of its own', async () => {
    await setup(VENUE)
    setName('אולם חדש')
    venueData.updateVenue.and.rejectWith(
      new HttpErrorResponse({
        status: 400,
        url: '/api/v1/data/venues/v1',
        error: { error: 'Validation failed', issues: [{ path: 'nameHebrew', code: 'too_big', message: 'Too big' }] }
      })
    )
    expect(await component.saveAndWait()).toBeFalse()
    expect((component as unknown as { nameError(): string | null }).nameError()).toBe('server_field_too_long')
    const msg = TestBed.inject(UserMsgService) as jasmine.SpyObj<UserMsgService>
    expect(msg.onSetErrorMsg).not.toHaveBeenCalled()
  })

  describe('infrastructure vs equipment groups', () => {
    const EQ = [
      { _id: 'e1', nameHebrew: 'תנור', category: 'infrastructure' },
      { _id: 'e2', nameHebrew: 'סיר', category: 'tool' }
    ]
    const WITH_ROWS: VenueProfile = {
      ...VENUE,
      availableInfrastructure: [
        { equipmentId: 'e1', availableQuantity: 2 },
        { equipmentId: 'e2', availableQuantity: 3 },
        { equipmentId: 'gone', availableQuantity: 1 }
      ]
    }
    type Rows = { infraArray: { value: { group: string }[] } }

    it('places hydrated rows by category; unknown equipment goes to other', async () => {
      await setup(WITH_ROWS, EQ)
      const groups = (component as unknown as Rows).infraArray.value.map((r) => r.group)
      expect(groups).toEqual(['infra', 'other', 'other'])
    })

    it('saves the payload without the group field', async () => {
      await setup(WITH_ROWS, EQ)
      setName('אולם חדש')
      await component.saveAndWait()
      const payload = venueData.updateVenue.calls.mostRecent().args[0] as VenueProfile
      expect(payload.availableInfrastructure).toEqual([
        { equipmentId: 'e1', availableQuantity: 2 },
        { equipmentId: 'e2', availableQuantity: 3 },
        { equipmentId: 'gone', availableQuantity: 1 }
      ])
    })
  })

  describe('opening hours rows (plan 537, plan 372)', () => {
    type Hours = {
      hoursRows_: { (): { dayIndexes: number[]; open: string; close: string }[]; set: (v: unknown[]) => void }
      hoursSubmitAttempted_: () => boolean
    }
    const hours = () => component as unknown as Hours
    const row = (r: { dayIndexes?: number[]; open?: string; close?: string }) => ({
      dayIndexes: [],
      open: '',
      close: '',
      openInvalid: false,
      closeInvalid: false,
      ...r
    })
    const addRow = (r: { dayIndexes?: number[]; open?: string; close?: string }) =>
      hours().hoursRows_.set([...hours().hoursRows_(), row(r)])
    const sentHours = (spy: jasmine.Spy) => (spy.calls.mostRecent().args[0] as VenueProfile).operatingHours

    it('drops an empty row and saves', async () => {
      await setup(null)
      setName('אולם')
      addRow({})
      expect(await component.saveAndWait()).toBeTrue()
      expect(venueData.addVenue.calls.mostRecent().args[0].operatingHours).toEqual([])
    })

    it('blocks a row with only an open time and marks it', async () => {
      await setup(null)
      setName('אולם')
      addRow({ dayIndexes: [0], open: '10:00' })
      expect(await component.saveAndWait()).toBeFalse()
      expect(venueData.addVenue).not.toHaveBeenCalled()
      expect(hours().hoursSubmitAttempted_()).toBeTrue()
      expect(TestBed.inject(UserMsgService).onSetErrorMsg).toHaveBeenCalled()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.hours-error')?.textContent).toContain('venue_hours_missing_time')
    })

    it('blocks equal open and close', async () => {
      await setup(null)
      setName('אולם')
      addRow({ dayIndexes: [0], open: '18:00', close: '18:00' })
      expect(await component.saveAndWait()).toBeFalse()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.hours-error')?.textContent).toContain('venue_hours_same_time')
    })

    it('saves an overnight row and shows the +1 marker', async () => {
      await setup(null)
      setName('אולם')
      addRow({ dayIndexes: [4], open: '18:00', close: '02:00' })
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.hours-next-day')).not.toBeNull()
      expect(await component.saveAndWait()).toBeTrue()
      expect(sentHours(venueData.addVenue)).toEqual([
        { days: 'ה׳', time: '18:00–02:00', dayIndexes: [4], open: '18:00', close: '02:00' }
      ])
    })

    it('saves a valid row as structured fields plus generated strings', async () => {
      await setup(null)
      setName('אולם')
      addRow({ dayIndexes: [0, 1, 2, 3, 4], open: '08:00', close: '23:00' })
      await component.saveAndWait()
      expect(sentHours(venueData.addVenue)).toEqual([
        { days: 'א׳–ה׳', time: '08:00–23:00', dayIndexes: [0, 1, 2, 3, 4], open: '08:00', close: '23:00' }
      ])
    })

    it('hydrates structured hours into the picker without marking changes', async () => {
      await setup(VENUE)
      expect(hours().hoursRows_()[0]).toEqual(
        jasmine.objectContaining({ dayIndexes: [0, 1, 2, 3, 4], open: '08:00', close: '23:00' })
      )
      expect(component.hasRealChanges()).toBeFalse()
    })

    it('blocks a stored time that does not parse until the row is removed', async () => {
      await setup({ ...VENUE, operatingHours: [{ days: 'א׳', time: 'ערב', dayIndexes: [0] }] })
      expect(await component.saveAndWait()).toBeFalse()
      expect(venueData.updateVenue).not.toHaveBeenCalled()
      hours().hoursRows_.set([])
      expect(await component.saveAndWait()).toBeTrue()
      expect(sentHours(venueData.updateVenue)).toEqual([])
    })
  })

  describe('contacts (plan 372)', () => {
    type Contacts = {
      addContact: () => void
      contactsArray: { at: (i: number) => { patchValue: (v: unknown) => void } }
    }
    const contacts = () => component as unknown as Contacts

    it('saves two contacts on add', async () => {
      await setup(null)
      setName('אולם')
      contacts().addContact()
      contacts().addContact()
      contacts().contactsArray.at(0).patchValue({ name: 'דנה', phone: '050-1', role: 'מנהלת' })
      contacts().contactsArray.at(1).patchValue({ name: 'רון' })
      expect(await component.saveAndWait()).toBeTrue()
      const sent = venueData.addVenue.calls.mostRecent().args[0] as VenueProfile
      expect(sent.contacts).toEqual([
        { name: 'דנה', phone: '050-1', role: 'מנהלת' },
        { name: 'רון', phone: undefined, role: undefined }
      ])
    })

    it('blocks a contact without a name', async () => {
      await setup(null)
      setName('אולם')
      contacts().addContact()
      expect(await component.saveAndWait()).toBeFalse()
      expect(venueData.addVenue).not.toHaveBeenCalled()
    })

    it('hydrates contacts on edit', async () => {
      await setup({ ...VENUE, contacts: [{ name: 'דנה', role: 'מנהלת' }] })
      setName('אולם חדש')
      await component.saveAndWait()
      expect((venueData.updateVenue.calls.mostRecent().args[0] as VenueProfile).contacts).toEqual([
        { name: 'דנה', phone: undefined, role: 'מנהלת' }
      ])
    })
  })

  describe('tour videos (plan 373)', () => {
    type Videos = {
      addVideo: () => void
      videosArray: { at: (i: number) => { patchValue: (v: unknown) => void }; length: number }
    }
    const videos = () => component as unknown as Videos
    const visit = new Date(2026, 10, 3).getTime()

    it('saves a video with its visit date as local midnight and a trimmed note', async () => {
      await setup(null)
      setName('אולם')
      videos().addVideo()
      videos().videosArray.at(0).patchValue({ url: ' https://youtu.be/abc ', visitDate: '2026-11-03', note: ' סיור ' })
      expect(await component.saveAndWait()).toBeTrue()
      expect((venueData.addVenue.calls.mostRecent().args[0] as VenueProfile).videos).toEqual([
        { url: 'https://youtu.be/abc', visitDate: visit, note: 'סיור' }
      ])
    })

    it('blocks a link that is not https', async () => {
      await setup(null)
      setName('אולם')
      videos().addVideo()
      videos().videosArray.at(0).patchValue({ url: 'http://example.com/v' })
      expect(await component.saveAndWait()).toBeFalse()
      expect(venueData.addVenue).not.toHaveBeenCalled()
    })

    it('hydrates videos on edit without marking changes, and keeps them on save', async () => {
      await setup({ ...VENUE, videos: [{ url: 'https://drive.google.com/x', visitDate: visit }] })
      expect(videos().videosArray.length).toBe(1)
      expect(component.hasRealChanges()).toBeFalse()
      setName('אולם חדש')
      await component.saveAndWait()
      expect((venueData.updateVenue.calls.mostRecent().args[0] as VenueProfile).videos).toEqual([
        { url: 'https://drive.google.com/x', visitDate: visit, note: undefined }
      ])
    })

    it('counts an added video as an unsaved change', async () => {
      await setup(VENUE)
      videos().addVideo()
      expect(component.hasRealChanges()).toBeTrue()
    })
  })

  describe('current location (plan 373)', () => {
    type Loc = {
      useCurrentLocation: () => void
      clearLocation: () => void
      location_: () => unknown
      locationError_: () => string | null
      locationLabel_: () => string
    }
    const loc = () => component as unknown as Loc
    let getPosition: jasmine.Spy

    beforeEach(() => {
      getPosition = spyOn(navigator.geolocation, 'getCurrentPosition')
    })

    it('stores lat/lng with rounded accuracy and sends it on save', async () => {
      getPosition.and.callFake((ok: PositionCallback) =>
        ok({ coords: { latitude: 32.1, longitude: 34.8, accuracy: 14.6 } } as GeolocationPosition)
      )
      await setup(null)
      setName('אולם')
      loc().useCurrentLocation()
      expect(loc().location_()).toEqual({ lat: 32.1, lng: 34.8, accuracy: 15 })
      expect(loc().locationLabel_()).toBe('location_saved location_accuracy')
      expect(component.hasRealChanges()).toBeTrue()
      expect(await component.saveAndWait()).toBeTrue()
      expect((venueData.addVenue.calls.mostRecent().args[0] as VenueProfile).location).toEqual({
        lat: 32.1,
        lng: 34.8,
        accuracy: 15
      })
    })

    it('shows the denied message and keeps the form usable', async () => {
      getPosition.and.callFake((_ok: PositionCallback, fail: PositionErrorCallback) =>
        fail({ code: 1 } as GeolocationPositionError)
      )
      await setup(null)
      loc().useCurrentLocation()
      expect(loc().location_()).toBeNull()
      expect(loc().locationError_()).toBe('location_denied')
      setName('אולם')
      expect(await component.saveAndWait()).toBeTrue()
    })

    it('shows the unavailable message on a timeout', async () => {
      getPosition.and.callFake((_ok: PositionCallback, fail: PositionErrorCallback) =>
        fail({ code: 3 } as GeolocationPositionError)
      )
      await setup(null)
      loc().useCurrentLocation()
      expect(loc().locationError_()).toBe('location_unavailable')
    })

    it('hydrates a saved location and clears it', async () => {
      await setup({ ...VENUE, location: { lat: 1, lng: 2 } })
      expect(loc().location_()).toEqual({ lat: 1, lng: 2 })
      expect(component.hasRealChanges()).toBeFalse()
      loc().clearLocation()
      expect(component.hasRealChanges()).toBeTrue()
      await component.saveAndWait()
      expect((venueData.updateVenue.calls.mostRecent().args[0] as VenueProfile).location).toBeNull()
    })

    it('puts the location pin inside the address field and shows no address hint (Human 2026-11-23, D7)', async () => {
      await setup({ ...VENUE, address: '', location: { lat: 1, lng: 2 } })
      fixture.detectChanges()
      const el = fixture.nativeElement as HTMLElement
      const wrapper = el.querySelector('.venue-address-input')
      expect(wrapper?.querySelector('#address')).not.toBeNull()
      expect(wrapper?.querySelector('.location-btn')).not.toBeNull()
      expect(el.querySelector('.venue-location')).toBeNull()
      expect(el.textContent).not.toContain('location_address_hint')
      expect(el.querySelector('.location-saved')).not.toBeNull()
    })

    it('fills an empty address from the pin, shown lighter until the user types (Human 2026-11-23)', async () => {
      getPosition.and.callFake((ok: PositionCallback) =>
        ok({ coords: { latitude: 32.0779, longitude: 34.7741, accuracy: 10 } } as GeolocationPosition)
      )
      await setup(null)
      venueData.reverseGeocode.and.resolveTo('דיזנגוף 50, תל אביב-יפו')
      loc().useCurrentLocation()
      await new Promise((resolve) => setTimeout(resolve))
      fixture.detectChanges()
      const access = component as unknown as FormAccess
      expect(venueData.reverseGeocode).toHaveBeenCalledWith(32.0779, 34.7741)
      expect(access.venueForm_.get('address').value).toBe('דיזנגוף 50, תל אביב-יפו')
      const input = (fixture.nativeElement as HTMLElement).querySelector('#address') as HTMLInputElement
      expect(input.classList).toContain('is-auto')
      access.venueForm_.get('address').setValue('דיזנגוף 52')
      fixture.detectChanges()
      expect(input.classList).not.toContain('is-auto')
    })

    it('never overwrites an address the user typed', async () => {
      getPosition.and.callFake((ok: PositionCallback) =>
        ok({ coords: { latitude: 1, longitude: 2, accuracy: 10 } } as GeolocationPosition)
      )
      await setup(null)
      venueData.reverseGeocode.and.resolveTo('רחוב אחר 1')
      const access = component as unknown as FormAccess
      access.venueForm_.get('address').setValue('הרצל 1')
      loc().useCurrentLocation()
      await new Promise((resolve) => setTimeout(resolve))
      expect(venueData.reverseGeocode).not.toHaveBeenCalled()
      expect(access.venueForm_.get('address').value).toBe('הרצל 1')
    })

    it('sends no location key on add when none was saved', async () => {
      await setup(null)
      setName('אולם')
      await component.saveAndWait()
      expect((venueData.addVenue.calls.mostRecent().args[0] as VenueProfile).location).toBeUndefined()
    })
  })
})
