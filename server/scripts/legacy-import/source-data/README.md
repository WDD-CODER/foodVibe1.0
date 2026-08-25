# Legacy FoodComposer SQL source

`fullDATA_utf8.sql` is the original FoodComposer (MS SQL Server) database export, used
by every script in `server/scripts/legacy-import/` as the source of truth for the
one-time migration into MongoDB (plan 300) and its ongoing verification
(`verify-against-source.js`).

**No longer tracked in the repo (2026-08-23).** It was committed for a while
(~10MB) while the migration was still being actively validated — new discrepancies
between this source and Mongo were still being found and fixed through plan 300
Finding 5. Plan 300's final atomic sub-task (a full-database sweep, extended to
suppliers) confirmed **0 remaining mismatches**, and nothing has touched
`server/scripts/legacy-import/` since. Per that plan's own condition for removal
("once the migration is fully validated, stable, and no further legacy-data
questions are expected"), it was untracked deliberately as part of plan 307 —
Mongo is the permanent source of truth going forward, not this file.

**If you need to re-run `verify-against-source.js` or any of the other scripts here**
(e.g. a new legacy-data question surfaces): obtain the original FoodComposer export
from wherever the plan 300 import sourced it (the original MS SQL Server database /
whichever machine held it at import time — ask if that's unclear), convert it to
UTF-8 if it isn't already, and drop it at
`server/scripts/legacy-import/source-data/fullDATA_utf8.sql`. All four
`DEFAULT_SQL_PATH` script defaults point at that exact path; every script also
accepts `--sql-path=<path>` to point at a different location without moving the file.
