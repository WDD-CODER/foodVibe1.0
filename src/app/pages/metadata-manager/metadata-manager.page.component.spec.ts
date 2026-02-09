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

  // Mock Signals for Dependency Mapping
  const mockUnits = signal(['גרם', 'מ"ל']);
  const mockAllergens = signal(['גלוטן', 'אגוזים']);
  const mockCategories = signal(['ירקות', 'בשר']);
  const mockProducts = signal([]);

  beforeEach(async () => {
    // Mocking Services
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'registerUnit'], {
      allUnits_: mockUnits
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
        // FIX: Use .pick() to properly initialize the icon provider service
        LucideAngularModule.pick({ Scale, AlertTriangle, X, ChevronLeft ,Tag})
      ],
      providers: [
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: MetadataRegistryService, useValue: metadataRegistrySpy },
        { provide: ProductDataService, useValue: productDataSpy }
        // REMOVE the manual { provide: LUCIDE_ICONS ... } block
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataManagerComponent);
    component = fixture.componentInstance;

    // Rule #4: Trigger lifecycle order
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});