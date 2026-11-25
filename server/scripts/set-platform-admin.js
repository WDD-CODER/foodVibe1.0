'use strict';
/**
 * set-platform-admin.js — Plan 737. Makes one existing user the platform admin (or takes it away).
 *   node server/scripts/set-platform-admin.js --target=local|atlas --email=<email> [--off] [--confirm-host=<host>] [--db=<name>] [--write]
 * Dry run by default; `--write` applies. Atlas needs `--confirm-host=<host>` (checked by `connect`). Prints the user id only,
 * never the email or name.
 */

const { parseTarget } = require('../utils/db-target');

function parseArgs(argv) {
  const args = { target: parseTarget(argv, { required: true }), on: true, write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--off') { args.on = false; continue; }
    if (arg === '--write') { args.write = true; continue; }
    const m = /^--(email|confirm-host|db|target)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    if (m[1] !== 'target') args[m[1]] = m[2];
  }
  const email = (args.email ?? '').trim().toLowerCase();
  if (!email) throw new Error('--email is required');
  args.email = email;
  if (args.db !== undefined && (args.target !== 'local' || !/^[A-Za-z0-9_-]+$/.test(args.db))) {
    throw new Error('--db=<name> works with --target=local only (letters, digits, _ and -)');
  }
  return args;
}

/** Pure: `users` is the (at most 2) documents found. Returns `{ refused }` or `{ userId, from, to }`. */
function planChange(users, { on }) {
  if (users.length === 0) return { refused: 'no user with that email' };
  if (users.length > 1) return { refused: 'more than one user with that email' };
  const user = users[0];
  if (user.removedAt) return { refused: 'that user was removed' };
  return { userId: String(user._id), from: user.isPlatformAdmin === true, to: on === true, _id: user._id };
}

/** One guarded write with an audit row. Returns true when a document changed. */
async function applyChange(db, plan, { at }) {
  const res = await db.collection('users').updateOne(
    { _id: plan._id, isPlatformAdmin: { $ne: plan.to }, removedAt: null },
    {
      $set: { isPlatformAdmin: plan.to },
      $push: { platformAdminHistory: { $each: [{ at, on: plan.to, by: 'script' }], $slice: -20 } },
    },
  );
  return res.modifiedCount === 1;
}

/** Runs the whole flow on an open db; returns `{ code, lines }`. */
async function run(db, args, { at = Date.now() } = {}) {
  const users = await db.collection('users').find({ email: args.email }).limit(2).toArray();
  const plan = planChange(users, { on: args.on });
  if (plan.refused) return { code: 1, lines: [`PLATFORM_ADMIN: refused — ${plan.refused}`] };
  if (plan.from === plan.to) return { code: 0, lines: [`PLATFORM_ADMIN: ${plan.userId} already ${plan.to} — nothing to do`] };
  if (!args.write) {
    return { code: 0, lines: [`PLATFORM_ADMIN: ${plan.userId} ${plan.from} → ${plan.to} (dry run — add --write to apply)`] };
  }
  if (!(await applyChange(db, plan, { at }))) return { code: 1, lines: ['PLATFORM_ADMIN: refused — the user changed meanwhile'] };
  return { code: 0, lines: [`PLATFORM_ADMIN: ${plan.userId} ${plan.from} → ${plan.to} written`] };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: args.target, 'confirm-host': args['confirm-host'], db: args.db });
  let result;
  try {
    result = await run(db, args);
  } finally {
    await client.close();
  }
  for (const line of result.lines) console.log(line);
  process.exit(result.code);
}

module.exports = { parseArgs, planChange, applyChange, run };

if (require.main === module) {
  main().catch((err) => { console.error('[set-platform-admin] failed:', err.message); process.exit(1); });
}
