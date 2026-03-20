import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';

import { DashboardPage } from './dashboard.page';
import { MetadataManagerComponent } from '../metadata-manager/metadata-manager.page.component';
import { VenueListComponent } from '../venues/components/venue-list/venue-list.component';
import { VenueFormComponent } from '../venues/components/venue-form/venue-form.component';
import { TrashPage } from '../trash/trash.page';
import {
  LucideAngularModule,
  PlusCircle, FilePlus, Utensils, MapPin, Trash2, Truck,
  ArrowRight, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
} from 'lucide-angular';

@Component({ selector: 'app-metadata-manager', template: '', standalone: true })
class MetadataManagerStub {}

@Component({ selector: 'app-venue-list', template: '', standalone: true })
class VenueListStub {
  @Input() embeddedInDashboard = false;
  @Output() addVenueClick = new EventEmitter<void>();
}

@Component({ selector: 'app-venue-form', template: '', standalone: true })
class VenueFormStub {
  @Input() embeddedInDashboard = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}

@Component({ selector: 'app-trash-page', template: '', standalone: true })
class TrashPageStub {}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let component: DashboardPage;
  let router: jasmine.SpyObj<Router>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({});

    await TestBed.configureTestingModule({
      imports: [
        DashboardPage,
        LucideAngularModule.pick({ PlusCircle, FilePlus, Utensils, MapPin, Trash2, Truck, ArrowRight, ChevronRight, ChevronLeft, ChevronUp, ChevronDown }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
            snapshot: { queryParams: {} },
          },
        },
      ],
    })
    .overrideComponent(DashboardPage, {
      remove: { imports: [MetadataManagerComponent, VenueListComponent, VenueFormComponent, TrashPage] },
      add: { imports: [MetadataManagerStub, VenueListStub, VenueFormStub, TrashPageStub] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show overview tab by default', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-overview"]'))).not.toBeNull();
  });

  it('should navigate with query param when setTab(metadata) is called', () => {
    const metaBtn = fixture.debugElement.query(By.css('[data-testid="btn-nav-metadata"]'));
    metaBtn?.nativeElement.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tab: 'metadata' },
        replaceUrl: true,
      })
    );
  });

  it('should resolve "metadata" query param to metadata tab', () => {
    queryParamsSubject.next({ tab: 'metadata' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-metadata"]'))).not.toBeNull();
  });

  it('should resolve "venues" query param to venues tab', () => {
    queryParamsSubject.next({ tab: 'venues' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-venues"]'))).not.toBeNull();
  });

  it('should resolve "add-venue" query param to add-venue tab', () => {
    queryParamsSubject.next({ tab: 'add-venue' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-add-venue"]'))).not.toBeNull();
  });

  it('should resolve "trash" query param to trash tab', () => {
    queryParamsSubject.next({ tab: 'trash' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-trash"]'))).not.toBeNull();
  });

  it('should fall back to overview for unknown query param', () => {
    queryParamsSubject.next({ tab: 'unknown' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-overview"]'))).not.toBeNull();
  });

  it('should render overview component when no tab param', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-overview"]'))).not.toBeNull();
  });

  it('should render metadata layout when tab = metadata', () => {
    queryParamsSubject.next({ tab: 'metadata' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-metadata"]'))).not.toBeNull();
  });

  it('should render venue-list when tab = venues', () => {
    queryParamsSubject.next({ tab: 'venues' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-venues"]'))).not.toBeNull();
  });

  it('should render venue-form when tab = add-venue', () => {
    queryParamsSubject.next({ tab: 'add-venue' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-add-venue"]'))).not.toBeNull();
  });

  it('should render trash page when tab = trash', () => {
    queryParamsSubject.next({ tab: 'trash' });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="dashboard-tab-trash"]'))).not.toBeNull();
  });

  it('should navigate with empty queryParams when overview tab is set', () => {
    queryParamsSubject.next({ tab: 'metadata' });
    fixture.detectChanges();
    const backBtn = fixture.debugElement.query(By.css('[data-testid="btn-back-to-dashboard"]'));
    backBtn?.nativeElement.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: {},
        replaceUrl: true,
      })
    );
  });
});
