import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LucideAngularModule, Plus, Search, ChevronRight, ChevronLeft, ChevronDown, Trash2, Pencil, X, CircleX, Menu } from 'lucide-angular';
import { EquipmentListComponent } from './equipment-list.component';
import { EquipmentDataService } from '@services/equipment-data.service';
import { UserService } from '@services/user.service';
import { UserMsgService } from '@services/user-msg.service';
import { TranslationService } from '@services/translation.service';
import { RequireAuthService } from 'src/app/core/utils/require-auth.util';
import { LoggingService } from '@services/logging.service';
import { ConfirmModalService } from '@services/confirm-modal.service';
import { HeroFabService } from '@services/hero-fab.service';
import { AddItemModalService } from '@services/add-item-modal.service';
import { TranslationKeyModalService } from '@services/translation-key-modal.service';

describe('EquipmentListComponent', () => {
  let component: EquipmentListComponent;
  let fixture: ComponentFixture<EquipmentListComponent>;

  const mockEquipment = signal([]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EquipmentListComponent,
        RouterTestingModule.withRoutes([{ path: 'equipment', component: EquipmentListComponent }]),
        LucideAngularModule.pick({ Plus, Search, ChevronRight, ChevronLeft, ChevronDown, Trash2, Pencil, X, CircleX, Menu })
      ],
      providers: [
        {
          provide: EquipmentDataService,
          useValue: {
            allEquipment_: mockEquipment,
            saveEquipment: jasmine.createSpy('saveEquipment').and.returnValue({ subscribe: (fn: () => void) => fn?.() }),
            deleteEquipment: jasmine.createSpy('deleteEquipment').and.returnValue({ subscribe: (fn: () => void) => fn?.() })
          }
        },
        { provide: UserService, useValue: { isLoggedIn: signal(true) } },
        { provide: UserMsgService, useValue: { show: jasmine.createSpy('show') } },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
        { provide: RequireAuthService, useValue: {} },
        { provide: LoggingService, useValue: { log: jasmine.createSpy('log') } },
        { provide: ConfirmModalService, useValue: { open: jasmine.createSpy('open').and.returnValue(Promise.resolve(true)) } },
        { provide: HeroFabService, useValue: { setPageActions: jasmine.createSpy('setPageActions'), clearPageActions: jasmine.createSpy('clearPageActions') } },
        { provide: AddItemModalService, useValue: {} },
        { provide: TranslationKeyModalService, useValue: { open: jasmine.createSpy('open').and.returnValue(Promise.resolve(null)) } }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/equipment');
    fixture = TestBed.createComponent(EquipmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show list shell and title', () => {
    expect(fixture.nativeElement.querySelector('app-list-shell')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.page-title')).toBeTruthy();
  });
});
