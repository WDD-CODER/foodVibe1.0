import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { EquipmentDataService } from '@services/equipment-data.service'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import type { Equipment } from '@models/equipment.model'
import { EquipmentFormComponent } from './equipment-form.component'

const EQUIPMENT = {
  _id: 'e1',
  nameHebrew: 'סיר',
  category: 'tool',
  ownedQuantity: 2,
  isConsumable: false
} as Equipment

describe('EquipmentFormComponent unsaved work (plan 498)', () => {
  let fixture: ComponentFixture<EquipmentFormComponent>
  let equipmentData: jasmine.SpyObj<EquipmentDataService>
  let router: jasmine.SpyObj<Router>

  function setup(equipment: Equipment | null): EquipmentFormComponent {
    equipmentData = jasmine.createSpyObj<EquipmentDataService>('EquipmentDataService', [
      'updateEquipment',
      'addEquipment'
    ])
    equipmentData.updateEquipment.and.resolveTo()
    equipmentData.addEquipment.and.resolveTo()
    router = jasmine.createSpyObj<Router>('Router', ['navigate'])
    TestBed.configureTestingModule({
      imports: [EquipmentFormComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: EquipmentDataService, useValue: equipmentData },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg'])
        },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['error']) },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { data: of(equipment ? { equipment } : {}), snapshot: { data: equipment ? { equipment } : {} } }
        }
      ]
    })
    fixture = TestBed.createComponent(EquipmentFormComponent)
    fixture.detectChanges()
    return fixture.componentInstance
  }

  it('a freshly opened form has no unsaved changes, add and edit alike', () => {
    expect(setup(null).hasRealChanges()).toBeFalse()
    TestBed.resetTestingModule()
    expect(setup(EQUIPMENT).hasRealChanges()).toBeFalse()
  })

  it('typing a name makes the guard ask; typing it back makes it stop asking', () => {
    const page = setup(EQUIPMENT)
    const form = (page as unknown as { equipmentForm_: { patchValue(v: object): void } }).equipmentForm_
    form.patchValue({ nameHebrew: 'מחבת' })
    expect(page.hasRealChanges()).toBeTrue()
    form.patchValue({ nameHebrew: 'סיר' })
    expect(page.hasRealChanges()).toBeFalse()
  })

  it('a successful save sets isSubmitted so the guard lets the page go', async () => {
    const page = setup(EQUIPMENT)
    await page.onSubmit()
    expect(equipmentData.updateEquipment).toHaveBeenCalled()
    expect(page.isSubmitted).toBeTrue()
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/equipment'])
  })

  it('saveAndWait saves, answers true and does not navigate itself (the pending navigation continues)', async () => {
    const page = setup(EQUIPMENT)
    expect(await page.saveAndWait()).toBeTrue()
    expect(equipmentData.updateEquipment).toHaveBeenCalled()
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('saveAndWait answers false when the save fails, so the user stays', async () => {
    const page = setup(EQUIPMENT)
    equipmentData.updateEquipment.and.rejectWith(new Error('boom'))
    expect(await page.saveAndWait()).toBeFalse()
    expect(page.isSubmitted).toBeFalse()
  })
})
