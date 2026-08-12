import { Injectable } from '@angular/core';
import { DEFAULT_CATEGORIES } from '../data/categories-default';
import { Category } from '../models';
import { active, now } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private store: CollectionStore<Category>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<Category>(storageService, 'categories');
  }

  /** Siembra DEFAULT_CATEGORIES en el primer arranque (si la key todavía está vacía). */
  async getAll(): Promise<Category[]> {
    const current = await this.store.getAll();
    if (current.length === 0) {
      await this.store.saveAll(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return active(current);
  }

  async create(name: string): Promise<Category> {
    // sin pasar por getAll(): no queremos el filtro de activos acá, se necesita el array crudo para pushear
    const all = await this.store.getAll();
    if (all.length === 0) all.push(...DEFAULT_CATEGORIES);
    const created: Category = { id: crypto.randomUUID(), name, updatedAt: now(), deletedAt: null };
    all.push(created);
    await this.store.saveAll(all);
    return created;
  }

  /**
   * Todas las filas creadas por el usuario, tombstones incluidos — para el
   * snapshot saliente de /sync. Los defaults (DEFAULT_CATEGORIES, id=slug)
   * quedan afuera a propósito: se siembran localmente en cada dispositivo,
   * nunca viajan al servidor (ver ROADMAP-mudanza.md).
   */
  async getAllForSync(): Promise<Category[]> {
    const defaultIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    const all = await this.store.getAll();
    return all.filter((c) => !defaultIds.has(c.id));
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  applyFromSync(rows: Category[]): Promise<void> {
    return this.store.upsertMany(rows, (c) => c.id);
  }
}
