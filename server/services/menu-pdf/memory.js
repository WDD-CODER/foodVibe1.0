'use strict'
/**
 * Plan 767: how much memory a render takes: this Node process, plus the browser process and its children read from
 * /proc on Linux. Memory shared between the browser's processes is counted once per process, so the total errs high.
 */
const fs = require('node:fs')
const path = require('node:path')

const SAMPLE_MS = 100
const BYTES_PER_MB = 1024 * 1024

function readStatus(procDir, pid) {
  try {
    const text = fs.readFileSync(path.join(procDir, pid, 'status'), 'utf8')
    return {
      pid: Number(pid),
      parent: Number(text.match(/^PPid:\s+(\d+)/m)?.[1] ?? 0),
      rssKb: Number(text.match(/^VmRSS:\s+(\d+)\s+kB/m)?.[1] ?? 0),
    }
  } catch {
    return null // the process ended between the listing and the read
  }
}

/** VmRSS in MB of `rootPid` and every process under it; null when it cannot be read. */
function treeRssMb(rootPid, procDir = '/proc') {
  if (!rootPid) return null
  let names
  try {
    names = fs.readdirSync(procDir)
  } catch {
    return null
  }
  const all = names.filter(name => /^\d+$/.test(name)).map(name => readStatus(procDir, name)).filter(Boolean)
  const tree = all.filter(entry => entry.pid === rootPid)
  if (!tree.length) return null
  for (let at = 0; at < tree.length; at += 1) {
    tree.push(...all.filter(entry => entry.parent === tree[at].pid))
  }
  return tree.reduce((sum, entry) => sum + entry.rssKb, 0) / 1024
}

const round = value => (value === null ? null : Math.round(value * 10) / 10)

/**
 * Samples memory every 100 ms until `stop()`, which takes one last sample and answers the highest one:
 * `{ nodeRssMb, browserRssMb, peakTotalMb }` (the two parts of the peak). Without a browser reading (not Linux) the
 * browser and the total are null and `nodeRssMb` is Node's own highest sample.
 */
function startMemorySampler(browserPid, platform = process.platform) {
  let peak = null
  const sample = () => {
    const node = process.memoryUsage.rss() / BYTES_PER_MB
    const browser = platform === 'linux' ? treeRssMb(browserPid()) : null
    const total = node + (browser ?? 0)
    const better = !peak
      || (browser !== null && peak.browser === null)
      || ((browser === null) === (peak.browser === null) && total > peak.total)
    if (better) peak = { node, browser, total }
  }
  sample()
  const timer = setInterval(sample, SAMPLE_MS)
  return {
    stop() {
      clearInterval(timer)
      sample()
      return {
        nodeRssMb: round(peak.node),
        browserRssMb: round(peak.browser),
        peakTotalMb: round(peak.browser === null ? null : peak.total),
      }
    },
  }
}

module.exports = { startMemorySampler, treeRssMb }
