'use strict';
/**
 * bump-master-version.js
 * Run this after any script writes/edits/removes __master__ docs (seed-master.js,
 * a manually-run fix script) so POST /refresh's version-gated
 * syncMasterToUser (server/services/master-version.js) picks up the change on the
 * next refresh instead of comparing against a stale version.
 *
 * Run against local:  node server/scripts/bump-master-version.js
 * Run against Atlas:  node server/scripts/bump-master-version.js --target=atlas
 * (--target=local|atlas, default local; atlas reads server/.env.live)
 */

const mongoose = require('mongoose');
const path = require('path');
const { parseTarget, loadServerEnv, mongoUri } = require('../utils/db-target');

const target = parseTarget(process.argv);
const isLocal = target === 'local';

async function run() {
  console.log(`Connecting to ${isLocal ? 'LOCAL' : 'ATLAS'}...`);
  loadServerEnv(target);
  await mongoose.connect(mongoUri(target));
  const { bumpMasterVersion } = require('../services/master-version');
  const version = await bumpMasterVersion();
  console.log(`Master version bumped to ${version} (${new Date(version).toISOString()})`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('[bump-master-version]', err);
  process.exit(1);
});
