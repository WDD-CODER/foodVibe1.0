import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { Router } from '@angular/router'
import { RouterTestingModule } from '@angular/router/testing'
import {
  LucideAngularModule,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  X,
  CircleX,
  Menu,
  SlidersVertical
} from 'lucide-angular'
import { EquipmentListComponent } from './equipment-list.component'
import { EquipmentDataService } from '@services/equipment-data.service'
import { UserService } from '@services/user.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslationService } from '@services/translation.service'
import { RequireAuthService } from 'src/app/core/utils/require-auth.util'
import { LoggingService } from '@services/logging.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { HeroFabService } from '@services/hero-fab.service'
import { AddItemModalService } from '@services/add-item-modal.service'
import { TranslationKeyModalService } from '@services/translation-key-modal.service'

describe('EquipmentListComponent', () => {
  let component: EquipmentListComponent
  let fixture: ComponentFixture<EquipmentListComponent>

  const mockEquipment = signal([])

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EquipmentListComponent,
        RouterTestingModule.withRoutes([{ path: 'inventory/equipment', component: EquipmentListComponent }]),
        LucideAngularModule.pick({
          Plus,
          Search,
          ChevronRight,
          ChevronLeft,
          ChevronDown,
          ChevronUp,
          Trash2,
          Pencil,
          X,
          CircleX,
          Menu,
          SlidersVertical
        })
      ],
      providers: [
        {
          provide: EquipmentDataService,
          useValue: {
            allEquipment_: mockEquipment,
            saveEquipment: jasmine
              .createSpy('saveEquipment')
              .and.returnValue({ subscribe: (fn: () => void) => fn?.() }),
            deleteEquipment: jasmine
              .createSpy('deleteEquipment')
              .and.returnValue({ subscribe: (fn: () => void) => fn?.() })
          }
        },
        { provide: UserService, useValue: { isLoggedIn: signal(true) } },
        { provide: UserMsgService, useValue: { show: jasmine.createSpy('show') } },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
        { provide: RequireAuthService, useValue: {} },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['log', 'info', 'warn', 'error']) },
        {
          provide: ConfirmModalService,
          useValue: { open: jasmine.createSpy('open').and.returnValue(Promise.resolve(true)) }
        },
        {
          provide: HeroFabService,
          useValue: {
            setPageActions: jasmine.createSpy('setPageActions'),
            clearPageActions: jasmine.createSpy('clearPageActions')
          }
        },
        { provide: AddItemModalService, useValue: {} },
        {
          provide: TranslationKeyModalService,
          useValue: { open: jasmine.createSpy('open').and.returnValue(Promise.resolve(null)) }
        }
      ]
    }).compileComponents()

    const router = TestBed.inject(Router)
    await router.navigateByUrl('/inventory/equipment')
    fixture = TestBed.createComponent(EquipmentListComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should show list shell and title', () => {
    expect(fixture.nativeElement.querySelector('app-list-shell')).toBeTruthy()
    expect(fixture.nativeElement.querySelector('app-page-header h1.ph-title')).toBeTruthy()
  })

  describe('row panel unsaved work (plan 498)', () => {
    interface PanelState {
      editingId_: { set(id: string | null): void }
      editForm_: { patchValue(v: object): void }
      hydrateEditForm(e: object): void
    }
    const panel = () => component as unknown as PanelState
    const item = { _id: 'e1', nameHebrew: 'סיר', category: 'tool', ownedQuantity: 1, isConsumable: false, notes: '' }

    it('has no unsaved changes while no row is open', () => {
      expect(component.hasRealChanges()).toBeFalse()
    })

    it('an opened, untouched row panel asks nothing; a changed value does; changing it back stops asking', () => {
      panel().editingId_.set('e1')
      panel().hydrateEditForm(item)
      expect(component.hasRealChanges()).toBeFalse()
      panel().editForm_.patchValue({ nameHebrew: 'מחבת' })
      expect(component.hasRealChanges()).toBeTrue()
      panel().editForm_.patchValue({ nameHebrew: 'סיר' })
      expect(component.hasRealChanges()).toBeFalse()
    })

    it('a click outside asks once, keeps the panel open on stay, and ignores the answering tap', async () => {
      const confirm = TestBed.inject(ConfirmModalService) as unknown as { openTernary: jasmine.Spy }
      confirm.openTernary = jasmine.createSpy('openTernary').and.resolveTo('cancel')
      panel().editingId_.set('e1')
      panel().hydrateEditForm(item)
      panel().editForm_.patchValue({ nameHebrew: 'מחבת' })
      const outside = (
        component as unknown as { onInlinePanelClickOutside(): Promise<void> }
      ).onInlinePanelClickOutside.bind(component)
      await Promise.all([outside(), outside()])
      await outside()
      expect(confirm.openTernary).toHaveBeenCalledTimes(1)
      expect(component.hasRealChanges()).toBeTrue()
      await new Promise((resolve) => setTimeout(resolve))
      await outside()
      expect(confirm.openTernary).toHaveBeenCalledTimes(2)
    })

    it('closing the panel clears the question', () => {
      panel().editingId_.set('e1')
      panel().hydrateEditForm(item)
      panel().editForm_.patchValue({ nameHebrew: 'מחבת' })
      panel().editingId_.set(null)
      expect(component.hasRealChanges()).toBeFalse()
    })
  })

  it('titles the list with the equipment key and has no scaling column', () => {
    expect(fixture.nativeElement.querySelector('app-page-header h1.ph-title').textContent.trim()).toBe('equipment')
    expect(fixture.nativeElement.querySelector('.col-scaling')).toBeNull()
  })
})
