'use strict';
/** Plan 737 — the one-off script that sets isPlatformAdmin (parseArgs, planChange, run/applyChange on the in-memory database). */

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { parseArgs, planChange, applyChange, run } = require('../scripts/set-platform-admin');

const SCRIPT = path.resolve(__dirname, '../scripts/set-platform-admin.js');

describe('parseArgs', () => {
  const base = ['node', 'x', '--target=local', '--email=Dan@Example.com'];
  it('accepts the full set and lower-cases the email', () => {
    expect(parseArgs([...base, '--off', '--write', '--db=scratch'])).toMatchObject({
      target: 'local', email: 'dan@example.com', on: false, write: true, db: 'scratch',
    });
    expect(parseArgs(base)).toMatchObject({ on: true, write: false });
    expect(parseArgs(['node', 'x', '--target=atlas', '--email=a@b.c', '--confirm-host=h.example'])['confirm-host']).toBe('h.example');
  });
  it('refuses a missing target, a missing email, an unknown argument and --db with Atlas', () => {
    expect(() => parseArgs(['node', 'x', '--email=a@b.c'])).toThrow('--target=local|atlas is required');
    expect(() => parseArgs(['node', 'x', '--target=local'])).toThrow(/--email/);
    expect(() => parseArgs(['node', 'x', '--target=local', '--email=  '])).toThrow(/--email/);
    expect(() => parseArgs([...base, '--bogus'])).toThrow(/Unknown argument/);
    expect(() => parseArgs([...base, '--dry-run'])).toThrow(/Unknown argument/);
    expect(() => parseArgs(['node', 'x', '--target=atlas', '--email=a@b.c', '--db=scratch'])).toThrow(/--db/);
  });
  it('run without a target, the script exits 1 and says the target is required, before any connection', () => {
    const res = spawnSync(process.execPath, [SCRIPT, '--email=a@b.c'], { encoding: 'utf8', timeout: 20000 });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('--target=local|atlas is required');
    expect(res.stdout).not.toContain('[tool] target=');
  });
});

describe('planChange', () => {
  it('refuses 0, 2 and removed users', () => {
    expect(planChange([], { on: true })).toEqual({ refused: 'no user with that email' });
    expect(planChange([{ _id: 'u1' }, { _id: 'u2' }], { on: true })).toEqual({ refused: 'more than one user with that email' });
    expect(planChange([{ _id: 'u1', removedAt: 5 }], { on: true })).toEqual({ refused: 'that user was removed' });
  });
  it('plans the change or says nothing to do', () => {
    expect(planChange([{ _id: 'u1', isPlatformAdmin: false }], { on: true })).toEqual({ userId: 'u1', from: false, to: true, noop: false });
    expect(planChange([{ _id: 'u1' }], { on: true })).toMatchObject({ from: false, to: true, noop: false });
    expect(planChange([{ _id: 'u1', isPlatformAdmin: true }], { on: true })).toMatchObject({ noop: true });
    expect(planChange([{ _id: 'u1', isPlatformAdmin: true }], { on: false })).toMatchObject({ from: true, to: false, noop: false });
  });
});

describe('run on the in-memory database', () => {
  let mongod;
  let client;
  let db;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('platform_admin_test');
  }, 60000);
  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });
  beforeEach(async () => {
    await db.collection('users').deleteMany({});
    await db.collection('users').insertMany([
      { _id: 'u_dan', email: 'dan@example.com', name: 'Dan', isPlatformAdmin: false },
      { _id: 'u_other', email: 'other@example.com', name: 'Other', isPlatformAdmin: false },
      { _id: 'u_gone', email: 'gone@example.com', name: 'Gone', isPlatformAdmin: false, removedAt: 7 },
    ]);
  });
  const user = (id) => db.collection('users').findOne({ _id: id });

  it('a dry run writes nothing and names the user id only', async () => {
    const res = await run(db, { email: 'dan@example.com', on: true, write: false });
    expect(res).toEqual({ code: 0, lines: ['PLATFORM_ADMIN: u_dan false → true (dry run — add --write to apply)'] });
    expect((await user('u_dan')).isPlatformAdmin).toBe(false);
    expect((await user('u_dan')).platformAdminHistory).toBeUndefined();
    expect(res.lines.join('\n')).not.toMatch(/dan@example|Dan\b/);
  });

  it('the email is matched lower-cased and trimmed', async () => {
    const res = await run(db, { email: '  DAN@Example.COM ', on: true, write: false });
    expect(res.lines[0]).toContain('u_dan false → true');
  });

  it('--write sets the flag with one history row; --off clears it', async () => {
    const res = await run(db, { email: 'dan@example.com', on: true, write: true, at: 1000 });
    expect(res).toEqual({ code: 0, lines: ['PLATFORM_ADMIN: u_dan false → true written'] });
    let doc = await user('u_dan');
    expect(doc.isPlatformAdmin).toBe(true);
    expect(doc.platformAdminHistory).toEqual([{ at: 1000, on: true, by: 'script' }]);
    expect((await user('u_other')).isPlatformAdmin).toBe(false);

    expect(await run(db, { email: 'dan@example.com', on: true, write: true })).toEqual({
      code: 0, lines: ['PLATFORM_ADMIN: u_dan already true — nothing to do'],
    });

    const off = await run(db, { email: 'dan@example.com', on: false, write: true, at: 2000 });
    expect(off.lines).toEqual(['PLATFORM_ADMIN: u_dan true → false written']);
    doc = await user('u_dan');
    expect(doc.isPlatformAdmin).toBe(false);
    expect(doc.platformAdminHistory).toEqual([{ at: 1000, on: true, by: 'script' }, { at: 2000, on: false, by: 'script' }]);
  });

  it('refuses no match, two matches and a removed user, writing nothing', async () => {
    expect(await run(db, { email: 'nobody@example.com', on: true, write: true })).toEqual({
      code: 1, lines: ['PLATFORM_ADMIN: refused — no user with that email'],
    });
    await db.collection('users').insertOne({ _id: 'u_dup', email: 'other@example.com' });
    expect(await run(db, { email: 'other@example.com', on: true, write: true })).toEqual({
      code: 1, lines: ['PLATFORM_ADMIN: refused — more than one user with that email'],
    });
    expect(await run(db, { email: 'gone@example.com', on: true, write: true })).toEqual({
      code: 1, lines: ['PLATFORM_ADMIN: refused — that user was removed'],
    });
    expect(await db.collection('users').countDocuments({ isPlatformAdmin: true })).toBe(0);
  });

  it('a user changed meanwhile is refused by the guarded write', async () => {
    const plan = planChange([await user('u_dan')], { on: true });
    await db.collection('users').updateOne({ _id: 'u_dan' }, { $set: { removedAt: 9 } });
    expect(await applyChange(db, plan, { at: 1 })).toBe(false);
    expect((await user('u_dan')).isPlatformAdmin).toBe(false);
  });
});
