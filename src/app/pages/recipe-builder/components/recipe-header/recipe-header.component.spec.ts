import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronDown, Plus, X } from 'lucide-angular';
import { RecipeHeaderComponent } from './recipe-header.component';
import { UnitRegistryService } from '@services/unit-registry.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { TranslationService } from '@services/translation.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { LabelCreationModalService } from 'src/app/shared/label-creation-modal/label-creation-modal.service';
import { signal } from '@angular/core';

describe('RecipeHeaderComponent', () => {
  let component: RecipeHeaderComponent;
  let fixture: ComponentFixture<RecipeHeaderComponent>;
  let fb: FormBuilder;

  function createRecipeForm(overrides: { recipe_type?: 'dish' | 'preparation'; serving_portions?: number; yield_conversions?: FormArray } = {}) {
    const type = overrides.recipe_type ?? 'preparation';
    const conversions = overrides.yield_conversions ?? fb.array([fb.group({ unit: ['gram'], amount: [1] })]);
    return fb.group({
      recipe_type: [type],
      serving_portions: [overrides.serving_portions ?? 1],
      yield_conversions: conversions,
      name_hebrew: [''],
      total_weight_g: [0],
      labels: [[] as string[]]
    });
  }

  beforeEach(async () => {
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'openUnitCreator'], {
      allUnitKeys_: signal(['gram', 'kg', 'dish', 'liter'])
    });
    unitRegistrySpy.getConversion.and.returnValue(1);

    const metadataRegistrySpy = jasmine.createSpyObj('MetadataRegistryService', [], {
      allLabels_: signal([{ key: 'vegan', color: '#10B981' }, { key: 'gluten-free', color: '#F59E0B' }])
    });
    const labelCreationModalSpy = jasmine.createSpyObj('LabelCreationModalService', ['open']);
    labelCreationModalSpy.open.and.returnValue(Promise.resolve(null));

    await TestBed.configureTestingModule({
      imports: [RecipeHeaderComponent, ReactiveFormsModule, LucideAngularModule.pick({ ChevronDown, Plus, X })],
      providers: [
        FormBuilder,
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: KitchenStateService, useValue: {} },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } },
        { provide: MetadataRegistryService, useValue: metadataRegistrySpy },
        { provide: LabelCreationModalService, useValue: labelCreationModalSpy }
      ]
    }).compileComponents();

    fb = TestBed.inject(FormBuilder);

    fixture = TestBed.createComponent(RecipeHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', createRecipeForm());
    fixture.componentRef.setInput('currentCost', 0);
    fixture.componentRef.setInput('totalWeightG', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display currentCost from input', () => {
    fixture.componentRef.setInput('currentCost', 12.5);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('12.5');
  });

  it('should display totalWeightG from input', () => {
    fixture.componentRef.setInput('totalBrutoWeightG', 350);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('350g');
  });

  it('should toggle recipe_type between dish and preparation', () => {
    const form = createRecipeForm({ recipe_type: 'preparation' });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    expect(form.get('recipe_type')?.value).toBe('preparation');
    component['toggleTypeWrapper']();
    expect(form.get('recipe_type')?.value).toBe('dish');
    component['toggleTypeWrapper']();
    expect(form.get('recipe_type')?.value).toBe('preparation');
  });

  it('should update primary amount when updatePrimaryAmount is called (precision/magnitude step)', () => {
    const form = createRecipeForm({ recipe_type: 'preparation' });
    const conversions = form.get('yield_conversions') as FormArray;
    conversions.at(0).get('amount')?.setValue(2);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    component.yield.updatePrimaryAmount(1);
    expect(conversions.at(0).get('amount')?.value).toBe(3);
    component.yield.updatePrimaryAmount(-1);
    expect(conversions.at(0).get('amount')?.value).toBe(2);
  });

  it('should update primary amount when scaling chip emits valueChange', () => {
    const form = createRecipeForm({ recipe_type: 'preparation' });
    const conversions = form.get('yield_conversions') as FormArray;
    conversions.at(0).get('amount')?.setValue(2);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    component.yield.onScalingChipAmountChange(5);
    expect(conversions.at(0).get('amount')?.value).toBe(5);
  });

  it('should call openUnitCreator service when onPrimaryUnitChange returns create_unit', () => {
    const result = component.yield.onPrimaryUnitChange('NEW_UNIT');
    expect(result).toBe('create_unit');
  });

  it('should resolve primary unit label to dish when recipe_type is dish', () => {
    const form = createRecipeForm({ recipe_type: 'dish' });
    const conversions = form.get('yield_conversions') as FormArray;
    conversions.at(0).patchValue({ unit: 'dish', amount: 4 });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    expect(component.yield.primaryUnitLabel_()).toBe('dish');
  });

  it('should disable secondary chip minus button when amount is zero', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [0] })
    ]);
    const form = createRecipeForm({ yield_conversions: conversions });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    const minusBtn = fixture.nativeElement.querySelector('.scaling-chip--secondary .ctrl-btn[disabled]');
    expect(minusBtn).toBeTruthy();
  });

  it('should update secondary amount when scaling chip emits valueChange', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [2] })
    ]);
    const form = createRecipeForm({ yield_conversions: conversions });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    component.yield.onSecondaryScalingChipAmountChange(0, 5);
    expect(conversions.at(1).get('amount')?.value).toBe(5);
  });

  it('should update secondary chip amount when +/- is clicked (precision/magnitude step)', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [2] })
    ]);
    const form = createRecipeForm({ yield_conversions: conversions });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    component.yield.updateSecondaryAmount(0, 1);
    expect(conversions.at(1).get('amount')?.value).toBe(3);
    component.yield.updateSecondaryAmount(0, -1);
    expect(conversions.at(1).get('amount')?.value).toBe(2);
  });

  it('should exclude used units from availableSecondaryUnits_', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [1] })
    ]);
    const form = createRecipeForm({ yield_conversions: conversions });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    const available = component.yield.availableSecondaryUnits_();
    expect(available).not.toContain('gram');
    expect(available).not.toContain('liter');
  });

  it('should exclude secondary units from availablePrimaryUnits_', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [1] })
    ]);
    const form = createRecipeForm({ yield_conversions: conversions });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    const available = component.yield.availablePrimaryUnits_();
    expect(available).not.toContain('liter');
    expect(available).toContain('gram');
  });

  it('should remove secondary chip and make unit available again', () => {
    const conversions = fb.array([
      fb.group({ unit: ['gram'], amount: [1] }),
      fb.group({ unit: ['liter'], amount: [1] })
    ]);
    const form = createRecipeForm({ yield_conversions: conversions });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    expect(component.yield.availableSecondaryUnits_()).not.toContain('liter');
    component.yield.removeSecondaryUnit(0);
    fixture.detectChanges();
    expect(conversions.length).toBe(1);
    expect(component.yield.availableSecondaryUnits_()).toContain('liter');
  });
});
