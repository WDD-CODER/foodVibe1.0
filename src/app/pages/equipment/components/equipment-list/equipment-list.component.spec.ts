import type { Equipment } from '@models/equipment.model'
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
  SlidersVertical,
  MoreVertical
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
          SlidersVertical,
          MoreVertical
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

  it('titles the list with the equipment key and has a rule column', () => {
    expect(fixture.nativeElement.querySelector('app-page-header h1.ph-title').textContent.trim()).toBe('equipment')
    expect(fixture.nativeElement.querySelector('.col-scaling')).not.toBeNull()
  })

  describe('shared empty state and phone sheet (plan 711)', () => {
    const item = {
      _id: 'e9',
      nameHebrew: 'סיר',
      category: 'tool',
      ownedQuantity: 1,
      isConsumable: false,
      createdAt: 1,
      updatedAt: 1
    }
    interface Internals {
      searchQuery_: { set(v: string): void }
      editingId_: { set(id: string | null): void; (): string | null }
      isDesktop_: unknown
      hydrateEditForm(e: object): void
    }
    const internals = () => component as unknown as Internals
    afterEach(() => {
      // The list keeps its search in sessionStorage: put it back so the next test sees a clean list.
      internals().searchQuery_.set('')
      fixture.detectChanges()
      sessionStorage.clear()
      mockEquipment.set([])
    })

    it('a search with no match shows one shared empty state', () => {
      mockEquipment.set([item] as never)
      internals().searchQuery_.set('zzzz')
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelectorAll('app-empty-state').length).toBe(1)
      expect(fixture.nativeElement.querySelector('.no-results')).toBeNull()
    })

    it('on a phone, editing a row opens the shared popup and Escape closes it with nothing typed', async () => {
      mockEquipment.set([item] as never)
      internals().isDesktop_ = signal(false)
      const outside = spyOn(
        component as unknown as { onInlinePanelClickOutside(): Promise<void> },
        'onInlinePanelClickOutside'
      ).and.callThrough()
      internals().editingId_.set('e9')
      internals().hydrateEditForm(item)
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('app-modal-shell')).not.toBeNull()
      expect(fixture.nativeElement.querySelector('.c-modal-overlay')).not.toBeNull()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(outside).toHaveBeenCalledTimes(1)
      expect(internals().editingId_()).toBeNull()
    })
  })

  describe('quick-edit loading rule (plan 640)', () => {
    interface PanelState {
      editingId_: { set(id: string | null): void }
      editForm_: { patchValue(v: object): void }
      scalingErrors_(): Record<string, string>
      hydrateEditForm(e: object): void
      onInlineSave(): Promise<void>
    }
    const panel = () => component as unknown as PanelState
    const base = { _id: 'e1', nameHebrew: 'ארון חימום', category: 'tool', ownedQuantity: 1, isConsumable: false }
    let update: jasmine.Spy
    const open = (e: Partial<Equipment>) => {
      const item = { ...base, createdAt: 1, updatedAt: 1, ...e } as Equipment
      mockEquipment.set([item] as never)
      update = jasmine.createSpy('updateEquipment').and.resolveTo(undefined)
      ;(TestBed.inject(EquipmentDataService) as unknown as { updateEquipment: jasmine.Spy }).updateEquipment = update
      panel().editingId_.set('e1')
      panel().hydrateEditForm(item)
      fixture.detectChanges()
    }
    const val = (id: string) => (fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement | null)?.value
    afterEach(() => mockEquipment.set([]))

    it('opens with the switch on and the three numbers filled for an item with a rule', () => {
      open({ scalingRule: { perGuests: 20, minQuantity: 1, maxQuantity: 3 } })
      expect(val('inline-per-guests')).toBe('20')
      expect(val('inline-min-quantity')).toBe('1')
      expect(val('inline-max-quantity')).toBe('3')
    })

    it('shows the three inputs only when the switch is on', () => {
      open({})
      expect(fixture.nativeElement.querySelector('#inline-per-guests')).toBeNull()
      const sw = fixture.nativeElement.querySelector('input[formControlName="scalingEnabled"]') as HTMLInputElement
      sw.click()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('#inline-per-guests')).not.toBeNull()
      expect(fixture.nativeElement.querySelector('#inline-min-quantity')).not.toBeNull()
      expect(fixture.nativeElement.querySelector('#inline-max-quantity')).not.toBeNull()
    })

    it('saves per guests 10, minimum 2, no maximum as the rule', async () => {
      open({})
      panel().editForm_.patchValue({ scalingEnabled: true, perGuests: 10, minQuantity: 2, maxQuantity: null })
      await panel().onInlineSave()
      expect(update.calls.mostRecent().args[0].scalingRule).toEqual({ perGuests: 10, minQuantity: 2 })
      expect(
        (component as unknown as { scalingSummary(e: Equipment): string }).scalingSummary(
          update.calls.mostRecent().args[0]
        )
      ).toBe('scaling_summary'.replace('{n}', '10').replace('{range}', '2'))
    })

    it('turning it off on an item that had a rule stores the zero rule', async () => {
      open({ scalingRule: { perGuests: 20, minQuantity: 1 } })
      panel().editForm_.patchValue({ scalingEnabled: false })
      await panel().onInlineSave()
      expect(update.calls.mostRecent().args[0].scalingRule).toEqual({ perGuests: 0, minQuantity: 0 })
    })

    it('a maximum below the minimum shows the error and does not save', async () => {
      open({})
      panel().editForm_.patchValue({ scalingEnabled: true, perGuests: 10, minQuantity: 3, maxQuantity: 2 })
      await panel().onInlineSave()
      expect(update).not.toHaveBeenCalled()
      expect(panel().scalingErrors_()['maxQuantity']).toBe('scaling_max_below_min')
    })

    it('an item that never had a rule and stays off is saved without one', async () => {
      open({})
      await panel().onInlineSave()
      expect(update).toHaveBeenCalledTimes(1)
      expect('scalingRule' in update.calls.mostRecent().args[0]).toBeFalse()
    })
  })

  describe('rule column (plan 624)', () => {
    const item = (scalingRule?: Equipment['scalingRule']) =>
      ({
        _id: 'x',
        nameHebrew: 'סיר',
        category: 'tool',
        ownedQuantity: 1,
        isConsumable: false,
        scalingRule
      }) as Equipment
    const summary = (e: Equipment) =>
      (component as unknown as { scalingSummary(e: Equipment): string }).scalingSummary(e)

    it('an item with a rule shows the guests and the range', () => {
      expect(summary(item({ perGuests: 50, minQuantity: 2, maxQuantity: 4 }))).toBe(
        'scaling_summary'.replace('{n}', '50').replace('{range}', '2–4')
      )
    })

    it('an open maximum shows only the minimum; none shows the dash key', () => {
      expect(summary(item({ perGuests: 25, minQuantity: 1 }))).toBe('scaling_summary')
      expect(summary(item())).toBe('no_scaling')
      expect(summary(item({ perGuests: 0, minQuantity: 0 }))).toBe('no_scaling')
    })
  })
})
