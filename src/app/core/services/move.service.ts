import { Injectable } from '@angular/core';
import { Move } from '../models';
import { active, now } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class MoveService {
  private store: CollectionStore<Move>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<Move>(storageService, 'moves');
  }

  async getAll(): Promise<Move[]> {
    return active(await this.store.getAll());
  }

  async getById(id: string): Promise<Move | undefined> {
    const all = await this.getAll();
    return all.find((m) => m.id === id);
  }

  async create(name: string): Promise<Move> {
    const all = await this.store.getAll();
    const created: Move = {
      id: crypto.randomUUID(),
      name,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    all.push(created);
    await this.store.saveAll(all);
    return created;
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllForSync(): Promise<Move[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  applyFromSync(rows: Move[]): Promise<void> {
    return this.store.upsertMany(rows, (m) => m.id);
  }
}
