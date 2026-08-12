import { Injectable } from '@angular/core';
import { ArticuloCategoria } from '../models';
import { activos, ahora } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ArticuloCategoriaService {
  private store: CollectionStore<ArticuloCategoria>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<ArticuloCategoria>(storageService, 'articulo_categorias');
  }

  /** Reasignar la misma pareja actualiza la fila existente (revive un tombstone si hacía falta) en vez de duplicarla. */
  async asignar(articuloId: string, categoriaId: string): Promise<void> {
    const todas = await this.store.getAll();
    const existente = todas.find((r) => r.articuloId === articuloId && r.categoriaId === categoriaId);
    if (existente) {
      if (existente.eliminadoEn) {
        existente.eliminadoEn = null;
        existente.actualizadoEn = ahora();
        await this.store.saveAll(todas);
      }
      return;
    }
    todas.push({ articuloId, categoriaId, actualizadoEn: ahora(), eliminadoEn: null });
    await this.store.saveAll(todas);
  }

  /** Tombstone, no borrado real — la fila se mantiene para sincronizar el borrado de la relación. */
  async quitar(articuloId: string, categoriaId: string): Promise<void> {
    const todas = await this.store.getAll();
    const idx = todas.findIndex((r) => r.articuloId === articuloId && r.categoriaId === categoriaId);
    if (idx === -1) return;
    todas[idx] = { ...todas[idx], eliminadoEn: ahora(), actualizadoEn: ahora() };
    await this.store.saveAll(todas);
  }

  async getCategoriasDeArticulo(articuloId: string): Promise<string[]> {
    const todas = await this.store.getAll();
    return activos(todas)
      .filter((r) => r.articuloId === articuloId)
      .map((r) => r.categoriaId);
  }

  async getArticulosDeCategoria(categoriaId: string): Promise<string[]> {
    const todas = await this.store.getAll();
    return activos(todas)
      .filter((r) => r.categoriaId === categoriaId)
      .map((r) => r.articuloId);
  }

  /** Limpieza de huérfanos — llamar al borrar un Articulo (Ionic Storage no tiene cascada). Tombstone, no borrado real. */
  async eliminarPorArticulo(articuloId: string): Promise<void> {
    const todas = await this.store.getAll();
    const marca = ahora();
    await this.store.saveAll(
      todas.map((r) => (r.articuloId === articuloId ? { ...r, eliminadoEn: marca, actualizadoEn: marca } : r)),
    );
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllParaSync(): Promise<ArticuloCategoria[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  aplicarDesdeSync(filas: ArticuloCategoria[]): Promise<void> {
    return this.store.upsertMany(filas, (r) => `${r.articuloId}:${r.categoriaId}`);
  }
}
