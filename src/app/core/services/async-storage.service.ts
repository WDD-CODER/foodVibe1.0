import { Injectable, inject } from '@angular/core'
import { HttpStorageAdapter } from './http-storage.adapter'

export type EntityId = {
  _id: string
}

/**
 * Thin facade over HttpStorageAdapter. Plan 321 Phase 1 removed the localStorage
 * fallback mode (useBackend/useBackendAuth flags, the backup_<key> mirror, and the
 * artificial query() delay) — every method now delegates to the backend unconditionally.
 * Kept as its own class (rather than inlining HttpStorageAdapter everywhere) so data
 * services have one stable injection point.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private httpAdapter = inject(HttpStorageAdapter)

  async query<T>(entityType: string): Promise<T[]> {
    return this.httpAdapter.query<T>(entityType)
  }

  async get<T extends EntityId>(entityType: string, entityId: string): Promise<T> {
    return this.httpAdapter.get<T>(entityType, entityId)
  }

  async post<T>(entityType: string, newEntity: T): Promise<T & EntityId> {
    return this.httpAdapter.post<T>(entityType, newEntity)
  }

  /**
   * TEMPORARY (dev-process-only, see chat 2026-09-26).
   */
  async pushToMaster(entityType: string, entityId: string): Promise<void> {
    return this.httpAdapter.pushToMaster(entityType, entityId)
  }

  async put<T extends EntityId>(entityType: string, updatedEntity: T): Promise<T> {
    return this.httpAdapter.put<T>(entityType, updatedEntity)
  }

  async remove(entityType: string, entityId: string): Promise<void> {
    return this.httpAdapter.remove(entityType, entityId)
  }

  /** Appends an entity that already has an _id (e.g. restoring from trash). */
  async appendExisting<T extends EntityId>(entityType: string, entity: T): Promise<void> {
    return this.httpAdapter.appendExisting<T>(entityType, entity)
  }

  /** Replaces the entire collection for an entity type (e.g. trash clear-all, a registry save). */
  async replaceAll<T>(entityType: string, entities: T[]): Promise<void> {
    return this.httpAdapter.replaceAll<T>(entityType, entities)
  }

  async queryFiltered<T extends { entityType?: string; entityId?: string }>(
    entityType: string,
    filterEntityType: string,
    filterEntityId: string
  ): Promise<T[]> {
    return this.httpAdapter.queryFiltered<T>(entityType, filterEntityType, filterEntityId)
  }

  /** Lean prefix-match typeahead search (plan 301, Milestone 1). */
  async search<T extends { name_hebrew?: string }>(entityType: string, q: string, limit = 25): Promise<T[]> {
    return this.httpAdapter.search<T>(entityType, q, limit)
  }

  /**
   * Lightweight count (plan 301 M3 / 304 M2) — avoids loading the full collection just
   * to show a dashboard badge. filter mirrors the server's generic.js semantics exactly:
   * 'lowStock' (PRODUCT_LIST, min_stock_level_ > 0) or 'unapproved' (RECIPE_LIST/DISH_LIST,
   * is_approved_ !== true) — see kitchen-state.service.ts's lowStockProducts_ and
   * dashboard-overview.component.ts's prior unapprovedCount_ computed for the source of truth.
   */
  async count(entityType: string, filter?: 'lowStock' | 'unapproved'): Promise<number> {
    return this.httpAdapter.count(entityType, filter)
  }

  async deleteBulk(entityType: string, ids: string[]): Promise<void> {
    return this.httpAdapter.deleteBulk(entityType, ids)
  }
}
