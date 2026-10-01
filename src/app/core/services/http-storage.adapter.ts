import { Injectable, Injector, inject } from '@angular/core'
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { catchError, firstValueFrom, of } from 'rxjs'
import { environment } from '../../../environments/environment'

/** Mirrors EntityId from async-storage.service.ts — kept local to avoid circular import. */
type EntityId = { _id: string }

/**
 * sessionStorage key where the JWT is stored after login.
 *
 * Security decision (standards-security.md §Requirement 3):
 * "No password, hash, or token ever written to localStorage."
 * JWT tokens are credentials; sessionStorage is mandatory. This means the
 * token is cleared automatically when the browser tab is closed, which is
 * the intended behaviour — it prevents silent persistent-login across
 * separate browser sessions while still supporting the 30-day JWT expiry
 * when the same tab/session remains open.
 * localStorage was rejected because it survives tab close and browser
 * restart, violating the credential-storage prohibition in the standard.
 */
const TOKEN_KEY = 'fv_token'

/**
 * recipes and dishes share one v2 schema and carry no kind field — the collection says which
 * they are (Plan 321 G1). The client still uses recipeType in memory, so it is attached when
 * reading and stripped when writing (the strict server schema would reject it).
 */
const RECIPE_TYPE_BY_COLLECTION: Record<string, 'dish' | 'preparation'> = { recipes: 'preparation', dishes: 'dish' }

function fromServer<T>(entityType: string, doc: T): T {
  const recipeType = RECIPE_TYPE_BY_COLLECTION[entityType]
  return recipeType && doc && typeof doc === 'object' ? ({ ...doc, recipeType } as T) : doc
}

function toServer<T>(entityType: string, doc: T): T {
  if (!(entityType in RECIPE_TYPE_BY_COLLECTION) || !doc || typeof doc !== 'object') return doc
  const { recipeType: _recipeType, ...rest } = doc as T & { recipeType?: unknown }
  return rest as T
}

/**
 * HTTP adapter that implements the StorageService interface — every operation
 * goes to the REST API. StorageService (async-storage.service.ts) is a thin
 * facade over this class (Plan 321 Phase 1 removed the old localStorage fallback
 * mode, so there is no longer a runtime choice between the two).
 *
 * HttpClient is resolved lazily via Injector so constructing this service doesn't
 * force an HttpClient provider on every consumer at construction time.
 *
 * Endpoints:
 *   query        → GET    /api/v1/data/:entityType
 *   get          → GET    /api/v1/data/:entityType/:id
 *   post         → POST   /api/v1/data/:entityType        (server assigns _id unless the body already has one — see generic.js)
 *   put          → PUT    /api/v1/data/:entityType/:id
 *   remove       → DELETE /api/v1/data/:entityType/:id
 *   appendExisting → POST /api/v1/data/:entityType        (body already has _id — server honors it, e.g. trash restore)
 *   replaceAll   → PUT    /api/v1/data/:entityType        (body is full array, no :id segment)
 *   queryFiltered → GET   /api/v1/data/:entityType?filterEntityType=&filterEntityId=
 *   deleteBulk   → DELETE /api/v1/data/:entityType/bulk   (body: { ids })
 *   search        → GET   /api/v1/data/:entityType/search?q=&limit=
 */
@Injectable({ providedIn: 'root' })
export class HttpStorageAdapter {
  private readonly injector_ = inject(Injector)
  private base = environment.apiUrl

  private get http(): HttpClient {
    return this.injector_.get(HttpClient)
  }

  // ---------------------------------------------------------------------------
  // Token helper
  // ---------------------------------------------------------------------------

  private headers(): HttpHeaders {
    const token = sessionStorage.getItem(TOKEN_KEY)
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders()
  }

  // ---------------------------------------------------------------------------
  // Public interface — matches StorageService exactly
  // ---------------------------------------------------------------------------

  /** Returns all entities of a given type. */
  async query<T>(entityType: string): Promise<T[]> {
    const docs = await firstValueFrom(
      this.http.get<T[]>(`${this.base}/api/v1/data/${entityType}`, { headers: this.headers(), withCredentials: true })
    )
    return docs.map((d) => fromServer(entityType, d))
  }

