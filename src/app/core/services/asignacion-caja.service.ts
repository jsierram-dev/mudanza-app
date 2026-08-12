import { Injectable } from '@angular/core';
import { AsignacionCaja } from '../models';
import { activos, ahora } from '../utils/sync-meta';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AsignacionCajaService {
  private store: CollectionStore<AsignacionCaja>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<AsignacionCaja>(storageService, 'asignaciones');
  }

  async getAll(): Promise<AsignacionCaja[]> {
    return activos(await this.store.getAll());
  }

  /** Reasignar la misma pareja (articuloId, cajaId) actualiza la cantidad (y revive un tombstone si hacía falta) en vez de duplicar fila. */
  async asignar(articuloId: string, cajaId: string, cantidad: number): Promise<void> {
    const todas = await this.store.getAll();
    const existente = todas.find((a) => a.articuloId === articuloId && a.cajaId === cajaId);
    if (existente) {
      existente.cantidad = cantidad;
      existente.eliminadoEn = null;
      existente.actualizadoEn = ahora();
    } else {
      todas.push({ articuloId, cajaId, cantidad, fechaAsignacion: ahora(), actualizadoEn: ahora(), eliminadoEn: null });
    }
    await this.store.saveAll(todas);
  }

  /** Tombstone, no borrado real — la fila se mantiene para sincronizar el borrado de la relación. */
  async quitar(articuloId: string, cajaId: string): Promise<void> {
    const todas = await this.store.getAll();
    const idx = todas.findIndex((a) => a.articuloId === articuloId && a.cajaId === cajaId);
    if (idx === -1) return;
    todas[idx] = { ...todas[idx], eliminadoEn: ahora(), actualizadoEn: ahora() };
    await this.store.saveAll(todas);
  }

  async getCajasDeArticulo(articuloId: string): Promise<AsignacionCaja[]> {
    const todas = await this.store.getAll();
    return activos(todas).filter((a) => a.articuloId === articuloId);
  }

  async getArticulosDeCaja(cajaId: string): Promise<AsignacionCaja[]> {
    const todas = await this.store.getAll();
    return activos(todas).filter((a) => a.cajaId === cajaId);
  }

  /** Limpieza de huérfanos — llamar al borrar una Caja. Tombstone, no borrado real. */
  async eliminarPorCaja(cajaId: string): Promise<void> {
    const todas = await this.store.getAll();
    const marca = ahora();
    await this.store.saveAll(todas.map((a) => (a.cajaId === cajaId ? { ...a, eliminadoEn: marca, actualizadoEn: marca } : a)));
  }

  /** Limpieza de huérfanos — llamar al borrar un Articulo. Tombstone, no borrado real. */
  async eliminarPorArticulo(articuloId: string): Promise<void> {
    const todas = await this.store.getAll();
    const marca = ahora();
    await this.store.saveAll(
      todas.map((a) => (a.articuloId === articuloId ? { ...a, eliminadoEn: marca, actualizadoEn: marca } : a)),
    );
  }

  /** Todas las filas, tombstones incluidos — para armar el snapshot saliente de /sync. */
  getAllParaSync(): Promise<AsignacionCaja[]> {
    return this.store.getAll();
  }

  /** Aplica lo que devolvió el servidor (actualizaciones o una resolución de conflicto). */
  aplicarDesdeSync(filas: AsignacionCaja[]): Promise<void> {
    return this.store.upsertMany(filas, (a) => `${a.articuloId}:${a.cajaId}`);
  }
}
