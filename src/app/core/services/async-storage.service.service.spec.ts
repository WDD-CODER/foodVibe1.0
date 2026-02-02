import { TestBed } from '@angular/core/testing';
import { AsyncStorageService } from './async-storage.service.service';


describe('AsyncStorageServiceService', () => {
  let service: AsyncStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsyncStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
