import { HttpErrorResponse } from '@angular/common/http'
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

  it('shows the title in the page header and keeps a light Cancel that calls the handler (plan 712)', () => {
    const page = setup(null)
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('.c-form-page')).not.toBeNull()
    expect(el.querySelector('app-page-header h1.ph-title')?.textContent).toContain('add_equipment')
    const cancel = el.querySelector<HTMLButtonElement>('.c-form-actions button[type="button"]')
    expect(cancel?.classList).toContain('c-btn-ghost')
    const spy = spyOn(page, 'onCancel')
    cancel!.click()
    expect(spy).toHaveBeenCalled()
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

  it('plan 540: a 400 too_big on nameHebrew marks the name and adds no toast of its own', async () => {
    const page = setup(EQUIPMENT)
    equipmentData.updateEquipment.and.rejectWith(
      new HttpErrorResponse({
        status: 400,
        url: '/api/v1/data/equipment/e1',
        error: { error: 'Validation failed', issues: [{ path: 'nameHebrew', code: 'too_big', message: 'Too big' }] }
      })
    )
    await page.onSubmit()
    expect((page as unknown as { validationErrors_(): Record<string, string> }).validationErrors_()['nameHebrew']).toBe(
      'server_field_too_long'
    )
    const msg = TestBed.inject(UserMsgService) as jasmine.SpyObj<UserMsgService>
    expect(msg.onSetErrorMsg).not.toHaveBeenCalled()
  })

  describe('scaling rule (plan 624)', () => {
    type FormShape = { patchValue(v: object): void }
    const formOf = (page: EquipmentFormComponent) => (page as unknown as { equipmentForm_: FormShape }).equipmentForm_
    const errorsOf = (page: EquipmentFormComponent) =>
      (page as unknown as { validationErrors_(): Record<string, string> }).validationErrors_()
    const savedBody = (): Equipment => equipmentData.updateEquipment.calls.mostRecent().args[0]

    it('a rule is saved with the three numbers', async () => {
      const page = setup(EQUIPMENT)
      formOf(page).patchValue({ scalingEnabled: true, perGuests: 50, minQuantity: 2, maxQuantity: 4 })
      await page.onSubmit()
      expect(savedBody().scalingRule).toEqual({ perGuests: 50, minQuantity: 2, maxQuantity: 4 })
    })

    it('an empty maximum leaves maxQuantity out', async () => {
      const page = setup(EQUIPMENT)
      formOf(page).patchValue({ scalingEnabled: true, perGuests: 25, minQuantity: 1, maxQuantity: null })
      await page.onSubmit()
      expect(savedBody().scalingRule).toEqual({ perGuests: 25, minQuantity: 1 })
    })

    it('switching a stored rule off saves perGuests 0', async () => {
      const page = setup({ ...EQUIPMENT, scalingRule: { perGuests: 50, minQuantity: 2 } })
      formOf(page).patchValue({ scalingEnabled: false })
      await page.onSubmit()
      expect(savedBody().scalingRule).toEqual({ perGuests: 0, minQuantity: 0 })
    })

    it('an item that never had a rule saves none', async () => {
      const page = setup(EQUIPMENT)
      await page.onSubmit()
      expect('scalingRule' in savedBody()).toBeFalse()
    })

    it('a maximum below the minimum blocks the save', async () => {
      const page = setup(EQUIPMENT)
      formOf(page).patchValue({ scalingEnabled: true, perGuests: 50, minQuantity: 3, maxQuantity: 2 })
      await page.onSubmit()
      expect(equipmentData.updateEquipment).not.toHaveBeenCalled()
      expect(errorsOf(page)['maxQuantity']).toBe('scaling_max_below_min')
    })

    it('perGuests must be a whole number of at least 1', async () => {
      const page = setup(EQUIPMENT)
      formOf(page).patchValue({ scalingEnabled: true, perGuests: 0, minQuantity: 1 })
      await page.onSubmit()
      expect(errorsOf(page)['perGuests']).toBe('scaling_per_guests_required')
    })

    it('hydrates a stored rule and shows the fields; a stored perGuests 0 shows as off', () => {
      const page = setup({ ...EQUIPMENT, scalingRule: { perGuests: 50, minQuantity: 2, maxQuantity: 4 } })
      fixture.detectChanges()
      const el = fixture.nativeElement as HTMLElement
      expect(el.querySelector<HTMLInputElement>('#perGuests')?.value).toBe('50')
      expect(el.querySelector<HTMLInputElement>('#maxQuantity')?.value).toBe('4')
      expect(page.hasRealChanges()).toBeFalse()
      TestBed.resetTestingModule()
      setup({ ...EQUIPMENT, scalingRule: { perGuests: 0, minQuantity: 0 } })
      fixture.detectChanges()
      expect((fixture.nativeElement as HTMLElement).querySelector('#perGuests')).toBeNull()
    })
  })
})
