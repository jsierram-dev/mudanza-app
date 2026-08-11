import { Injectable } from '@angular/core';
import { AsignacionCaja } from '../models';
import { CollectionStore } from './collection-store';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AsignacionCajaService {
  private store: CollectionStore<AsignacionCaja>;

  constructor(storageService: StorageService) {
    this.store = new CollectionStore<AsignacionCaja>(storageService, 'asignaciones');
  }

  getAll(): Promise<AsignacionCaja[]> {
    return this.store.getAll();
  }

  /** Reasignar la misma pareja (articuloId, cajaId) actualiza la cantidad en vez de duplicar fila. */
  async asignar(articuloId: string, cajaId: string, cantidad: number): Promise<void> {
    const todas = await this.store.getAll();
    const existente = todas.find((a) => a.articuloId === articuloId && a.cajaId === cajaId);
    if (existente) {
      existente.cantidad = cantidad;
    } else {
      todas.push({ articuloId, cajaId, cantidad, fechaAsignacion: new Date().toISOString() });
    }
    await this.store.saveAll(todas);
  }

  async quitar(articuloId: string, cajaId: string): Promise<void> {
    const todas = await this.store.getAll();
    await this.store.saveAll(todas.filter((a) => !(a.articuloId === articuloId && a.cajaId === cajaId)));
  }

  async getCajasDeArticulo(articuloId: string): Promise<AsignacionCaja[]> {
    const todas = await this.store.getAll();
    return todas.filter((a) => a.articuloId === articuloId);
  }

  async getArticulosDeCaja(cajaId: string): Promise<AsignacionCaja[]> {
    const todas = await this.store.getAll();
    return todas.filter((a) => a.cajaId === cajaId);
  }

  /** Limpieza de huérfanos — llamar al borrar una Caja (Ionic Storage no tiene cascada). */
  async eliminarPorCaja(cajaId: string): Promise<void> {
    const todas = await this.store.getAll();
    await this.store.saveAll(todas.filter((a) => a.cajaId !== cajaId));
  }

  /** Limpieza de huérfanos — llamar al borrar un Articulo. */
  async eliminarPorArticulo(articuloId: string): Promise<void> {
    const todas = await this.store.getAll();
    await this.store.saveAll(todas.filter((a) => a.articuloId !== articuloId));
  }
}
