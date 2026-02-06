import { TestBed } from '@angular/core/testing';

import { KitchenStateServiceService } from './kitchen-state.service.service';

describe('KitchenStateServiceService', () => {
  let service: KitchenStateServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KitchenStateServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
