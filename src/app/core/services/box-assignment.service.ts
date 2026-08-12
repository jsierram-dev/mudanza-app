import { Injectable } from '@angular/core';
import { BoxAssignment } from '../models';
import { active, now } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class BoxAssignmentService {
  private store: CollectionStore<BoxAssignment>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<BoxAssignment>(storageService, 'box_assignments');
  }

  async getAll(): Promise<BoxAssignment[]> {
    return active(await this.store.getAll());
  }

  /** Reasignar la misma pareja (itemId, boxId) actualiza la cantidad (y revive un tombstone si hacía falta) en vez de duplicar fila. */
  async assign(itemId: string, boxId: string, quantity: number): Promise<void> {
    const all = await this.store.getAll();
    const existing = all.find((a) => a.itemId === itemId && a.boxId === boxId);
    if (existing) {
      existing.quantity = quantity;
      existing.deletedAt = null;
      existing.updatedAt = now();
    } else {
      all.push({ itemId, boxId, quantity, assignedAt: now(), updatedAt: now(), deletedAt: null });
    }
    await this.store.saveAll(all);
  }

  /** Tombstone, no borrado real — la fila se mantiene para sincronizar el borrado de la relación. */
  async remove(itemId: string, boxId: string): Promise<void> {
    const all = await this.store.getAll();
    const idx = all.findIndex((a) => a.itemId === itemId && a.boxId === boxId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], deletedAt: now(), updatedAt: now() };
    await this.store.saveAll(all);
  }

  async getBoxesForItem(itemId: string): Promise<BoxAssignment[]> {
    const all = await this.store.getAll();
    return active(all).filter((a) => a.itemId === itemId);
  }

  async getItemsInBox(boxId: string): Promise<BoxAssignment[]> {
    const all = await this.store.getAll();
    return active(all).filter((a) => a.boxId === boxId);
  }

  /** Limpieza de huérfanos — llamar al borrar una Box. Tombstone, no borrado real. */
  async deleteByBox(boxId: string): Promise<void> {
    const all = await this.store.getAll();
    const mark = now();
    await this.store.saveAll(all.map((a) => (a.boxId === boxId ? { ...a, deletedAt: mark, updatedAt: mark } : a)));
  }

  /** Limpieza de huérfanos — llamar al borrar un Item. Tombstone, no borrado real. */
  async deleteByItem(itemId: string): Promise<void> {
    const all = await this.store.getAll();
    const mark = now();
    await this.store.saveAll(all.map((a) => (a.itemId === itemId ? { ...a, deletedAt: mark, updatedAt: mark } : a)));
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllForSync(): Promise<BoxAssignment[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  applyFromSync(rows: BoxAssignment[]): Promise<void> {
    return this.store.upsertMany(rows, (a) => `${a.itemId}:${a.boxId}`);
  }
}
