import { Injectable } from '@angular/core';
import { Item } from '../models';
import { active, now } from '../utils/sync-meta';
import { ItemCategoryService } from './item-category.service';
import { BoxAssignmentService } from './box-assignment.service';
import { CollectionStore } from './collection-store';
import { PhotoService } from './photo.service';
import { StorageService } from './storage.service';

export interface NewItemData {
  name: string;
  photoUri: string;
  weightKg?: number;
  fragile?: boolean;
  essential?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ItemService {
  private store: CollectionStore<Item>;

  constructor(
    storageService: StorageService,
    private boxAssignmentService: BoxAssignmentService,
    private itemCategoryService: ItemCategoryService,
    private photoService: PhotoService,
  ) {
    this.store = new CollectionStore<Item>(storageService, 'items');
  }

  async getAll(): Promise<Item[]> {
    return active(await this.store.getAll());
  }

  async getById(itemId: string): Promise<Item | undefined> {
    const all = await this.store.getAll();
    return active(all).find((i) => i.id === itemId);
  }

  async create(data: NewItemData): Promise<Item> {
    const all = await this.store.getAll();
    const created: Item = {
      id: crypto.randomUUID(),
      name: data.name,
      photoUri: data.photoUri,
      registeredAt: now(),
      weightKg: data.weightKg,
      fragile: data.fragile ?? false,
      essential: data.essential ?? false,
      updatedAt: now(),
      deletedAt: null,
    };
    all.push(created);
    await this.store.saveAll(all);
    return created;
  }

  /** Tombstone, no borrado real (ver ROADMAP-mudanza.md) — la fila se mantiene para sincronizar el borrado. */
  async delete(itemId: string): Promise<void> {
    const all = await this.store.getAll();
    const idx = all.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const photoUri = all[idx].photoUri;
    all[idx] = { ...all[idx], deletedAt: now(), updatedAt: now() };
    await this.store.saveAll(all);
    // limpieza de huérfanos en las dos relaciones (ver ROADMAP-mudanza.md)
    await Promise.all([
      this.boxAssignmentService.deleteByItem(itemId),
      this.itemCategoryService.deleteByItem(itemId),
    ]);
    await this.photoService.deleteFile(photoUri);
  }

  async searchByName(text: string): Promise<Item[]> {
    const all = await this.getAll();
    const q = text.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) => i.name.toLowerCase().includes(q));
  }

  /** Artículos registrados que todavía no se asignaron a ninguna caja. */
  async getUnassigned(): Promise<Item[]> {
    const [all, assignments] = await Promise.all([this.getAll(), this.boxAssignmentService.getAll()]);
    const assignedIds = new Set(assignments.map((a) => a.itemId));
    return all.filter((i) => !assignedIds.has(i.id));
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllForSync(): Promise<Item[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  applyFromSync(rows: Item[]): Promise<void> {
    return this.store.upsertMany(rows, (i) => i.id);
  }
}
