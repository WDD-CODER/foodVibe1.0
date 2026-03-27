import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors EntityId from async-storage.service.ts — kept local to avoid circular import. */
type EntityId = { _id: string };

/** localStorage key where the JWT is stored after login. */
const TOKEN_KEY = 'fv_token';

/**
 * HTTP adapter that mirrors the full StorageService interface.
 * Delegates every operation to the REST API instead of localStorage.
 *
 * Drop-in replacement: StorageService injects this when environment.useBackend is true.
 * No data-service files need to change — only StorageService's delegation logic.
 *
 * Endpoints:
 *   query        → GET  /api/data/:entityType
 *   get          → GET  /api/data/:entityType/:id
 *   post         → POST /api/data/:entityType        (body includes _id assigned here)
 *   put          → PUT  /api/data/:entityType/:id
 *   remove       → DELETE /api/data/:entityType/:id
 *   appendExisting → POST /api/data/:entityType      (body already has _id)
 *   replaceAll   → PUT  /api/data/:entityType        (body is full array, no :id segment)
 */
@Injectable({ providedIn: 'root' })
export class HttpStorageAdapter {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ---------------------------------------------------------------------------
  // Token helper
  // ---------------------------------------------------------------------------

  private headers(): HttpHeaders {
    const token = localStorage.getItem(TOKEN_KEY);
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  // ---------------------------------------------------------------------------
  // Public interface — matches StorageService exactly
  // ---------------------------------------------------------------------------

  /**
   * Returns all entities of a given type.
   * The delay parameter is accepted for interface compatibility but ignored
   * (HTTP latency already provides natural async delay).
   */
  async query<T>(entityType: string, _delay = 100): Promise<T[]> {
    return firstValueFrom(
      this.http.get<T[]>(`${this.base}/api/data/${entityType}`, { headers: this.headers() })
    );
  }

  /** Returns one entity by id. Throws if not found (404 → HttpErrorResponse). */
  async get<T extends EntityId>(entityType: string, entityId: string): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.base}/api/data/${entityType}/${entityId}`, { headers: this.headers() })
    );
  }

  /**
   * Creates a new entity. Assigns a fresh _id via makeId() before sending,
   * matching the behaviour of StorageService.post().
   */
  async post<T>(entityType: string, newEntity: T): Promise<T & EntityId> {
    const entityWithId = { ...(newEntity as object), _id: this.makeId() } as T & EntityId;
    return firstValueFrom(
      this.http.post<T & EntityId>(`${this.base}/api/data/${entityType}`, entityWithId, { headers: this.headers() })
    );
  }

  /** Updates one entity. Uses updatedEntity._id as the path parameter. */
  async put<T extends EntityId>(entityType: string, updatedEntity: T): Promise<T> {
    return firstValueFrom(
      this.http.put<T>(
        `${this.base}/api/data/${entityType}/${updatedEntity._id}`,
        updatedEntity,
        { headers: this.headers() }
      )
    );
  }

  /** Removes one entity by id. */
  async remove(entityType: string, entityId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.base}/api/data/${entityType}/${entityId}`, { headers: this.headers() })
    );
  }

  /**
   * 5-char alphanumeric ID generator — identical to StorageService.makeId().
   * Existing localStorage _id values are also 5-char alphanumeric, so IDs
   * generated here are format-compatible for migration purposes.
   */
  makeId(length = 5): string {
    let txt = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      txt += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return txt;
  }

  /**
   * Appends an entity that already has an _id (e.g. restoring from trash).
   * Unlike post(), does not generate a new _id — sends body as-is.
   */
  async appendExisting<T extends EntityId>(entityType: string, entity: T): Promise<void> {
    await firstValueFrom(
      this.http.post<unknown>(`${this.base}/api/data/${entityType}`, entity, { headers: this.headers() })
    );
  }

  /**
   * Replaces the entire entity collection (e.g. clearing trash after dispose-all).
   * Sends array to PUT /api/data/:entityType (no id segment — server does deleteMany + insertMany).
   */
  async replaceAll<T>(entityType: string, entities: T[]): Promise<void> {
    await firstValueFrom(
      this.http.put<unknown>(`${this.base}/api/data/${entityType}`, entities, { headers: this.headers() })
    );
  }
}
