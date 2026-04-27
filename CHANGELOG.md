# Changelog

All notable changes to FoodVibe are documented here.

## [0.1.0.0] - 2026-04-27

### Added
- **User Management card** (Plan 288) — admin-only panel in Metadata Manager for viewing registered users and deleting their data; guards non-admins with a lock state
- **Nutrition filter in Inventory sidebar** — filter products by nutrition tags; fixes leaf-off icon crash when filter panel is open
- **MongoDB nutrition patching scripts** — batch-patch nutrition fields on Atlas products and demo catalog; catalog-review output updated
- **Admin API routes** — `GET /admin/users` and `DELETE /admin/users/:id` with role-gated middleware; `UserAdminService` and `AdminUser` model wired in Angular

### Fixed
- `logging.service.ts` — `logServerUrl` removed from default `environment.ts`; eliminates `ERR_CONNECTION_REFUSED` console noise on plain `ng serve` (log server URL retained in `environment.local.ts` for intentional use)

### Changed
- Claude configuration: skill routing rules, REV3 token-opt, merge conflict guard, session retrospective, failure-log entries, standards-domain updates, execute-it command revision
