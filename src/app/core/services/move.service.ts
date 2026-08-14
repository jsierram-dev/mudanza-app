import { Injectable } from '@angular/core';
import { Move } from '../models';
import { active, now } from '../utils/sync-meta';
import { BoxService } from './box.service';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class MoveService {
  private store: CollectionStore<Move>;

  constructor(
    storageService: StorageService,
    private boxService: BoxService,
  ) {
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

  async update(move: Move): Promise<void> {
    const all = await this.store.getAll();
    const idx = all.findIndex((m) => m.id === move.id);
    if (idx === -1) return;
    all[idx] = { ...move, updatedAt: now() };
    await this.store.saveAll(all);
  }

  /**
   * Tombstone, no borrado real (ver ROADMAP-mudanza.md) — cascada a las cajas
   * de la mudanza (que a su vez arrastran sus asignaciones y foto de
   * portada, ver BoxService.delete). Los artículos NO se borran: son un
   * catálogo reusable entre mudanzas (ver Item) y quedan sin asignar, igual
   * que al borrar una caja sola.
   */
  async delete(moveId: string): Promise<void> {
    const boxes = await this.boxService.getByMove(moveId);
    await Promise.all(boxes.map((box) => this.boxService.delete(box.id)));

    const all = await this.store.getAll();
    const idx = all.findIndex((m) => m.id === moveId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], deletedAt: now(), updatedAt: now() };
    await this.store.saveAll(all);
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
