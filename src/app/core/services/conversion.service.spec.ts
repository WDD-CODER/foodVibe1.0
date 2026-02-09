import { TestBed } from '@angular/core/testing';
import { ConversionService } from './conversion.service';

describe('ConversionService', () => {
  let service: ConversionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConversionService]
    });
    service = TestBed.inject(ConversionService);
  });

  describe('Cost Calculations', () => {
    it('should calculate net cost correctly (Standard Case)', () => {
      // 100 NIS / (1000g * 0.9 yield) = 100 / 900 = 0.1111...
      const result = service.calculateNetCost(100, 1000, 10);
      expect(result).toBeCloseTo(0.1111, 4);
    });

    it('should return 0 if gross price is missing or conversion factor is zero', () => {
      expect(service.calculateNetCost(0, 1000, 10)).toBe(0);
      expect(service.calculateNetCost(100, 0, 10)).toBe(0);
      expect(service.calculateNetCost(100, -1, 10)).toBe(0);
    });
  });

  describe('Waste & Yield Syncing', () => {
    it('should calculate yield factor from waste percent and avoid float junk', () => {
      // 15% waste should be 0.85 yield
      const result = service.handleWasteChange('15');
      expect(result.yieldFactor).toBe(0.85);

      // Edge case: 100% waste
      expect(service.handleWasteChange(100).yieldFactor).toBe(0);
      
      // Edge case: invalid input
      expect(service.handleWasteChange('abc').yieldFactor).toBe(1);
    });

    it('should calculate waste percent from yield factor', () => {
      // 0.8 yield should be 20% waste
      const result = service.handleYieldChange(0.8);
      expect(result.wastePercent).toBe(20);

      // 0 yield should be 100% waste
      expect(service.handleYieldChange(0).wastePercent).toBe(100);
    });
  });

  describe('Scaling & Purchase Logic', () => {
    it('should calculate waste quantity based on total', () => {
      expect(service.getWasteQuantity(20, 1000)).toBe(200);
    });

    it('should calculate waste percentage from quantity', () => {
      expect(service.getWastePercent(200, 1000)).toBe(20);
      expect(service.getWastePercent(200, 0)).toBe(0); // Zero guard
    });

    it('should calculate suggested purchase price', () => {
      // 5 NIS (base) * 1000 (unit) = 5000
      expect(service.getSuggestedPurchasePrice(5, 1000)).toBe(5000);
      expect(service.getSuggestedPurchasePrice(0, 1000)).toBe(0);
    });
  });
});