import { Injectable } from '@angular/core';
import { Mudanza } from '../models';
import { activos, ahora } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class MudanzaService {
  private store: CollectionStore<Mudanza>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<Mudanza>(storageService, 'mudanzas');
  }

  async getAll(): Promise<Mudanza[]> {
    return activos(await this.store.getAll());
  }

  async getById(id: string): Promise<Mudanza | undefined> {
    const todas = await this.getAll();
    return todas.find((m) => m.id === id);
  }

  async crear(nombre: string): Promise<Mudanza> {
    const todas = await this.store.getAll();
    const nueva: Mudanza = {
      id: crypto.randomUUID(),
      nombre,
      fechaCreacion: ahora(),
      actualizadoEn: ahora(),
      eliminadoEn: null,
    };
    todas.push(nueva);
    await this.store.saveAll(todas);
    return nueva;
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllParaSync(): Promise<Mudanza[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  aplicarDesdeSync(filas: Mudanza[]): Promise<void> {
    return this.store.upsertMany(filas, (m) => m.id);
  }
}
