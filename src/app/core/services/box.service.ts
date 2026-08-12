import { Injectable } from '@angular/core';
import { Box } from '../models';
import { active, now } from '../utils/sync-meta';
import { ItemService } from './item.service';
import { BoxAssignmentService } from './box-assignment.service';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

/**
 * Asset bundleado por defecto — ver ROADMAP-mudanza.md, sección "Diseños de
 * caja". Exportado para que las pantallas puedan distinguir "todavía no
 * tiene foto propia" (mostrar placeholder) de "ya tiene una foto real"
 * (mostrarla con <app-photo>).
 */
export const DEFAULT_COVER_PHOTO = 'assets/cajas/estandar.png';

@Injectable({ providedIn: 'root' })
export class BoxService {
  private store: CollectionStore<Box>;

  constructor(
    storageService: StorageService,
    private boxAssignmentService: BoxAssignmentService,
    private itemService: ItemService,
  ) {
    this.store = new CollectionStore<Box>(storageService, 'boxes');
  }

  async getByMove(moveId: string): Promise<Box[]> {
    const all = await this.store.getAll();
    return active(all).filter((b) => b.moveId === moveId);
  }

  async getById(boxId: string): Promise<Box | undefined> {
    const all = await this.store.getAll();
    return active(all).find((b) => b.id === boxId);
  }

  async create(
    moveId: string,
    data: Partial<Pick<Box, 'name' | 'destinationRoom' | 'coverPhotoUri'>> = {},
  ): Promise<Box> {
    const all = await this.store.getAll();
    const inThisMove = active(all).filter((b) => b.moveId === moveId);
    const nextNumber = inThisMove.length ? Math.max(...inThisMove.map((b) => b.number)) + 1 : 1;

    const created: Box = {
      id: crypto.randomUUID(),
      moveId,
      number: nextNumber,
      status: 'empty',
      coverPhotoUri: data.coverPhotoUri ?? DEFAULT_COVER_PHOTO,
      name: data.name,
      destinationRoom: data.destinationRoom,
      updatedAt: now(),
      deletedAt: null,
    };
    all.push(created);
    await this.store.saveAll(all);
    return created;
  }

  async update(box: Box): Promise<void> {
    const all = await this.store.getAll();
    const idx = all.findIndex((b) => b.id === box.id);
    if (idx === -1) return;
    all[idx] = { ...box, updatedAt: now() };
    await this.store.saveAll(all);
  }

  /** Tombstone, no borrado real (ver ROADMAP-mudanza.md) — la fila se mantiene para sincronizar el borrado. */
  async delete(boxId: string): Promise<void> {
    const all = await this.store.getAll();
    const idx = all.findIndex((b) => b.id === boxId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], deletedAt: now(), updatedAt: now() };
    await this.store.saveAll(all);
    await this.boxAssignmentService.deleteByBox(boxId);
  }

  /**
   * Suma weightKg × quantity de cada artículo asignado a la caja. Artículos
   * sin weightKg cargado cuentan como 0 — el total puede ser parcial si no
   * todos los artículos de la caja tienen peso registrado.
   */
  async totalWeightKg(boxId: string): Promise<number> {
    const assignments = await this.boxAssignmentService.getItemsInBox(boxId);
    const weights = await Promise.all(
      assignments.map(async (a) => {
        const item = await this.itemService.getById(a.itemId);
        return (item?.weightKg ?? 0) * a.quantity;
      }),
    );
    return weights.reduce((total, w) => total + w, 0);
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllForSync(): Promise<Box[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  applyFromSync(rows: Box[]): Promise<void> {
    return this.store.upsertMany(rows, (b) => b.id);
  }
}
