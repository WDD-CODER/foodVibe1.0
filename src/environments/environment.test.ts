// Unit tests: no log shipping, and API URLs point at a closed port so no spec can reach a real backend (plan 507).
// Plan 321 Phase 1: localStorage fallback mode (useBackend/useBackendAuth) removed.
// Plain `ng serve` now behaves the same as `ng serve -c local` — hits the local
// backend at localhost:3000, real backend auth, auto-login as the dev guest.
export const environment = {
  production: false,
  sendLogsToServer: false,
  localDev: true,
  apiUrl: 'http://127.0.0.1:1',
  authApiUrl: 'http://127.0.0.1:1',
  autoLoginGuest: true,
  cloudinaryCloudName: 'dsxi4o2gb',
  cloudinaryUploadPreset: 'foodvibe',
}