  /**
   * Returns entities of a given type filtered by document entityType/entityId fields
   * (e.g. VERSION_HISTORY scoped to one recipe/dish/product).
   */
  async queryFiltered<T>(entityType: string, filterEntityType: string, filterEntityId: string): Promise<T[]> {
    const params = new URLSearchParams({
      filterEntityType,
      filterEntityId
    })
    return firstValueFrom(
      this.http.get<T[]>(`${this.base}/api/v1/data/${entityType}?${params.toString()}`, {
        headers: this.headers(),
        withCredentials: true
      })
    )
  }

  /**
   * Lean prefix-match typeahead search (plan 301, Milestone 1). Returns only the
   * server's lean projection for the entity type, not full documents — the point
   * is a small response regardless of collection size.
   */
  async search<T>(entityType: string, q: string, limit = 25): Promise<T[]> {
    const params = new URLSearchParams({ q, limit: String(limit) })
    return firstValueFrom(
      this.http.get<T[]>(`${this.base}/api/v1/data/${entityType}/search?${params.toString()}`, {
        headers: this.headers(),
        withCredentials: true
      })
    )
  }

  /**
   * Lightweight count (plan 301 M3 / 304 M2) — for dashboard stats that don't need
   * the full collection loaded. Mirrors the server's `filter=lowStock|unapproved`.
   */
  async count(entityType: string, filter?: string): Promise<number> {
    const params = filter ? `?${new URLSearchParams({ filter }).toString()}` : ''
    const { count } = await firstValueFrom(
      this.http.get<{ count: number }>(`${this.base}/api/v1/data/${entityType}/count${params}`, {
        headers: this.headers(),
        withCredentials: true
      })
    )
    return count
  }

  /**
   * Deletes many entities by _id in one request (user-scoped on the server).
   */
  async deleteBulk(entityType: string, ids: string[]): Promise<void> {
    await firstValueFrom(
      this.http.delete<unknown>(`${this.base}/api/v1/data/${entityType}/bulk`, {
        headers: this.headers(),
        withCredentials: true,
        body: { ids }
      })
    )
  }

  /** Returns one entity by id. Throws if not found (404 → HttpErrorResponse). */
  async get<T extends EntityId>(entityType: string, entityId: string): Promise<T> {
    const doc = await firstValueFrom(
      this.http.get<T>(`${this.base}/api/v1/data/${entityType}/${entityId}`, {
        headers: this.headers(),
        withCredentials: true
      })
    )
    return fromServer(entityType, doc)
  }

  /**
   * Creates a new entity. The server assigns `_id` (Plan 321 Phase 1 — a single
   * server-side id generator replaces the old client-picked-id convention).
   * Use the `_id` on the resolved doc, not one picked beforehand.
   */
  async post<T>(entityType: string, newEntity: T): Promise<T & EntityId> {
    const saved = await firstValueFrom(
      this.http.post<T & EntityId>(`${this.base}/api/v1/data/${entityType}`, toServer(entityType, newEntity), {
        headers: this.headers(),
        withCredentials: true
      })
    )
    return fromServer(entityType, saved)
  }

  /** Updates one entity. Uses updatedEntity._id as the path parameter. */
  async put<T extends EntityId>(entityType: string, updatedEntity: T): Promise<T> {
    const saved = await firstValueFrom(
      this.http.put<T>(
        `${this.base}/api/v1/data/${entityType}/${updatedEntity._id}`,
        toServer(entityType, updatedEntity),
        {
          headers: this.headers(),
          withCredentials: true
        }
      )
    )
    return fromServer(entityType, saved)
  }

  /**
   * TEMPORARY (dev-process-only, see chat 2026-09-26): pushes the caller's own
   * saved copy onto its linked __master__ document so the change reaches every
   * user on next sync. Open to any signed-in user for now — restrict/remove
   * once this dev pass is done.
   */
  async pushToMaster(entityType: string, entityId: string): Promise<{ masterId: string }> {
    return firstValueFrom(
      this.http.put<{ ok: boolean; masterId: string }>(
        `${this.base}/api/v1/data/${entityType}/${entityId}/push-to-master`,
        {},
        { headers: this.headers(), withCredentials: true }
      )
    )
  }

