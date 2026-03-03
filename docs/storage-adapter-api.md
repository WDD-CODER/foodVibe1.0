# Storage Adapter API (Plan 017)

## Overview

The app uses a single **storage abstraction** implemented by `StorageService` in `src/app/core/services/async-storage.service.ts`. All entity persistence goes through this service. This document describes the **contract** that any alternative adapter (e.g. HTTP REST) must implement so the app can switch from localStorage to a backend without changing domain logic.

## Current implementation: localStorage

- **Entity types (keys):** `RECIPE_LIST`, `DISH_LIST`, `PRODUCT_LIST`, `KITCHEN_SUPPLIERS`, `KITCHEN_UNITS`, `TRASH_RECIPES`, etc.
- **Shape:** Each key holds a JSON array of entities. Each entity has at least `_id: string`.

## Contract (IStorageAdapter)

Any adapter that replaces the current `StorageService` must provide the following interface. The existing service already implements it; a future HTTP adapter would implement the same contract.

| Method | Signature | Description |
|--------|-----------|-------------|
| **query** | `query<T>(entityType: string, delay?: number): Promise<T[]>` | Return all entities for the given type. `delay` is optional (e.g. simulate latency; HTTP adapter may ignore it). |
| **get** | `get<T extends EntityId>(entityType: string, entityId: string): Promise<T>` | Return a single entity by id. Throw if not found. |
| **post** | `post<T>(entityType: string, newEntity: T): Promise<T & EntityId>` | Create a new entity. The adapter must assign a unique `_id` and return the saved entity (with `_id`). |
| **put** | `put<T extends EntityId>(entityType: string, updatedEntity: T): Promise<T>` | Update an existing entity by `_id`. Throw if not found. |
| **remove** | `remove(entityType: string, entityId: string): Promise<void>` | Delete the entity. No-op or throw if not found. |
| **appendExisting** | `appendExisting<T extends EntityId>(entityType: string, entity: T): Promise<void>` | Append an entity (with existing `_id`) to the list. Used e.g. for trash. |
| **replaceAll** | `replaceAll<T>(entityType: string, entities: T[]): Promise<void>` | Replace the entire list for the entity type. |

**EntityId:** `{ _id: string }`.

## REST API mapping (future)

When moving to HTTP:

- `query` → `GET /api/{entityType}` (e.g. `GET /api/products`).
- `get` → `GET /api/{entityType}/{entityId}`.
- `post` → `POST /api/{entityType}` with body; server returns saved entity with `_id`.
- `put` → `PUT /api/{entityType}/{entityId}` with body.
- `remove` → `DELETE /api/{entityType}/{entityId}`.
- `appendExisting` / `replaceAll` → either dedicated endpoints or implemented via get + post/put as appropriate.

## Data services that use storage

All of these call the single `StorageService` (or equivalent adapter):

- `ProductDataService` — PRODUCT_LIST
- `RecipeDataService` — RECIPE_LIST, TRASH_RECIPES
- `DishDataService` — DISH_LIST
- `SupplierDataService` — KITCHEN_SUPPLIERS
- `UnitRegistryService` — KITCHEN_UNITS
- Trash/version history keys as needed

Ensuring all storage calls go through this abstraction (no direct `localStorage` in domain code) keeps the migration path to a backend clear.
