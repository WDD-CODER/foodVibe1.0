'use strict';
/**
 * set-platform-admin.js — Plan 737. Makes one existing user the platform admin (or clears it with --off).
 * The only way to set `isPlatformAdmin`: no route, sign-up rule or environment setting grants it.
 *   node server/scripts/set-platform-admin.js --target=local|atlas --email=<email> [--off] [--confirm-host=<host>] [--db=<name>] [--write]
 * `--target` is required. Atlas needs `--confirm-host=<host>` (checked by `connect`); `--db` works with local only.
 * Dry run by default; `--write` applies. The output names the user id only, never the email or the name.
 * Runbook: docs/security-go-live.md «הפיכת משתמש למנהל מערכת באפליקציה החיה».
 */

const { parseTarget } = require('../utils/db-target');

const PREFIX = 'PLATFORM_ADMIN:';

function parseArgs(argv) {
  const args = { target: parseTarget(argv, { required: true }), on: true, write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    if (arg === '--off') { args.on = false; continue; }
    const m = /^--(target|email|confirm-host|db)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    if (m[1] !== 'target') args[m[1]] = m[2];
  }
  args.email = (args.email ?? '').trim().toLowerCase();
  if (!args.email) throw new Error('--email=<email> is required');
  if (args.db !== undefined && (args.target !== 'local' || !/^[A-Za-z0-9_-]+$/.test(args.db))) {
    throw new Error('--db=<name> works with --target=local only (letters, digits, _ and -)');
  }
  return args;
}

/** Pure: from the matched users (at most 2) decide the change. Returns `{ refused }` or `{ userId, from, to, noop }`. */
function planChange(users, { on }) {
  if (users.length === 0) return { refused: 'no user with that email' };
  if (users.length > 1) return { refused: 'more than one user with that email' };
  const [user] = users;
  if (user.removedAt != null) return { refused: 'that user was removed' };
  const from = user.isPlatformAdmin === true;
  const to = on === true;
  return { userId: user._id, from, to, noop: from === to };
}

/** Reads the users with this email (lower-cased, exact) — at most two, enough to see an ambiguous match. */
function findUsers(db, email) {
  return db.collection('users').find({ email: String(email).trim().toLowerCase() }).limit(2).toArray();
}

/** Guarded write with an audit row. Returns true when the user was changed, false when it changed meanwhile. */
async function applyChange(db, plan, { at = Date.now() } = {}) {
  const res = await db.collection('users').updateOne(
    { _id: plan.userId, isPlatformAdmin: { $ne: plan.to }, removedAt: null },
    {
      $set: { isPlatformAdmin: plan.to },
      $push: { platformAdminHistory: { $each: [{ at, on: plan.to, by: 'script' }], $slice: -20 } },
    },
  );
  return res.modifiedCount === 1;
}

/** Runs one change on an open database. Returns `{ code, lines }`; prints nothing itself. */
async function run(db, { email, on, write, at }) {
  const plan = planChange(await findUsers(db, email), { on });
  if (plan.refused) return { code: 1, lines: [`${PREFIX} refused — ${plan.refused}`] };
  const id = String(plan.userId);
  if (plan.noop) return { code: 0, lines: [`${PREFIX} ${id} already ${plan.to} — nothing to do`] };
  if (!write) return { code: 0, lines: [`${PREFIX} ${id} ${plan.from} → ${plan.to} (dry run — add --write to apply)`] };
  if (!(await applyChange(db, plan, { at }))) return { code: 1, lines: [`${PREFIX} refused — the user changed meanwhile`] };
  return { code: 0, lines: [`${PREFIX} ${id} ${plan.from} → ${plan.to} written`] };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(`${PREFIX} ${err.message}`);
    process.exit(1);
  }
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: args.target, 'confirm-host': args['confirm-host'], db: args.db });
  let code = 1;
  try {
    const result = await run(db, args);
    for (const line of result.lines) console.log(line);
    code = result.code;
  } finally {
    await client.close();
  }
  process.exit(code);
}

module.exports = { parseArgs, planChange, findUsers, applyChange, run };

if (require.main === module) {
  main().catch((err) => { console.error(`${PREFIX} failed: ${err.message}`); process.exit(1); });
}
