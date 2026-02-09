import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, convertToParamMap } from '@angular/router';
import { productResolver } from './product.resolver';
import { KitchenStateService } from '../services/kitchen-state.service';
import { signal } from '@angular/core';
import { Product } from '../models/product.model';

describe('productResolver', () => {
  let mockRouter: jasmine.SpyObj<Router>;
  let mockKitchenState: jasmine.SpyObj<KitchenStateService>;
  
  // Rule #4: Callable Signal Mock for the SoT
  const mockProductsSignal = signal<Product[]>([]);

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockKitchenState = jasmine.createSpyObj('KitchenStateService', [], {
      products_: () => mockProductsSignal() 
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: KitchenStateService, useValue: mockKitchenState }
      ]
    });
  });

  const executeResolver = (routeOverride: Partial<ActivatedRouteSnapshot>) => {
    return TestBed.runInInjectionContext(() => 
      productResolver(
        routeOverride as ActivatedRouteSnapshot, 
        {} as RouterStateSnapshot
      )
    );
  };

  it('should return null if no ID is present (Add Mode)', () => {
    const route = { 
      paramMap: convertToParamMap({}) 
    };
    
    const result = executeResolver(route);
    expect(result).toBeNull();
  });

  it('should return product if found in state (Edit Mode)', () => {
    const mockProduct = { _id: '123', name_hebrew: 'Test' } as Product;
    mockProductsSignal.set([mockProduct]);
    
    const route = { 
      paramMap: convertToParamMap({ id: '123' }) 
    };
    
    const result = executeResolver(route);
    expect(result).toEqual(mockProduct);
  });

  it('should redirect and return null if product is not found', () => {
    mockProductsSignal.set([]); 
    // FIX: Using convertToParamMap to satisfy TS2345
    const route = { 
      paramMap: convertToParamMap({ id: '999' }) 
    };
    
    const result = executeResolver(route);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/inventory/list']);
    expect(result).toBeNull();
  });
});