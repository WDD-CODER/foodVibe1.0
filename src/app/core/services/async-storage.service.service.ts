import { Injectable } from '@angular/core';
import { storageService } from './storage-service'; // Adjust path

@Injectable({
  providedIn: 'root'
})
export class AsyncStorageService {

  async query<T>(entityType: string, delay = 100): Promise<T[]> {
    return storageService.query<T>(entityType, delay);
  }

  async get<T extends { _id: string }>(entityType: string, entityId: string): Promise<T> {
    return storageService.get<T>(entityType, entityId);
  }

  async post<T>(entityType: string, newEntity: T): Promise<T> {
    return storageService.post<T>(entityType, newEntity);
  }

  async put<T extends { _id: string }>(entityType: string, updatedEntity: T): Promise<T> {
    return storageService.put<T>(entityType, updatedEntity);
  }

  async remove(entityType: string, entityId: string): Promise<void> {
    return storageService.remove(entityType, entityId);
  }
}