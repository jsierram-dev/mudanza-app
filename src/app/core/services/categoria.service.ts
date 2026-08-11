import { Injectable } from '@angular/core';
import { CATEGORIAS_DEFAULT } from '../data/categorias-default';
import { Categoria } from '../models';
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
    return actuales;
  }

  async crear(nombre: string): Promise<Categoria> {
    const todas = await this.getAll();
    const nueva: Categoria = { id: crypto.randomUUID(), nombre };
    todas.push(nueva);
    await this.store.saveAll(todas);
    return nueva;
  }
}
