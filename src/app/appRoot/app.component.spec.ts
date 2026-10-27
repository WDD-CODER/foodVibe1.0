import { TestBed } from '@angular/core/testing'
import { AppComponent } from './app.component'
import { provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideServiceWorker } from '@angular/service-worker'
import { HeaderComponent } from '../core/components/header/header.component'
import { UserMsg } from 'src/app/core/components/user-msg/user-msg.component'
import { UserMsgService } from '@services/user-msg.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UnitRegistryService } from '@services/unit-registry.service'
import { ConversionService } from '@services/conversion.service'
import { UnitCreatorModal } from 'src/app/shared/unit-creator/unit-creator.component'
import { Component, Input, Output, EventEmitter, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

// 1. Rigorous Mock to replace the problematic production component
@Component({
  selector: 'app-unit-creator-modal',
  standalone: true,
  template: '<div class="mock-modal">Mock Unit Modal</div>'
})
class MockUnitCreatorModal {
  @Input() netUnitCost = 0
  @Output() unitSaved = new EventEmitter()
  @Output() closed = new EventEmitter()
  isOpen_ = () => false
}

describe('AppComponent', () => {
  beforeEach(async () => {
    const mockUserMsgService = { msg_: signal(null) }
    // isCreatorOpen_ true so @defer (when …) mounts unit-creator-modal for the assertion below
    const mockUnitRegistry = { allUnits_: signal([]), isCreatorOpen_: signal(true) }

    await TestBed.configureTestingModule({
      imports: [AppComponent, HeaderComponent, UserMsg, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // enabled: false registers a working no-op SwUpdate for DI without a real service worker.
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
        { provide: UserMsgService, useValue: mockUserMsgService },
        { provide: UnitRegistryService, useValue: mockUnitRegistry },
        { provide: ConversionService, useValue: {} }
      ]
    })
      /**
       * 2. THE FIX: Override the AppComponent metadata
       * This REMOVES the real UnitCreatorModal and REPLACES it with our Mock.
       */
      .overrideComponent(AppComponent, {
        remove: { imports: [UnitCreatorModal] },
        add: { imports: [MockUnitCreatorModal] }
      })
      .compileComponents()
  })

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent)
    const app = fixture.componentInstance
    expect(app).toBeTruthy()
  })

  it("should have the 'foodVibe1.0' title", () => {
    const fixture = TestBed.createComponent(AppComponent)
    const app = fixture.componentInstance
    expect(app.title).toEqual('foodVibe1.0')
  })

  it('should render the core UI components', () => {
    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()
    const compiled = fixture.nativeElement as HTMLElement

    // Eager shell only — unit-creator-modal is behind @defer (when isCreatorOpen_)
    expect(compiled.querySelector('app-header')).toBeTruthy()
    expect(compiled.querySelector('router-outlet')).toBeTruthy()
    // The toast and the confirm popup are behind @defer (plan 419): absent until a message or a confirm is open.
    expect(compiled.querySelector('app-user-msg')).toBeNull()
    expect(compiled.querySelector('app-confirm-modal')).toBeNull()
    expect(compiled.querySelector('app-hero-fab')).toBeTruthy()
  })

  it('mounts the confirm popup once a confirm is open', async () => {
    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()
    void TestBed.inject(ConfirmModalService).open('are you sure')
    fixture.detectChanges()
    // The deferred chunk resolves on a later tick: poll for it instead of waiting for zone stability.
    const host = fixture.nativeElement as HTMLElement
    for (let i = 0; i < 40 && !host.querySelector('app-confirm-modal'); i++) {
      await new Promise((resolve) => setTimeout(resolve, 25))
      fixture.detectChanges()
    }
    expect(host.querySelector('app-confirm-modal')).toBeTruthy()
  })
})
