import { Injectable } from '@angular/core';
import { CATEGORIAS_DEFAULT } from '../data/categorias-default';
import { Categoria } from '../models';
import { activos, ahora } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private store: CollectionStore<Categoria>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<Categoria>(storageService, 'categorias');
  }

  /** Siembra CATEGORIAS_DEFAULT en el primer arranque (si la key todavía está vacía). */
  async getAll(): Promise<Categoria[]> {
    const actuales = await this.store.getAll();
    if (actuales.length === 0) {
      await this.store.saveAll(CATEGORIAS_DEFAULT);
      return CATEGORIAS_DEFAULT;
    }
    return activos(actuales);
  }

  async crear(nombre: string): Promise<Categoria> {
    // sin pasar por getAll(): no queremos el filtro de activos acá, se necesita el array crudo para pushear
    const todas = await this.store.getAll();
    if (todas.length === 0) todas.push(...CATEGORIAS_DEFAULT);
    const nueva: Categoria = { id: crypto.randomUUID(), nombre, actualizadoEn: ahora(), eliminadoEn: null };
    todas.push(nueva);
    await this.store.saveAll(todas);
    return nueva;
  }

  /**
   * Todas las filas creadas por el usuario, tombstones incluidos — para el
   * snapshot saliente de /sync. Los defaults (CATEGORIAS_DEFAULT, id=slug)
   * quedan afuera a propósito: se siembran localmente en cada dispositivo,
   * nunca viajan al servidor (ver ROADMAP-mudanza.md).
   */
  async getAllParaSync(): Promise<Categoria[]> {
    const idsDefault = new Set(CATEGORIAS_DEFAULT.map((c) => c.id));
    const todas = await this.store.getAll();
    return todas.filter((c) => !idsDefault.has(c.id));
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  aplicarDesdeSync(filas: Categoria[]): Promise<void> {
    return this.store.upsertMany(filas, (c) => c.id);
  }
}
