import { ActivityLogService, ActivityEntry } from './activity-log.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;

  beforeEach(() => {
    // Ensure a clean slate for each test
    spyOn(window.localStorage, 'getItem').and.returnValue(null);
    spyOn(window.localStorage, 'setItem').and.stub();
    service = new ActivityLogService();
  });

  it('should record activity and expose it via signal', () => {
    const entry = {
      action: 'created' as const,
      entityType: 'product' as const,
      entityId: 'p1',
      entityName: 'Test product',
    };

    service.recordActivity(entry);

    const log = service.activityLog_();
    expect(log.length).toBe(1);
    expect(log[0].entityId).toBe('p1');
    expect(log[0].entityName).toBe('Test product');
    expect(log[0].action).toBe('created');
    expect(log[0].timestamp).toBeGreaterThan(0);
  });

  it('should cap the number of entries', () => {
    const base: Omit<ActivityEntry, 'id' | 'timestamp'> = {
      action: 'created',
      entityType: 'product',
      entityId: 'p',
      entityName: 'Prod',
    };

    for (let i = 0; i < 150; i++) {
      service.recordActivity({
        ...base,
        entityId: `p${i}`,
        entityName: `Prod ${i}`,
      });
    }

    const log = service.activityLog_();
    expect(log.length).toBeLessThanOrEqual(100);
  });
});

