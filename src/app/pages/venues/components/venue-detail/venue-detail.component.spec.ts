import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, Phone, Play } from 'lucide-angular'
import { VenueDetailComponent } from './venue-detail.component'
import { UserService } from '@services/user.service'
import { EquipmentDataService } from '@services/equipment-data.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { TranslationService } from '@services/translation.service'
import { VenueProfile } from '@models/venue.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const BASE: VenueProfile = {
  _id: 'v1',
  nameHebrew: 'אולם',
  environmentType: 'outdoor_field',
  availableInfrastructure: [],
  createdAt: 1
}

describe('VenueDetailComponent (plan 373: videos and navigation)', () => {
  let fixture: ComponentFixture<VenueDetailComponent>

  async function setup(venue: VenueProfile): Promise<HTMLElement> {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [VenueDetailComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Phone, Play })],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ venue }), snapshot: { data: { venue } } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: UserService, useValue: { isLoggedIn: signal(true) } },
        {
          provide: EquipmentDataService,
          useValue: { ensureLoaded: () => Promise.resolve(), allEquipment_: signal([]) }
        },
        {
          provide: MenuEventDataService,
          useValue: { ensureLoaded: () => Promise.resolve(), allMenuEvents_: signal([]) }
        },
        { provide: TranslationService, useValue: translation }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(VenueDetailComponent)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  it('lists videos newest first with the source label and a new-tab open link', async () => {
    const el = await setup({
      ...BASE,
      videos: [
        { url: 'https://drive.google.com/file/d/old', visitDate: new Date(2026, 0, 5).getTime() },
        { url: 'https://youtu.be/new', visitDate: new Date(2026, 10, 3).getTime(), note: 'סיור שני' },
        { url: 'https://example.com/undated' }
      ]
    })
    const rows = Array.from(el.querySelectorAll('.video-row'))
    expect(rows.length).toBe(3)
    const links = rows.map((r) => r.querySelector('a') as HTMLAnchorElement)
    expect(links.map((a) => a.href)).toEqual([
      'https://youtu.be/new',
      'https://drive.google.com/file/d/old',
      'https://example.com/undated'
    ])
    expect(links.every((a) => a.target === '_blank' && a.rel === 'noopener')).toBeTrue()
    expect(rows[0].textContent).toContain('video_source_youtube')
    expect(rows[0].textContent).toContain('סיור שני')
    expect(rows[1].textContent).toContain('video_source_drive')
    expect(rows[2].textContent).toContain('video_source_link')
  })

  it('shows an empty videos card and no navigate links when the venue has neither', async () => {
    const el = await setup(BASE)
    expect(el.querySelector('.video-row')).toBeNull()
    expect(el.textContent).toContain('venue_videos_empty')
    expect(el.querySelector('.venue-nav')).toBeNull()
  })

  it('builds the navigate links from a typed address when no location is saved', async () => {
    const el = await setup({ ...BASE, address: 'הרצל 1, תל אביב' })
    const q = encodeURIComponent('הרצל 1, תל אביב')
    const hrefs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.venue-nav a')).map((a) => a.href)
    expect(hrefs).toEqual([
      `https://waze.com/ul?q=${q}&navigate=yes`,
      `https://www.google.com/maps/search/?api=1&query=${q}`
    ])
  })

  it('prefers the saved location over the typed address', async () => {
    const el = await setup({ ...BASE, address: 'הרצל 1', location: { lat: 32.0853, lng: 34.7818 } })
    const first = el.querySelector<HTMLAnchorElement>('.venue-nav a')
    expect(first?.href).toBe('https://waze.com/ul?ll=32.0853,34.7818&navigate=yes')
  })

  it('treats a cleared (null) location as no location', async () => {
    const el = await setup({ ...BASE, location: null })
    expect(el.querySelector('.venue-nav')).toBeNull()
  })

  it('shows Waze and Google Maps links for a saved location', async () => {
    const el = await setup({ ...BASE, location: { lat: 32.0853, lng: 34.7818, accuracy: 15 } })
    const hrefs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.venue-nav a')).map((a) => a.href)
    expect(hrefs).toEqual([
      'https://waze.com/ul?ll=32.0853,34.7818&navigate=yes',
      'https://www.google.com/maps/search/?api=1&query=32.0853,34.7818'
    ])
  })
})
