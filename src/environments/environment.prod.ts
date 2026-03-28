export const environment = {
  production: true,
  apiUrl: '',
  authApiUrl: '',
  useBackendAuth: true,
  useBackend: true,
  logServerUrl: ''
}

// Same-origin deployment: empty apiUrl means API calls go to the same host.
// If useBackend is true and this is served from a file:// URL, something is wrong.
