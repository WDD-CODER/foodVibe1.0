// Plan 321 Phase 1: localStorage fallback mode (useBackend/useBackendAuth) removed.
// Plain `ng serve` now behaves the same as `ng serve -c local` — hits the local
// backend at localhost:3000, real backend auth, auto-login as the dev guest.
export const environment = {
  production: false,
  localDev: true,
  apiUrl: 'http://localhost:3000',
  authApiUrl: 'http://localhost:3000',
  autoLoginGuest: true,
  cloudinaryCloudName: 'dsxi4o2gb',
  cloudinaryUploadPreset: 'foodvibe',
}
