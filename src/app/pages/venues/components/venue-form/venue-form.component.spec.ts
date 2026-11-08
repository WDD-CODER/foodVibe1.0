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
  operatingHours: [{ days: 'א׳–ה׳', time: '08:00–23:00' }]
}

/** The protected form, reached the same way the template does. */
type FormAccess = { venueForm_: { get: (k: string) => { setValue: (v: unknown) => void } } }

describe('VenueFormComponent (pending-changes guard contract)', () => {
  let fixture: ComponentFixture<VenueFormComponent>
  let component: VenueFormComponent
  let venueData: {
    ensureLoaded: jasmine.Spy
    allVenues_: ReturnType<typeof signal>
    addVenue: jasmine.Spy
    updateVenue: jasmine.Spy
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
      updateVenue: jasmine.createSpy('updateVenue').and.resolveTo()
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

  describe('opening hours rows (plan 537)', () => {
    type Hours = {
      venueForm_: { get: (k: string) => { setValue: (v: unknown) => void } }
      addHoursRow: () => void
      removeHoursRow: (i: number) => void
      hoursArray: { at: (i: number) => { patchValue: (v: unknown) => void; value: unknown }; value: unknown[] }
      hoursErrors_: () => Record<number, string>
    }
    const hours = () => component as unknown as Hours
    const addRow = (row: { days?: string; open?: string; close?: string }) => {
      hours().addHoursRow()
      const i = hours().hoursArray.value.length - 1
      hours().hoursArray.at(i).patchValue(row)
    }
    const sentHours = (spy: jasmine.Spy) => (spy.calls.mostRecent().args[0] as VenueProfile).operatingHours

    it('drops an empty row and saves', async () => {
      await setup(null)
      setName('אולם')
      hours().addHoursRow()
      expect(await component.saveAndWait()).toBeTrue()
      expect(venueData.addVenue.calls.mostRecent().args[0].operatingHours).toEqual([])
    })

    it('blocks a row with only an open time and marks it', async () => {
      await setup(null)
      setName('אולם')
      addRow({ days: 'א׳', open: '10:00' })
      expect(await component.saveAndWait()).toBeFalse()
      expect(venueData.addVenue).not.toHaveBeenCalled()
      expect(hours().hoursErrors_()[0]).toBe('missing_time')
      expect(TestBed.inject(UserMsgService).onSetErrorMsg).toHaveBeenCalled()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.hours-error')?.textContent).toContain('venue_hours_missing_time')
    })

    it('blocks equal open and close', async () => {
      await setup(null)
      setName('אולם')
      addRow({ days: 'א׳', open: '18:00', close: '18:00' })
      expect(await component.saveAndWait()).toBeFalse()
      expect(hours().hoursErrors_()[0]).toBe('same_time')
    })

    it('saves an overnight row and shows the +1 marker', async () => {
      await setup(null)
      setName('אולם')
      addRow({ days: 'ה׳', open: '18:00', close: '02:00' })
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.hours-next-day')?.textContent).toContain('+1')
      expect(await component.saveAndWait()).toBeTrue()
      expect(sentHours(venueData.addVenue)).toEqual([{ days: 'ה׳', time: '18:00–02:00' }])
    })

    it('saves a valid row as days and an en-dash range', async () => {
      await setup(null)
      setName('אולם')
      addRow({ days: 'א׳–ה׳', open: '08:00', close: '23:00' })
      await component.saveAndWait()
      expect(sentHours(venueData.addVenue)).toEqual([{ days: 'א׳–ה׳', time: '08:00–23:00' }])
    })

    it('hydrates a stored range into open and close', async () => {
      await setup(VENUE)
      expect(hours().hoursArray.value[0]).toEqual(
        jasmine.objectContaining({ days: 'א׳–ה׳', open: '08:00', close: '23:00' })
      )
      expect(component.hasRealChanges()).toBeFalse()
    })

    it('blocks a stored time that does not parse until the row is removed', async () => {
      await setup({ ...VENUE, operatingHours: [{ days: 'א׳', time: 'ערב' }] })
      expect(await component.saveAndWait()).toBeFalse()
      expect(venueData.updateVenue).not.toHaveBeenCalled()
      expect(hours().hoursErrors_()[0]).toBe('missing_time')
      hours().removeHoursRow(0)
      expect(await component.saveAndWait()).toBeTrue()
      expect(sentHours(venueData.updateVenue)).toEqual([])
    })
  })
})
