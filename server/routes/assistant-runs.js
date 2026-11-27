'use strict';
/**
 * Plan 752 (C-RUNS): the one read path of the assistant's run records — the list and one run. The owner reads them (a
 * consultant has the owner's rights, ADR 0032; the platform admin acting in the business too); staff do not. The
 * business always comes from the signed token; every query lives in `services/frontdesk-runs.js`. A real guest's words
 * reach the acting platform admin only by opening the run, and that leaves a trace on it. Logs carry ids, counts and
 * enums only — never text from a run.
 */
const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, isPlatformAdmin } = require('../middleware/auth');
const { requireModule } = require('../middleware/require-module');
const { dataWriteLimiter } = require('../middleware/write-limit');
const { scopeFilter } = require('../utils/business-scope');
const { assertCan } = require('../utils/permissions');
const { logger } = require('../logger');
const { listRuns, loadRun, markAdminView } = require('../services/frontdesk-runs');
const { TURN_SYSTEM_PROMPT, TABLE_SYSTEM_PROMPT } = require('../services/frontdesk-prompt');

const router = Router();
const db = () => mongoose.connection.db;
const FILTERS = ['all', 'answered', 'handover', 'fallback'];
const SCOPES = ['real', 'test'];
const LIST_DEFAULT = 50;
const LIST_MAX = 100;
const ADMIN_VIEWS_MAX = 20;

const logOf = req => req.log || logger;
const badInput = res => res.status(400).json({ error: 'BAD_INPUT' });
const failed = (req, res, event, err) => {
  logOf(req).error({ err, event });
  return res.status(500).json({ error: 'Server error' });
};
const actsAsPlatform = req => req.user.acting === 'platform';

/** A query number: a finite integer inside [min, max], or `undefined` when absent, `null` when malformed. */
function queryInt(v, min, max) {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !/^\d{1,16}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/** Today's fixed rules for the run's prompt (they are code, so they are never stored). */
const promptRulesOf = ({ tone, tablesOn }) =>
  TURN_SYSTEM_PROMPT.replace('{{TONE}}', tone) + (tablesOn ? '\n' + TABLE_SYSTEM_PROMPT : '');

router.use(verifyToken, requireModule('frontdesk'), dataWriteLimiter);

router.get('/', async (req, res) => {
  try {
    const { businessId } = scopeFilter(req);
    if (!assertCan(req, res, 'editFrontDesk', { type: 'assistantRuns' })) return;
    const filter = req.query.filter === undefined ? 'all' : req.query.filter;
    const scope = req.query.scope === undefined ? 'real' : req.query.scope;
    if (!FILTERS.includes(filter) || !SCOPES.includes(scope)) return badInput(res);
    const limit = queryInt(req.query.limit, 1, LIST_MAX);
    const before = queryInt(req.query.before, 0, Number.MAX_SAFE_INTEGER);
    if (limit === null || before === null) return badInput(res);
    const found = await listRuns(db(), businessId, {
      filter, test: scope === 'test', limit: limit === undefined ? LIST_DEFAULT : limit, before,
    });
    const runs = actsAsPlatform(req)
      ? found.runs.map(row => (row.test ? row : { ...row, text: '', textHidden: true }))
      : found.runs;
    logOf(req).info({ event: 'assistant_runs.listed', count: runs.length, filter, scope });
    return res.json({ runs, more: found.more, now: Date.now() });
  } catch (err) {
    return failed(req, res, 'assistant_runs.list.failed', err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { businessId } = scopeFilter(req);
    if (!assertCan(req, res, 'editFrontDesk', { type: 'assistantRuns' })) return;
    let run = await loadRun(db(), businessId, req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    if (actsAsPlatform(req) && !run.test) {
      let view;
      try {
        view = await markAdminView(db(), run, req.user.userId, Date.now());
      } catch (err) {
        logOf(req).error({ err, event: 'assistant_runs.read.failed', runId: run._id });
        return res.status(503).json({ error: 'TRACE_FAILED' });
      }
      run = { ...run, adminViews: [...(run.adminViews ?? []), view].slice(-ADMIN_VIEWS_MAX) };
      logOf(req).warn({ event: 'assistant_runs.admin_read', runId: run._id, conversationId: run.conversationId });
    }
    const { prompt, ...shown } = run;
    if (isPlatformAdmin(req) && prompt) Object.assign(shown, { prompt, promptRules: promptRulesOf(prompt) });
    logOf(req).info({ event: 'assistant_runs.read', runId: run._id });
    return res.json({ run: shown });
  } catch (err) {
    return failed(req, res, 'assistant_runs.read.failed', err);
  }
});

module.exports = router;
