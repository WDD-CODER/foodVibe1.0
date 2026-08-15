---
name: Point dev environment at local Express/MongoDB
overview: Update environment.ts so the Angular dev build routes all API calls to the local Express server (port 3000) instead of using localStorage.
todos:
  - Edit src/environments/environment.ts
  - Verify prod build compiles with zero errors
isProject: false
---

# Point dev environment at local Express/MongoDB

## Goal
Update `src/environments/environment.ts` so `apiUrl`, `authApiUrl`, `useBackend`, and `useBackendAuth` all target the local Express server running on `http://localhost:3000`.

## Atomic Sub-tasks

- [x] Edit `src/environments/environment.ts`: set `apiUrl` and `authApiUrl` to `'http://localhost:3000'`, `useBackend` and `useBackendAuth` to `true`
- [x] Run `ng build --configuration production` and confirm zero errors

## Constraints

- Do NOT touch `src/environments/environment.prod.ts`
- Do NOT run `ng serve` — only the production build check

## Done when

`ng build --configuration production` passes with zero errors.
