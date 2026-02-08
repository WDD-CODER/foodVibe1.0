import { TestBed } from '@angular/core/testing';

import { MetadataRegistryService } from './metadata-registry.service';

describe('MetadataRegistryService', () => {
  let service: MetadataRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetadataRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
