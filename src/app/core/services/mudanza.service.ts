import { Injectable } from '@angular/core';
import { Mudanza } from '../models';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class MudanzaService {
  private store: CollectionStore<Mudanza>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<Mudanza>(storageService, 'mudanzas');
  }

  getAll(): Promise<Mudanza[]> {
    return this.store.getAll();
  }

  async getById(id: string): Promise<Mudanza | undefined> {
    const todas = await this.store.getAll();
    return todas.find((m) => m.id === id);
  }

  async crear(nombre: string): Promise<Mudanza> {
    const todas = await this.store.getAll();
    const nueva: Mudanza = {
      id: crypto.randomUUID(),
      nombre,
      fechaCreacion: new Date().toISOString(),
    };
    todas.push(nueva);
    await this.store.saveAll(todas);
    return nueva;
  }
}
