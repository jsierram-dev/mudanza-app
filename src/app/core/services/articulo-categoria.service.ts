import { Injectable } from '@angular/core';
import { ArticuloCategoria } from '../models';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ArticuloCategoriaService {
  private store: CollectionStore<ArticuloCategoria>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<ArticuloCategoria>(storageService, 'articulo_categorias');
  }

  async asignar(articuloId: string, categoriaId: string): Promise<void> {
    const todas = await this.store.getAll();
    const yaExiste = todas.some((r) => r.articuloId === articuloId && r.categoriaId === categoriaId);
    if (!yaExiste) {
      todas.push({ articuloId, categoriaId });
      await this.store.saveAll(todas);
    }
  }

  async quitar(articuloId: string, categoriaId: string): Promise<void> {
    const todas = await this.store.getAll();
    await this.store.saveAll(todas.filter((r) => !(r.articuloId === articuloId && r.categoriaId === categoriaId)));
  }

  async getCategoriasDeArticulo(articuloId: string): Promise<string[]> {
    const todas = await this.store.getAll();
    return todas.filter((r) => r.articuloId === articuloId).map((r) => r.categoriaId);
  }

  async getArticulosDeCategoria(categoriaId: string): Promise<string[]> {
    const todas = await this.store.getAll();
    return todas.filter((r) => r.categoriaId === categoriaId).map((r) => r.articuloId);
  }

  /** Limpieza de huérfanos — llamar al borrar un Articulo (Ionic Storage no tiene cascada). */
  async eliminarPorArticulo(articuloId: string): Promise<void> {
    const todas = await this.store.getAll();
    await this.store.saveAll(todas.filter((r) => r.articuloId !== articuloId));
  }
}
