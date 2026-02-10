import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetadataManagerComponent } from './metadata-manager.page.component';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { ProductDataService } from '@services/product-data.service';
import {
  LucideAngularModule,
  Scale,
  AlertTriangle,
  X,
  ChevronLeft,
  Tag,
} from 'lucide-angular';
import { signal } from '@angular/core';

describe('MetadataManagerPageComponent', () => {
  let component: MetadataManagerComponent;
  let fixture: ComponentFixture<MetadataManagerComponent>;

  // LOGIC CHANGE: Standardized English keys for Mock Signals 
  const mockUnits = signal(['gram', 'ml']);
  const mockAllergens = signal(['gluten', 'nuts']);
  const mockCategories = signal(['vegetables', 'meat']);
  const mockProducts = signal([]);

  beforeEach(async () => {
    // Mocking Services
    // REPLACEMENT: Changed 'allUnits_' to 'allUnitKeys_' to match the refactored Service 
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'registerUnit'], {
      allUnitKeys_: mockUnits
    });
    unitRegistrySpy.getConversion.and.returnValue(1);

    const metadataRegistrySpy = jasmine.createSpyObj('MetadataRegistryService', ['registerAllergen'], {
      allAllergens_: mockAllergens,
      allCategories_: mockCategories
    });

    const productDataSpy = jasmine.createSpyObj('ProductDataService', [], {
      allProducts_: mockProducts
    });

    await TestBed.configureTestingModule({
      imports: [
        MetadataManagerComponent,
        LucideAngularModule.pick({ Scale, AlertTriangle, X, ChevronLeft, Tag })
      ],
      providers: [
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: MetadataRegistryService, useValue: metadataRegistrySpy },
        { provide: ProductDataService, useValue: productDataSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataManagerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // NEW TEST CASE: Verify the logic uses English while the view uses the Pipe
  it('should handle English keys for allergens', () => {
    const metadataRegistry = TestBed.inject(MetadataRegistryService) as jasmine.SpyObj<MetadataRegistryService>;
    component.addAllergen('peanuts');
    expect(metadataRegistry.registerAllergen).toHaveBeenCalledWith('peanuts');
  });
});