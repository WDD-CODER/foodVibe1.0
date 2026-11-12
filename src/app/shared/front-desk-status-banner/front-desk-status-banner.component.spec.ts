import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { LucideAngularModule, CirclePause } from 'lucide-angular'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { TranslationService } from '@services/translation.service'
import { FrontDeskStatusBannerComponent } from './front-desk-status-banner.component'

describe('FrontDeskStatusBannerComponent (plan 557)', () => {
  const profile_ = signal<{ status: string } | null>(null)

  function render(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [FrontDeskStatusBannerComponent, LucideAngularModule.pick({ CirclePause })],
      providers: [
        { provide: FrontDeskProfileDataService, useValue: { profile_, ensureLoaded: () => Promise.resolve() } },
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } }
      ]
    })
    const fixture = TestBed.createComponent(FrontDeskStatusBannerComponent)
    fixture.detectChanges()
    return fixture.nativeElement
  }

  it('shows the notice only when the status is suspended', () => {
    profile_.set({ status: 'suspended' })
    expect(render().querySelector('[data-testid="fd-suspended-banner"]')?.textContent).toContain('fd_suspended_banner')
  })

  for (const status of ['draft', 'pilot', 'active']) {
    it(`shows nothing for ${status}`, () => {
      profile_.set({ status })
      expect(render().querySelector('[data-testid="fd-suspended-banner"]')).toBeNull()
    })
  }

  it('shows nothing while there is no profile', () => {
    profile_.set(null)
    expect(render().querySelector('[data-testid="fd-suspended-banner"]')).toBeNull()
  })
})
