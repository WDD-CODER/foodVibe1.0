import { Injectable } from '@angular/core';

export type EntityId = {
  _id: string;
};

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  async query<T>(entityType: string, delay = 100): Promise<T[]> {
    const entities = JSON.parse(localStorage.getItem(entityType) || 'null') || [];
    if (delay) {
      return new Promise((resolve) => setTimeout(resolve, delay, entities));
    }
    return entities;
  }

  async get<T extends EntityId>(entityType: string, entityId: string): Promise<T> {
    const entities = await this.query<T>(entityType);
    const entity = entities.find(entity => entity._id === entityId);
    if (!entity) throw new Error(`Cannot get, Item ${entityId} of type: ${entityType} does not exist`);
    return entity;
  }

  async post<T>(entityType: string, newEntity: T): Promise<T & EntityId> {
    const entityToSave = { ...newEntity, _id: this.makeId() };
    const entities = await this.query<T & EntityId>(entityType);
    entities.push(entityToSave);
    this._save(entityType, entities);
    return entityToSave;
  }

  async put<T extends EntityId>(entityType: string, updatedEntity: T): Promise<T> {
    const entities = await this.query<T>(entityType);
    const idx = entities.findIndex(entity => entity._id === updatedEntity._id);
    if (idx === -1) throw new Error(`Cannot update, item ${updatedEntity._id} does not exist`);

    entities[idx] = updatedEntity;
    this._save(entityType, entities);
    return updatedEntity;
  }

  async remove(entityType: string, entityId: string): Promise<void> {
    const entities = await this.query<EntityId>(entityType);
    const idx = entities.findIndex(entity => entity._id === entityId);
    if (idx !== -1) {
      entities.splice(idx, 1);
      this._save(entityType, entities);
    } else {
      throw new Error(`Cannot remove, item ${entityId} of type: ${entityType} does not exist`);
    }
  }

  public makeId(length = 5): string {
    let txt = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      txt += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return txt;
  }

  private _save<T>(entityType: string, entities: T[]): void {
    localStorage.setItem(entityType, JSON.stringify(entities));
  }
}