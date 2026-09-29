/**
 * Single client-side id generator (Plan 321 Phase 1 — replaces the two separate
 * 5-char alphanumeric `makeId()` implementations that used to live on
 * `StorageService`/`HttpStorageAdapter`). Only needed for client-generated array
 * items that never round-trip through `POST /api/v1/data/:type` for a server-
 * assigned id (e.g. a registry item inside a `replaceAll()`-saved array) — a
 * genuinely new top-level entity should go through `StorageService.post()` and use
 * the `_id` on the returned doc instead of generating one here.
 */
export function newId(): string {
  return crypto.randomUUID()
}
