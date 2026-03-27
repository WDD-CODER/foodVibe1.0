export const environment = {
  production: true,
  apiUrl: 'https://your-render-url.onrender.com',
  authApiUrl: 'https://your-render-url.onrender.com',
  useBackendAuth: true,
  useBackend: true,
  logServerUrl: ''
}

// Startup guard: throw at APP_INITIALIZER time if backend is enabled but URL is still placeholder
if (environment.useBackend && environment.apiUrl.includes('your-render-url')) {
  throw new Error(
    '[foodVibe] environment.prod.ts: useBackend is true but apiUrl is still the placeholder ' +
    '"your-render-url". Update apiUrl to the real Render deployment URL before building for production.'
  );
}
