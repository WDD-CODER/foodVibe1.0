import { TestBed } from '@angular/core/testing';
import { UnitRegistryService } from './unit-registry.service';

describe('UnitRegistryService', () => {
  let service: UnitRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UnitRegistryService]
    });
    service = TestBed.inject(UnitRegistryService);
  });

  it('should be created and have initial units', () => {
    expect(service).toBeTruthy();
    
    // REPLACEMENT: Using allUnitKeys_ and English Logic Keys
    const units = service.allUnitKeys_();
    expect(units).toContain('kg');
    expect(units).toContain('grams');
    
    // LOGIC CHANGE: Standardized English Key
    expect(service.getConversion('kg')).toBe(1000);
  });

  describe('Registry Operations', () => {
    it('should register a new unit and update the allUnitKeys_ computed signal', () => {
      // 1. Register a new unit using English key (or custom name)
      service.registerUnit('sack', 25000);
      
      // 2. Assert signal reactivity using correctly named property
      expect(service.allUnitKeys_()).toContain('sack');
      expect(service.getConversion('sack')).toBe(25000);
    });

    it('should update an existing unit rate', () => {
      // LOGIC CHANGE: Standardized English Key
      service.registerUnit('grams', 2); // Overwriting base gram
      expect(service.getConversion('grams')).toBe(2);
    });

    it('should return 1 as a fallback for unknown units', () => {
      // Rule: Safety fallback to prevent division by zero in ConversionService [cite: 464]
      expect(service.getConversion('UnknownUnit')).toBe(1);
    });
  });
});