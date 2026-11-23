'use strict'
/**
 * Plan 676 (C-JOBS): the one small scheduler. `runDue` runs the four jobs one after the other, each in its own `try`;
 * `startScheduler` ticks it from one unref'd interval timer (never under vitest unless forced). Runs only while the
 * server is awake. Logs carry job names and counts only.
 */
const { logger } = require('../logger')
const reminders = require('./reminders')
const noShow = require('./no-show')
const waitlistExpire = require('./waitlist-expire')
const orphanHolds = require('./orphan-holds')

const JOBS = [
  ['reminders', reminders], ['noShow', noShow], ['waitlist', waitlistExpire], ['orphanHolds', orphanHolds],
]
let timer = null
let running = false

async function runDue(db, now, { log = logger } = {}) {
  const counts = {}
  for (const [name, job] of JOBS) {
    try {
      counts[name] = await job.run(db, now)
    } catch (err) {
      counts[name] = {}
      log.error({ event: 'jobs.failed', job: name, errName: err && err.name })
    }
  }
  if (Object.values(counts).some(c => Object.values(c).some(n => n > 0))) log.info({ event: 'jobs.ran', ...counts })
  return counts
}

function startScheduler(db, { now = Date.now, every = 60000, force = false } = {}) {
  if ((process.env.VITEST && !force) || timer) return
  const tick = async () => {
    if (running) return
    running = true
    try {
      await runDue(db, now())
    } finally {
      running = false
    }
  }
  timer = setInterval(tick, every).unref()
}

function stopScheduler() {
  if (timer) clearInterval(timer)
  timer = null
  running = false
}

module.exports = { runDue, startScheduler, stopScheduler }
