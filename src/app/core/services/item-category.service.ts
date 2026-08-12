import { Injectable } from '@angular/core';
import { ItemCategory } from '../models';
import { active, now } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ItemCategoryService {
  private store: CollectionStore<ItemCategory>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<ItemCategory>(storageService, 'item_categories');
  }

  /** Reasignar la misma pareja actualiza la fila existente (revive un tombstone si hacía falta) en vez de duplicarla. */
  async assign(itemId: string, categoryId: string): Promise<void> {
    const all = await this.store.getAll();
    const existing = all.find((r) => r.itemId === itemId && r.categoryId === categoryId);
    if (existing) {
      if (existing.deletedAt) {
        existing.deletedAt = null;
        existing.updatedAt = now();
        await this.store.saveAll(all);
      }
      return;
    }
    all.push({ itemId, categoryId, updatedAt: now(), deletedAt: null });
    await this.store.saveAll(all);
  }

  /** Tombstone, no borrado real — la fila se mantiene para sincronizar el borrado de la relación. */
  async remove(itemId: string, categoryId: string): Promise<void> {
    const all = await this.store.getAll();
    const idx = all.findIndex((r) => r.itemId === itemId && r.categoryId === categoryId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], deletedAt: now(), updatedAt: now() };
    await this.store.saveAll(all);
  }

  async getCategoriesForItem(itemId: string): Promise<string[]> {
    const all = await this.store.getAll();
    return active(all)
      .filter((r) => r.itemId === itemId)
      .map((r) => r.categoryId);
  }

  async getItemsForCategory(categoryId: string): Promise<string[]> {
    const all = await this.store.getAll();
    return active(all)
      .filter((r) => r.categoryId === categoryId)
      .map((r) => r.itemId);
  }

  /** Limpieza de huérfanos — llamar al borrar un Item (Ionic Storage no tiene cascada). Tombstone, no borrado real. */
  async deleteByItem(itemId: string): Promise<void> {
    const all = await this.store.getAll();
    const mark = now();
    await this.store.saveAll(
      all.map((r) => (r.itemId === itemId ? { ...r, deletedAt: mark, updatedAt: mark } : r)),
    );
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllForSync(): Promise<ItemCategory[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  applyFromSync(rows: ItemCategory[]): Promise<void> {
    return this.store.upsertMany(rows, (r) => `${r.itemId}:${r.categoryId}`);
  }
}
