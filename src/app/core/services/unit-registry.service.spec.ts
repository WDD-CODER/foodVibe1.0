import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UnitRegistryService } from './unit-registry.service';
import { StorageService } from './async-storage.service';
import { UserMsgService } from './user-msg.service';

describe('UnitRegistryService', () => {
  let service: UnitRegistryService;

  beforeEach(fakeAsync(() => {
    const storageSpy = jasmine.createSpyObj('StorageService', ['query', 'put', 'post']);
    storageSpy.query.and.returnValue(Promise.resolve([]));
    storageSpy.put.and.returnValue(Promise.resolve());
    storageSpy.post.and.returnValue(Promise.resolve());

    const userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg']);

    TestBed.configureTestingModule({
      providers: [
        UnitRegistryService,
        { provide: StorageService, useValue: storageSpy },
        { provide: UserMsgService, useValue: userMsgSpy }
      ]
    });

    service = TestBed.inject(UnitRegistryService);
    tick(); // let initUnits() complete
  }));

  it('should be created and have initial units', () => {
    expect(service).toBeTruthy();
    const units = service.allUnitKeys_();
    expect(units).toContain('kg');
    expect(units).toContain('gram');
    expect(service.getConversion('kg')).toBe(1000);
    expect(service.getConversion('gram')).toBe(1);
  });

  describe('Registry Operations', () => {
    it('should register a new unit and update the allUnitKeys_ computed signal', fakeAsync(() => {
      service.registerUnit('sack', 25000);
      tick();
      expect(service.allUnitKeys_()).toContain('sack');
      expect(service.getConversion('sack')).toBe(25000);
    }));

    it('should not overwrite existing unit (shows message instead)', fakeAsync(() => {
      const rateBefore = service.getConversion('gram');
      service.registerUnit('gram', 2);
      tick();
      expect(service.getConversion('gram')).toBe(rateBefore);
    }));

    it('should return 1 as a fallback for unknown units', () => {
      expect(service.getConversion('UnknownUnit')).toBe(1);
    });
  });
});