import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { DashboardPage } from './dashboard.page';
import { LucideAngularModule, PlusCircle, FilePlus, Utensils } from 'lucide-angular';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let component: DashboardPage;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        DashboardPage,
        HttpClientTestingModule,
        LucideAngularModule.pick({ PlusCircle, FilePlus, Utensils }),
      ],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: { queryParams: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show overview tab by default', () => {
    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('overview');
  });

  it('should navigate with query param when setTab(metadata) is called', () => {
    (component as unknown as { setTab: (t: string) => void }).setTab('metadata');
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        relativeTo: TestBed.inject(ActivatedRoute),
        queryParams: { tab: 'metadata' },
        replaceUrl: true,
      })
    );
  });
});
