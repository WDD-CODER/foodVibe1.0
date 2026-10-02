'use strict';
/**
 * Shared read-only connection helper for Plan 321 migration tools.
 * `--target=local` or `--target=atlas` is required, and Atlas additionally requires
 * `--confirm-host=<host>` matching the cluster host in MONGO_URI (the "host confirm"
 * from the plan's Global migration rules). These tools never write.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');

function parseArgs(argv, extra = {}) {
  const args = {};
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (!m || !(['target', 'confirm-host', 'out'].includes(m[1]) || m[1] in extra)) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    args[m[1]] = m[2];
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

async function connect(args) {
  const uri = args.target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${args.target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30000 });
  await client.connect();
  const db = client.db();
  if (args.target === 'atlas') {
    // Replica-set members come back in varying order, so accept any member of the cluster.
    const hosts = (client.options.hosts ?? []).map(h => h.host);
    const host = hosts[0] ?? '';
    if (!hosts.includes(args['confirm-host'])) {
      await client.close();
      throw new Error(`Atlas host confirm required: re-run with --confirm-host=${host}`);
    }
  }
  console.log(`[tool] target=${args.target} database=${db.databaseName}`);
  return { client, db };
}

module.exports = { parseArgs, connect };
