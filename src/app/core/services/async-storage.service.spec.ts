import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EntityId, StorageService } from './async-storage.service';

describe('StorageService', () => {
  let service: StorageService;
  const ENTITY_TYPE = 'test_entity';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorageService]
    });
    service = TestBed.inject(StorageService);
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Create (post)', () => {
    it('should save an item and assign an _id', async () => {
      const newItem = { name: 'Test' };
      const savedItem = await service.post(ENTITY_TYPE, newItem);

      expect(savedItem._id).toBeDefined();
      expect(savedItem.name).toBe('Test');

      const entities = JSON.parse(localStorage.getItem(ENTITY_TYPE)!);
      expect(entities.length).toBe(1);
      expect(entities[0]._id).toBe(savedItem._id);
    });
  });

  describe('Read (query/get)', () => {
    it('should return empty array if no entities exist', async () => {
      const entities = await service.query(ENTITY_TYPE, 0);
      expect(entities).toEqual([]);
    });

    // storage.service.spec.ts
    it('should handle delay in query', fakeAsync(() => {
      let result: any[] | null = null;
      service.query(ENTITY_TYPE, 100).then(data => result = data);

      expect(result).toBeNull();
      tick(100);

      // Use a type guard to satisfy the compiler
      if (result !== null) {
        expect(result).toEqual([]);
      } else {
        fail('Result should not be null after tick');
      }
    }));

    it('should fetch a specific item by _id', async () => {
      const item = await service.post(ENTITY_TYPE, { val: 42 });
      const fetched = await service.get<EntityId & { val: number }>(ENTITY_TYPE, item._id);
      expect(fetched.val).toBe(42);
    });

    it('should throw error if item does not exist', async () => {
      await expectAsync(service.get(ENTITY_TYPE, 'non-existent'))
        .toBeRejectedWithError(/does not exist/);
    });
  });

  describe('Update (put)', () => {
    it('should update an existing item', async () => {
      const item = await service.post(ENTITY_TYPE, { status: 'old' });
      const updated = { ...item, status: 'new' };

      const result = await service.put(ENTITY_TYPE, updated);
      expect(result.status).toBe('new');

      const entities = await service.query<EntityId & { status: string }>(ENTITY_TYPE, 0);
      expect(entities[0].status).toBe('new');
    });

    it('should throw error when updating non-existent item', async () => {
      const ghost = { _id: '123', name: 'ghost' };
      await expectAsync(service.put(ENTITY_TYPE, ghost))
        .toBeRejectedWithError(/does not exist/);
    });
  });

  describe('Delete (remove)', () => {
    it('should remove an item from localStorage', async () => {
      const item = await service.post(ENTITY_TYPE, { deleteMe: true });
      await service.remove(ENTITY_TYPE, item._id);

      const entities = await service.query(ENTITY_TYPE, 0);
      expect(entities.length).toBe(0);
    });

    it('should throw error when removing non-existent item', async () => {
      await expectAsync(service.remove(ENTITY_TYPE, 'none'))
        .toBeRejectedWithError(/does not exist/);
    });
  });

  describe('Utilities', () => {
    it('should generate a random ID of specified length', () => {
      const id = service.makeId(10);
      expect(id.length).toBe(10);
      expect(typeof id).toBe('string');
    });
  });
});