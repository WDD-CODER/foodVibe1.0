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
    // Verify initial SoT
    const units = service.allUnits_();
    expect(units).toContain('ק"ג');
    expect(units).toContain('גרם');
    expect(service.getConversion('ק"ג')).toBe(1000);
  });

  describe('Registry Operations', () => {
    it('should register a new unit and update the allUnits_ computed signal', () => {
      // 1. Register a new unit
      service.registerUnit('שק', 25000);
      
      // 2. Assert signal reactivity
      expect(service.allUnits_()).toContain('שק');
      expect(service.getConversion('שק')).toBe(25000);
    });

    it('should update an existing unit rate', () => {
      service.registerUnit('גרם', 2); // Overwriting base gram
      expect(service.getConversion('גרם')).toBe(2);
    });

    it('should return 1 as a fallback for unknown units', () => {
      // Rule: Safety fallback to prevent division by zero in ConversionService
      expect(service.getConversion('UnknownUnit')).toBe(1);
    });
  });
});