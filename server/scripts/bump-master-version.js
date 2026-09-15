'use strict';
/**
 * bump-master-version.js
 * Run this after any script writes/edits/removes __master__ docs (seed-master.js,
 * a legacy-import script, a manual fix script) so POST /refresh's version-gated
 * syncMasterToUser (server/services/master-version.js) picks up the change on the
 * next refresh instead of comparing against a stale version.
 *
 * Run against local:  NODE_ENV=development node server/scripts/bump-master-version.js
 * Run against Atlas:  node server/scripts/bump-master-version.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const isLocal = process.env.NODE_ENV === 'development';
const uri = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;

async function run() {
  console.log(`Connecting to ${isLocal ? 'LOCAL' : 'ATLAS'}...`);
  await mongoose.connect(uri);
  const { bumpMasterVersion } = require('../services/master-version');
  const version = await bumpMasterVersion();
  console.log(`Master version bumped to ${version} (${new Date(version).toISOString()})`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('[bump-master-version]', err);
  process.exit(1);
});
