export const environment = {
  production: true,
  localDev: false,
  apiUrl: '',
  authApiUrl: '',
  useBackendAuth: true,
  useBackend: true,
  autoLoginGuest: false,
  logServerUrl: '',
  cloudinaryCloudName: 'dsxi4o2gb',
  cloudinaryUploadPreset: 'foodvibe',
}

// Same-origin deployment: empty apiUrl means API calls go to the same host.
// If useBackend is true and this is served from a file:// URL, something is wrong.
