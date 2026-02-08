import { TestBed } from '@angular/core/testing';

import { UnitRegistryService } from './unit-registry.service';

describe('UnitRegistryService', () => {
  let service: UnitRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnitRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
