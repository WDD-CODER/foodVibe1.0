const fs = require('fs');
const path = require('path');

const TERMS_FILE = path.join(__dirname, '..', '..', 'public', 'assets', 'legal', 'terms.he.json');
let cached = null;

/**
 * Plan 584: the version of the terms the app shows, read once from the same JSON file the client loads,
 * so the server and the app can never disagree on it.
 */
function currentTermsVersion() {
  if (cached === null) cached = JSON.parse(fs.readFileSync(TERMS_FILE, 'utf8')).version;
  return cached;
}

module.exports = { currentTermsVersion, TERMS_FILE };
