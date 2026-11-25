'use strict';
/** Plan 737 — the one-off platform-admin script: arguments, the one-user rule, dry run, write, off, the guard. */

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { parseArgs, planChange, run } = require('../scripts/set-platform-admin');

const script = path.join(__dirname, '..', 'scripts', 'set-platform-admin.js');
const argv = (...a) => ['node', 'script', ...a];

beforeAll(async () => {
  await buildTestApp();
}, 60000);
afterAll(async () => {
  await teardownTestApp();
});
beforeEach(async () => {
  await testDb().collection('users').deleteMany({});
});

describe('parseArgs', () => {
  it('requires --target', () => {
    expect(() => parseArgs(argv('--email=a@b.c'))).toThrow('--target=local|atlas is required');
  });
  it('requires --email', () => {
    expect(() => parseArgs(argv('--target=local'))).toThrow('--email is required');
  });
  it('refuses an unknown argument', () => {
    expect(() => parseArgs(argv('--target=local', '--email=a@b.c', '--nope'))).toThrow('Unknown argument');
  });
  it('refuses --db with atlas', () => {
    expect(() => parseArgs(argv('--target=atlas', '--email=a@b.c', '--db=x'))).toThrow('--db=<name> works with --target=local only');
  });
  it('trims and lower-cases the email, defaults to a dry run', () => {
    const a = parseArgs(argv('--target=local', '--email= Dan@Example.COM '));
    expect(a).toMatchObject({ email: 'dan@example.com', on: true, write: false });
    expect(parseArgs(argv('--target=local', '--email=a@b.c', '--off', '--write'))).toMatchObject({ on: false, write: true });
  });
  it('exits 1 with the message and no connection when run without a target', () => {
    const res = spawnSync(process.execPath, [script, '--email=a@b.c'], { encoding: 'utf8' });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('--target=local|atlas is required');
    expect(res.stdout).not.toContain('[tool]');
  });
});

describe('planChange', () => {
  it('refuses 0, 2 and removed users', () => {
    expect(planChange([], { on: true }).refused).toBe('no user with that email');
    expect(planChange([{ _id: 1 }, { _id: 2 }], { on: true }).refused).toBe('more than one user with that email');
    expect(planChange([{ _id: 1, removedAt: 5 }], { on: true }).refused).toBe('that user was removed');
  });
  it('reports from and to', () => {
    expect(planChange([{ _id: 1, isPlatformAdmin: false }], { on: true })).toMatchObject({ userId: '1', from: false, to: true });
    expect(planChange([{ _id: 1, isPlatformAdmin: true }], { on: true })).toMatchObject({ from: true, to: true });
  });
});

describe('run against the test database', () => {
  const seed = async (extra = {}) => {
    const { insertedId } = await testDb().collection('users').insertOne({ email: 'dan@example.com', name: 'Dan', removedAt: null, ...extra });
    return insertedId;
  };
  const args = (o = {}) => ({ email: 'dan@example.com', on: true, write: false, ...o });

  it('a dry run writes nothing and names no email', async () => {
    const id = await seed();
    const r = await run(testDb(), args());
    expect(r).toEqual({ code: 0, lines: [`PLATFORM_ADMIN: ${id} false → true (dry run — add --write to apply)`] });
    expect(r.lines.join('')).not.toContain('dan@example.com');
    const u = await testDb().collection('users').findOne({ _id: id });
    expect(u.isPlatformAdmin).toBeUndefined();
    expect(u.platformAdminHistory).toBeUndefined();
  });

  it('--write sets the flag and one history row; again is nothing to do', async () => {
    const id = await seed();
    const r = await run(testDb(), args({ write: true }), { at: 123 });
    expect(r.lines).toEqual([`PLATFORM_ADMIN: ${id} false → true written`]);
    const u = await testDb().collection('users').findOne({ _id: id });
    expect(u.isPlatformAdmin).toBe(true);
    expect(u.platformAdminHistory).toEqual([{ at: 123, on: true, by: 'script' }]);
    const again = await run(testDb(), args({ write: true }));
    expect(again).toEqual({ code: 0, lines: [`PLATFORM_ADMIN: ${id} already true — nothing to do`] });
  });

  it('--off clears the flag', async () => {
    const id = await seed({ isPlatformAdmin: true });
    const r = await run(testDb(), args({ on: false, write: true }), { at: 5 });
    expect(r.lines).toEqual([`PLATFORM_ADMIN: ${id} true → false written`]);
    const u = await testDb().collection('users').findOne({ _id: id });
    expect(u.isPlatformAdmin).toBe(false);
  });

  it('matches the email lower-cased and refuses unknown and removed users', async () => {
    await seed();
    const { parseArgs: pa } = require('../scripts/set-platform-admin');
    expect((await run(testDb(), pa(argv('--target=local', '--email=DAN@example.com')))).code).toBe(0);
    expect(await run(testDb(), args({ email: 'x@y.z' }))).toEqual({ code: 1, lines: ['PLATFORM_ADMIN: refused — no user with that email'] });
    await testDb().collection('users').updateOne({ email: 'dan@example.com' }, { $set: { removedAt: 9 } });
    expect(await run(testDb(), args({ write: true }))).toEqual({ code: 1, lines: ['PLATFORM_ADMIN: refused — that user was removed'] });
  });

  it('refuses when the user changed meanwhile', async () => {
    const id = await seed();
    const { applyChange } = require('../scripts/set-platform-admin');
    await testDb().collection('users').updateOne({ _id: id }, { $set: { isPlatformAdmin: true } });
    const ok = await applyChange(testDb(), { _id: id, to: true }, { at: 1 });
    expect(ok).toBe(false);
  });
});