  /** Mirror of pushToMaster for the delete path: removes the caller's linked
   *  __master__ copy so future/unsynced users stop receiving it. */
  async deleteFromMaster(entityType: string, entityId: string): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(
        `${this.base}/api/v1/data/${entityType}/${entityId}/delete-from-master`,
        {},
        { headers: this.headers(), withCredentials: true }
      )
    )
  }

  /** Plan 322 M8: strips a deleted product's ingredient line from every OTHER user's
   *  own recipes/dishes that reference their own cloned copy of the same shared
   *  product. Products only, dev-only, Human-requested — reaches into other users'
   *  own documents, unlike deleteFromMaster above. */
  async purgeProductIngredientEverywhere(entityType: string, entityId: string): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(
        `${this.base}/api/v1/data/${entityType}/${entityId}/purge-ingredient-everywhere`,
        {},
        { headers: this.headers(), withCredentials: true }
      )
    )
  }

  /** Plan 322: renames (or adds, if `oldKey` isn't already in master) a key in __master__'s own
   *  registry doc, so future signups get it too. Same open-to-any-signed-in-user tradeoff as
   *  pushToMaster above. */
  async pushRegistryRenameToMaster(
    entityType: string,
    oldKey: string,
    newKey: string,
    itemData?: { color?: string; autoTriggers?: string[] }
  ): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(
        `${this.base}/api/v1/data/${entityType}/registry-rename-master`,
        { oldKey, newKey, itemData },
        { headers: this.headers(), withCredentials: true }
      )
    )
  }

  /** Plan 322 M10: mirror of pushRegistryRenameToMaster above, for DELETE. Removes `key` from
   *  __master__'s own registry doc, and — same dev-only, Human-requested cross-user exception as
   *  purgeProductIngredientEverywhere above — also strips it from every other user's own
   *  recipes/dishes/products. */
  async pushRegistryDeleteToMaster(entityType: string, key: string): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(
        `${this.base}/api/v1/data/${entityType}/registry-delete-master`,
        { key },
        { headers: this.headers(), withCredentials: true }
      )
    )
  }

  /** Plan 322 M4: the shared '__global__' Hebrew-dictionary override layer (admin-writable, everyone reads). */
  async getGlobalDictionaryOverrides(): Promise<Record<string, string>> {
    const { items } = await firstValueFrom(
      this.http.get<{ items: Record<string, string> }>(`${this.base}/api/v1/data/DICTIONARY_OVERRIDES/global`, {
        headers: this.headers(),
        withCredentials: true
      })
    )
    return items
  }

  /** Plan 322 M4: admin-only — upserts one key/label pair into the shared global override doc. */
  async putGlobalDictionaryOverride(key: string, hebrewLabel: string): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(
        `${this.base}/api/v1/data/DICTIONARY_OVERRIDES/global`,
        { key, hebrewLabel },
        { headers: this.headers(), withCredentials: true }
      )
    )
  }

  /** Removes one entity by id. */
  async remove(entityType: string, entityId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.base}/api/v1/data/${entityType}/${entityId}`, {
        headers: this.headers(),
        withCredentials: true
      })
    )
  }

  /**
   * Appends an entity that already has an _id (e.g. restoring from trash).
   * Unlike post(), does not generate a new _id — sends body as-is.
   */
  async appendExisting<T extends EntityId>(entityType: string, entity: T): Promise<void> {
    await firstValueFrom(
      this.http
        .post<unknown>(`${this.base}/api/v1/data/${entityType}`, toServer(entityType, entity), {
          headers: this.headers(),
          withCredentials: true
        })
        .pipe(
          // 409 = item already exists in the target collection (e.g. already in trash from a
          // prior attempt). The goal of appendExisting is "make sure it's there" — treat as success.
          catchError((err: HttpErrorResponse) =>
            err.status === 409 ? of(null) : new Promise((_, reject) => reject(err))
          )
        )
    )
  }

  /**
   * Replaces the entire entity collection (e.g. clearing trash after dispose-all).
   * Sends array to PUT /api/v1/data/:entityType (no id segment — server does deleteMany + insertMany).
   */
  async replaceAll<T>(entityType: string, entities: T[]): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(`${this.base}/api/v1/data/${entityType}`, entities, {
        headers: this.headers().set('X-Confirm-Replace', 'true'),
        withCredentials: true
      })
    )
  }
}
