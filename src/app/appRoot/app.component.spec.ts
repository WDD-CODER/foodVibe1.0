import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HeaderComponent } from '../core/componets/header/header.component';
import { FooterComponent } from '../core/componets/footer/footer.component';
import { UserMsg } from "src/app/core/componets/user-msg/user-msg.component";
import { UserMsgService } from '@services/user-msg.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { ConversionService } from '@services/conversion.service';
import { UnitCreatorModal } from 'src/app/shared/unit-creator/unit-creator.component';
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';

// 1. Rigorous Mock to replace the problematic production component
@Component({
  selector: 'unit-creator-modal',
  standalone: true,
  template: '<div class="mock-modal">Mock Unit Modal</div>'
})
class MockUnitCreatorModal {
  @Input() netUnitCost = 0;
  @Output() unitSaved = new EventEmitter();
  @Output() closed = new EventEmitter();
  isOpen_ = () => false; 
}

describe('AppComponent', () => {
  beforeEach(async () => {
    const mockUserMsgService = { msg_: signal(null) };
    const mockUnitRegistry = { allUnits_: signal([]) };

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        // We still import dependencies that don't crash
        HeaderComponent,
        FooterComponent,
        UserMsg,
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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
    .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'foodVibe1.0' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('foodVibe1.0');
  });

  it('should render the core UI components', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    
    // Verifying the presence of the selectors
    expect(compiled.querySelector('app-header')).toBeTruthy();
    expect(compiled.querySelector('app-footer')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('user-msg')).toBeTruthy();
    expect(compiled.querySelector('unit-creator-modal')).toBeTruthy();
  });
});