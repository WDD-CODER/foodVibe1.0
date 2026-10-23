'use strict';
/** Plan 492 — the one-off that frees the usernames of staff removed before the fix. */

const { planRelease } = require('../scripts/release-removed-staff-names');
const { isValidUsername, releasedUsername } = require('../utils/username');

describe('release-removed-staff-names', () => {
  it('plans only removed users that still hold their name, and the result is idempotent', () => {
    const users = [
      { _id: 'a', name: 'cook1', removedAt: 5 },
      { _id: 'b', name: 'live', removedAt: null },
      { _id: 'c', name: 'c~removed~c', removedName: 'cook3', removedAt: 7 },
      { _id: 'd', name: 'cook4' },
    ];
    const plan = planRelease(users);
    expect(plan).toEqual([{ _id: 'a', removedName: 'cook1', name: 'cook1~removed~a' }]);
    const after = users.map((u) => { const p = plan.find((x) => x._id === u._id); return p ? { ...u, name: p.name, removedName: p.removedName } : u; });
    expect(planRelease(after)).toEqual([]);
  });

  it('the placeholder name can never be a valid username', () => {
    expect(releasedUsername('cook1', 'id1')).toBe('cook1~removed~id1');
    expect(isValidUsername(releasedUsername('cook1', 'id1'))).toBe(false);
    expect(isValidUsername(releasedUsername('ab', 'x'))).toBe(false);
  });
});
