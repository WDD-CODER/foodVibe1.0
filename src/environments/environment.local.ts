// Opened through the remote link (plan 388, scripts/remote-port.mjs): any host but localhost
// talks to the API on the same origin — the remote proxy routes /api to this checkout's backend.
const viaRemote = typeof location !== 'undefined' && !['localhost', '127.0.0.1'].includes(location.hostname)

export const environment = {
  production: false,
  localDev: true,
  apiUrl: viaRemote ? '' : 'http://localhost:3000',
  authApiUrl: viaRemote ? '' : 'http://localhost:3000',
  autoLoginGuest: true,
  cloudinaryCloudName: 'dsxi4o2gb',
  cloudinaryUploadPreset: 'foodvibe',
}
