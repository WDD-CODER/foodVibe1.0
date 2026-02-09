import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { ProductFormComponent } from './product-form.component';
import { ConversionService } from '@services/conversion.service';
import { KitchenStateService } from '@services/kitchen-state.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { UnitRegistryService } from '@services/unit-registry.service';
import { UtilService } from '@services/util.service';
import { UserMsgService } from '@services/user-msg.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { LucideAngularModule, ShieldAlert, X, FlaskConical, Plus, Trash2, ArrowRight, Save } from 'lucide-angular';
import { Product } from '@models/product.model';

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockConversionService: jasmine.SpyObj<ConversionService>;
  let mockUnitRegistry: jasmine.SpyObj<UnitRegistryService>;

  // Signal Mocks for SoT
  const mockCategories = signal(['meat', 'dairy']);
  const mockAllergens = signal(['gluten', 'peanuts']);
  const mockUnits = signal(['kg', 'liter']);
  const mockUnitKeys = signal(['ק"ג', 'גרם']);
  const mockIsCreatorOpen = signal(false); // Add this signal mock
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockConversionService = jasmine.createSpyObj('ConversionService',
      ['handleWasteChange', 'handleYieldChange', 'getSuggestedPurchasePrice']
    );
    mockConversionService.handleWasteChange.and.returnValue({ yieldFactor: 1 });
    mockConversionService.handleYieldChange.and.returnValue({ wastePercent: 0 });
    mockConversionService.getSuggestedPurchasePrice.and.returnValue(0);
    mockUnitRegistry = jasmine.createSpyObj('UnitRegistryService',
      ['getConversion', 'openUnitCreator'],
      {
        allUnitKeys_: mockUnitKeys,
        isCreatorOpen_: mockIsCreatorOpen // This satisfies line 88 in your component
      }
    );

    const mockMetadata = jasmine.createSpyObj('MetadataRegistryService', ['registerCategory'], {
      allCategories_: mockCategories,
      allAllergens_: mockAllergens
    });

    const mockUtil = jasmine.createSpyObj('UtilService', ['getEmptyProduct']);
    mockUtil.getEmptyProduct.and.returnValue({ name_hebrew: '', base_unit_: 'grams' } as Product);

    await TestBed.configureTestingModule({
      imports: [
        ProductFormComponent,
        ReactiveFormsModule,
        LucideAngularModule.pick({ ShieldAlert, X, FlaskConical, Plus, Trash2, ArrowRight, Save })
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ConversionService, useValue: mockConversionService },
        { provide: UnitRegistryService, useValue: mockUnitRegistry },
        { provide: MetadataRegistryService, useValue: mockMetadata },
        { provide: UtilService, useValue: mockUtil },
        { provide: UserMsgService, useValue: {} },
        { provide: KitchenStateService, useValue: { saveProduct: () => of(null) } },
        {
          provide: ActivatedRoute,
          useValue: { data: of({ product: null }), params: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Form Logic: Waste & Yield Sync', () => {
    it('should update yield_factor when waste_percent changes', () => {
      mockConversionService.handleWasteChange.and.returnValue({ yieldFactor: 0.8 });

      const wasteCtrl = component['productForm_'].get('waste_percent_');
      wasteCtrl?.setValue(20);

      expect(component['productForm_'].get('yield_factor_')?.value).toBe(0.8);
    });
  });

  describe('Computed Calculations', () => {
    it('should calculate netUnitCost_ reactively from form values', fakeAsync(() => {
      // Set initial form state
      component['productForm_'].patchValue({
        buy_price_global_: 100,
        yield_factor_: 0.8
      });

      tick(); // Let valueChanges stream through toSignal
      fixture.detectChanges();

      // Formula in code: price / yieldFactor => 100 / 0.8 = 125
      expect((component as any).netUnitCost_()).toBe(125);
    }));
  });

 describe('Dynamic Purchase Options', () => {
    it('should add a new purchase option and sync suggested price on unit change', () => {
      // 1. Setup the global price
      component['productForm_'].patchValue({ buy_price_global_: 10 });
      
      // 2. Configure the EXISTING spies instead of re-creating the object
      mockUnitRegistry.getConversion.and.returnValue(1000); 
      mockConversionService.getSuggestedPurchasePrice.and.returnValue(10000);

      // 3. Act
      (component as any).addPurchaseOption();
      const options = component.purchaseOptions_;
      const firstRow = options.at(0);

      // 4. Trigger unit change - this calls getConversion and getSuggestedPurchasePrice
      firstRow.get('unit_symbol_')?.setValue('kg');

      // 5. Assert
      expect(firstRow.get('conversion_rate_')?.value).toBe(1000);
      expect(firstRow.get('price_override_')?.value).toBe(10000);
    });
  });

  describe('Allergen Management', () => {
    it('should toggle allergens in the form control', () => {
      const ctrl = component['productForm_'].get('allergens_');
      (component as any).toggleAllergen('gluten');
      expect(ctrl?.value).toContain('gluten');
      (component as any).toggleAllergen('gluten');
      expect(ctrl?.value).not.toContain('gluten');
    });
  });
});