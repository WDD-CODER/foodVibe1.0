import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
  Tags,
  Trash2,
  UtensilsCrossed,
  Pencil,
  Package,
  Archive,
  Download,
  RotateCcw,
  Upload,
  CookingPot,
  BookOpen,
  MapPin,
  Lock,
} from 'lucide-angular';
import { signal } from '@angular/core';
import { TranslationService } from '@services/translation.service';

describe('MetadataManagerPageComponent', () => {
  let component: MetadataManagerComponent;
  let fixture: ComponentFixture<MetadataManagerComponent>;

  // LOGIC CHANGE: Standardized English keys for Mock Signals 
  const mockUnits = signal(['gram', 'ml']);
  const mockAllergens = signal(['gluten', 'nuts']);
  const mockCategories = signal(['vegetables', 'meat']);
  const mockLabels = signal([{ key: 'label1', color: '#ccc' }]);
  const mockMenuTypes = signal<{ key: string }[]>([]);
  const mockProducts = signal([]);

  beforeEach(async () => {
    // Mocking Services
    // REPLACEMENT: Changed 'allUnits_' to 'allUnitKeys_' to match the refactored Service 
    const unitRegistrySpy = jasmine.createSpyObj('UnitRegistryService', ['getConversion', 'registerUnit'], {
      allUnitKeys_: mockUnits
    });
    unitRegistrySpy.getConversion.and.returnValue(1);

    const metadataRegistrySpy = jasmine.createSpyObj('MetadataRegistryService', ['registerAllergen', 'getLabelColor'], {
      allAllergens_: mockAllergens,
      allCategories_: mockCategories,
      allLabels_: mockLabels,
      allMenuTypes_: mockMenuTypes
    });
    metadataRegistrySpy.getLabelColor.and.returnValue('#999');

    const productDataSpy = jasmine.createSpyObj('ProductDataService', [], {
      allProducts_: mockProducts
    });

    await TestBed.configureTestingModule({
      imports: [
        MetadataManagerComponent,
        LucideAngularModule.pick({ Scale, AlertTriangle, X, ChevronLeft, Tag, Tags, Trash2, UtensilsCrossed, Pencil, Package, Archive, Download, RotateCcw, Upload, CookingPot, BookOpen, MapPin, Lock })
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UnitRegistryService, useValue: unitRegistrySpy },
        { provide: MetadataRegistryService, useValue: metadataRegistrySpy },
        { provide: ProductDataService, useValue: productDataSpy },
        { provide: TranslationService, useValue: { translate: (k: string) => k || '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataManagerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should identify system units via isSystemUnit', () => {
    expect(component.isSystemUnit('gram')).toBe(true);
    expect(component.isSystemUnit('kg')).toBe(true);
    expect(component.isSystemUnit('dish')).toBe(true);
    expect(component.isSystemUnit('jar')).toBe(false);
  });
});