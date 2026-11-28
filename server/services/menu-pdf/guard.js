'use strict'
/**
 * Plan 767: what the headless browser may load. A menu being printed reaches only `data:`, Google Fonts and
 * Cloudinary. A page being photographed (an address a user typed) reaches only public hosts over https on port 443.
 */
const dns = require('node:dns')
const net = require('node:net')

const RENDER_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'res.cloudinary.com'])

const blocked = new net.BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, the cloud metadata address included
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // protocol assignments
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved and broadcast
]) blocked.addSubnet(address, prefix, 'ipv4')
// IPv6 ranges inside the public block that tunnel to an IPv4 address or are never routed.
for (const [address, prefix] of [['2001::', 32], ['2001:db8::', 32], ['2002::', 16]]) {
  blocked.addSubnet(address, prefix, 'ipv6')
}

// The only public IPv6 block: loopback, private, link-local, multicast and IPv4-mapped addresses all fall outside it.
const publicV6 = new net.BlockList()
publicV6.addSubnet('2000::', 3, 'ipv6')

function isPublicAddress(address) {
  const family = net.isIP(address)
  if (family === 4) return !blocked.check(address, 'ipv4')
  if (family === 6) return publicV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6')
  return false
}

function parseUrl(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** A request of a menu being printed. */
function isAllowedRenderRequest(value) {
  const url = parseUrl(value)
  if (!url) return false
  if (url.protocol === 'data:') return true
  return url.protocol === 'https:' && url.port === '' && RENDER_HOSTS.has(url.hostname)
}

/** An https address on port 443 whose host is public: every address it resolves to is checked. */
async function isPublicWebUrl(value) {
  const url = parseUrl(value)
  // An explicit :443 is read as no port at all.
  if (!url || url.protocol !== 'https:' || url.port !== '') return false
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase()
  // The browser sends any *.localhost name to this machine without asking DNS.
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return false
  if (net.isIP(host)) return isPublicAddress(host)
  try {
    const found = await dns.promises.lookup(host, { all: true, verbatim: true })
    return found.length > 0 && found.every(entry => isPublicAddress(entry.address))
  } catch {
    return false
  }
}

/** A request of a page being photographed. `data:` and `blob:` never touch the network. */
async function isAllowedScreenshotRequest(value) {
  if (/^(data|blob):/i.test(value)) return true
  return isPublicWebUrl(value)
}

module.exports = { isAllowedRenderRequest, isAllowedScreenshotRequest, isPublicAddress, isPublicWebUrl }
