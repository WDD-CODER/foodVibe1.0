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

  async function setup(venue: VenueProfile | null): Promise<void> {
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
          useValue: { ensureLoaded: () => Promise.resolve(), allEquipment_: signal([]) }
        },
        { provide: ActivatedRoute, useValue: { data: of({ venue }), snapshot: { data: { venue } } } },
        { provide: Router, useValue: router },
        { provide: RequireAuthService, useValue: { requireAuth: () => true } },
        { provide: CloudinaryService, useValue: {} },
        { provide: UserMsgService, useValue: jasmine.createSpyObj('UserMsgService', ['onSetErrorMsg']) },
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
})
